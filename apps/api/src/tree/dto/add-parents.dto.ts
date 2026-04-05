import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ParentDataDto {
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

export class AddParentsDto {
  @IsString()
  treeNodeId: string;

  @ValidateNested()
  @Type(() => ParentDataDto)
  parent1: ParentDataDto;

  @ValidateNested()
  @Type(() => ParentDataDto)
  parent2: ParentDataDto;
}
