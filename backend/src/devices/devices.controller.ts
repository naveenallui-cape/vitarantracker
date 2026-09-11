import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentAdmin,
  type AuthenticatedAdmin,
} from '../common/decorators/current-admin.decorator';
import { DevicesService } from './devices.service';
import { QueryDevicesDto } from './dto/query-devices.dto';
import { ReassignDeviceDto } from './dto/reassign-device.dto';

@Controller('admin/devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  findAll(@Query() query: QueryDevicesDto) {
    return this.devicesService.findMany(query);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.devicesService.assignmentHistory(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.devicesService.revoke(id, admin.id);
  }

  @Post(':id/replace')
  replace(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.devicesService.replace(id, admin.id);
  }

  @Post(':id/reassign')
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignDeviceDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.devicesService.reassign(id, dto, admin.id);
  }
}
