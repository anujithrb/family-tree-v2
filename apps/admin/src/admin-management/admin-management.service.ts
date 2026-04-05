import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class AdminManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, otpEnabled: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(email: string, name: string, password: string) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcryptjs.hash(password, 12);
    return this.prisma.adminUser.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, otpEnabled: true, createdAt: true },
    });
  }

  async update(id: string, dto: { email?: string; name?: string; password?: string }) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    const data: any = {};
    if (dto.email) data.email = dto.email;
    if (dto.name) data.name = dto.name;
    if (dto.password) data.passwordHash = await bcryptjs.hash(dto.password, 12);

    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, otpEnabled: true, createdAt: true },
    });
  }

  async remove(id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    // AdminSession records cascade delete via Prisma schema
    await this.prisma.adminUser.delete({ where: { id } });
  }
}
