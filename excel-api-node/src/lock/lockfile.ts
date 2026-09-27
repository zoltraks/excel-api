// File locking with lockfile protocol

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface LockfileContent {
  pid: number;
  hostname: string;
  locked_at: string;
  implementation: string;
}

export interface LockInfo {
  locked: boolean;
  locked_by?: string;
  locked_since?: string;
}

const POLL_INTERVAL_MS = 25;

class FileLock {
  private lockDir: string;
  private lockTimeoutMs: number;
  private implementation: string;

  constructor(lockDir: string, lockTimeoutMs: number, implementation: string) {
    this.lockDir = lockDir;
    this.lockTimeoutMs = lockTimeoutMs;
    this.implementation = implementation;

    // Ensure lock directory exists
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
  }

  getLockfilePath(fileId: string): string {
    return path.join(this.lockDir, `${fileId}.lock`);
  }

  async acquire(fileId: string): Promise<void> {
    const lockfilePath = this.getLockfilePath(fileId);
    const deadline = Date.now() + this.lockTimeoutMs;

    let acquired = false;
    while (!acquired) {
      const lockContent: LockfileContent = {
        pid: process.pid,
        hostname: os.hostname(),
        locked_at: new Date().toISOString(),
        implementation: this.implementation,
      };

      try {
        // Atomic exclusive create — fails with EEXIST if the lockfile exists
        fs.writeFileSync(lockfilePath, JSON.stringify(lockContent), { flag: 'wx', mode: 0o644 });
        acquired = true;
        continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }

      const existing = this.tryReadLockfile(lockfilePath);
      if (existing) {
        const lockTime = Date.parse(existing.locked_at);
        if (!Number.isNaN(lockTime) && Date.now() - lockTime >= this.lockTimeoutMs) {
          // Stale lock — break it and retry
          try {
            fs.unlinkSync(lockfilePath);
          } catch {
            // Raced with another process; retry loop handles it
          }
          continue;
        }
        // REASON: re-acquiring a lock held by this process can never unblock — fail fast
        if (existing.pid === process.pid) {
          throw new Error(`File is locked by ${existing.hostname} (PID ${existing.pid})`);
        }
      }

      if (Date.now() >= deadline) {
        const holder = existing ? `${existing.hostname} (PID ${existing.pid})` : 'unknown holder';
        throw new Error(`File is locked by ${holder}`);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  release(fileId: string): void {
    const lockfilePath = this.getLockfilePath(fileId);

    if (!fs.existsSync(lockfilePath)) {
      return;
    }

    const lockContent = this.tryReadLockfile(lockfilePath);

    // Only release if we own the lock
    if (lockContent && lockContent.pid === process.pid) {
      fs.unlinkSync(lockfilePath);
    }
  }

  private tryReadLockfile(lockfilePath: string): LockfileContent | null {
    try {
      const content = fs.readFileSync(lockfilePath, 'utf8');
      const parsed = JSON.parse(content) as Partial<LockfileContent>;
      if (typeof parsed.pid !== 'number' || typeof parsed.locked_at !== 'string') {
        return null;
      }
      return parsed as LockfileContent;
    } catch {
      return null;
    }
  }

  private isStale(lockContent: LockfileContent): boolean {
    const lockTime = Date.parse(lockContent.locked_at);
    if (Number.isNaN(lockTime)) {
      return false;
    }
    return Date.now() - lockTime >= this.lockTimeoutMs;
  }

  isLocked(fileId: string): boolean {
    const lockfilePath = this.getLockfilePath(fileId);

    if (!fs.existsSync(lockfilePath)) {
      return false;
    }

    const lockContent = this.tryReadLockfile(lockfilePath);
    if (!lockContent) {
      return false;
    }

    return !this.isStale(lockContent);
  }

  getLockInfo(fileId: string): LockInfo {
    const lockfilePath = this.getLockfilePath(fileId);

    if (!fs.existsSync(lockfilePath)) {
      return { locked: false };
    }

    const lockContent = this.tryReadLockfile(lockfilePath);
    if (!lockContent || this.isStale(lockContent)) {
      return { locked: false };
    }

    return {
      locked: true,
      locked_by: lockContent.hostname,
      locked_since: lockContent.locked_at,
    };
  }
}

let lockInstance: FileLock | null = null;

export function initFileLock(lockDir: string, lockTimeoutMs: number, implementation: string): FileLock {
  if (!lockInstance) {
    lockInstance = new FileLock(lockDir, lockTimeoutMs, implementation);
  }
  return lockInstance;
}

export function getFileLock(): FileLock {
  if (!lockInstance) {
    throw new Error('File lock not initialized. Call initFileLock first.');
  }
  return lockInstance;
}
