import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DeviceAuthGuard } from '../common/guards/device-auth.guard';
import {
  CurrentDevice,
  type AuthenticatedDevice,
} from '../common/decorators/current-device.decorator';
import { ActivityEventsService } from '../activity-events/activity-events.service';
import { CreateActivityEventDto } from '../activity-events/dto/create-activity-event.dto';
import { HeartbeatsService } from '../heartbeats/heartbeats.service';
import { HeartbeatDto } from '../heartbeats/dto/heartbeat.dto';

@Controller('tracker')
@UseGuards(DeviceAuthGuard)
export class TrackerController {
  constructor(
    private readonly activityEventsService: ActivityEventsService,
    private readonly heartbeatsService: HeartbeatsService,
  ) {}

  @Post('events')
  events(
    @CurrentDevice() device: AuthenticatedDevice,
    @Body() dto: CreateActivityEventDto,
  ) {
    return this.activityEventsService.ingest(device, dto);
  }

  @Post('heartbeat')
  heartbeat(
    @CurrentDevice() device: AuthenticatedDevice,
    @Body() dto: HeartbeatDto,
  ) {
    return this.heartbeatsService.ingest(device, dto);
  }
}
