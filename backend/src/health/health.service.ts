import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type HealthResponse = {
  status: 'ok' | 'unhealthy';
  database: 'connected' | 'disconnected';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{ healthy: boolean; body: HealthResponse }> {
    const connected = await this.prisma.isDatabaseConnected();
    return {
      healthy: connected,
      body: {
        status: connected ? 'ok' : 'unhealthy',
        database: connected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
