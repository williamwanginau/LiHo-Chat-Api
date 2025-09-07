import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

describe('AuthService (unit)', () => {
  let usersMock: {
    createUser: jest.Mock;
    findByEmail: jest.Mock;
    updateLastLogin: jest.Mock;
    toResponse: jest.Mock;
  };
  let jwtMock: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersMock = {
      createUser: jest.fn(),
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
      toResponse: jest.fn(),
    };
    jwtMock = { signAsync: jest.fn() };
    // Construct using minimal typed picks to avoid any
    type UsersDeps = Pick<UsersService, 'createUser' | 'findByEmail' | 'updateLastLogin' | 'toResponse'>;
    type JwtDeps = Pick<JwtService, 'signAsync'>;
    const usersDep = usersMock as unknown as UsersDeps;
    const jwtDep = jwtMock as unknown as JwtDeps;
    service = new AuthService(
      usersDep as unknown as UsersService,
      jwtDep as unknown as JwtService,
      900,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('register: normalizes inputs and calls toResponse', async () => {
    usersMock.createUser.mockResolvedValue({ id: 'u1' });
    usersMock.toResponse.mockReturnValue({ id: 'u1', email: 'a@b.com', name: 'Alice' });

    const res = await service.register({ email: '  A@B.COM ', name: ' Alice ', password: 'password123' });

    expect(usersMock.createUser).toHaveBeenCalledWith({
      email: 'a@b.com',
      name: 'Alice',
      password: 'password123',
    });
    expect(usersMock.toResponse).toHaveBeenCalledWith({ id: 'u1' });
    expect(res).toEqual({ id: 'u1', email: 'a@b.com', name: 'Alice' });
  });

  it('validate: throws 401 when user not found', async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    await expect(service.validate('a@b.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validate: throws 401 when password mismatch', async () => {
    usersMock.findByEmail.mockResolvedValue({ id: 'u1', disabled: false, passwordHash: 'h' });
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
    await expect(service.validate('a@b.com', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validate: throws 403 when user is disabled (no bcrypt compare)', async () => {
    usersMock.findByEmail.mockResolvedValue({ id: 'u1', disabled: true, passwordHash: 'h' });
    const cmp = jest.spyOn(bcrypt, 'compare');
    await expect(service.validate('a@b.com', 'pw')).rejects.toBeInstanceOf(ForbiddenException);
    expect(cmp).not.toHaveBeenCalled();
  });

  it('validate: returns user when bcrypt.compare ok', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    const res = await service.validate('a@b.com', 'pw');
    expect(res).toBe(user);
  });

  it('login: updates lastLogin and returns signed token', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    jwtMock.signAsync.mockResolvedValue('token');

    const res = await service.login({ email: ' A@B.COM ', password: 'password123' });
    expect(usersMock.updateLastLogin).toHaveBeenCalledWith('u1');
    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      { sub: 'u1', email: 'a@b.com' },
      expect.objectContaining({ expiresIn: expect.any(Number) }),
    );
    expect(res).toEqual({ accessToken: 'token', tokenType: 'Bearer', expiresIn: expect.any(Number) });
  });

  it('login: throws 401 on invalid credentials and does not update or sign', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);
    await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersMock.updateLastLogin).not.toHaveBeenCalled();
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  it('login: disabled user -> 403 and no side effects', async () => {
    usersMock.findByEmail.mockResolvedValue({
      id: 'u1',
      disabled: true,
      passwordHash: 'h',
      email: 'a@b.com',
    });
    const cmp = jest.spyOn(bcrypt, 'compare');
    await expect(service.login({ email: 'a@b.com', password: 'pw' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(cmp).not.toHaveBeenCalled();
    expect(usersMock.updateLastLogin).not.toHaveBeenCalled();
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  it('login: passes payload and options to signAsync', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    jwtMock.signAsync.mockResolvedValue('token');

    await service.login({ email: 'a@b.com', password: 'pw' });
    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      { sub: 'u1', email: 'a@b.com' },
      expect.objectContaining({ expiresIn: expect.any(Number) }),
    );
  });

  it('validate: normalizes email before lookup', async () => {
    usersMock.findByEmail.mockResolvedValue(null);
    await expect(service.validate('  A@B.COM ', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersMock.findByEmail).toHaveBeenCalledWith('a@b.com');
  });

  it('register: bubbles up underlying errors', async () => {
    usersMock.createUser.mockRejectedValue(new Error('boom'));
    await expect(
      service.register({ email: 'a@b.com', name: 'Alice', password: 'pw' }),
    ).rejects.toThrow('boom');
  });

  it('login: normalizes email before lookup', async () => {
    const user = { id: 'u1', disabled: false, passwordHash: 'h', email: 'a@b.com' };
    usersMock.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    jwtMock.signAsync.mockResolvedValue('token');

    await service.login({ email: '  A@B.COM ', password: 'pw' });
    expect(usersMock.findByEmail).toHaveBeenCalledWith('a@b.com');
  });

  it('validate: bcrypt throws -> bubbles up', async () => {
    usersMock.findByEmail.mockResolvedValue({ id: 'u1', disabled: false, passwordHash: 'h' });
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => {
      throw new Error('hash-fail');
    });
    await expect(service.validate('a@b.com', 'pw')).rejects.toThrow('hash-fail');
  });
});
