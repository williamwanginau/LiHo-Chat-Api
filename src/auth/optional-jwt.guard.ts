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

  override handleRequest(err: unknown, user: unknown, info: unknown, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const auth = (req.headers?.authorization ?? req.headers?.Authorization) as string | undefined;
    const hasAuth = typeof auth === 'string' && auth.trim().toLowerCase().startsWith('bearer ');

    if (!hasAuth) {
      // No Authorization header → treat as anonymous (no req.user)
      return undefined;
    }

    // Authorization was provided: invalid → 401
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user;
  }
}

