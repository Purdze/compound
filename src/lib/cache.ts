type Entry<T> = { value: T; expiresAt: number };

/**
 * Small in-process TTL cache. Concurrent callers for the same key share one
 * in-flight promise, so a burst of requests produces a single upstream call.
 * Failures are not cached.
 */
export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private ttlMs: number) {}

  private live(key: string): Entry<T> | undefined {
    const hit = this.entries.get(key);
    return hit && hit.expiresAt > Date.now() ? hit : undefined;
  }

  peek(key: string): T | undefined {
    return this.live(key)?.value;
  }

  /** When the cached value for `key` expires (epoch ms), or undefined if nothing is cached. */
  expiresAt(key: string): number | undefined {
    return this.live(key)?.expiresAt;
  }

  /** `ttlFor` overrides the cache's lifetime for a particular loaded value. */
  async get(key: string, load: () => Promise<T>, ttlFor?: (value: T) => number | undefined): Promise<T> {
    const hit = this.peek(key);
    if (hit !== undefined) return hit;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: Date.now() + (ttlFor?.(value) ?? this.ttlMs) });
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}
