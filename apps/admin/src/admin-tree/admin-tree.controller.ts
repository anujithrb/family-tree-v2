import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminTreeService } from './tree.service';
import { IsString, MinLength, IsOptional, IsInt, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddSpouseDto {
  @IsString() treeNodeId!: string;
  @IsOptional() @IsString() userId?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(2100) birthYear?: number;
  @IsOptional() @IsBoolean() isDeceased?: boolean;
}

class AddChildDto {
  @IsString() coupleId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(2100) birthYear?: number;
  @IsOptional() @IsBoolean() isDeceased?: boolean;
}

class ParentDataDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(2100) birthYear?: number;
  @IsOptional() @IsBoolean() isDeceased?: boolean;
}

class AddParentsDto {
  @IsString() treeNodeId!: string;
  @ValidateNested() @Type(() => ParentDataDto) parent1!: ParentDataDto;
  @ValidateNested() @Type(() => ParentDataDto) parent2!: ParentDataDto;
}

class AddSiblingDto {
  @IsString() treeNodeId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(2100) birthYear?: number;
  @IsOptional() @IsBoolean() isDeceased?: boolean;
}

class EditNodeDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsInt() @Min(1000) @Max(2100) birthYear?: number;
  @IsOptional() @IsInt() deathYear?: number;
  @IsOptional() @IsBoolean() isDeceased?: boolean;
  @IsOptional() @IsString() gender?: string;
}

@Controller('communities/:communityId/tree')
@UseGuards(AdminAuthGuard)
export class AdminTreeController {
  constructor(private readonly adminTreeService: AdminTreeService) {}

  @Get()
  getTree(@Param('communityId') communityId: string) {
    return this.adminTreeService.getTree(communityId);
  }

  @Post('add-spouse')
  addSpouse(@Param('communityId') communityId: string, @Body() dto: AddSpouseDto) {
    return this.adminTreeService.addSpouse(communityId, dto.treeNodeId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
      userId: dto.userId,
    });
  }

  @Post('add-child')
  addChild(@Param('communityId') communityId: string, @Body() dto: AddChildDto) {
    return this.adminTreeService.addChild(communityId, dto.coupleId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Post('add-parents')
  addParents(@Param('communityId') communityId: string, @Body() dto: AddParentsDto) {
    return this.adminTreeService.addParents(communityId, dto.treeNodeId, {
      parent1: dto.parent1,
      parent2: dto.parent2,
    });
  }

  @Post('add-sibling')
  addSibling(@Param('communityId') communityId: string, @Body() dto: AddSiblingDto) {
    return this.adminTreeService.addSibling(communityId, dto.treeNodeId, {
      name: dto.name,
      gender: dto.gender,
      birthYear: dto.birthYear,
      isDeceased: dto.isDeceased,
    });
  }

  @Put('nodes/:nodeId')
  editNode(
    @Param('communityId') communityId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: EditNodeDto,
  ) {
    return this.adminTreeService.editNode(communityId, nodeId, dto);
  }

  @Delete('nodes/:nodeId')
  removeNode(@Param('communityId') communityId: string, @Param('nodeId') nodeId: string) {
    return this.adminTreeService.removeNode(communityId, nodeId);
  }
}
