import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';

@Injectable()
export class AdminPersonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: { name?: string; page?: number }) {
    const page = filters.page || 1;
    const where: any = {};
    if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };

    const [persons, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        include: { user: { select: { id: true, email: true, displayName: true } } },
        orderBy: { name: 'asc' },
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.person.count({ where }),
    ]);

    return { persons, total, page };
  }

  async getById(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        user: true,
        treeNodes: { include: { community: true } },
      },
    });
    if (!person) throw new NotFoundException('Person not found');
    return person;
  }

  async update(
    id: string,
    dto: {
      name?: string;
      gender?: string;
      birthYear?: number;
      deathYear?: number;
      isDeceased?: boolean;
      profileId?: string;
    },
  ) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) throw new NotFoundException('Person not found');

    return this.prisma.person.update({ where: { id }, data: dto });
  }
}
