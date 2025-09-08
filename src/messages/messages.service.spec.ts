import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MessagesService (unit)', () => {
  let svc: MessagesService;
  const now = new Date('2025-09-06T12:00:00.000Z');

  const rooms = new Map<string, { id: string; isPrivate: boolean }>();
  const memberships = new Set<string>();
  const messages: Array<{ id: string; roomId: string; userId: string; content: string; createdAt: Date; updatedAt: Date }> = [];

  const prismaMock = {
    room: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const r = rooms.get(where.id);
        if (!r) return null;
        if (!select) return r;
        const out: any = {};
        if (select.id) out.id = r.id;
        if (select.isPrivate) out.isPrivate = r.isPrivate;
        return out;
      }),
    },
    membership: {
      count: jest.fn(async ({ where }: any) => (memberships.has(`${where.userId}:${where.roomId}`) ? 1 : 0)),
    },
    message: {
      findMany: jest.fn(async ({ where, orderBy, take, select }: any) => {
        let xs = messages.filter((m) => m.roomId === where.roomId);
        if (where.OR) {
          const [a, b] = where.OR;
          const lt = a?.createdAt?.lt as Date | undefined;
          const eq = b?.AND?.[0]?.createdAt?.equals as Date | undefined;
          const idlt = b?.AND?.[1]?.id?.lt as string | undefined;
          xs = xs.filter((m) => (lt ? m.createdAt < lt : eq && idlt ? m.createdAt.getTime() === eq.getTime() && m.id < idlt : true));
        }
        xs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1));
        const out = xs.slice(0, take).map((m) => ({
          id: m.id,
          roomId: m.roomId,
          content: m.content,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          user: { id: m.userId, name: `U-${m.userId}` },
        }));
        return out;
      }),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    rooms.clear();
    memberships.clear();
    messages.splice(0, messages.length);
    rooms.set('public', { id: 'public', isPrivate: false });
    rooms.set('priv', { id: 'priv', isPrivate: true });
    memberships.add('u1:priv');
    messages.push(
      { id: 'm1', roomId: 'public', userId: 'u1', content: 'a', createdAt: new Date(now.getTime() - 1000), updatedAt: new Date(now.getTime() - 1000) },
      { id: 'm2', roomId: 'public', userId: 'u2', content: 'b', createdAt: now, updatedAt: now },
    );
    svc = new MessagesService(prismaMock);
  });

  it('404 when room does not exist', async () => {
    await expect(svc.listRoomMessages({ roomId: 'no', userId: null, limit: 10 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 when private and not a member', async () => {
    await expect(svc.listRoomMessages({ roomId: 'priv', userId: 'u2', limit: 10 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('400 when cursor is invalid', async () => {
    await expect(svc.listRoomMessages({ roomId: 'public', userId: null, limit: 10, cursor: '???' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps author, editedAt, messageId alias, and hasMore', async () => {
    const out = await svc.listRoomMessages({ roomId: 'public', userId: null, limit: 1 });
    expect(out.items[0]).toMatchObject({
      id: 'm2',
      messageId: 'm2',
      roomId: 'public',
      author: { id: 'u2', name: 'U-u2' },
      editedAt: null,
    });
    expect(out.hasMore).toBe(true);
    expect(typeof out.nextCursor).toBe('string');
    expect(out.serverTime instanceof Date || typeof out.serverTime === 'string').toBe(true);
  });
});

