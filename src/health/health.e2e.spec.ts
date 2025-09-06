import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { HealthModule } from './health.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Health e2e - /livez', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Mock Prisma to avoid real DB connections in tests
    const mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue(1),
    } satisfies Pick<PrismaService, '$queryRaw'>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /livez -> 200 { status: "ok" }', async () => {
    // Use the underlying Express instance to avoid opening a real port
    const server = app.getHttpAdapter().getInstance();
    await request(server).get('/livez').expect(200).expect({ status: 'ok' });
  });
});

describe('Health e2e - /readyz (DB up)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue(1),
    } satisfies Pick<PrismaService, '$queryRaw'>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /readyz -> 200 with db: up', async () => {
    const server = app.getHttpAdapter().getInstance();
    const res = await request(server).get('/readyz').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body?.checks?.db).toBe('up');
  });
});

describe('Health e2e - /readyz (DB down)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('DB down')),
    } satisfies Pick<PrismaService, '$queryRaw'>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /readyz -> 503 with db: down', async () => {
    const server = app.getHttpAdapter().getInstance();
    const res = await request(server).get('/readyz').expect(503);
    expect(res.body?.checks?.db).toBe('down');
  });
});
