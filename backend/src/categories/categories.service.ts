import { Injectable, OnModuleInit } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Default categories seeded once on boot (DESIGN.md §4.2). Shared across users.
const DEFAULT_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Rau củ', icon: '🥬' },
  { name: 'Thịt cá', icon: '🍖' },
  { name: 'Trái cây', icon: '🍎' },
  { name: 'Đồ khô', icon: '🌾' },
  { name: 'Đồ uống', icon: '🥤' },
  { name: 'Gia vị', icon: '🧂' },
  { name: 'Đồ ăn vặt', icon: '🍪' },
  { name: 'Khác', icon: '📦' },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  // Idempotent: only inserts defaults that don't already exist.
  private async seedDefaults() {
    const existing = await this.prisma.category.findMany({
      where: { isDefault: true },
      select: { name: true },
    });
    const have = new Set(existing.map((c) => c.name));
    const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.name));
    if (missing.length > 0) {
      await this.prisma.category.createMany({
        data: missing.map((c) => ({ ...c, isDefault: true })),
      });
    }
  }

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }
}
