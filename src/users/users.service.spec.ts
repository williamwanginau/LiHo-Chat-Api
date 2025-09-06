import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService (unit)', () => {
  const now = new Date('2025-09-06T12:00:00.000Z');
  let service: UsersService;
  type PrismaUserMock = { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  let prismaMock: { user: PrismaUserMock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new UsersService(prismaMock as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    const hashSpy = jest.spyOn(bcrypt, 'hash') as unknown as jest.SpyInstance<
      Promise<string>,
      [string, number]
    >;
    hashSpy.mockResolvedValue('hashed');
    prismaMock.user.create.mockResolvedValue(user);

    const res = await service.createUser({
      email: '  A@B.com  ',
      name: '  Alice  ',
      password: 'password123',
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'a@b.com',
          name: 'Alice',
          passwordHash: 'hashed',
        }),
      }),
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', expect.any(Number));
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(res).toBe(user);
  });

  it('createUser: maps unique email to ConflictException (409)', async () => {
    prismaMock.user.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['User_email_key'] },
    });

    await expect(
      service.createUser({ email: 'a@b.com', name: 'Alice', password: 'x'.repeat(8) }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('createUser: non-P2002 errors bubble up', async () => {
    prismaMock.user.create.mockRejectedValue(new Error('boom'));
    await expect(
      service.createUser({ email: 'x@y.com', name: 'X', password: 'password123' }),
    ).rejects.toThrow('boom');
  });

  it('findByEmail: returns user or null', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await service.findByEmail('a@b.com')).toBeNull();
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' } as Partial<User>);
    expect(await service.findByEmail('a@b.com')).toMatchObject({ id: 'u1' });
  });

  it('createUser: P2002 with string target maps to 409 conflict', async () => {
    prismaMock.user.create.mockRejectedValue({ code: 'P2002', meta: { target: 'email' } });
    await expect(
      service.createUser({ email: 'a@b.com', name: 'Alice', password: 'password123' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('createUser: P2002 without target does not map to email conflict', async () => {
    prismaMock.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.createUser({ email: 'a@b.com', name: 'Alice', password: 'password123' }),
    ).rejects.not.toMatchObject({ status: 409 });
  });

  it('findByEmail: normalizes query email before lookup', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await service.findByEmail('  A@B.COM ');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
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
    // Ensure response does not expose passwordHash
    const hasPasswordHash = Object.prototype.hasOwnProperty.call(dto as object, 'passwordHash');
    expect(hasPasswordHash).toBe(false);
  });
});
