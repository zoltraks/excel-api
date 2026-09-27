// Rate limiter unit tests

import { describe, it, expect } from 'vitest';
import { RateLimiter } from './limiter.js';

describe('RateLimiter', () => {
  it('allows requests up to the limit', () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.hit('a')).toBe(true);
    expect(limiter.hit('a')).toBe(true);
    expect(limiter.hit('a')).toBe(true);
    expect(limiter.hit('a')).toBe(false);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.hit('a')).toBe(true);
    expect(limiter.hit('b')).toBe(true);
    expect(limiter.hit('a')).toBe(false);
  });

  it('resets after the window elapses', () => {
    const limiter = new RateLimiter(1, 5);
    expect(limiter.hit('a')).toBe(true);
    expect(limiter.hit('a')).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(limiter.hit('a')).toBe(true);
        resolve();
      }, 10);
    });
  });
});
