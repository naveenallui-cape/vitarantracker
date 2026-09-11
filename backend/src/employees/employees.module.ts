import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { DevicesModule } from '../devices/devices.module';
import { WorkTimeModule } from '../work-time/work-time.module';

@Module({
  imports: [DevicesModule, WorkTimeModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
