import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { INestApplication } from '@nestjs/common';

export async function createNestApp(
  expressApp: Express = express(),
): Promise<{ app: INestApplication; server: Express }> {
  validateEnvironment();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { rawBody: false },
  );
  const config = app.get(ConfigService<AppConfig, true>);
  const origins = config.get('corsOrigin', { infer: true });

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  expressApp.set('trust proxy', 1);

  return { app, server: expressApp };
}
