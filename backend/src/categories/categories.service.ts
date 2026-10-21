import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

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

  // Only into an empty table: once seeded, admins own the list, so a renamed or
  // deleted default must not come back on the next boot.
  private async seedDefaults() {
    if ((await this.prisma.category.count()) > 0) return;
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true })),
    });
  }

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  // --- Admin ---------------------------------------------------------------

  /** Every category with how many entries (all users) use it. */
  async adminList() {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { entries: true } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, entryCount: _count.entries }));
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.assertNameFree(dto.name);
    return this.prisma.category.create({
      data: { name: dto.name, icon: dto.icon || null },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.getOrThrow(id);
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        icon: dto.icon === undefined ? undefined : dto.icon || null,
      },
    });
  }

  /** Entries keep existing with no category (FK is `SetNull`). */
  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.category.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string): Promise<Category> {
    const category = await this.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const clash = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'CATEGORY_EXISTS',
        message: 'A category with this name already exists',
      });
    }
  }
}
