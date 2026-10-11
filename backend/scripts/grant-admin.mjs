// Grants (or with --revoke, removes) the admin role (plans/09).
//
//   node --env-file=.env.local scripts/grant-admin.mjs you@example.com
//   node --env-file=.env.local scripts/grant-admin.mjs you@example.com --revoke
//
// Takes effect immediately: AdminGuard reads the role from the DB, not the JWT.
import { PrismaClient } from '@prisma/client';

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error('usage: grant-admin.mjs <email> [--revoke]');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: flag === '--revoke' ? 'user' : 'admin' },
    select: { email: true, role: true },
  });
  console.log(`${user.email} -> ${user.role}`);
} catch (err) {
  console.error(err.code === 'P2025' ? `No user with email ${email}` : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
