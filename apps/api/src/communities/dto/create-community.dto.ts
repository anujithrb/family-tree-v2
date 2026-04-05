import {
  IsString,
  MinLength,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WizardNodeDto {
  @IsString()
  tempId: string;

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

  @IsOptional()
  @IsBoolean()
  isSelf?: boolean;
}

export class WizardCoupleDto {
  @IsString()
  spouse1: string; // tempId

  @IsString()
  spouse2: string; // tempId
}

export class WizardChildDto {
  @IsString()
  coupleSpouse1: string; // tempId to identify couple

  @IsString()
  coupleSpouse2: string; // tempId to identify couple

  @IsString()
  childRef: string; // tempId

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class CreateCommunityDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardNodeDto)
  nodes: WizardNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardCoupleDto)
  couples: WizardCoupleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WizardChildDto)
  children: WizardChildDto[];
}
