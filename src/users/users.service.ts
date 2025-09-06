import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(params: {
    email: string;
    name: string;
    password: string;
  }): Promise<User> {
    const email = params.email.trim().toLowerCase();
    const name = params.name.trim();
    const passwordHash = await bcrypt.hash(params.password, 10);
    try {
      return await this.prisma.user.create({
        data: { email, name, passwordHash },
      });
    } catch (e: any) {
      if (this.isUniqueViolation(e, 'User_email_key')) {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }

  async findByEmail(emailLower: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: emailLower } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  toResponse(user: User): UserResponseDto {
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

  private isUniqueViolation(err: any, indexName: string): boolean {
    // Prisma P2002 unique constraint failed
    return (
      err &&
      (err as Prisma.PrismaClientKnownRequestError).code === 'P2002' &&
      Array.isArray((err as any).meta?.target)
        ? (err as any).meta.target.includes(indexName)
        : true
    );
  }
}

