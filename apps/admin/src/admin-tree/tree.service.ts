/**
 * Admin tree service — same logic as API TreeService but:
 * - editNode skips ownership checks (admin can edit any person)
 * - No community membership restrictions
 */
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
export class AdminTreeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundException('Community not found');

    const treeNodes = await this.prisma.treeNode.findMany({
      where: { communityId },
      include: { person: { include: { user: true } } },
    });

    const couples = await this.prisma.couple.findMany({ where: { communityId } });

    const coupleChildren = await this.prisma.coupleChild.findMany({
      where: { couple: { communityId } },
      orderBy: { sortOrder: 'asc' },
    });

    const nodesWithParents = new Set(coupleChildren.map((cc) => cc.childId));

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

    const rootCouple = computedCouples.find(
      (c) => !nodesWithParents.has(c.spouseAId) && !nodesWithParents.has(c.spouseBId),
    );

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

    return { communityId, communityName: community.name, people, couples: computedCouples };
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
        const person = await tx.person.findFirst({ where: { userId: spouseData.userId } });
        if (!person) throw new NotFoundException('No Person found for this user');

        const existingInCommunity = await tx.treeNode.findFirst({
          where: { communityId, personId: person.id },
        });
        if (existingInCommunity) {
          throw new ConflictException('This user already has a node in this community');
        }
        personId = person.id;
      } else {
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

      const spouseNode = await tx.treeNode.create({ data: { communityId, personId } });
      const couple = await tx.couple.create({
        data: { communityId, spouse1Id: treeNodeId, spouse2Id: spouseNode.id },
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

      const childCount = await tx.coupleChild.count({ where: { coupleId } });

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

      const childNode = await tx.treeNode.create({ data: { communityId, personId: person.id } });

      await tx.coupleChild.create({
        data: { coupleId, childId: childNode.id, sortOrder: childCount },
      });

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
      const node = await tx.treeNode.findUnique({
        where: { id: treeNodeId },
        include: { childIn: true, spouse1In: true, spouse2In: true },
      });
      if (!node) throw new NotFoundException('Tree node not found');
      if (node.communityId !== communityId) {
        throw new BadRequestException('Node does not belong to this community');
      }
      if (node.childIn.length > 0) {
        throw new BadRequestException('This person already has parents.');
      }

      const couple = node.spouse1In || node.spouse2In;
      if (!couple) {
        throw new BadRequestException('Node must be part of a couple to add parents');
      }

      const spouseId = couple.spouse1Id === treeNodeId ? couple.spouse2Id : couple.spouse1Id;
      const spouseChildIn = await tx.coupleChild.findMany({ where: { childId: spouseId } });
      if (spouseChildIn.length > 0) {
        throw new BadRequestException('The other spouse already has parents.');
      }

      const checkExists = async (pid: string) => {
        const count = await tx.person.count({ where: { profileId: pid } });
        return count > 0;
      };

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
      const parentNode1 = await tx.treeNode.create({ data: { communityId, personId: person1.id } });

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
      const parentNode2 = await tx.treeNode.create({ data: { communityId, personId: person2.id } });

      const parentsCouple = await tx.couple.create({
        data: { communityId, spouse1Id: parentNode1.id, spouse2Id: parentNode2.id },
      });

      await tx.coupleChild.create({
        data: { coupleId: parentsCouple.id, childId: treeNodeId, sortOrder: 0 },
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
      const childEntry = await tx.coupleChild.findFirst({
        where: { childId: treeNodeId, couple: { communityId } },
      });
      if (!childEntry) {
        throw new BadRequestException('This person has no parents in this community.');
      }

      const siblingCount = await tx.coupleChild.count({ where: { coupleId: childEntry.coupleId } });

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

      const siblingNode = await tx.treeNode.create({ data: { communityId, personId: person.id } });

      await tx.coupleChild.create({
        data: { coupleId: childEntry.coupleId, childId: siblingNode.id, sortOrder: siblingCount },
      });

      return { siblingNodeId: siblingNode.id, personId: person.id };
    });
  }

  async editNode(
    communityId: string,
    treeNodeId: string,
    data: { name?: string; birthYear?: number | null; deathYear?: number | null; isDeceased?: boolean; gender?: string | null },
  ) {
    const node = await this.prisma.treeNode.findUnique({
      where: { id: treeNodeId },
      include: { person: true },
    });
    if (!node) throw new NotFoundException('Tree node not found');
    if (node.communityId !== communityId) {
      throw new BadRequestException('Node does not belong to this community');
    }

    // Admin can edit all fields — no ownership check
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
    if (data.deathYear !== undefined) updateData.deathYear = data.deathYear;
    if (data.isDeceased !== undefined) updateData.isDeceased = data.isDeceased;
    if (data.gender !== undefined) updateData.gender = data.gender;

    return this.prisma.person.update({ where: { id: node.personId }, data: updateData });
  }

  async removeNode(communityId: string, treeNodeId: string) {
    return this.prisma.$transaction(async (tx) => {
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
        const nodeIsSpouse1 = couple.spouse1Id === treeNodeId;
        const otherSpouseId = nodeIsSpouse1 ? couple.spouse2Id : couple.spouse1Id;
        const nodeHasParents = node.childIn.length > 0;
        const otherChildIn = await tx.coupleChild.findMany({ where: { childId: otherSpouseId } });
        const otherHasParents = otherChildIn.length > 0;

        await tx.couple.delete({ where: { id: couple.id } });

        if (nodeHasParents && !otherHasParents) {
          await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
          const otherNode = await tx.treeNode.findUnique({
            where: { id: otherSpouseId },
            include: { person: { include: { treeNodes: true, user: true } } },
          });
          await tx.treeNode.delete({ where: { id: otherSpouseId } });
          deletedNodeIds.push(otherSpouseId);
          if (otherNode && otherNode.person.treeNodes.length <= 1 && !otherNode.person.user) {
            await tx.person.delete({ where: { id: otherNode.personId } });
          }
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        } else if (!nodeHasParents && otherHasParents) {
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        } else {
          await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
          await tx.treeNode.delete({ where: { id: treeNodeId } });
          deletedNodeIds.push(treeNodeId);
        }
      } else {
        await tx.coupleChild.deleteMany({ where: { childId: treeNodeId } });
        await tx.treeNode.delete({ where: { id: treeNodeId } });
        deletedNodeIds.push(treeNodeId);
      }

      if (node.person.treeNodes.length <= 1 && !node.person.user) {
        await tx.person.delete({ where: { id: node.personId } }).catch(() => {});
      }

      return { deleted: deletedNodeIds };
    });
  }
}
