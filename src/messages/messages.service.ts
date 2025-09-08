import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decodeCursor } from '../common/cursor.util';
import { MessagesPageDto, MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoomMessages(params: {
    roomId: string;
    userId: string | null;
    limit: number;
    cursor?: string;
  }): Promise<MessagesPageDto> {
    const { roomId, userId, limit, cursor } = params;

    // 1) Room existence and visibility
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { id: true, isPrivate: true } });
    if (!room) throw new NotFoundException('NOT_FOUND');
    if (room.isPrivate) {
      if (!userId) throw new ForbiddenException('FORBIDDEN');
      const member = await this.prisma.membership.count({ where: { roomId, userId } });
      if (member === 0) throw new ForbiddenException('FORBIDDEN');
    }

    // 2) Cursor handling
    let whereCursor: Record<string, unknown> | undefined = undefined;
    if (cursor) {
      let c;
      try {
        c = decodeCursor(cursor);
      } catch {
        throw new BadRequestException('INVALID_CURSOR');
      }
      whereCursor = {
        OR: [
          { createdAt: { lt: c.createdAt } },
          { AND: [{ createdAt: { equals: c.createdAt } }, { id: { lt: c.id } }] },
        ],
      };
    }

    // 3) Query messages with author
    const rows = await this.prisma.message.findMany({
      where: { roomId, ...(whereCursor ?? {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(100, Math.max(1, limit)) + 1,
      select: {
        id: true,
        roomId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items: MessageResponseDto[] = pageRows.map((m) => ({
      id: m.id,
      messageId: m.id,
      roomId: m.roomId,
      content: m.content,
      createdAt: m.createdAt,
      editedAt: m.updatedAt > m.createdAt ? m.updatedAt : null,
      author: { id: m.user.id, name: m.user.name },
    }));

    const last = pageRows[pageRows.length - 1];
    const nextCursor = last ? Buffer.from(`${last.createdAt.toISOString()}|${last.id}`, 'utf8').toString('base64') : undefined;

    return { items, hasMore, nextCursor, serverTime: new Date() };
  }
}
