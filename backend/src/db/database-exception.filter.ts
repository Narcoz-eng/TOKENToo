import { ArgumentsHost, Catch } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { databaseSetupMessage, isDatabaseSetupError } from "./database-errors";

@Catch()
export class DatabaseExceptionFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    if (!isDatabaseSetupError(exception)) return super.catch(exception, host);

    const response = host.switchToHttp().getResponse();
    response.status(503).json({
      statusCode: 503,
      message: databaseSetupMessage()
    });
  }
}
