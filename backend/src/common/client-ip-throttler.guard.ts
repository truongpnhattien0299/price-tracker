import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

const sha256 = (s: string) => createHash('sha256').update(s).digest();

/**
 * ThrottlerGuard keyed on the real end-user IP.
 *
 * Web traffic reaches the API through the Next.js BFF, so req.ip is the BFF
 * server's address and every web user would share one 60 req/min bucket. The
 * BFF forwards the browser's IP in `X-Client-IP`, authenticated by the shared
 * `BFF_SECRET` in `X-BFF-Secret`. The header is only honoured when the secret
 * matches — otherwise anyone could pick their own bucket — and everything else
 * (mobile, curl) falls back to req.ip (see TRUST_PROXY in main.ts).
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = req.headers?.['x-client-ip'];
    if (typeof forwarded === 'string' && isIP(forwarded) && this.fromBff(req)) {
      return forwarded;
    }
    return req.ip;
  }

  private fromBff(req: Record<string, any>): boolean {
    // Read lazily: ConfigModule loads .env after this file is imported.
    const secret = process.env.BFF_SECRET;
    const given = req.headers?.['x-bff-secret'];
    if (!secret || typeof given !== 'string') return false;
    // Hash first so both sides have equal length for timingSafeEqual.
    return timingSafeEqual(sha256(given), sha256(secret));
  }
}
