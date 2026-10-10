import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementService } from '../entitlement/entitlement.service';
import { ReportQueryDto, TimeSeriesQueryDto } from './dto/report-query.dto';

// All queries push aggregation to Postgres (GROUP BY / SUM) — DESIGN.md §8.
// $queryRawUnsafe used only where we build dynamic WHERE clauses;
// userId always bound as a typed $N param; date filters passed as ISO strings.
// Free users only get ranges inside their history window (plans/07 E8).
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlement: EntitlementService,
  ) {}

  async summary(userId: string, q: ReportQueryDto) {
    await this.entitlement.assertReportRange(userId, q.from);
    const { where, params } = buildDateWhere(userId, q);
    const rows = await this.prisma.$queryRawUnsafe<
      { total: string; count: string }[]
    >(
      `SELECT COALESCE(SUM(price), 0)::text AS total,
              COUNT(*)::text                AS count
       FROM entries
       WHERE ${where}`,
      ...params,
    );
    const { total, count } = rows[0] ?? { total: '0', count: '0' };
    const entryCount = Number(count);
    const totalSpent = Number(total);
    return {
      totalSpent,
      entryCount,
      avgPerEntry: entryCount > 0 ? totalSpent / entryCount : 0,
      currency: 'VND',
    };
  }

  async byCategory(userId: string, q: ReportQueryDto) {
    await this.entitlement.assertReportRange(userId, q.from);
    const { where, params } = buildDateWhere(userId, q, 'e');
    const rows = await this.prisma.$queryRawUnsafe<
      { categoryName: string; total: string; count: string }[]
    >(
      `SELECT COALESCE(c.name, 'Không có danh mục') AS "categoryName",
              SUM(e.price)::text                     AS total,
              COUNT(*)::text                         AS count
       FROM entries e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE ${where}
       GROUP BY c.name
       ORDER BY SUM(e.price) DESC`,
      ...params,
    );
    const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);
    return rows.map((r) => ({
      categoryName: r.categoryName,
      total: Number(r.total),
      count: Number(r.count),
      percentage:
        grandTotal > 0
          ? Math.round((Number(r.total) / grandTotal) * 10000) / 100
          : 0,
    }));
  }

  async timeSeries(userId: string, q: TimeSeriesQueryDto) {
    await this.entitlement.assertReportRange(userId, q.from, {
      groupBy: q.groupBy,
      tz: q.tz,
    });
    const fmt =
      q.groupBy === 'day'
        ? 'YYYY-MM-DD'
        : q.groupBy === 'month'
          ? 'YYYY-MM'
          : 'YYYY';
    const { where, params } = buildDateWhere(userId, q);
    // $N placeholder for tz — params already has userId (and optionally dates),
    // so tz is the next index.
    const tzIdx = params.length + 1;
    const fmtIdx = tzIdx + 1;
    const rows = await this.prisma.$queryRawUnsafe<
      { period: string; total: string }[]
    >(
      `SELECT to_char(
                (purchased_at AT TIME ZONE 'UTC' AT TIME ZONE $${tzIdx}),
                $${fmtIdx}
              ) AS period,
              SUM(price)::text AS total
       FROM entries
       WHERE ${where}
       GROUP BY period
       ORDER BY period ASC`,
      ...params,
      q.tz,
      fmt,
    );
    return rows.map((r) => ({ period: r.period, total: Number(r.total) }));
  }

  async topStores(userId: string, q: ReportQueryDto) {
    await this.entitlement.assertReportRange(userId, q.from);
    const { where, params } = buildDateWhere(userId, q);
    const rows = await this.prisma.$queryRawUnsafe<
      { storeName: string; total: string; count: string }[]
    >(
      `SELECT COALESCE(store_name, 'Không rõ') AS "storeName",
              SUM(price)::text                  AS total,
              COUNT(*)::text                    AS count
       FROM entries
       WHERE ${where}
         AND store_name IS NOT NULL
       GROUP BY store_name
       ORDER BY SUM(price) DESC
       LIMIT 10`,
      ...params,
    );
    return rows.map((r) => ({
      storeName: r.storeName,
      total: Number(r.total),
      count: Number(r.count),
    }));
  }
}

// Builds a parameterized WHERE clause scoped to userId + optional date range.
// tableAlias lets callers prefix columns when joining (e.g. 'e' → e.user_id).
function buildDateWhere(
  userId: string,
  q: ReportQueryDto,
  tableAlias?: string,
) {
  const p = tableAlias ? `${tableAlias}.` : '';
  const params: (string | Date)[] = [userId];
  let where = `${p}user_id = $1::uuid`;

  if (q.from) {
    params.push(q.from);
    where += ` AND ${p}purchased_at >= $${params.length}`;
  }
  if (q.to) {
    params.push(q.to);
    where += ` AND ${p}purchased_at <= $${params.length}`;
  }
  return { where, params };
}
