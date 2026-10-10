import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Entry, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  Access,
  EntitlementService,
  isLocked,
} from '../entitlement/entitlement.service';
import { paymentRequired } from '../common/entitlement.util';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { QueryEntriesDto } from './dto/query-entries.dto';

export interface CalendarCell {
  date: string;
  count: number;
  coverPhotoKey: string | null;
  blurhash: string | null;
  locked: boolean;
}

// An entry outside a Free user's history window: enough to draw a blurred
// placeholder, never the photo key or the price (DESIGN.md §14.6).
export type LockedEntry = Pick<Entry, 'id' | 'purchasedAt' | 'blurhash'> & {
  locked: true;
};

function present(entry: Entry, access: Access): (Entry & { locked: false }) | LockedEntry {
  if (isLocked(access, entry.purchasedAt)) {
    const { id, purchasedAt, blurhash } = entry;
    return { id, purchasedAt, blurhash, locked: true };
  }
  return { ...entry, locked: false };
}

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly entitlement: EntitlementService,
  ) {}

  async create(userId: string, dto: CreateEntryDto) {
    await this.entitlement.assertCanCreate(userId);
    await this.assertCategory(dto.categoryId);
    if (dto.photoKey) this.uploads.assertOwnKey(userId, dto.photoKey);
    const entry = await this.prisma.entry.create({
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
    // Backdated past a Free user's window, it comes back locked like any other read.
    return present(entry, await this.entitlement.access(userId));
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

    const [access, [data, total]] = await Promise.all([
      this.entitlement.access(userId),
      this.prisma.$transaction([
        this.prisma.entry.findMany({
          where,
          orderBy: { purchasedAt: 'desc' },
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        }),
        this.prisma.entry.count({ where }),
      ]),
    ]);

    return {
      data: data.map((e) => present(e, access)),
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const [entry, access] = await Promise.all([
      this.getOwned(userId, id),
      this.entitlement.access(userId),
    ]);
    return present(entry, access);
  }

  // Ownership check: a foreign id is a 404, never a 403.
  private async getOwned(userId: string, id: string) {
    const entry = await this.prisma.entry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }

  async update(userId: string, id: string, dto: UpdateEntryDto) {
    const [current, access] = await Promise.all([
      this.getOwned(userId, id),
      this.entitlement.access(userId),
    ]);
    // The response would hand back the price and photo key the window hides.
    if (isLocked(access, current.purchasedAt)) {
      throw paymentRequired('HISTORY_LOCKED', 'Entry is outside the Free history window');
    }
    // @IsOptional lets null through; these columns are NOT NULL, so null would
    // otherwise surface as a 500 from Decimal/Prisma. Nullable fields take null to clear.
    for (const field of ['price', 'currency', 'purchasedAt'] as const) {
      if (dto[field] === null) {
        throw new BadRequestException(`${field} cannot be null`);
      }
    }
    if (dto.categoryId !== undefined) await this.assertCategory(dto.categoryId);
    if (dto.photoKey) this.uploads.assertOwnKey(userId, dto.photoKey);

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

    const updated = await this.prisma.entry.update({ where: { id }, data });
    // Photo replaced or removed: the old object is no longer referenced.
    if (current.photoKey && dto.photoKey !== undefined && dto.photoKey !== current.photoKey) {
      await this.deletePhoto(current.photoKey);
    }
    return present(updated, access);
  }

  // Allowed on locked entries too: hiding data never stops the owner deleting it.
  async remove(userId: string, id: string) {
    const entry = await this.getOwned(userId, id);
    await this.prisma.entry.delete({ where: { id } });
    if (entry.photoKey) await this.deletePhoto(entry.photoKey);
    return { id, deleted: true };
  }

  // Best-effort storage (R2) cleanup; don't fail the request if the object is gone.
  private async deletePhoto(key: string) {
    try {
      await this.uploads.deleteObject(key);
    } catch {
      /* ignore storage delete errors */
    }
  }

  // Calendar grid for a month, grouped by the user's LOCAL day (DESIGN.md §4.2).
  // Timestamps stored UTC -> reinterpret as UTC then convert to tz before bucketing.
  // Days before a Free user's history window keep their count but trade the
  // cover key for its blurhash. The window starts at local midnight, so a day
  // is never half locked.
  async calendar(userId: string, month: string, tz: string): Promise<CalendarCell[]> {
    const monthStart = `${month}-01`;
    const access = await this.entitlement.access(userId, tz);
    const rows = await this.prisma.$queryRaw<
      (Omit<CalendarCell, 'locked'> & { firstAt: Date })[]
    >`
      SELECT
        to_char((purchased_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count,
        MIN(purchased_at) AS "firstAt",
        (array_agg(photo_key ORDER BY purchased_at ASC)
           FILTER (WHERE photo_key IS NOT NULL))[1] AS "coverPhotoKey",
        (array_agg(blurhash ORDER BY purchased_at ASC)
           FILTER (WHERE photo_key IS NOT NULL))[1] AS blurhash
      FROM entries
      WHERE user_id = ${userId}::uuid
        AND (purchased_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date >= ${monthStart}::date
        AND (purchased_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date < (${monthStart}::date + INTERVAL '1 month')
      GROUP BY date
      ORDER BY date ASC;
    `;
    return rows.map(({ firstAt, ...cell }) => {
      const locked = isLocked(access, firstAt);
      return { ...cell, coverPhotoKey: locked ? null : cell.coverPhotoKey, locked };
    });
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
