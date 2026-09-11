import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'authorization',
  'devicetoken',
  'registrationcode',
  'jwt',
  'secret',
  'token',
]);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();
    const safeBody = this.sanitize(request.body);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${request.method} ${request.url} ${Date.now() - startedAt}ms body=${JSON.stringify(safeBody)}`,
          );
        },
        error: () => {
          this.logger.warn(
            `${request.method} ${request.url} failed ${Date.now() - startedAt}ms`,
          );
        },
      }),
    );
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([key, nested]) => {
            if (SENSITIVE_KEYS.has(key.toLowerCase())) {
              return [key, '[REDACTED]'];
            }
            return [key, this.sanitize(nested)];
          },
        ),
      );
    }
    return value;
  }
}
