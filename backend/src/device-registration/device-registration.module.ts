import { Module } from '@nestjs/common';
import { DeviceRegistrationController } from './device-registration.controller';
import { DeviceRegistrationService } from './device-registration.service';

@Module({
  controllers: [DeviceRegistrationController],
  providers: [DeviceRegistrationService],
  exports: [DeviceRegistrationService],
})
export class DeviceRegistrationModule {}
