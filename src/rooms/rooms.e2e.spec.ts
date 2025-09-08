import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type UserRow = { id: string; name: string };
type RoomRow = { id: string; name: string; isPrivate: boolean; createdAt: Date; updatedAt: Date };
type MembershipRow = { userId: string; roomId: string; role: string; createdAt: Date; updatedAt: Date };
type MessageRow = {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('Rooms e2e', () => {
  let app: INestApplication;

  const users = new Map<string, UserRow>();
  const rooms: RoomRow[] = [];
  const memberships: MembershipRow[] = [];
  const messages: MessageRow[] = [];
  let idCounter = 1;

  const resetData = () => {
    users.clear();
    rooms.splice(0, rooms.length);
    memberships.splice(0, memberships.length);
    messages.splice(0, messages.length);
    idCounter = 1;

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

    messages.push(
      { id: 'm1', roomId: 'public', userId: 'u1', content: 'pub1', createdAt: t1, updatedAt: t1 },
      { id: 'm2', roomId: 'public', userId: 'u2', content: 'pub2', createdAt: t2, updatedAt: t2 },
      { id: 'm3', roomId: 'private', userId: 'u1', content: 'hello secret', createdAt: t1, updatedAt: t1 },
    );
  };

  function sortRoomsDesc(a: RoomRow, b: RoomRow) {
    if (a.updatedAt.getTime() !== b.updatedAt.getTime()) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  }

  function lastMessageOf(roomId: string): MessageRow | undefined {
    const xs = messages
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1));
    return xs[0];
  }

  const mockPrisma = {
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma as unknown),
    membership: {
      count: jest.fn(async ({ where }: { where: { userId?: string; roomId?: string } }) =>
        memberships.filter((m) => (!where.userId || m.userId === where.userId) && (!where.roomId || m.roomId === where.roomId)).length,
      ),
      create: jest.fn(async ({ data }: { data: { userId: string; roomId: string; role?: string } }) => {
        const now = new Date();
        const row: MembershipRow = { userId: data.userId, roomId: data.roomId, role: data.role ?? 'MEMBER', createdAt: now, updatedAt: now };
        memberships.push(row);
        return row;
      }),
    },
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
      create: jest.fn(
        async ({ data, select }: { data: { name: string; isPrivate?: boolean; memberships?: { create: { userId: string; role?: string } } }; select?: { id?: boolean; name?: boolean; isPrivate?: boolean; updatedAt?: boolean } }) => {
          const now = new Date();
          const id = `r${idCounter++}`;
          const row: RoomRow = { id, name: data.name, isPrivate: !!data.isPrivate, createdAt: now, updatedAt: now };
          rooms.push(row);
          if (data.memberships?.create) {
            memberships.push({ userId: data.memberships.create.userId, roomId: id, role: data.memberships.create.role ?? 'MEMBER', createdAt: now, updatedAt: now });
          }
          if (!select) return (row as unknown) as { id?: string; name?: string; isPrivate?: boolean; updatedAt?: Date };
          const out: Partial<{ id: string; name: string; isPrivate: boolean; updatedAt: Date }> = {};
          if (select.id) out.id = row.id;
          if (select.name) out.name = row.name;
          if (select.isPrivate) out.isPrivate = row.isPrivate;
          if (select.updatedAt) out.updatedAt = row.updatedAt;
          return out as { id?: string; name?: string; isPrivate?: boolean; updatedAt?: Date };
        },
      ),
      findMany: jest.fn(
        async ({ where, orderBy: _orderBy, take, select }: { where?: { isPrivate?: boolean; OR?: [{ isPrivate?: boolean }?, { memberships?: { some?: { userId?: string } } }?] }; orderBy?: unknown; take?: number; select?: { id?: boolean; name?: boolean; isPrivate?: boolean; updatedAt?: boolean; messages?: { take?: number } } }) => {
          let xs = rooms.slice();
          if (where) {
            if (where.isPrivate === false) xs = xs.filter((r) => !r.isPrivate);
            if (where.OR) {
            const conds = where.OR as Array<unknown>;
              xs = xs.filter((r) => {
                const a = conds[0] as { isPrivate?: boolean } | undefined;
                const aok = a?.isPrivate === false ? !r.isPrivate : false;
                const b = conds[1] as { memberships?: { some?: { userId?: string } } } | undefined;
                const uid = b?.memberships?.some?.userId;
                const bok = uid ? memberships.some((m) => m.roomId === r.id && m.userId === uid) : false;
                return aok || bok;
              });
            }
          }
          xs.sort(sortRoomsDesc);
          if (typeof take === 'number') xs = xs.slice(0, take);
          if (!select) return (xs as unknown) as Array<unknown>;
          return xs.map((r) => {
            const out: Partial<{ id: string; name: string; isPrivate: boolean; updatedAt: Date; messages: Array<{ id: string; content: string; createdAt: Date }> }> = {};
            if (select.id) out.id = r.id;
            if (select.name) out.name = r.name;
            if (select.isPrivate) out.isPrivate = r.isPrivate;
            if (select.updatedAt) out.updatedAt = r.updatedAt;
            if (select.messages) {
              const lm = lastMessageOf(r.id);
              out.messages = lm && select.messages.take === 1 ? [{ id: lm.id, content: lm.content, createdAt: lm.createdAt }] : [];
            }
            return out as unknown;
          });
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
      // Header example: Bearer user:u2
      const uid = auth.includes('user:u2') ? 'u2' : 'u1';
      req.user = { userId: uid, email: `${uid}@example.com` };
      return true;
    }
  }

  class FakeJwtGuard extends FakeOptionalGuard {}

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-strong';
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(new FakeOptionalGuard())
      .overrideGuard(JwtAuthGuard)
      .useValue(new FakeJwtGuard())
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

  it('GET /rooms (匿名) -> 只回公開房，含 lastMessage 與 serverTime', async () => {
    const server = app.getHttpServer();
    const res = await request(server).get('/rooms').expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    const names = (res.body.items as Array<{ name: string }>).map((x) => x.name);
    expect(names).toEqual(['Public Room']);
    const publicRoom = res.body.items[0];
    expect(publicRoom.lastMessage.content).toBe('pub2');
    expect(res.body.serverTime).toBeTruthy();
  });

  it('GET /rooms (登入 u1) -> 回公開 + 私有成員房', async () => {
    const server = app.getHttpServer();
    const res = await request(server).get('/rooms').set('Authorization', 'Bearer user:u1').expect(200);
    const names = (res.body.items as Array<{ name: string }>).map((x) => x.name).sort();
    expect(names).toEqual(['Public Room', 'Secret'].sort());
  });

  it('POST /rooms (登入) -> 建立房間並自動成員', async () => {
    const server = app.getHttpServer();
    const before = memberships.length;
    const res = await request(server)
      .post('/rooms')
      .set('Authorization', 'Bearer user:u1')
      .send({ name: 'New Room', isPrivate: true })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'New Room', isPrivate: true });
    const after = memberships.length;
    expect(after).toBeGreaterThan(before);
  });
});
