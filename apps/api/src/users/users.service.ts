import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@family-tree/database';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      profilePhoto: user.profilePhoto,
      status: user.status,
      person: user.person
        ? {
            id: user.person.id,
            profileId: user.person.profileId,
            name: user.person.name,
            birthYear: user.person.birthYear,
            deathYear: user.person.deathYear,
            isDeceased: user.person.isDeceased,
            gender: user.person.gender,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.profilePhoto !== undefined) updateData.profilePhoto = dto.profilePhoto;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { person: true },
    });

    // Sync name to linked Person if displayName changed
    if (dto.displayName && user.person) {
      await this.prisma.person.update({
        where: { id: user.person.id },
        data: { name: dto.displayName },
      });
    }

    return updated;
  }
}
