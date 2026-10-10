import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_TZ,
  FREE_LIMITS,
  isPro,
  paymentRequired,
} from '../common/entitlement.util';

export interface Access {
  isPro: boolean;
  /** Start of the visible history for a Free user; null = nothing is locked. */
  historyFrom: Date | null;
}

// Anything with a purchase date can be checked against the history window.
export function isLocked(access: Access, purchasedAt: Date) {
  return access.historyFrom !== null && purchasedAt < access.historyFrom;
}

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pro status plus the Free history window (DESIGN.md §14.6) in one query.
   * The window slides by local day: midnight in `tz`, `historyMonths` back
   * from today — so a calendar day is always wholly locked or wholly visible.
   */
  async access(userId: string, tz: string = DEFAULT_TZ): Promise<Access> {
    const rows = await this.prisma.$queryRawUnsafe<
      { proExpiresAt: Date | null; historyFrom: Date }[]
    >(
      `SELECT pro_expires_at AS "proExpiresAt",
              ((date_trunc('day', now() AT TIME ZONE $2)
                 - make_interval(months => $3::int)) AT TIME ZONE $2) AS "historyFrom"
       FROM users
       WHERE id = $1::uuid`,
      userId,
      tz,
      FREE_LIMITS.historyMonths,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('User not found');
    const pro = isPro(row);
    return { isPro: pro, historyFrom: pro ? null : row.historyFrom };
  }

  /** Entries created this local month. createdAt, not purchasedAt: the user sets the latter. */
  async entriesThisMonth(userId: string, tz: string = DEFAULT_TZ) {
    const rows = await this.prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*)::int AS count
       FROM entries
       WHERE user_id = $1::uuid
         AND created_at >= (date_trunc('month', now() AT TIME ZONE $2) AT TIME ZONE $2)`,
      userId,
      tz,
    );
    return rows[0]?.count ?? 0;
  }

  /** GET /me/entitlement (DESIGN.md §5.6). */
  async summary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { proSource: true, proExpiresAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const [access, used] = await Promise.all([
      this.access(userId),
      this.entriesThisMonth(userId),
    ]);
    return {
      isPro: access.isPro,
      proSource: user.proSource,
      proExpiresAt: user.proExpiresAt,
      limits: access.isPro ? null : FREE_LIMITS,
      usage: { entriesThisMonth: used },
      historyFrom: access.historyFrom,
    };
  }

  // Soft cap: count-then-insert, so two concurrent creates may overshoot by one.
  async assertCanCreate(userId: string) {
    const { isPro: pro } = await this.access(userId);
    if (pro) return;
    if ((await this.entriesThisMonth(userId)) >= FREE_LIMITS.entriesPerMonth) {
      throw paymentRequired(
        'ENTRY_LIMIT',
        `Free plan allows ${FREE_LIMITS.entriesPerMonth} entries per month`,
      );
    }
  }

  /** Refuse to sign photo URLs for entries outside the Free window. Unattached keys pass. */
  async assertKeysVisible(userId: string, keys: string[]) {
    const access = await this.access(userId);
    if (!access.historyFrom || keys.length === 0) return;
    const rows = await this.prisma.$queryRawUnsafe<{ locked: number }[]>(
      `SELECT COUNT(*)::int AS locked
       FROM entries
       WHERE user_id = $1::uuid
         AND photo_key = ANY($2::text[])
         AND purchased_at < $3`,
      userId,
      keys,
      access.historyFrom,
    );
    if ((rows[0]?.locked ?? 0) > 0) {
      throw paymentRequired('HISTORY_LOCKED', 'Photo is outside the Free history window');
    }
  }

  /** Free reports stay inside the history window; yearly grouping is Pro-only. */
  async assertReportRange(
    userId: string,
    from: Date | undefined,
    opts: { groupBy?: string; tz?: string } = {},
  ) {
    const access = await this.access(userId, opts.tz);
    if (access.isPro) return;
    if (opts.groupBy === 'year') {
      throw paymentRequired('PRO_ONLY', 'Yearly reports require Pro');
    }
    if (!from || from < access.historyFrom!) {
      throw paymentRequired(
        'HISTORY_LOCKED',
        `Free reports cover the last ${FREE_LIMITS.historyMonths} months`,
      );
    }
  }
}
