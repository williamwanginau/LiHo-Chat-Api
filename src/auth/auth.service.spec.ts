import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService (unit)', () => {
  const now = new Date('2025-09-06T12:00:00.000Z');
  let usersMock: {
    createUser: jest.Mock;
    findByEmail: jest.Mock;
    updateLastLogin: jest.Mock;
    toResponse: jest.Mock;
  };
  let jwtMock: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    usersMock = {
      createUser: jest.fn(),
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
      toResponse: jest.fn(),
    };
    jwtMock = { signAsync: jest.fn() };
    // Construct without any casting to any
    service = new AuthService(
      usersMock as unknown as { createUser: any; findByEmail: any; updateLastLogin: any; toResponse: any },
      jwtMock as unknown as { signAsync: (payload: unknown) => Promise<string> } as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('register: delegates to UsersService and returns masked user', async () => {
    usersMock.createUser.mockResolvedValue({ id: 'u1' });
    usersMock.toResponse.mockReturnValue({ id: 'u1', email: 'a@b.com', name: 'Alice' });
    const res = await service.register({ email: 'A@B.COM', name: ' Alice ', password: 'password123' });
    expect(usersMock.createUser).toHaveBeenCalled();
    expect(res).toEqual({ id: 'u1', email: 'a@b.com', name: 'Alice' });
  });

  it('validate: throws 401 when user not found or password mismatch', async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    await expect(service.validate('a@b.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);

    usersMock.findByEmail.mockResolvedValue({ id: 'u1', disabled: false, passwordHash: 'h' });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as unknown as never);
    await expect(service.validate('a@b.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validate: throws 403 when user is disabled', async () => {
    usersMock.findByEmail.mockResolvedValue({ id: 'u1', disabled: true, passwordHash: 'h' });
    await expect(service.validate('a@b.com', 'pw')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validate: returns user when bcrypt.compare ok', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as unknown as never);
    const res = await service.validate('a@b.com', 'pw');
    expect(res).toBe(user);
  });

  it('login: updates lastLogin and returns signed token', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as unknown as never);
    jwtMock.signAsync.mockResolvedValue('token');

    const res = await service.login({ email: ' A@B.COM ', password: 'password123' });
    expect(usersMock.updateLastLogin).toHaveBeenCalledWith('u1');
    expect(jwtMock.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.com' });
    expect(res).toEqual({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 900 });
  });
});

