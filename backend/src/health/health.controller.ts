import { Controller, Get } from '@nestjs/common';
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
}
