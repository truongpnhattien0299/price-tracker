import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPro } from '../common/entitlement.util';

// Shape returned to clients — never leak passwordHash; expose computed isPro.
export type PublicUser = Omit<User, 'passwordHash'> & { isPro: boolean };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  static toPublic(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...rest } = user;
    return { ...rest, isPro: isPro(user) };
  }
}
