import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { WorkTimeModule } from '../work-time/work-time.module';

@Module({
  imports: [WorkTimeModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
