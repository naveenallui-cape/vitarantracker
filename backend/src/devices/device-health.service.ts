import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfig } from '../config/configuration';

@Injectable()
export class DeviceHealthService {
  private readonly logger = new Logger(DeviceHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async markOfflineDevices(): Promise<number> {
    return this.detectOfflineDevices();
  }

  async detectOfflineDevices(now = new Date()): Promise<number> {
    const graceSeconds = this.config.get('offlineGraceSeconds', {
      infer: true,
    });
    const threshold = new Date(now.getTime() - graceSeconds * 1000);

    const result = await this.prisma.device.updateMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { lastSeenAt: null, registeredAt: { lt: threshold } },
          { lastSeenAt: { lt: threshold } },
        ],
      },
      data: {
        status: 'OFFLINE',
        currentActivityStatus: 'OFFLINE',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} Windows device(s) offline`);
    }

    return result.count;
  }
}
