import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkTimeReportQueryDto } from './dto/work-time-report-query.dto';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('work-time')
  workTime(@Query() query: WorkTimeReportQueryDto) {
    return this.reportsService.workTime(query);
  }

  @Get('overview')
  overview(@Query() query: WorkTimeReportQueryDto) {
    return this.reportsService.overview(query);
  }

  @Get('timeline')
  timeline(@Query() query: WorkTimeReportQueryDto) {
    return this.reportsService.timeline(query);
  }

  @Get('work-time/export')
  async export(@Query() query: WorkTimeReportQueryDto, @Res() res: Response) {
    const csv = await this.reportsService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="work-time-report.csv"',
    );
    res.send(csv);
  }
}
