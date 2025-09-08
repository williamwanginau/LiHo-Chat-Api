import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { APP_GUARD } from '@nestjs/core';

type UserRow = { id: string; name: string };
type RoomRow = { id: string; name: string; isPrivate: boolean; createdAt: Date; updatedAt: Date };
type MembershipRow = { userId: string; roomId: string; role: string; createdAt: Date; updatedAt: Date };
type MessageRow = { id: string; roomId: string; userId: string; content: string; createdAt: Date; updatedAt: Date };

describe('Messages e2e - GET /rooms/:id/messages', () => {
  let app: INestApplication;

  const users = new Map<string, UserRow>();
  const rooms: RoomRow[] = [];
  const memberships: MembershipRow[] = [];
  const messages: MessageRow[] = [];

  const resetData = () => {
    users.clear();
    rooms.splice(0, rooms.length);
    memberships.splice(0, memberships.length);
    messages.splice(0, messages.length);

    const t0 = new Date('2025-09-06T12:00:00.000Z');
    const t1 = new Date('2025-09-06T12:00:30.000Z');
    const t2 = new Date('2025-09-06T12:01:00.000Z');

    users.set('u1', { id: 'u1', name: 'Alice' });
    users.set('u2', { id: 'u2', name: 'Bob' });

    rooms.push(
      { id: 'public', name: 'Public Room', isPrivate: false, createdAt: t0, updatedAt: t2 },
      { id: 'private', name: 'Secret', isPrivate: true, createdAt: t0, updatedAt: t1 },
    );
    memberships.push({ userId: 'u1', roomId: 'private', role: 'ADMIN', createdAt: t0, updatedAt: t0 });

    // public: m1 older, m2 newer
    messages.push(
      { id: 'm1', roomId: 'public', userId: 'u1', content: 'pub1', createdAt: t1, updatedAt: t1 },
      { id: 'm2', roomId: 'public', userId: 'u2', content: 'pub2', createdAt: t2, updatedAt: t2 },
    );
  };

  function sortDesc(a: MessageRow, b: MessageRow) {
    if (a.createdAt.getTime() !== b.createdAt.getTime()) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  }

  const mockPrisma = {
    room: {
      findUnique: jest.fn(async ({ where, select }: { where: { id: string }; select?: { id?: boolean; isPrivate?: boolean } }) => {
        const r = rooms.find((x) => x.id === where.id);
        if (!r) return null;
        if (!select) return (r as unknown) as { id?: string; isPrivate?: boolean };
        const out: Partial<{ id: string; isPrivate: boolean }> = {};
        if (select.id) out.id = r.id;
        if (select.isPrivate) out.isPrivate = r.isPrivate;
        return out as { id?: string; isPrivate?: boolean };
      }),
    },
    membership: {
      count: jest.fn(async ({ where }: { where: { roomId: string; userId: string } }) =>
        memberships.filter((m) => m.roomId === where.roomId && m.userId === where.userId).length,
      ),
    },
    message: {
      findMany: jest.fn(
        async ({
          where,
          orderBy: _orderBy,
          take,
          select: _select,
        }: {
          where: { roomId: string; OR?: unknown[] };
          orderBy?: unknown;
          take?: number;
          select?: unknown;
        }) => {
          let xs = messages.filter((m) => m.roomId === where.roomId);
          if (where.OR) {
            const [a, b] = where.OR as [
              { createdAt?: { lt?: Date } }?,
              { AND?: [{ createdAt?: { equals?: Date } }?, { id?: { lt?: string } }?] }?,
            ];
          xs = xs.filter((m) => {
            const lt = a?.createdAt?.lt;
            const eq = b?.AND?.[0]?.createdAt?.equals;
            const idlt = b?.AND?.[1]?.id?.lt;
            if (lt) return m.createdAt < lt;
            if (eq && idlt) return m.createdAt.getTime() === eq.getTime() && m.id < idlt;
            return true;
          });
          }
          xs.sort(sortDesc);
          const limit = take ?? 10;
          const sliced = xs.slice(0, limit);
          return sliced.map((m) => ({
            id: m.id,
            roomId: m.roomId,
            content: m.content,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            user: { id: users.get(m.userId)!.id, name: users.get(m.userId)!.name },
          }));
        },
      ),
    },
  } as unknown as PrismaService;

  class FakeOptionalGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<{
        headers: Record<string, unknown>;
        user?: { userId: string; email: string };
      }>();
      const auth = req.headers?.authorization as string | undefined;
      if (!auth) return true;
      const uid = auth.includes('user:u2') ? 'u2' : 'u1';
      req.user = { userId: uid, email: `${uid}@example.com` };
      return true;
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-strong';
    class AllowAll implements CanActivate {
      canActivate(_context: ExecutionContext) { return true; }
    }
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(new FakeOptionalGuard())
      // Disable global throttling for this suite to avoid cross-suite 429s
      .overrideProvider(APP_GUARD)
      .useValue(new AllowAll())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetData();
    jest.clearAllMocks();
  });

  it('匿名讀公開房：第一頁 limit=1，nextCursor 存在且 hasMore=true', async () => {
    const server = app.getHttpServer();
    const res = await request(server).get('/rooms/public/messages?limit=1').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].content).toBe('pub2');
    expect(res.body.hasMore).toBe(true);
    expect(typeof res.body.nextCursor).toBe('string');
    expect(res.body.serverTime).toBeTruthy();
  });

  it('使用 nextCursor 翻頁可取到更舊訊息，且不重複', async () => {
    const server = app.getHttpServer();
    const first = await request(server).get('/rooms/public/messages?limit=1').expect(200);
    const cur = first.body.nextCursor;
    const second = await request(server).get(`/rooms/public/messages?limit=1&cursor=${encodeURIComponent(cur)}`).expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].content).toBe('pub1');
    expect(second.body.hasMore).toBe(false);
  });

  it('私有房非成員 -> 403', async () => {
    const server = app.getHttpServer();
    await request(server).get('/rooms/private/messages').set('Authorization', 'Bearer user:u2').expect(403);
  });

  it('房間不存在 -> 404', async () => {
    const server = app.getHttpServer();
    await request(server).get('/rooms/not-exist/messages').expect(404);
  });

  it('壞游標（Base64但不合規）-> 400', async () => {
    const bad = Buffer.from('hello', 'utf8').toString('base64');
    const server = app.getHttpServer();
    await request(server).get(`/rooms/public/messages?cursor=${bad}`).expect(400);
  });

  it('limit 超界（101）-> 400', async () => {
    const server = app.getHttpServer();
    await request(server).get('/rooms/public/messages?limit=101').expect(400);
  });
});
