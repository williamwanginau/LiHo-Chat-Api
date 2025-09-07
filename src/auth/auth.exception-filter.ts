import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception.getResponse?.();

    let message: string | string[] = 'Error';
    if (typeof payload === 'string') message = payload;
    else if (payload && typeof payload === 'object') {
      const m = (payload as { message?: unknown }).message;
      if (Array.isArray(m)) message = m;
      else if (typeof m === 'string') message = m;
      else message = (payload as { error?: unknown }).error as string ?? 'Error';
    }

    const code = (HttpStatus[status] as string) ?? 'ERROR';
    res.status(status).json({ message, code });
  }
}

