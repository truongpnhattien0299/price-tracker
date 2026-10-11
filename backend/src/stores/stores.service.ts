import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Store, StoreStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { likePattern, searchKey } from '../common/normalize.util';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { AdminQueryStoresDto, QueryStoresDto } from './dto/query-stores.dto';

// Personal + pending stores one user may hold; stops a script filling the table (S11).
export const MAX_OWN_STORES = 300;

// A proposal this close to a global store is probably the same shop (S10).
const NEARBY_M = 100;

// Equirectangular distance in metres between two coordinate column pairs.
// Plenty for "which store is nearer" at city scale, no PostGIS needed.
const distanceSql = (lat1: string, lng1: string, lat2: string, lng2: string) =>
  `(111320 * sqrt(power((${lat1})::float8 - (${lat2})::float8, 2)
     + power(((${lng1})::float8 - (${lng2})::float8) * cos(radians((${lat2})::float8)), 2)))`;

export interface StoreView {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  status: StoreStatus;
  /** Created by the caller (only then can it be edited, while not global). */
  mine: boolean;
  distanceM?: number;
}

/** The entry columns a store fills in (S6). */
export interface StoreSnapshot {
  storeName: string;
  address: string | null;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
}

export function snapshotOf(store: Store): StoreSnapshot {
  return {
    storeName: store.name,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
  };
}

function storeGlobal() {
  return new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: 'STORE_GLOBAL',
    message: 'Global stores can only be changed by an admin',
  });
}

function toView(store: Store, userId: string | null): StoreView {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    lat: store.latitude.toNumber(),
    lng: store.longitude.toNumber(),
    status: store.status,
    mine: userId !== null && store.ownerId === userId,
  };
}

// A point needs both halves (same rule as entries).
function assertCoordinatePair(dto: UpdateStoreDto) {
  if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
    throw new BadRequestException('latitude and longitude must be sent together');
  }
  if (dto.latitude === null || dto.longitude === null) {
    throw new BadRequestException('A store must have a location');
  }
}

