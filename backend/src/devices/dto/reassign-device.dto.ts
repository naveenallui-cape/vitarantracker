import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReassignDeviceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  newEmployeeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
