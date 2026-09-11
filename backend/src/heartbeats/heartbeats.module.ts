import { Module } from '@nestjs/common';
import { HeartbeatsService } from './heartbeats.service';
import { WorkTimeModule } from '../work-time/work-time.module';

@Module({
  imports: [WorkTimeModule],
  providers: [HeartbeatsService],
  exports: [HeartbeatsService],
})
export class HeartbeatsModule {}
