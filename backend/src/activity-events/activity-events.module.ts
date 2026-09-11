import { Module } from '@nestjs/common';
import { WorkTimeModule } from '../work-time/work-time.module';
import { ActivityEventsService } from './activity-events.service';

@Module({
  imports: [WorkTimeModule],
  providers: [ActivityEventsService],
  exports: [ActivityEventsService],
})
export class ActivityEventsModule {}
