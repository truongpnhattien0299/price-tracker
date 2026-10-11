import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../strategies/jwt.strategy';

// Runs after JwtAuthGuard. The role is read from the DB on every request rather
// than carried in the JWT, so granting or revoking admin takes effect at once.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    const row = user
      ? await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { role: true },
        })
      : null;
    if (row?.role !== Role.admin) throw new ForbiddenException('Admin only');
    return true;
  }
}
