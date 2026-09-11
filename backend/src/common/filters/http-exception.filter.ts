import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    const mapped = this.mapUnknownError(exception);
    response.status(mapped.status).json({
      success: false,
      message: mapped.message,
      code: mapped.code,
    });
  }

  private mapUnknownError(exception: unknown): {
    status: number;
    message: string;
    code: string;
  } {
    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return this.mapPrismaError(exception);
    }

    const message =
      exception instanceof Error ? exception.message : 'An unexpected error occurred';

    if (/Can't reach database server|P1001|P1017|timed out/i.test(message)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'Cannot connect to the database. Check DATABASE_URL (encode @ in the password as %40).',
        code: ErrorCodes.DATABASE_UNAVAILABLE,
      };
    }

    if (/does not exist|P2021/i.test(message)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'Database tables are missing. Run prisma migrate deploy against this database.',
        code: ErrorCodes.DATABASE_UNAVAILABLE,
      };
    }

    if (/bcrypt|Cannot find module/i.test(message)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Password hashing failed to load on the server.',
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.redact(message) || 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    };
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError | Prisma.PrismaClientRustPanicError): {
    status: number;
    message: string;
    code: string;
  } {
    const code =
      'code' in exception && typeof exception.code === 'string'
        ? exception.code
        : '';

    if (code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        message: 'A record with that unique value already exists.',
        code: ErrorCodes.CONFLICT,
      };
    }

    if (code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found.',
        code: 'NOT_FOUND',
      };
    }

    if (code === 'P2021' || code === 'P2010') {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'Database tables are missing. Run prisma migrate deploy against this database.',
        code: ErrorCodes.DATABASE_UNAVAILABLE,
      };
    }

    if (
      code === 'P1001' ||
      code === 'P1002' ||
      code === 'P1017' ||
      code === 'P2024' ||
      exception instanceof Prisma.PrismaClientInitializationError
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'Cannot connect to the database. Check DATABASE_URL (encode @ in the password as %40).',
        code: ErrorCodes.DATABASE_UNAVAILABLE,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.redact(exception.message) || 'Database request failed',
      code: ErrorCodes.DATABASE_UNAVAILABLE,
    };
  }

  private redact(message: string): string {
    return message.replace(/postgresql:\/\/\S+/gi, 'postgresql://***');
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
