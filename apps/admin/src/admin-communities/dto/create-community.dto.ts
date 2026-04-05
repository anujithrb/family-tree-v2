import { IsString } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  name!: string;
}
