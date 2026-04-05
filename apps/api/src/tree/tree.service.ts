import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  PrismaService,
  generateProfileId,
  computeBloodlineStatus,
} from '@family-tree/database';

@Injectable()
export class TreeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundException('Community not found');

    const treeNodes = await this.prisma.treeNode.findMany({
      where: { communityId },
      include: {
        person: { include: { user: true } },
      },
    });

    const couples = await this.prisma.couple.findMany({
      where: { communityId },
    });

    const coupleChildren = await this.prisma.coupleChild.findMany({
      where: { couple: { communityId } },
      orderBy: { sortOrder: 'asc' },
    });

    // Build a set of nodeIds that appear as children (have parents)
    const nodesWithParents = new Set(coupleChildren.map((cc) => cc.childId));

    // Compute bloodline for each couple
    const computedCouples = couples.map((couple) => {
      const bloodline = computeBloodlineStatus({
        spouse1Id: couple.spouse1Id,
        spouse2Id: couple.spouse2Id,
        spouse1HasParents: nodesWithParents.has(couple.spouse1Id),
        spouse2HasParents: nodesWithParents.has(couple.spouse2Id),
      });

      const children = coupleChildren
        .filter((cc) => cc.coupleId === couple.id)
        .map((cc) => cc.childId);

      return {
        id: couple.id,
        spouseAId: bloodline.spouseAId,
        spouseBId: bloodline.spouseBId,
        status: couple.status,
        marriageDate: couple.marriageDate,
        divorceDate: couple.divorceDate,
        children,
      };
    });

    // Find root couple: couple where neither spouse has parents
    const rootCouple = computedCouples.find(
      (c) => !nodesWithParents.has(c.spouseAId) && !nodesWithParents.has(c.spouseBId),
    );

    // Sort: root couple first
    if (rootCouple) {
      const idx = computedCouples.indexOf(rootCouple);
      if (idx > 0) {
        computedCouples.splice(idx, 1);
        computedCouples.unshift(rootCouple);
      }
    }

    const people = treeNodes.map((tn) => {
      const person = tn.person;
      const user = person.user;
      return {
        nodeId: tn.id,
        personId: person.id,
        profileId: person.profileId,
        name: user?.displayName || person.name,
        birthYear: person.birthYear,
        deathYear: person.deathYear,
        isDeceased: person.isDeceased,
        gender: person.gender,
        profilePhoto: user?.profilePhoto || null,
        isRegisteredUser: !!user,
      };
    });

    return {
      communityId,
      communityName: community.name,
      people,
      couples: computedCouples,
    };
  }

  async addSpouse(
    communityId: string,
    treeNodeId: string,
    spouseData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean; userId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingNode = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: { spouse1In: true, spouse2In: true },
      });
      if (!existingNode) throw new NotFoundException('Tree node not found');
      if (existingNode.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }
      if (existingNode.spouse1In || existingNode.spouse2In) {
        throw new ConflictException('Person already has a spouse');
      }

      let personId: string;

      if (spouseData.userId) {
        // Cross-community: link to existing registered user's Person
        const person = await tx.person.findFirst({
          where: { userId: spouseData.userId },
        });
        if (!person) {
          throw new NotFoundException('No Person found for this user');
        }

        // Verify they don't already have a TreeNode in this community
        const existingInCommunity = await tx.treeNode.findFirst({
          where: { communityId, personId: person.id },
        });
        if (existingInCommunity) {
          throw new ConflictException(
            'This user already has a node in this community',
          );
        }

        personId = person.id;
      } else {
        // Standard: create a new Person
        const checkExists = async (pid: string) => {
          const count = await tx.person.count({ where: { profileId: pid } });
          return count > 0;
        };
        const profileId = await generateProfileId(spouseData.name, checkExists);

        const person = await tx.person.create({
          data: {
            profileId,
            name: spouseData.name,
            gender: spouseData.gender || null,
            birthYear: spouseData.birthYear || null,
            isDeceased: spouseData.isDeceased || false,
          },
        });
        personId = person.id;
      }

      const spouseNode = await tx.treeNode.create({
        data: { communityId, personId },
      });

      const couple = await tx.couple.create({
        data: {
          communityId,
          spouse1Id: treeNodeId,
          spouse2Id: spouseNode.id,
        },
      });

      return { coupleId: couple.id, spouseNodeId: spouseNode.id, personId };
    });
  }

  async addChild(
    communityId: string,
    coupleId: string,
    childData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const couple = await tx.couple.findUnique({ where: { id: coupleId } });
      if (!couple) throw new NotFoundException('Couple not found');
      if (couple.communityId !== communityId) {
        throw new BadRequestException('Couple does not belong to this community');
      }

      const childCount = await tx.coupleChild.count({
        where: { coupleId },
      });

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };
      const profileId = await generateProfileId(childData.name, checkExists);

      const person = await tx.person.create({
        data: {
          profileId,
          name: childData.name,
          gender: childData.gender || null,
          birthYear: childData.birthYear || null,
          isDeceased: childData.isDeceased || false,
        },
      });

      const childNode = await tx.treeNode.create({
        data: { communityId, personId: person.id },
      });

      await tx.coupleChild.create({
        data: {
          coupleId,
          childId: childNode.id,
          sortOrder: childCount,
        },
      });

      // Cross-community auto-creation:
      // Check if either spouse's Person has TreeNodes in other communities
      const spouseNodes = await tx.treeNode.findMany({
        where: {
          personId: { in: [couple.spouse1Id, couple.spouse2Id].map(() => '') },
        },
      });

      // Get the actual person IDs from spouse tree nodes
      const spouse1Node = await tx.treeNode.findUnique({
        where: { id: couple.spouse1Id },
        include: { person: { include: { treeNodes: true } } },
      });
      const spouse2Node = await tx.treeNode.findUnique({
        where: { id: couple.spouse2Id },
        include: { person: { include: { treeNodes: true } } },
      });

      if (spouse1Node && spouse2Node) {
        // For each other community where a spouse has a TreeNode
        const otherSpouse1Nodes = spouse1Node.person.treeNodes.filter(
          (tn) => tn.communityId !== communityId,
        );
        const otherSpouse2Nodes = spouse2Node.person.treeNodes.filter(
          (tn) => tn.communityId !== communityId,
        );

        // Find communities where both spouses have nodes and form a couple
        for (const s1Node of otherSpouse1Nodes) {
          for (const s2Node of otherSpouse2Nodes) {
            if (s1Node.communityId === s2Node.communityId) {
              // Both spouses exist in this other community — check if they have a couple there
              const otherCouple = await tx.couple.findFirst({
                where: {
                  communityId: s1Node.communityId,
                  OR: [
                    { spouse1Id: s1Node.id, spouse2Id: s2Node.id },
                    { spouse1Id: s2Node.id, spouse2Id: s1Node.id },
                  ],
                },
              });

              if (otherCouple) {
                // Create child TreeNode in the other community with the same Person
                const otherChildNode = await tx.treeNode.create({
                  data: {
                    communityId: s1Node.communityId,
                    personId: person.id,
                  },
                });

                const otherChildCount = await tx.coupleChild.count({
                  where: { coupleId: otherCouple.id },
                });

                await tx.coupleChild.create({
                  data: {
                    coupleId: otherCouple.id,
                    childId: otherChildNode.id,
                    sortOrder: otherChildCount,
                  },
                });
              }
            }
          }
        }
      }

      return { childNodeId: childNode.id, personId: person.id };
    });
  }

  async addParents(
    communityId: string,
    treeNodeId: string,
    parentsData: {
      parent1: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean };
      parent2: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean };
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Verify the node exists and is a root couple member
      const node = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: { childIn: true, spouse1In: true, spouse2In: true },
      });
      if (!node) throw new NotFoundException('Tree node not found');
      if (node.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }
      if (node.childIn.length > 0) {
        throw new BadRequestException(
          'This person already has parents. add-parents is only available for root couple members.',
        );
      }

      // Verify the node is part of a couple (root couple)
      const couple = node.spouse1In || node.spouse2In;
      if (!couple) {
        throw new BadRequestException(
          'Node must be part of a couple to add parents',
        );
      }

      // Verify neither spouse of the root couple has parents (confirming it IS the root)
      const spouseId = couple.spouse1Id === treeNodeId ? couple.spouse2Id : couple.spouse1Id;
      const spouseChildIn = await tx.coupleChild.findMany({
        where: { childId: spouseId },
      });
      if (spouseChildIn.length > 0) {
        throw new BadRequestException(
          'The other spouse already has parents. Only root couple members can add parents.',
        );
      }

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };

      // Create parent 1
      const profileId1 = await generateProfileId(parentsData.parent1.name, checkExists);
      const person1 = await tx.person.create({
        data: {
          profileId: profileId1,
          name: parentsData.parent1.name,
          gender: parentsData.parent1.gender || null,
          birthYear: parentsData.parent1.birthYear || null,
          isDeceased: parentsData.parent1.isDeceased || false,
        },
      });
      const parentNode1 = await tx.treeNode.create({
        data: { communityId, personId: person1.id },
      });

      // Create parent 2
      const profileId2 = await generateProfileId(parentsData.parent2.name, checkExists);
      const person2 = await tx.person.create({
        data: {
          profileId: profileId2,
          name: parentsData.parent2.name,
          gender: parentsData.parent2.gender || null,
          birthYear: parentsData.parent2.birthYear || null,
          isDeceased: parentsData.parent2.isDeceased || false,
        },
      });
      const parentNode2 = await tx.treeNode.create({
        data: { communityId, personId: person2.id },
      });

      // Create parents couple
      const parentsCouple = await tx.couple.create({
        data: {
          communityId,
          spouse1Id: parentNode1.id,
          spouse2Id: parentNode2.id,
        },
      });

      // Link target node as child of the new parents couple
      await tx.coupleChild.create({
        data: {
          coupleId: parentsCouple.id,
          childId: treeNodeId,
          sortOrder: 0,
        },
      });

      return {
        parentsCoupleId: parentsCouple.id,
        parent1NodeId: parentNode1.id,
        parent2NodeId: parentNode2.id,
      };
    });
  }

  async addSibling(
    communityId: string,
    treeNodeId: string,
    siblingData: { name: string; gender?: string; birthYear?: number; isDeceased?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find the node's parents
      const childEntry = await tx.coupleChild.findFirst({
        where: {
          childId: treeNodeId,
          couple: { communityId },
        },
      });
      if (!childEntry) {
        throw new BadRequestException(
          'This person has no parents in this community. Cannot add sibling.',
        );
      }

      const siblingCount = await tx.coupleChild.count({
        where: { coupleId: childEntry.coupleId },
      });

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };
      const profileId = await generateProfileId(siblingData.name, checkExists);

      const person = await tx.person.create({
        data: {
          profileId,
          name: siblingData.name,
          gender: siblingData.gender || null,
          birthYear: siblingData.birthYear || null,
          isDeceased: siblingData.isDeceased || false,
        },
      });

      const siblingNode = await tx.treeNode.create({
        data: { communityId, personId: person.id },
      });

      await tx.coupleChild.create({
        data: {
          coupleId: childEntry.coupleId,
          childId: siblingNode.id,
          sortOrder: siblingCount,
        },
      });

      return { siblingNodeId: siblingNode.id, personId: person.id };
    });
  }

  async editNode(
    communityId: string,
    treeNodeId: string,
    data: { name?: string; birthYear?: number | null; deathYear?: number | null; isDeceased?: boolean; gender?: string | null },
    requestUserId: string,
  ) {
    const node = await this.prisma.treeNode.findUnique({
      where: { id: treeNodeId },
      include: { person: { include: { user: true } } },
    });
    if (!node) throw new NotFoundException('Tree node not found');
    if (node.communityId !== communityId) {
      throw new BadRequestException('Node does not belong to this community');
    }

    // If person is a registered user and the requester is NOT that user,
    // only allow admin-editable fields (deathYear, isDeceased)
    const personOwnsAccount = node.person.user !== null;
    const requesterIsOwner = node.person.user?.id === requestUserId;

    const updateData: Record<string, any> = {};

    if (data.deathYear !== undefined) updateData.deathYear = data.deathYear;
    if (data.isDeceased !== undefined) updateData.isDeceased = data.isDeceased;

    if (!personOwnsAccount || requesterIsOwner) {
      // Can edit all fields
      if (data.name !== undefined) updateData.name = data.name;
      if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
      if (data.gender !== undefined) updateData.gender = data.gender;
    }

    const updated = await this.prisma.person.update({
      where: { id: node.personId },
      data: updateData,
    });

    return updated;
  }

  async removeNode(communityId: string, treeNodeId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find the node
      const node = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: {
          spouse1In: { include: { children: true } },
          spouse2In: { include: { children: true } },
          childIn: true,
          person: { include: { user: true, treeNodes: true } },
        },
      });
      if (!node) throw new NotFoundException('Tree node not found');
      if (node.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }

      const couple = node.spouse1In || node.spouse2In;
      const deletedNodeIds: string[] = [];

      if (couple && couple.children.length > 0) {
        throw new ConflictException(
          'Cannot remove a person whose couple has children. Remove descendants first.',
        );
      }

      if (couple) {
        // Determine bloodline vs married-in
        const nodeIsSpouse1 = couple.spouse1Id === treeNodeId;
        const otherSpouseId = nodeIsSpouse1 ? couple.spouse2Id : couple.spouse1Id;

        const nodeHasParents = node.childIn.length > 0;
        const otherChildIn = await tx.coupleChild.findMany({
          where: { childId: otherSpouseId },
        });
        const otherHasParents = otherChildIn.length > 0;

        // Delete couple
        await tx.couple.delete({ where: { id: couple.id } });

        if (nodeHasParents && !otherHasParents) {
          // Target is bloodline, other is married-in -> delete both
          // Remove target from parent's children
          await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
          // Delete the married-in spouse's node
          const otherNode = await tx.treeNode.findUnique({
            where: { id: otherSpouseId },
            include: { person: { include: { treeNodes: true, user: true } } },
          });
          await tx.treeNode.delete({ where: { id: otherSpouseId } });
          deletedNodeIds.push(otherSpouseId);
          // Clean up person if orphaned
          if (otherNode && otherNode.person.treeNodes.length <= 1 && !otherNode.person.user) {
            await tx.person.delete({ where: { id: otherNode.personId } });
          }
          // Delete target node
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        } else if (!nodeHasParents && otherHasParents) {
          // Target is married-in -> delete only target
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        } else {
          // Both have parents or neither -> delete target, keep other
          await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        }
      } else {
        // No couple — just delete the node
        await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
        await tx.treeNode.delete({ where: { id: treeNodeId } });
        deletedNodeIds.push(treeNodeId);
      }

      // Clean up person if no remaining tree nodes and no user account
      if (node.person.treeNodes.length <= 1 && !node.person.user) {
        await tx.person.delete({ where: { id: node.personId } }).catch(() => {});
      }

      return { deleted: deletedNodeIds };
    });
  }
}
