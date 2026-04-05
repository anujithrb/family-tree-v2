import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class EditNodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsInt()
  deathYear?: number;

  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;

  @IsOptional()
  @IsString()
  gender?: string;
}
