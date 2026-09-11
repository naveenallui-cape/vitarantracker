import { ActivityStatus } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class HeartbeatDto {
  @IsIn(['ACTIVE', 'IDLE', 'LOCKED'], {
    message: 'status must be ACTIVE, IDLE, or LOCKED',
  })
  status!: Extract<ActivityStatus, 'ACTIVE' | 'IDLE' | 'LOCKED'>;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  agentVersion!: string;

  @IsDateString()
  occurredAt!: string;
}
