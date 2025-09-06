import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async register(data: { email: string; name: string; password: string }) {
    const user = await this.users.createUser(data);
    return this.users.toResponse(user);
  }

  async validate(emailLower: string, password: string) {
    const user = await this.users.findByEmail(emailLower);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.disabled) throw new ForbiddenException('Account disabled');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const user = await this.validate(email, data.password);
    await this.users.updateLastLogin(user.id);
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, tokenType: 'Bearer', expiresIn: 15 * 60 };
  }
}

