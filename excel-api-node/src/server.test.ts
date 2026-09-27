// Unit tests for server utility functions

import { describe, it, expect } from 'vitest';
import { parseDuration } from './util/duration.js';

describe('parseDuration', () => {
  it('should parse seconds correctly', () => {
    expect(parseDuration('13s')).toBe(13000);
    expect(parseDuration('1s')).toBe(1000);
    expect(parseDuration('0s')).toBe(0);
  });

  it('should parse minutes correctly', () => {
    expect(parseDuration('3m')).toBe(180000);
    expect(parseDuration('1m')).toBe(60000);
  });

  it('should parse hours correctly', () => {
    expect(parseDuration('154h')).toBe(554400000);
    expect(parseDuration('1h')).toBe(3600000);
  });

  it('should throw error for invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow('Invalid duration format');
    expect(() => parseDuration('13')).toThrow('Invalid duration format');
    expect(() => parseDuration('s')).toThrow('Invalid duration format');
    expect(() => parseDuration('13x')).toThrow('Invalid duration format');
    expect(() => parseDuration('3d')).toThrow('Invalid duration format');
  });
});
