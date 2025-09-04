import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/healthz')
  async healthz() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch (e) {
      return { status: 'degraded', db: 'down' };
    }
  }

  // Alias for platforms or clients expecting /health
  @Get('/health')
  async health() {
    return this.healthz();
  }
}
