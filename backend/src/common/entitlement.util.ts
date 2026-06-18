import { User } from '@prisma/client';

// Pro status is computed dynamically (DESIGN.md §4.2): no cron downgrade —
// a user is Pro iff proExpiresAt is set and still in the future.
export function isPro(user: Pick<User, 'proExpiresAt'>): boolean {
  return !!user.proExpiresAt && user.proExpiresAt.getTime() > Date.now();
}
