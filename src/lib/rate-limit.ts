/**
 * In-memory sliding-window rate limiter. Compound runs as a single long-lived
 * container, so process memory is an adequate store. If you ever run more than
 * one replica, move this to Postgres or Redis.
 */
type Verdict = { ok: boolean; retryAfter: number };

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  check(key: string, now = Date.now()): Verdict {
    return this.evaluate(key, now, true);
  }

  /** Checks the limit without recording a hit; pair with `check` on failure to count only failures. */
  peek(key: string, now = Date.now()): Verdict {
    return this.evaluate(key, now, false);
  }

  private evaluate(key: string, now: number, record: boolean): Verdict {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      const oldest = recent[0] ?? now;
      return { ok: false, retryAfter: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)) };
    }

    if (record) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.sweep(since);
    return { ok: true, retryAfter: 0 };
  }

  private sweep(since: number) {
    for (const [key, times] of this.hits) {
      if (!times.some((t) => t > since)) this.hits.delete(key);
    }
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const limiters = {
  read: new RateLimiter(60, MINUTE),
  write: new RateLimiter(20, MINUTE),
  keySave: new RateLimiter(10, HOUR),
  failedSignIn: new RateLimiter(10, 15 * MINUTE),
};
