import { Injectable } from '@nestjs/common';
import { TreeOperationsService } from '@family-tree/database';

/**
 * Admin tree service — thin wrapper around shared TreeOperationsService.
 * Does NOT pass requestUserId to editNode, so all fields are editable (admin mode).
 */
@Injectable()
export class AdminTreeService {
  constructor(private readonly treeOps: TreeOperationsService) {}

  getTree(communityId: string) {
    return this.treeOps.getTree(communityId);
  }

  addSpouse(
    communityId: string,
    treeNodeId: string,
    spouseData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean; userId?: string },
  ) {
    return this.treeOps.addSpouse(communityId, treeNodeId, spouseData);
  }

  addChild(
    communityId: string,
    coupleId: string,
    childData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.treeOps.addChild(communityId, coupleId, childData);
  }

  addParents(
    communityId: string,
    treeNodeId: string,
    parentsData: {
      parent1: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean };
      parent2: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean };
    },
  ) {
    return this.treeOps.addParents(communityId, treeNodeId, parentsData);
  }

  addSibling(
    communityId: string,
    treeNodeId: string,
    siblingData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.treeOps.addSibling(communityId, treeNodeId, siblingData);
  }

  editNode(
    communityId: string,
    treeNodeId: string,
    data: { name?: string; birthYear?: number | null; deathYear?: number | null; isDeceased?: boolean; gender?: string | null },
  ) {
    // No requestUserId → admin mode (all fields editable)
    return this.treeOps.editNode(communityId, treeNodeId, data);
  }

  removeNode(communityId: string, treeNodeId: string) {
    return this.treeOps.removeNode(communityId, treeNodeId);
  }
}
