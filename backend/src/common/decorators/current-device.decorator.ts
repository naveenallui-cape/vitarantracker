import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActivityStatus, DeviceStatus, OperatingSystem } from '@prisma/client';

export type AuthenticatedDevice = {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  deviceName: string;
  hostname: string;
  operatingSystem: OperatingSystem;
  agentVersion: string;
  status: DeviceStatus;
  currentActivityStatus: ActivityStatus;
};

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDevice => {
    const request = context.switchToHttp().getRequest<{
      device: AuthenticatedDevice;
    }>();
    return request.device;
  },
);
