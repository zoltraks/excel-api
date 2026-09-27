// Fixed-window per-key rate limiter (single-node; see docs/ARCHITECTURE.md)

export class RateLimiter {
  private buckets = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  hit(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { windowStart: now, count: 1 });
      this.evict(now);
      return true;
    }
    bucket.count += 1;
    return bucket.count <= this.limit;
  }

  private evict(now: number): void {
    if (this.buckets.size <= 10000) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}
