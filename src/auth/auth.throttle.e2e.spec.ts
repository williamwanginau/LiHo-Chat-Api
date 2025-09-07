import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';

// Fast bcrypt mock
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

describe('Auth throttling e2e', () => {
  let app: INestApplication;
  const usersByEmail = new Map<string, UserRow>();
  let idCounter = 1;

  type CreateArgs = { data: { email: string; name: string; passwordHash: string } };
  type FindUniqueArgs = { where: { email?: string; id?: string } };
  const mockUser = {
    create: jest.fn<Promise<UserRow>, [CreateArgs]>(async ({ data }) => {
      const now = new Date();
      const row: UserRow = {
        id: `u${idCounter++}`,
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
        const err = new Error('Unique constraint failed') as unknown as {
          code: string;
          meta: { target: string[] };
        };
        err.code = 'P2002';
        err.meta = { target: ['User_email_key', 'email'] };
        throw err;
      }
      usersByEmail.set(row.email, row);
      return row;
    }),
    findUnique: jest.fn<Promise<UserRow | null>, [FindUniqueArgs]>(async ({ where }) => {
      const { email, id } = where;
      if (id) for (const r of usersByEmail.values()) if (r.id === id) return r;
      if (email) return usersByEmail.get(email) ?? null;
      return null;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
      for (const r of usersByEmail.values()) {
        if (r.id === where.id) {
          Object.assign(r, data);
          r.updatedAt = new Date();
          return r;
        }
      }
      return null;
    }),
  };
  const mockPrisma = { user: mockUser } as unknown as PrismaService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-strong';
    process.env.PRISMA_CONNECT_ON_BOOT = 'false';
    const { AppModule } = await import('../app.module');
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true }),
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

  it('POST /auth/login throttled at 5 requests within ~15s (6th -> 429)', async () => {
    const server = app.getHttpServer();
    // Register a user
    await request(server)
      .post('/auth/register')
      .send({ email: 't@example.com', name: 'T', password: 'password123' })
      .expect(201);

    // Make 5 successful logins
    for (let i = 0; i < 5; i++) {
      await request(server)
        .post('/auth/login')
        .send({ email: 't@example.com', password: 'password123' })
        .expect(201);
    }
    // 6th should be throttled
    await request(server)
      .post('/auth/login')
      .send({ email: 't@example.com', password: 'password123' })
      .expect(429);
  });
});
