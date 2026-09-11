import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { DevicesModule } from '../devices/devices.module';
import { WorkTimeModule } from '../work-time/work-time.module';
import { DeviceRegistrationModule } from '../device-registration/device-registration.module';

@Module({
  imports: [DevicesModule, WorkTimeModule, DeviceRegistrationModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
