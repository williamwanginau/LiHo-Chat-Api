import { ConflictException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService (unit)', () => {
  const now = new Date('2025-09-06T12:00:00.000Z');
  let service: UsersService;
  let prismaMock: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    // Cast via unknown to satisfy constructor type without using any
    service = new UsersService(prismaMock as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('createUser: normalizes email/name and hashes password', async () => {
    const user: User = {
      id: 'u1',
      email: 'a@b.com',
      name: 'Alice',
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
      avatarUrl: null,
      bio: null,
      emailVerifiedAt: null,
      disabled: false,
      lastLoginAt: null,
    };
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as unknown as never);
    prismaMock.user.create.mockResolvedValue(user);

    const res = await service.createUser({
      email: '  A@B.com  ',
      name: '  Alice  ',
      password: 'password123',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', name: 'Alice', passwordHash: 'hashed' },
    });
    expect(res).toBe(user);
  });

  it('createUser: maps unique email to ConflictException (409)', async () => {
    // Force the private uniqueness check to return true to simulate P2002
    const hook = service as unknown as { isUniqueViolation: (e: unknown, idx: string) => boolean };
    jest.spyOn(hook, 'isUniqueViolation').mockReturnValue(true);
    prismaMock.user.create.mockRejectedValue(new Error('duplicate'));

    await expect(
      service.createUser({ email: 'a@b.com', name: 'Alice', password: 'x'.repeat(8) }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('findByEmail: returns user or null', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await service.findByEmail('a@b.com')).toBeNull();
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' } as unknown as User);
    expect(await service.findByEmail('a@b.com')).toEqual({ id: 'u1' } as unknown as User);
  });

  it('updateLastLogin: updates lastLoginAt', async () => {
    prismaMock.user.update.mockResolvedValue({});
    await service.updateLastLogin('u1');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { lastLoginAt: now },
    });
  });

  it('toResponse: masks password and exposes profile fields', () => {
    const user: User = {
      id: 'u1',
      email: 'a@b.com',
      name: 'Alice',
      passwordHash: 'hashed',
      createdAt: now,
      updatedAt: now,
      avatarUrl: 'https://x',
      bio: 'hi',
      emailVerifiedAt: null,
      disabled: false,
      lastLoginAt: now,
    };
    const dto = service.toResponse(user);
    expect(dto).toMatchObject({
      id: 'u1',
      email: 'a@b.com',
      name: 'Alice',
      avatarUrl: 'https://x',
      bio: 'hi',
      disabled: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
    // @ts-expect-error passwordHash should not exist on response
    expect((dto as any).passwordHash).toBeUndefined();
  });
});

