import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: process is up (no external deps)
  @Get('/livez')
  @HttpCode(200)
  livez() {
    return { status: 'ok' };
  }

  // Readiness: check critical dependencies (DB)
  @Get('/readyz')
  async readyz() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', checks: { db: 'up' } };
    } catch (e) {
      throw new ServiceUnavailableException({ status: 'error', checks: { db: 'down' } });
    }
  }

  @Get('/healthz')
  async healthz() {
    return this.readyz();
  }

  // Alias for platforms or clients expecting /health
  @Get('/health')
  async health() {
    return this.readyz();
  }
}
