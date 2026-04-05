import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

class AdminEntryDto {
  @IsString()
  userId!: string;

  @IsString()
  treeNodeId!: string;
}

export class AssignAdminsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminEntryDto)
  admins!: AdminEntryDto[];
}
