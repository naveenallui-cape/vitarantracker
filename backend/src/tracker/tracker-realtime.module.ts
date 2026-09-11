import { Global, Module } from '@nestjs/common';
import { TrackerGateway } from './tracker.gateway';

@Global()
@Module({
  providers: [TrackerGateway],
  exports: [TrackerGateway],
})
export class TrackerRealtimeModule {}
