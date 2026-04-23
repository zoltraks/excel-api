// File locking with lockfile protocol

import * as fs from 'fs';
import * as path from 'path';

export interface LockfileContent {
  pid: number;
  hostname: string;
  timestamp: string;
  implementation: string;
}

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

    // Check if lock exists and is stale
    if (fs.existsSync(lockfilePath)) {
      const lockContent = this.readLockfile(lockfilePath);
      const lockTime = new Date(lockContent.timestamp).getTime();
      const now = Date.now();

      if (now - lockTime < this.lockTimeoutMs) {
        throw new Error(`File is locked by ${lockContent.hostname} (PID ${lockContent.pid})`);
      }

      // Lock is stale, remove it
      fs.unlinkSync(lockfilePath);
    }

    // Create new lockfile
    const lockContent: LockfileContent = {
      pid: process.pid,
      hostname: require('os').hostname(),
      timestamp: new Date().toISOString(),
      implementation: this.implementation,
    };

    fs.writeFileSync(lockfilePath, JSON.stringify(lockContent), { mode: 0o644 });
  }

  release(fileId: string): void {
    const lockfilePath = this.getLockfilePath(fileId);

    if (fs.existsSync(lockfilePath)) {
      const lockContent = this.readLockfile(lockfilePath);

      // Only release if we own the lock
      if (lockContent.pid === process.pid) {
        fs.unlinkSync(lockfilePath);
      }
    }
  }

  private readLockfile(lockfilePath: string): LockfileContent {
    const content = fs.readFileSync(lockfilePath, 'utf8');
    return JSON.parse(content);
  }

  isLocked(fileId: string): boolean {
    const lockfilePath = this.getLockfilePath(fileId);

    if (!fs.existsSync(lockfilePath)) {
      return false;
    }

    const lockContent = this.readLockfile(lockfilePath);
    const lockTime = new Date(lockContent.timestamp).getTime();
    const now = Date.now();

    // Check if lock is stale
    if (now - lockTime >= this.lockTimeoutMs) {
      return false;
    }

    return true;
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
