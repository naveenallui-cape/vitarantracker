import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentAdmin,
  type AuthenticatedAdmin,
} from '../common/decorators/current-admin.decorator';
import { DeviceRegistrationService } from './device-registration.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller()
export class DeviceRegistrationController {
  constructor(
    private readonly deviceRegistrationService: DeviceRegistrationService,
  ) {}

  @Post('admin/employees/:employeeId/device-registration-code')
  @UseGuards(JwtAuthGuard)
  generate(
    @Param('employeeId') employeeId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.deviceRegistrationService.generateCode(employeeId, admin.id);
  }

  @Post('devices/register')
  register(@Body() dto: RegisterDeviceDto) {
    return this.deviceRegistrationService.register(dto);
  }
}
