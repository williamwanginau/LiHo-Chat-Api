import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponseDto } from './dto/room-response.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // Intentionally minimal in step 1; will be implemented in step 2.
  // Provide a stable surface for membership checks later without creating
  // a circular dependency with the messages module.
  async isMember(userId: string, roomId: string): Promise<boolean> {
    const cnt = await this.prisma.membership.count({ where: { userId, roomId } });
    return cnt > 0;
  }

  async listRooms(userId: string | null): Promise<RoomResponseDto[]> {
    const where = userId
      ? {
          OR: [
            { isPrivate: false },
            { memberships: { some: { userId } } },
          ],
        }
      : { isPrivate: false };

    const rows = await this.prisma.room.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 100, // soft cap; future: paginate with cursor
      select: {
        id: true,
        name: true,
        isPrivate: true,
        updatedAt: true,
        messages: {
          select: { id: true, content: true, createdAt: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      isPrivate: r.isPrivate,
      updatedAt: r.updatedAt,
      lastMessage: r.messages[0]
        ? { content: r.messages[0].content, createdAt: r.messages[0].createdAt }
        : undefined,
    }));
  }

  async createRoom(ownerId: string, dto: CreateRoomDto): Promise<RoomResponseDto> {
    const name = dto.name.trim();
    const isPrivate = !!dto.isPrivate;
    const created = await this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name,
          isPrivate,
          memberships: {
            create: { userId: ownerId, role: Role.ADMIN },
          },
        },
        select: { id: true, name: true, isPrivate: true, updatedAt: true },
      });
      return room;
    });
    return { id: created.id, name: created.name, isPrivate: created.isPrivate, updatedAt: created.updatedAt };
  }
}
