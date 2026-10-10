import { HttpException, HttpStatus } from '@nestjs/common';
import { User } from '@prisma/client';

// Pro status is computed dynamically (DESIGN.md §4.2): no cron downgrade —
// a user is Pro iff proExpiresAt is set and still in the future.
export function isPro(user: Pick<User, 'proExpiresAt'>): boolean {
  return !!user.proExpiresAt && user.proExpiresAt.getTime() > Date.now();
}

// Free plan (DESIGN.md §14.1). Product policy, not deploy config — keep the
// landing copy in web/src/config/pricing.ts in sync when these change.
export const FREE_LIMITS = { entriesPerMonth: 50, historyMonths: 3 } as const;

// Calendar/report grouping zone when the client sends none (DESIGN.md §4.2).
export const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

export type PaywallCode = 'ENTRY_LIMIT' | 'HISTORY_LOCKED' | 'PRO_ONLY';

// 402 with a machine-readable `code`, so clients don't parse the message.
export function paymentRequired(code: PaywallCode, message: string) {
  return new HttpException(
    {
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      error: 'Payment Required',
      code,
      message,
    },
    HttpStatus.PAYMENT_REQUIRED,
  );
}
