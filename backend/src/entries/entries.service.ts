import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { QueryEntriesDto } from './dto/query-entries.dto';

export interface CalendarCell {
  date: string;
  count: number;
  coverPhotoKey: string | null;
}

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEntryDto) {
    await this.assertCategory(dto.categoryId);
    return this.prisma.entry.create({
      data: {
        userId,
        categoryId: dto.categoryId ?? null,
        productName: dto.productName ?? null,
        price: new Prisma.Decimal(dto.price),
        currency: dto.currency ?? 'VND',
        unit: dto.unit ?? null,
        photoKey: dto.photoKey ?? null,
        blurhash: dto.blurhash ?? null,
        latitude: dto.latitude != null ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude != null ? new Prisma.Decimal(dto.longitude) : null,
        address: dto.address ?? null,
        storeName: dto.storeName ?? null,
        note: dto.note ?? null,
        purchasedAt: dto.purchasedAt ?? new Date(),
      },
    });
  }

  async findAll(userId: string, q: QueryEntriesDto) {
    const where: Prisma.EntryWhereInput = {
      userId,
      ...(q.category ? { categoryId: q.category } : {}),
      ...(q.store
        ? { storeName: { contains: q.store, mode: 'insensitive' } }
        : {}),
      ...(q.search
        ? { productName: { contains: q.search, mode: 'insensitive' } }
        : {}),
      ...(q.from || q.to
        ? {
            purchasedAt: {
              ...(q.from ? { gte: q.from } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.entry.findMany({
        where,
        orderBy: { purchasedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.entry.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const entry = await this.prisma.entry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }

  async update(userId: string, id: string, dto: UpdateEntryDto) {
    await this.findOne(userId, id); // ownership check (404 if not owner)
    if (dto.categoryId !== undefined) await this.assertCategory(dto.categoryId);

    const data: Prisma.EntryUpdateInput = {};
    if (dto.productName !== undefined) data.productName = dto.productName;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.photoKey !== undefined) data.photoKey = dto.photoKey;
    if (dto.blurhash !== undefined) data.blurhash = dto.blurhash;
    if (dto.latitude !== undefined)
      data.latitude = dto.latitude != null ? new Prisma.Decimal(dto.latitude) : null;
    if (dto.longitude !== undefined)
      data.longitude = dto.longitude != null ? new Prisma.Decimal(dto.longitude) : null;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.storeName !== undefined) data.storeName = dto.storeName;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.purchasedAt !== undefined) data.purchasedAt = dto.purchasedAt;
    if (dto.categoryId !== undefined)
      data.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };

    return this.prisma.entry.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // ownership check
    // TODO Phase 3: also delete the S3 object at photoKey.
    await this.prisma.entry.delete({ where: { id } });
    return { id, deleted: true };
  }

  // Calendar grid for a month, grouped by the user's LOCAL day (DESIGN.md §4.2).
  // Timestamps stored UTC -> reinterpret as UTC then convert to tz before bucketing.
  async calendar(userId: string, month: string, tz: string): Promise<CalendarCell[]> {
    const monthStart = `${month}-01`;
    const rows = await this.prisma.$queryRaw<CalendarCell[]>`
      SELECT
        to_char((purchased_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count,
        (array_agg(photo_key ORDER BY purchased_at ASC)
           FILTER (WHERE photo_key IS NOT NULL))[1] AS "coverPhotoKey"
      FROM entries
      WHERE user_id = ${userId}::uuid
        AND (purchased_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date >= ${monthStart}::date
        AND (purchased_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date < (${monthStart}::date + INTERVAL '1 month')
      GROUP BY date
      ORDER BY date ASC;
    `;
    return rows;
  }

  private async assertCategory(categoryId?: string | null) {
    if (!categoryId) return;
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('Invalid categoryId');
  }
}
