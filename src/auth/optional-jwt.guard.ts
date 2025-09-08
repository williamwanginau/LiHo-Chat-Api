import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard treats requests without Authorization as anonymous.
 * If Authorization header is present but invalid, it throws 401.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    // Always allow the guard to process; handleRequest decides anon vs 401
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override handleRequest<TUser = any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _info: any,
    context: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _status?: any,
  ): TUser {
    const req = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const auth = (req.headers?.authorization ?? (req.headers as unknown as Record<string, string | undefined>)?.Authorization) as
      | string
      | undefined;
    const hasAuth = typeof auth === 'string' && auth.trim().toLowerCase().startsWith('bearer ');

    if (!hasAuth) {
      // No Authorization header → treat as anonymous
      // Return null casted to TUser to satisfy AuthGuard contract
      return (null as unknown) as TUser;
    }

    // Authorization was provided: invalid → 401
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user as TUser;
  }
}
