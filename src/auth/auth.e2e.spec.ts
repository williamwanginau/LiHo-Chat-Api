import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
// Mock bcrypt to speed up and avoid native cost
jest.mock('bcrypt', () => ({
  __esModule: true,
  hash: jest.fn(async (pw: string) => `h:${pw}`),
  compare: jest.fn(async (pw: string, h: string) => h === `h:${pw}`),
}));

type UserRow = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl: string | null;
  bio: string | null;
  emailVerifiedAt: Date | null;
  disabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

describe('Auth e2e - /auth/register /auth/login /auth/me', () => {
  let app: INestApplication;

  // Simple in-memory store to simulate Prisma.user model behavior
  const usersByEmail = new Map<string, UserRow>();
  let idCounter = 1;

  type CreateArgs = {
    data: { email: string; name: string; passwordHash: string };
    select?: Partial<Record<keyof UserRow, boolean>>;
  };
  type FindUniqueArgs = { where: { email?: string; id?: string } };
  type UpdateArgs = {
    where: { id: string };
    data: Partial<Pick<UserRow, 'lastLoginAt' | 'name' | 'avatarUrl' | 'bio' | 'disabled'>>;
  };

  const selectFields = (row: UserRow, select: Partial<Record<keyof UserRow, boolean>>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(select) as (keyof UserRow)[]) {
      if (select[key]) result[key as string] = row[key] ?? null;
    }
    return result;
  };

  const mockUser = {
    create: jest.fn<Promise<unknown>, [CreateArgs]>(async (args: CreateArgs) => {
      const { data, select } = args;
      const now = new Date();
      const id = `u${idCounter++}`;
      const row: UserRow = {
        id,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        avatarUrl: null,
        bio: null,
        emailVerifiedAt: null,
        disabled: false,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };
      if (usersByEmail.has(row.email)) {
        const err = new Error('Unique constraint failed on the fields: (`email`)') as unknown as {
          code: string;
          meta: { target: string[] };
        };
        err.code = 'P2002';
        err.meta = { target: ['User_email_key', 'email'] };
        throw err;
      }
      usersByEmail.set(row.email, row);

      if (select) return selectFields(row, select);
      return row;
    }),
    findUnique: jest.fn<Promise<UserRow | null>, [FindUniqueArgs]>(async (args: FindUniqueArgs) => {
      const { email, id } = args.where ?? {};
      if (id) {
        for (const row of usersByEmail.values()) {
          if (row.id === id) return row;
        }
      }
      if (email) return usersByEmail.get(email) ?? null;
      return null;
    }),
    update: jest.fn<Promise<UserRow | null>, [UpdateArgs]>(async (args: UpdateArgs) => {
      const id = args.where.id;
      const data = args.data ?? {};
      for (const row of usersByEmail.values()) {
        if (row.id === id) {
          Object.assign(row, data);
          row.updatedAt = new Date();
          return row;
        }
      }
      return null;
    }),
  };

  const mockPrisma = { user: mockUser } as unknown as PrismaService;

  beforeAll(async () => {
    // Keep hashing fast for tests and set a JWT secret used by both sign/verify
    process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    // bcrypt is mocked at module level

    const { AppModule } = await import('../app.module');
    class AllowAll implements CanActivate {
      canActivate(_context: ExecutionContext) {
        return true;
      }
    }
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(APP_GUARD)
      .useValue(new AllowAll())
      .compile();

    app = moduleRef.createNestApplication();
    // Align with main.ts global pipes behavior important for DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usersByEmail.clear();
    idCounter = 1;
    jest.clearAllMocks();
  });

  it('POST /auth/register -> creates user (safe fields), normalizes inputs', async () => {
    const server = app.getHttpServer();
    const res = await request(server)
      .post('/auth/register')
      .send({ email: '  A@B.COM ', name: ' Alice ', password: 'password123' })
      .expect(201);

    expect(res.body).toMatchObject({
      email: 'a@b.com',
      name: 'Alice',
      avatarUrl: null,
      bio: null,
      disabled: false,
    });
    expect(typeof res.body.id).toBe('string');
    // Should not expose passwordHash
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/register duplicate email -> 409', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/auth/register')
      .send({ email: 'dup@example.com', name: 'Dup', password: 'password123' })
      .expect(201);
    await request(server)
      .post('/auth/register')
      .send({ email: 'dup@example.com', name: 'Dup2', password: 'password123' })
      .expect(409);
  });

  it('POST /auth/login -> returns Bearer token (15m) and updates lastLoginAt; GET /auth/me returns profile', async () => {
    const server = app.getHttpServer();

    // Register first
    await request(server)
      .post('/auth/register')
      .send({ email: 'bob@example.com', name: 'Bob', password: 'password123' })
      .expect(201);

    // Login
    const login = await request(server)
      .post('/auth/login')
      .send({ email: '  BOB@EXAMPLE.COM ', password: 'password123' })
      .expect(201);

    expect(login.body).toMatchObject({ tokenType: 'Bearer' });
    expect(typeof login.body.accessToken).toBe('string');
    expect(login.body.expiresIn).toBe(15 * 60);

    // lastLoginAt should be updated in mock store
    const row = usersByEmail.get('bob@example.com');
    expect(row?.lastLoginAt).not.toBeNull();

    // me
    const me = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({ id: row?.id, email: 'bob@example.com', name: 'Bob' });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/login with wrong password -> 401', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/auth/register')
      .send({ email: 'c@d.com', name: 'C', password: 'password123' })
      .expect(201);

    await request(server)
      .post('/auth/login')
      .send({ email: 'c@d.com', password: 'wrong-password' })
      .expect(401);
  });

  it('GET /auth/me with JWT for non-existent user -> 401', async () => {
    const server = app.getHttpServer();
    // Register and login
    await request(server)
      .post('/auth/register')
      .send({ email: 'gone@example.com', name: 'Gone', password: 'password123' })
      .expect(201);
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'gone@example.com', password: 'password123' })
      .expect(201);

    // Delete the user from mock store to simulate missing user
    usersByEmail.delete('gone@example.com');

    await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
  });

  it('POST /auth/login invalid payload types -> 400', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/auth/login')
      // email as number triggers DTO transform non-string branch and validation failure
      .send({ email: 123, password: 'password123' })
      .expect(400);
  });
});
