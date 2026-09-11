import { ActivityEventType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateActivityEventDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  eventId!: string;

  @IsEnum(ActivityEventType, {
    message: 'eventType must be ACTIVE, IDLE, LOCKED, or UNLOCKED',
  })
  eventType!: ActivityEventType;

  @IsDateString()
  occurredAt!: string;
}
