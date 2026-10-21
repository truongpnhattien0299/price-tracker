import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

const DEFAULT_INTERVAL_MIN = 10;

// Render's free plan spins a web service down after 15 minutes without inbound
// traffic, and the next request then waits ~30-60 s for a cold start. Pinging
// our own public URL goes through Render's proxy, so it counts as traffic.
//
// It only keeps a running instance awake; it cannot wake a sleeping one (the
// first real request does that, and the timer starts again on boot). Runs only
// where Render sets RENDER_EXTERNAL_URL, or KEEP_ALIVE_URL for another host.
// Hits /health/live, which skips the DB, so Neon can still suspend.
@Injectable()
export class KeepAliveService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(KeepAliveService.name);
  private timer?: NodeJS.Timeout;

  onApplicationBootstrap() {
    const base = process.env.KEEP_ALIVE_URL ?? process.env.RENDER_EXTERNAL_URL;
    if (!base || process.env.KEEP_ALIVE === 'false') return;

    const minutes = Number(process.env.KEEP_ALIVE_INTERVAL_MIN) || DEFAULT_INTERVAL_MIN;
    const url = `${base.replace(/\/+$/, '')}/api/v1/health/live`;
    this.timer = setInterval(() => void this.ping(url), minutes * 60_000);
    this.timer.unref();
    this.logger.log(`Pinging ${url} every ${minutes} min`);
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  private async ping(url: string) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) this.logger.warn(`Keep-alive ping got HTTP ${res.status}`);
    } catch (err) {
      this.logger.warn(`Keep-alive ping failed: ${(err as Error).message}`);
    }
  }
}
