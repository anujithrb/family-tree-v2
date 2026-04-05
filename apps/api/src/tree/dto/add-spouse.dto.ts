import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class AddSpouseDto {
  @IsString()
  treeNodeId: string;

  @IsOptional()
  @IsString()
  userId?: string; // If provided, link to existing registered user's Person

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;
}
