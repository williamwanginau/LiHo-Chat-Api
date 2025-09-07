import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { Inject } from '@nestjs/common';
import { AUTH_ACCESS_EXPIRES_SEC } from './auth.tokens';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @Inject(AUTH_ACCESS_EXPIRES_SEC) private readonly expiresSec: number,
  ) {}

  async register(data: { email: string; name: string; password: string }): Promise<UserResponseDto> {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const user = await this.users.createUser({ email, name, password: data.password });
    return this.users.toResponse(user);
  }

  async validate(emailLower: string, password: string) {
    const user = await this.users.findByEmail(emailLower.trim().toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.disabled) throw new ForbiddenException('Account disabled');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(data: { email: string; password: string }): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
  }> {
    const email = data.email.trim().toLowerCase();
    const user = await this.validate(email, data.password);

    // Sign token with an explicit expiration that matches the response
    const expiresInSec = this.expiresSec;
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: expiresInSec });

    // Update last login after successful token issuance; best-effort
    try {
      await this.users.updateLastLogin(user.id);
    } catch (_e) {
      // no-op: do not fail login if bookkeeping update fails
    }

    return { accessToken, tokenType: 'Bearer', expiresIn: expiresInSec };
  }
}
