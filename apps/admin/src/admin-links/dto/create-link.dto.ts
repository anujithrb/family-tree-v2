import { IsString } from 'class-validator';

export class CreateLinkDto {
  @IsString()
  treeNodeAId!: string;

  @IsString()
  treeNodeBId!: string;
}
