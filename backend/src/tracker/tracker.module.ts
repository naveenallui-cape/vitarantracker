import { Module } from '@nestjs/common';
import { ActivityEventsModule } from '../activity-events/activity-events.module';
import { HeartbeatsModule } from '../heartbeats/heartbeats.module';
import { DeviceAuthGuard } from '../common/guards/device-auth.guard';
import { TrackerController } from './tracker.controller';

@Module({
  imports: [ActivityEventsModule, HeartbeatsModule],
  controllers: [TrackerController],
  providers: [DeviceAuthGuard],
})
export class TrackerModule {}
