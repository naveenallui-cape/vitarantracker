import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentAdmin,
  type AuthenticatedAdmin,
} from '../common/decorators/current-admin.decorator';
import { DevicesService } from '../devices/devices.service';
import { DailySummaryService } from '../work-time/daily-summary.service';
import { WorkTimeReportQueryDto } from '../reports/dto/work-time-report-query.dto';

@Controller('admin/employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly devicesService: DevicesService,
    private readonly dailySummaryService: DailySummaryService,
  ) {}

  @Get()
  findAll(@Query() query: QueryEmployeesDto) {
    return this.employeesService.findMany(query);
  }

  @Post()
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.employeesService.create(dto, admin.id);
  }

  @Get(':id/devices')
  listDevices(@Param('id') id: string) {
    return this.devicesService.findByEmployee(id);
  }

  @Get(':id/work-time')
  workTime(@Param('id') id: string, @Query() query: WorkTimeReportQueryDto) {
    return this.dailySummaryService.getEmployeeSummaries(id, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findByIdOrCode(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.employeesService.updateStatus(id, dto.status, admin.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.employeesService.update(id, dto, admin.id);
  }
}
