import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class WorkTimeReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceId?: string;
}
