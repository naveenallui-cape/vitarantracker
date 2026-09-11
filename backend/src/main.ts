import { ConfigService } from '@nestjs/config';
import { createNestApp } from './create-app';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const { app } = await createNestApp();
  const config = app.get(ConfigService<AppConfig, true>);
  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
