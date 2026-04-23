// Cache with mtime invalidation unit tests

import * as fs from 'fs';
import * as path from 'path';
import { initCache, getCache } from './mtimeCache.js';

describe('MtimeCache', () => {
  const tempDir = '/tmp/excel-api-cache-test';
  const testFile = path.join(tempDir, 'test.xlsx');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initCache', () => {
    it('should initialize cache with enabled=true', () => {
      const cache = initCache(true, 1000);
      expect(cache).toBeDefined();
      const stats = cache.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.size).toBe(0);
    });

    it('should return same instance on subsequent calls', () => {
      const cache1 = initCache(true, 1000);
      const cache2 = initCache(true, 1000);
      expect(cache1).toBe(cache2);
    });
  });

  describe('getCache', () => {
    it('should return initialized cache instance', () => {
      initCache(true, 1000);
      const cache = getCache();
      expect(cache).toBeDefined();
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data when cache is enabled', () => {
      fs.writeFileSync(testFile, 'test content');
      const cache = initCache(true, 1000);

      const testData = { key: 'value' };
      cache.set(testFile, testData);

      const retrieved = cache.get(testFile);
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent cache entries', () => {
      const cache = initCache(true, 1000);
      const retrieved = cache.get('/nonexistent/file.xlsx');
      expect(retrieved).toBeNull();
    });

    it('should invalidate cache when file is modified', async () => {
      fs.writeFileSync(testFile, 'initial content');
      const cache = initCache(true, 1000);

      const testData = { key: 'value' };
      cache.set(testFile, testData);

      // Wait a bit to ensure mtime changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify the file
      fs.writeFileSync(testFile, 'modified content');

      const retrieved = cache.get(testFile);
      expect(retrieved).toBeNull();
    });

    it('should invalidate cache when file is deleted', () => {
      fs.writeFileSync(testFile, 'test content');
      const cache = initCache(true, 1000);

      const testData = { key: 'value' };
      cache.set(testFile, testData);

      // Delete the file
      fs.unlinkSync(testFile);

      const retrieved = cache.get(testFile);
      expect(retrieved).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove specific cache entry', () => {
      fs.writeFileSync(testFile, 'test content');
      const cache = initCache(true, 1000);

      const testData = { key: 'value' };
      cache.set(testFile, testData);

      cache.invalidate(testFile);

      const retrieved = cache.get(testFile);
      expect(retrieved).toBeNull();
    });

    it('should not throw when invalidating non-existent entry', () => {
      const cache = initCache(true, 1000);
      expect(() => cache.invalidate('/nonexistent/file.xlsx')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      const file1 = path.join(tempDir, 'file1.xlsx');
      const file2 = path.join(tempDir, 'file2.xlsx');
      fs.writeFileSync(file1, 'content1');
      fs.writeFileSync(file2, 'content2');

      const cache = initCache(true, 1000);
      cache.set(file1, { data: 1 });
      cache.set(file2, { data: 2 });

      expect(cache.getStats().size).toBe(2);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      fs.writeFileSync(testFile, 'test content');
      const cache = initCache(true, 1000);

      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('enabled');
      expect(stats.size).toBe(0);
      expect(stats.enabled).toBe(true);

      cache.set(testFile, { key: 'value' });

      const updatedStats = cache.getStats();
      expect(updatedStats.size).toBe(1);
    });
  });

  describe('stop', () => {
    it('should stop polling timer', () => {
      const cache = initCache(true, 100);
      cache.stop();
      // No direct way to test timer is stopped, but should not throw
      expect(() => cache.stop()).not.toThrow();
    });

    it('should not throw when stopping already stopped cache', () => {
      const cache = initCache(true, 100);
      cache.stop();
      expect(() => cache.stop()).not.toThrow();
    });
  });
});
