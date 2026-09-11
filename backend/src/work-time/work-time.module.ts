import { Module } from '@nestjs/common';
import { DailySummaryService } from './daily-summary.service';
import { WorkTimeCalculationService } from './work-time-calculation.service';

@Module({
  providers: [WorkTimeCalculationService, DailySummaryService],
  exports: [WorkTimeCalculationService, DailySummaryService],
})
export class WorkTimeModule {}
