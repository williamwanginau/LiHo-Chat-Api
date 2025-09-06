import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  name!: string;

  @Expose()
  avatarUrl?: string | null;

  @Expose()
  bio?: string | null;

  @Expose()
  disabled!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  lastLoginAt?: Date | null;
}