function storeData(dto: UpdateStoreDto): Prisma.StoreUpdateInput {
  if (dto.name === null) throw new BadRequestException('name cannot be null');
  const data: Prisma.StoreUpdateInput = {};
  if (dto.name !== undefined) {
    data.name = dto.name;
    data.nameSearch = searchKey(dto.name);
  }
  if (dto.address !== undefined) data.address = dto.address || null;
  if (dto.latitude != null) data.latitude = new Prisma.Decimal(dto.latitude);
  if (dto.longitude != null) data.longitude = new Prisma.Decimal(dto.longitude);
  return data;
}

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- user side -----------------------------------------------------------

  /** Global stores + the caller's own, nearest first or most used first (S3, S9). */
  async search(userId: string, q: QueryStoresDto): Promise<StoreView[]> {
    const params: unknown[] = [userId];
    const where = [`(s.status = 'global' OR s.owner_id = $1::uuid)`];
    if (q.q?.trim()) {
      params.push(likePattern(q.q));
      where.push(`s.name_search LIKE $${params.length}`);
    }
    let distance = 'NULL::float8';
    let order = `"useCount" DESC, s.name ASC`;
    if (q.lat !== undefined && q.lng !== undefined) {
      params.push(q.lat, q.lng);
      const [lat, lng] = [`$${params.length - 1}`, `$${params.length}`];
      distance = distanceSql('s.latitude', 's.longitude', lat, lng);
      order = `"distanceM" ASC`;
    }
    params.push(q.limit);

    const rows = await this.prisma.$queryRawUnsafe<
      (Omit<StoreView, 'distanceM'> & { distanceM: number | null; useCount: number })[]
    >(
      `SELECT s.id, s.name, s.address,
              s.latitude::float8  AS lat,
              s.longitude::float8 AS lng,
              s.status::text      AS status,
              COALESCE(s.owner_id = $1::uuid, false) AS mine,
              ${distance} AS "distanceM",
              (SELECT COUNT(*)::int FROM entries e
                WHERE e.store_id = s.id AND e.user_id = $1::uuid) AS "useCount"
       FROM stores s
       WHERE ${where.join(' AND ')}
       ORDER BY ${order}
       LIMIT $${params.length}`,
      ...params,
    );
    return rows.map(({ distanceM, useCount: _useCount, ...s }) => ({
      ...s,
      ...(distanceM !== null ? { distanceM: Math.round(distanceM) } : {}),
    }));
  }

  async findOne(userId: string, id: string): Promise<StoreView> {
    return toView(await this.getVisible(userId, id), userId);
  }

  /** The caller's own stores, every status, for the "Cửa hàng" page. */
  async mine(userId: string) {
    const stores = await this.prisma.store.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { entries: true } } },
    });
    return stores.map((s) => ({
      ...toView(s, userId),
      reviewNote: s.reviewNote,
      proposedAt: s.proposedAt,
      createdAt: s.createdAt,
      entryCount: s._count.entries,
    }));
  }

  async create(userId: string, dto: CreateStoreDto): Promise<StoreView> {
    const owned = await this.prisma.store.count({
      where: { ownerId: userId, status: { not: StoreStatus.global } },
    });
    if (owned >= MAX_OWN_STORES) {
      throw new BadRequestException(`At most ${MAX_OWN_STORES} personal stores`);
    }
    const store = await this.prisma.store.create({
      data: {
        ownerId: userId,
        name: dto.name,
        nameSearch: searchKey(dto.name),
        address: dto.address || null,
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
      },
    });
    return toView(store, userId);
  }

  async update(userId: string, id: string, dto: UpdateStoreDto): Promise<StoreView> {
    await this.getEditable(userId, id);
    assertCoordinatePair(dto);
    return toView(await this.save(id, storeData(dto)), userId);
  }

  async remove(userId: string, id: string) {
    await this.getEditable(userId, id);
    // Entries keep their snapshot; the FK nulls store_id (S6).
    await this.prisma.store.delete({ where: { id } });
    return { id, deleted: true };
  }

  async propose(userId: string, id: string): Promise<StoreView> {
    const store = await this.getEditable(userId, id);
    if (store.status !== StoreStatus.personal) {
      throw new ConflictException('Store is already proposed');
    }
    const updated = await this.prisma.store.update({
      where: { id },
      data: { status: StoreStatus.pending, proposedAt: new Date(), reviewNote: null },
    });
    return toView(updated, userId);
  }

  async withdraw(userId: string, id: string): Promise<StoreView> {
    const store = await this.getEditable(userId, id);
    if (store.status !== StoreStatus.pending) {
      throw new ConflictException('Store is not proposed');
    }
    const updated = await this.prisma.store.update({
      where: { id },
      data: { status: StoreStatus.personal, proposedAt: null },
    });
    return toView(updated, userId);
  }

  /** Entry columns for a store the user may pick; 400 otherwise (S6). */
  async snapshotFor(userId: string, storeId: string): Promise<StoreSnapshot> {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, OR: [{ status: StoreStatus.global }, { ownerId: userId }] },
    });
    if (!store) throw new BadRequestException('Invalid storeId');
    return snapshotOf(store);
  }

  // Someone else's non-global store is a 404, like a foreign entry (S3).
  private async getVisible(userId: string, id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, OR: [{ status: StoreStatus.global }, { ownerId: userId }] },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  // Visible and not yet global: global stores belong to the admins (S4).
  private async getEditable(userId: string, id: string) {
    const store = await this.getVisible(userId, id);
    if (store.status === StoreStatus.global) throw storeGlobal();
    return store;
  }

  // ---- admin side ----------------------------------------------------------

  async adminList(q: AdminQueryStoresDto) {
    const where: Prisma.StoreWhereInput = {
      status: q.status,
      ...(q.q?.trim() ? { nameSearch: { contains: searchKey(q.q) } } : {}),
    };
    const [stores, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        orderBy: q.status === 'pending' ? { proposedAt: 'asc' } : { name: 'asc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          owner: { select: { displayName: true } },
          _count: { select: { entries: true } },
        },
      }),
      this.prisma.store.count({ where }),
    ]);
    const nearby = q.status === 'pending' ? await this.nearbyGlobal(stores.map((s) => s.id)) : null;

    return {
      data: stores.map((s) => ({
        ...toView(s, null),
        ownerName: s.owner?.displayName ?? null,
        proposedAt: s.proposedAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        entryCount: s._count.entries,
        ...(nearby ? { nearbyGlobal: nearby.get(s.id) ?? [] } : {}),
      })),
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };
  }

  /** Global stores within NEARBY_M of each proposal: merge candidates (S10). */
  private async nearbyGlobal(ids: string[]) {
    const byId = new Map<string, { id: string; name: string; address: string | null; distanceM: number }[]>();
    if (ids.length === 0) return byId;
    const rows = await this.prisma.$queryRawUnsafe<
      { pendingId: string; id: string; name: string; address: string | null; distanceM: number }[]
    >(
      `SELECT * FROM (
         SELECT p.id AS "pendingId", g.id, g.name, g.address,
                ${distanceSql('g.latitude', 'g.longitude', 'p.latitude', 'p.longitude')} AS "distanceM"
         FROM stores p
         JOIN stores g ON g.status = 'global'
         WHERE p.id = ANY($1::uuid[])
       ) d
       WHERE d."distanceM" <= $2
       ORDER BY d."distanceM" ASC`,
      ids,
      NEARBY_M,
    );
    for (const { pendingId, distanceM, ...g } of rows) {
      const list = byId.get(pendingId) ?? [];
      list.push({ ...g, distanceM: Math.round(distanceM) });
      byId.set(pendingId, list);
    }
    return byId;
  }

  async adminCreate(dto: CreateStoreDto): Promise<StoreView> {
    const store = await this.prisma.store.create({
      data: {
        name: dto.name,
        nameSearch: searchKey(dto.name),
        address: dto.address || null,
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
        status: StoreStatus.global,
      },
    });
    return toView(store, null);
  }

  async adminUpdate(id: string, dto: UpdateStoreDto): Promise<StoreView> {
    await this.getReviewable(id);
    assertCoordinatePair(dto);
    return toView(await this.save(id, storeData(dto)), null);
  }

  async adminRemove(id: string) {
    await this.getReviewable(id);
    await this.prisma.store.delete({ where: { id } });
    return { id, deleted: true };
  }

  async approve(id: string): Promise<StoreView> {
    await this.getPending(id);
    const store = await this.prisma.store.update({
      where: { id },
      data: { status: StoreStatus.global, reviewNote: null },
    });
    return toView(store, null);
  }

  async reject(id: string, note?: string): Promise<StoreView> {
    await this.getPending(id);
    const store = await this.prisma.store.update({
      where: { id },
      data: { status: StoreStatus.personal, proposedAt: null, reviewNote: note?.trim() || null },
    });
    return toView(store, null);
  }

  /** Moves every entry of `id` onto the global `targetId`, then deletes `id` (S10). */
  async merge(id: string, targetId: string) {
    if (id === targetId) throw new BadRequestException('Cannot merge a store into itself');
    await this.getReviewable(id);
    const target = await this.prisma.store.findFirst({
      where: { id: targetId, status: StoreStatus.global },
    });
    if (!target) throw new BadRequestException('Target must be a global store');
    const [moved] = await this.prisma.$transaction([
      this.prisma.entry.updateMany({
        where: { storeId: id },
        data: { storeId: target.id, ...snapshotOf(target) },
      }),
      this.prisma.store.delete({ where: { id } }),
    ]);
    return { id, mergedInto: target.id, movedEntries: moved.count };
  }

  // Admins act on proposals and global stores only; personal ones stay private (S3).
  private async getReviewable(id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, status: { in: [StoreStatus.pending, StoreStatus.global] } },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  private async getPending(id: string) {
    const store = await this.getReviewable(id);
    if (store.status !== StoreStatus.pending) {
      throw new ConflictException('Store is not pending review');
    }
    return store;
  }

  // Update the store and re-copy it into every entry that points at it (S7),
  // other users' entries included when the store is global.
  private async save(id: string, data: Prisma.StoreUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.update({ where: { id }, data });
      await tx.entry.updateMany({ where: { storeId: id }, data: snapshotOf(store) });
      return store;
    });
  }
}
