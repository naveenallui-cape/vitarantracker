import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes } from '../errors/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body =
        typeof payload === 'string'
          ? { success: false, message: payload, code: ErrorCodes.UNAUTHORIZED }
          : this.normalizeHttpException(payload);

      response.status(status).json(body);
      return;
    }

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    });
  }

  private normalizeHttpException(payload: object): {
    success: false;
    message: string;
    code: string;
  } {
    const record = payload as {
      success?: boolean;
      message?: string | string[];
      code?: string;
      error?: string;
    };

    const message = Array.isArray(record.message)
      ? record.message.join('; ')
      : (record.message ?? record.error ?? 'Request failed');

    return {
      success: false,
      message,
      code:
        record.code ??
        (Array.isArray(record.message)
          ? ErrorCodes.VALIDATION_ERROR
          : ErrorCodes.UNAUTHORIZED),
    };
  }
}
