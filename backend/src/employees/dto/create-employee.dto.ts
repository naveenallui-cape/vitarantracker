import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'employeeId may contain letters, numbers, hyphens, and underscores only',
  })
  employeeId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  department!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  designation!: string;
}
