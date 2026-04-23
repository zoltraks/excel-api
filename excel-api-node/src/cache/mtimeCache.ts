// Cache with mtime invalidation

import * as fs from 'fs';

interface CacheEntry<T> {
  data: T;
  mtime: number;
  timestamp: number;
}

class MtimeCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private enabled: boolean;
  private pollIntervalMs: number;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(enabled: boolean, pollIntervalMs: number) {
    this.enabled = enabled;
    this.pollIntervalMs = pollIntervalMs;

    if (this.enabled) {
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.invalidateStale();
    }, this.pollIntervalMs);
  }

  private invalidateStale(): void {
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      // Check if file has been modified since cache entry
      if (fs.existsSync(key)) {
        const stats = fs.statSync(key);
        if (stats.mtimeMs > entry.mtime) {
          keysToDelete.push(key);
        }
      } else {
        // File no longer exists
        keysToDelete.push(key);
      }
    }
    // Delete after iteration to avoid modifying Map during traversal
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  get(filePath: string): T | null {
    if (!this.enabled) {
      return null;
    }

    const entry = this.cache.get(filePath);
    if (!entry) {
      return null;
    }

    // Check if file has been modified
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs > entry.mtime) {
        this.cache.delete(filePath);
        return null;
      }
    } else {
      this.cache.delete(filePath);
      return null;
    }

    return entry.data;
  }

  set(filePath: string, data: T): void {
    if (!this.enabled) {
      return;
    }

    const mtime = fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : Date.now();

    this.cache.set(filePath, {
      data,
      mtime,
      timestamp: Date.now(),
    });
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  clear(): void {
    this.cache.clear();
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.enabled,
    };
  }
}

let cacheInstance: MtimeCache<unknown> | null = null;

export function initCache(enabled: boolean, pollIntervalMs: number): MtimeCache<unknown> {
  if (!cacheInstance) {
    cacheInstance = new MtimeCache<unknown>(enabled, pollIntervalMs);
  }
  return cacheInstance;
}

export function getCache(): MtimeCache<unknown> {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call initCache first.');
  }
  return cacheInstance;
}
