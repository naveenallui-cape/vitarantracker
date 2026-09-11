import { Module } from '@nestjs/common';
import { HealthController, RootController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [RootController, HealthController],
  providers: [HealthService],
})
export class HealthModule {}
