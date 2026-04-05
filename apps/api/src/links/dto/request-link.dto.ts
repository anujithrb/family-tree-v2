import { IsString } from 'class-validator';

export class RequestLinkDto {
  @IsString()
  treeNodeAId: string;

  @IsString()
  treeNodeBId: string;
}
