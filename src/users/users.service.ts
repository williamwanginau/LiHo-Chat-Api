import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';

// Safe projection of User without passwordHash
export type SafeUser = Pick<
  User,
  'id' | 'email' | 'name' | 'avatarUrl' | 'bio' | 'disabled' | 'createdAt' | 'updatedAt' | 'lastLoginAt'
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(params: {
    email: string;
    name: string;
    password: string;
  }): Promise<SafeUser> {
    const email = params.email.trim().toLowerCase();
    const name = params.name.trim();
    // Configurable bcrypt cost; default to 10 if unset
    const parsed = Number(process.env.BCRYPT_ROUNDS);
    const rounds = Number.isFinite(parsed) && parsed >= 4 && parsed <= 15 ? parsed : 10;
    const passwordHash = await bcrypt.hash(params.password, rounds);
    try {
      const created = await this.prisma.user.create({
        data: { email, name, passwordHash },
        // Return only safe fields (avoid carrying passwordHash)
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          bio: true,
          disabled: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });
      return created;
    } catch (e: unknown) {
      if (this.isUniqueViolation(e, ['User_email_key', 'email'])) {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async findByEmail(emailLower: string): Promise<User | null> {
    const email = emailLower.trim().toLowerCase();
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  toResponse(user: SafeUser | User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      disabled: user.disabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt ?? null,
    };
  }

  private isUniqueViolation(err: unknown, targetNames: string | string[]): boolean {
    // Duck-typing Prisma P2002 to avoid depending on internal error classes
    const names = Array.isArray(targetNames) ? targetNames : [targetNames];
    const k = err as { code?: string; meta?: { target?: string | string[] } };
    if (k?.code !== 'P2002') return false;
    const metaTarget = k.meta?.target;
    // If target is missing, do not assume it is the intended field; let caller rethrow
    if (!metaTarget) return false;

    const match = (t: string) => {
      const tl = t.toLowerCase();
      return names.some((n) => tl.includes(n.toLowerCase()));
    };

    if (Array.isArray(metaTarget)) return metaTarget.some(match);
    if (typeof metaTarget === 'string') return match(metaTarget);
    return false;
  }
}
