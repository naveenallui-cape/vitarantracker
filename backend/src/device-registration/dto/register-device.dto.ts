import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  employeeId!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/, {
    message: 'registrationCode must look like AB7K-92PX',
  })
  registrationCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  deviceName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  hostname!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  agentVersion!: string;
}
