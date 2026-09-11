import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { DeviceRegistrationModule } from './device-registration/device-registration.module';
import { DevicesModule } from './devices/devices.module';
import { TrackerRealtimeModule } from './tracker/tracker-realtime.module';
import { TrackerModule } from './tracker/tracker.module';
import { ActivityEventsModule } from './activity-events/activity-events.module';
import { HeartbeatsModule } from './heartbeats/heartbeats.module';
import { WorkTimeModule } from './work-time/work-time.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditLogsModule,
    HealthModule,
    AuthModule,
    EmployeesModule,
    DeviceRegistrationModule,
    DevicesModule,
    TrackerRealtimeModule,
    TrackerModule,
    ActivityEventsModule,
    HeartbeatsModule,
    WorkTimeModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
