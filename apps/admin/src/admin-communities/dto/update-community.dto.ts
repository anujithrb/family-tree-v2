import { IsString, IsOptional } from 'class-validator';

export class UpdateCommunityDto {
  @IsOptional()
  @IsString()
  name?: string;
}
