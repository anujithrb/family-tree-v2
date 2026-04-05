import { IsString, IsIn } from 'class-validator';

export class OverrideStatusDto {
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status!: string;
}
