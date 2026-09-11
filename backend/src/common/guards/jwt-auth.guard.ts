import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCodes } from '../errors/error-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        success: false,
        message: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
    return user;
  }
}
