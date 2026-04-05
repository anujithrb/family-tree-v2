import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, generateProfileId } from '@family-tree/database';
import { CreateCommunityDto } from './dto/create-community.dto';

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCommunity(dto: CreateCommunityDto, userId: string) {
    // Validate: at least one isSelf node
    const selfNode = dto.nodes.find((n) => n.isSelf);
    if (!selfNode) {
      throw new BadRequestException(
        'You must identify yourself in the tree (isSelf: true)',
      );
    }

    // Validate: all couple tempIds reference existing nodes
    const tempIds = new Set(dto.nodes.map((n) => n.tempId));
    for (const couple of dto.couples) {
      if (!tempIds.has(couple.spouse1) || !tempIds.has(couple.spouse2)) {
        throw new BadRequestException(
          `Couple references unknown tempId: ${couple.spouse1} or ${couple.spouse2}`,
        );
      }
    }
    for (const child of dto.children) {
      if (
        !tempIds.has(child.coupleSpouse1) ||
        !tempIds.has(child.coupleSpouse2) ||
        !tempIds.has(child.childRef)
      ) {
        throw new BadRequestException(
          `Child entry references unknown tempId`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create community
      const community = await tx.community.create({
        data: { name: dto.name },
      });

      // 2. Get the creating user's Person (or create one)
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { person: true },
      });

      // 3. Create all Persons + TreeNodes
      const tempToNodeId: Record<string, string> = {};
      const tempToPersonId: Record<string, string> = {};

      for (const node of dto.nodes) {
        let personId: string;

        if (node.isSelf && user?.person) {
          // Use existing Person for the self node
          personId = user.person.id;
        } else {
          const checkExists = async (pid: string) => {
            const count = await tx.person.count({
              where: { profileId: pid },
            });
            return count > 0;
          };
          const profileId = await generateProfileId(node.name, checkExists);

          const person = await tx.person.create({
            data: {
              profileId,
              name: node.name,
              gender: node.gender || null,
              birthYear: node.birthYear || null,
              isDeceased: node.isDeceased || false,
            },
          });
          personId = person.id;
        }

        tempToPersonId[node.tempId] = personId;

        const treeNode = await tx.treeNode.create({
          data: {
            communityId: community.id,
            personId,
          },
        });
        tempToNodeId[node.tempId] = treeNode.id;
      }

      // 4. Create Couples
      const coupleMap: Record<string, string> = {}; // "spouse1TempId:spouse2TempId" -> coupleId
      for (const couple of dto.couples) {
        const created = await tx.couple.create({
          data: {
            communityId: community.id,
            spouse1Id: tempToNodeId[couple.spouse1],
            spouse2Id: tempToNodeId[couple.spouse2],
          },
        });
        coupleMap[`${couple.spouse1}:${couple.spouse2}`] = created.id;
      }

      // 5. Create CoupleChild rows
      for (const child of dto.children) {
        const coupleKey = `${child.coupleSpouse1}:${child.coupleSpouse2}`;
        const coupleId = coupleMap[coupleKey];
        if (!coupleId) {
          throw new BadRequestException(
            `No couple found for ${child.coupleSpouse1} + ${child.coupleSpouse2}`,
          );
        }
        await tx.coupleChild.create({
          data: {
            coupleId,
            childId: tempToNodeId[child.childRef],
            sortOrder: child.sortOrder,
          },
        });
      }

      // 6. Create CommunityAdmin for the self node
      const selfNodeId = tempToNodeId[selfNode.tempId];
      await tx.communityAdmin.create({
        data: {
          communityId: community.id,
          userId,
          role: 'primary',
          treeNodeId: selfNodeId,
        },
      });

      return { id: community.id, name: community.name };
    });
  }

  async listCommunities(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            treeNodes: {
              include: {
                community: true,
              },
            },
          },
        },
      },
    });

    if (!user?.person) return [];

    return user.person.treeNodes.map((tn) => ({
      id: tn.community.id,
      name: tn.community.name,
      createdAt: tn.community.createdAt,
    }));
  }

  async getCommunity(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        admins: { include: { user: true } },
        _count: { select: { treeNodes: true, couples: true } },
      },
    });

    if (!community) throw new NotFoundException('Community not found');

    return {
      id: community.id,
      name: community.name,
      createdAt: community.createdAt,
      nodeCount: community._count.treeNodes,
      coupleCount: community._count.couples,
      admins: community.admins.map((a) => ({
        userId: a.userId,
        displayName: a.user.displayName,
        role: a.role,
      })),
    };
  }
}
