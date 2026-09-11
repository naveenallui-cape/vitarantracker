import { Module } from '@nestjs/common';
import { DeviceRegistrationModule } from '../device-registration/device-registration.module';
import { DeviceHealthService } from './device-health.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [DeviceRegistrationModule],
  controllers: [DevicesController],
  providers: [DevicesService, DeviceHealthService],
  exports: [DevicesService, DeviceHealthService],
})
export class DevicesModule {}
