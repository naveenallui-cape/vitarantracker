import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule, { rawBody: false });
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

  const expressApp = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: number) => void;
  };
  expressApp.set?.('trust proxy', 1);

  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
