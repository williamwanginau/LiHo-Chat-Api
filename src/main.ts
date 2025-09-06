import 'reflect-metadata';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // CORS origins: allow configuring via CORS_ORIGINS (comma-separated).
  // Fallback to commonly used patterns for local and hosted frontends.
  const corsFromEnv = config.get<string>('CORS_ORIGINS');
  const parsedOrigins = resolveCorsOrigins(corsFromEnv);

  app.enableCors({
    origin: parsedOrigins,
    credentials: true,
  });
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = Number(config.get('PORT')) || 4000;
  // 啟用關閉訊號監聽，確保 OnModuleDestroy 會被呼叫
  app.enableShutdownHooks();
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`HTTP server listening on http://localhost:${port}`);
}

bootstrap();
