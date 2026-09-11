import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class AppException extends HttpException {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ success: false, message, code }, status);
  }
}
