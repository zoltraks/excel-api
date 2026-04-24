// Unit tests for server utility functions

import { describe, it, expect } from 'vitest';

// Parse duration string (e.g., "13s", "3m", "154h") to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Expected format: <number><unit> where unit is s, m, or h.`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}. Expected s, m, or h.`);
  }
}

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
