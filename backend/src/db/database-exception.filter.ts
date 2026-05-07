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
    if (isDatabaseSetupError(exception)) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        ok: false,
        code: "DB_UNAVAILABLE",
        message: databaseSetupMessage(),
        action: "Configure DATABASE_URL and run migrations before retrying this request."
      });
      return;
    }

    if (this.isZodError(exception)) {
      response.status(HttpStatus.BAD_REQUEST).json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        action: "Check the submitted fields and retry.",
        issues: (exception as { issues?: unknown }).issues ?? []
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (body && typeof body === "object" && "ok" in body) {
        response.status(status).json(body);
        return;
      }
      const message = typeof body === "object" && body && "message" in body ? (body as { message?: unknown }).message : exception.message;
      response.status(status).json({
        ok: false,
        code: this.codeForStatus(status),
        message: Array.isArray(message) ? message.join("; ") : String(message || "Request failed."),
        action: this.actionForStatus(status)
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
      action: "Retry or check the backend logs for the underlying exception."
    });
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
