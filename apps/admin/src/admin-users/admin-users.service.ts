import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { randomBytes } from 'crypto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: { status?: string; name?: string; email?: string; page?: number }) {
    const page = filters.page || 1;
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' };
    if (filters.name) where.displayName = { contains: filters.name, mode: 'insensitive' };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { person: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            treeNodes: { include: { community: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async invite(email: string, displayName: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, displayName, status: 'invited' },
      });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.magicLink.create({
      data: { token, userId: user.id, expiresAt },
    });

    console.log(`[ADMIN INVITE] ${email}: /api/auth/verify/${token}`);

    return { userId: user.id, magicLinkToken: token };
  }

  async update(id: string, dto: { email?: string; displayName?: string; status?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { person: { include: { treeNodes: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id } });
    // Person is preserved if they have tree nodes (FK to person is nullable in user)
  }
}
