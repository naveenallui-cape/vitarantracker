import { Module } from '@nestjs/common';
import { HeartbeatsService } from './heartbeats.service';

@Module({
  providers: [HeartbeatsService],
  exports: [HeartbeatsService],
})
export class HeartbeatsModule {}
