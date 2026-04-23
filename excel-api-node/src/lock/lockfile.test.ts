// File locking with lockfile protocol unit tests

import * as fs from 'fs';
import * as path from 'path';
import { initFileLock, getFileLock } from './lockfile.js';

describe('FileLock', () => {
  const tempDir = '/tmp/excel-api-lock-test';
  const lockDir = path.join(tempDir, 'locks');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initFileLock', () => {
    it('should initialize file lock with given parameters', () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      expect(lock).toBeDefined();
      expect(fs.existsSync(lockDir)).toBe(true);
    });

    it('should return same instance on subsequent calls', () => {
      const lock1 = initFileLock(lockDir, 5000, 'excel-api-node');
      const lock2 = initFileLock(lockDir, 5000, 'excel-api-node');
      expect(lock1).toBe(lock2);
    });
  });

  describe('getFileLock', () => {
    it('should return initialized lock instance', () => {
      initFileLock(lockDir, 5000, 'excel-api-node');
      const lock = getFileLock();
      expect(lock).toBeDefined();
    });
  });

  describe('acquire', () => {
    it('should acquire lock for a file', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');
      
      const lockfilePath = path.join(lockDir, 'test-file.xlsx.lock');
      expect(fs.existsSync(lockfilePath)).toBe(true);
    });

    it('should throw error if file is already locked', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');

      await expect(lock.acquire('test-file.xlsx')).rejects.toThrow('File is locked');
    });

    it('should create lockfile with correct content', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');

      const lockfilePath = path.join(lockDir, 'test-file.xlsx.lock');
      const content = fs.readFileSync(lockfilePath, 'utf8');
      const lockContent = JSON.parse(content);

      expect(lockContent).toHaveProperty('pid');
      expect(lockContent).toHaveProperty('hostname');
      expect(lockContent).toHaveProperty('timestamp');
      expect(lockContent).toHaveProperty('implementation');
      expect(lockContent.implementation).toBe('excel-api-node');
      expect(lockContent.pid).toBe(process.pid);
    });
  });

  describe('release', () => {
    it('should release lock for a file', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');

      lock.release('test-file.xlsx');

      const lockfilePath = path.join(lockDir, 'test-file.xlsx.lock');
      expect(fs.existsSync(lockfilePath)).toBe(false);
    });

    it('should not throw when releasing non-existent lock', () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      expect(() => lock.release('nonexistent-file.xlsx')).not.toThrow();
    });

    it('should not release lock owned by another process', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');

      // Manually modify lockfile to simulate different PID
      const lockfilePath = path.join(lockDir, 'test-file.xlsx.lock');
      const content = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
      content.pid = 99999; // Different PID
      fs.writeFileSync(lockfilePath, JSON.stringify(content));

      lock.release('test-file.xlsx');

      // Lockfile should still exist
      expect(fs.existsSync(lockfilePath)).toBe(true);
    });
  });

  describe('isLocked', () => {
    it('should return false for file without lock', () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      expect(lock.isLocked('test-file.xlsx')).toBe(false);
    });

    it('should return true for locked file', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');
      expect(lock.isLocked('test-file.xlsx')).toBe(true);
    });

    it('should return true for fresh lock', async () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      await lock.acquire('test-file.xlsx');
      
      // Lock should still be fresh
      expect(lock.isLocked('test-file.xlsx')).toBe(true);
    });
  });

  describe('getLockfilePath', () => {
    it('should return correct lockfile path', () => {
      const lock = initFileLock(lockDir, 5000, 'excel-api-node');
      const lockfilePath = lock['getLockfilePath']('test-file.xlsx');
      
      expect(lockfilePath).toBe(path.join(lockDir, 'test-file.xlsx.lock'));
    });
  });
});
