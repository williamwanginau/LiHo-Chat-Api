import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AUTH_ACCESS_EXPIRES_SEC } from './auth.tokens';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const expiresSec = Number(config.get('JWT_EXPIRES_SEC') ?? 900);
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiresSec },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: AUTH_ACCESS_EXPIRES_SEC,
      useFactory: (config: ConfigService) => Number(config.get('JWT_EXPIRES_SEC') ?? 900),
      inject: [ConfigService],
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
