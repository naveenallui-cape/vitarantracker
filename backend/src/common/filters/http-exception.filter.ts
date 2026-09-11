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
          ? {
              success: false as const,
              message: payload,
              code: this.codeForStatus(status),
            }
          : this.normalizeHttpException(payload, status);

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

  private normalizeHttpException(
    payload: object,
    status: number,
  ): {
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
          : this.codeForStatus(status)),
    };
  }

  private codeForStatus(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) {
      return ErrorCodes.VALIDATION_ERROR;
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return ErrorCodes.UNAUTHORIZED;
    }
    if (status === HttpStatus.FORBIDDEN) {
      return ErrorCodes.FORBIDDEN;
    }
    if (status === HttpStatus.NOT_FOUND) {
      return 'NOT_FOUND';
    }
    if (status === HttpStatus.CONFLICT) {
      return ErrorCodes.CONFLICT;
    }
    return 'REQUEST_FAILED';
  }
}
