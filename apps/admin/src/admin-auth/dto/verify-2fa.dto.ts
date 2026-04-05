import { IsString } from 'class-validator';

export class Verify2FADto {
  @IsString()
  otpCode!: string;

  @IsString()
  secret!: string;
}
