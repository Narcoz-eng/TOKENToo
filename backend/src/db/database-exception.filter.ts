import { ArgumentsHost, Catch, HttpException, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { databaseSetupMessage, isDatabaseSetupError } from "./database-errors";

@Catch()
export class DatabaseExceptionFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const requestId = this.requestId(request);
    if (isDatabaseSetupError(exception)) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json(this.errorBody("DB_UNAVAILABLE", databaseSetupMessage(), requestId, { action: "Configure DATABASE_URL and run migrations before retrying this request." }));
      return;
    }

    if (this.isZodError(exception)) {
      response.status(HttpStatus.BAD_REQUEST).json(this.errorBody("VALIDATION_ERROR", "Request validation failed.", requestId, { action: "Check the submitted fields and retry.", details: (exception as { issues?: unknown }).issues ?? [] }));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (body && typeof body === "object" && "success" in body && "error" in body) {
        response.status(status).json({ requestId, ...body });
        return;
      }
      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      const message = "message" in record ? record.message : exception.message;
      const code = typeof record.code === "string" ? record.code : this.codeForStatus(status);
      response.status(status).json(this.errorBody(code, Array.isArray(message) ? message.join("; ") : String(message || "Request failed."), requestId, { action: this.actionForStatus(status), details: record.details ?? record.issues }));
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(this.errorBody("REQUEST_FAILED", "The request could not be completed.", requestId, { action: "Retry or check the backend logs for the underlying exception." }));
  }

  private errorBody(code: string, message: string, requestId: string, input: { action?: string; details?: unknown } = {}) {
    return {
      ok: false,
      success: false,
      requestId,
      error: {
        code,
        message,
        details: input.details,
        action: input.action
      },
      code,
      message,
      action: input.action
    };
  }

  private requestId(request?: { headers?: Record<string, string | string[] | undefined> }) {
    const header = request?.headers?.["x-request-id"];
    return (Array.isArray(header) ? header[0] : header) ?? `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private isZodError(exception: unknown) {
    return Boolean(exception && typeof exception === "object" && (exception as { name?: string }).name === "ZodError");
  }

  private codeForStatus(status: number) {
    if (status === 401 || status === 403) return "WALLET_REQUIRED";
    if (status === 400) return "VALIDATION_ERROR";
    if (status === 422) return "MISSING_ENV";
    if (status === 503) return "PROVIDER_NOT_CONFIGURED";
    return "REQUEST_FAILED";
  }

  private actionForStatus(status: number) {
    if (status === 401 || status === 403) return "Connect and authenticate the founder wallet.";
    if (status === 400) return "Fix the request payload and retry.";
    if (status === 422) return "Complete the required local setup and retry.";
    if (status === 503) return "Configure the missing provider and retry.";
    return "Review the request and retry.";
  }
}
