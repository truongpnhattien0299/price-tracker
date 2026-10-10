import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    // Prove DB connectivity, not just that the process is up.
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'up', timestamp: new Date().toISOString() };
  }

  // Liveness only — never touches the DB. Used by the Render health check and
  // the keep-awake ping: hitting check() instead would keep the Neon compute
  // from ever suspending and burn the free tier's compute-hour quota.
  @Get('live')
  @SkipThrottle()
  live() {
    return { status: 'ok' };
  }
}
