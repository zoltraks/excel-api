import { describe, it, expect } from 'vitest';
import { parseDuration } from './duration.js';

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('13s')).toBe(13000);
    expect(parseDuration('60s')).toBe(60000);
    expect(parseDuration('1s')).toBe(1000);
  });

  it('parses minutes', () => {
    expect(parseDuration('3m')).toBe(180000);
    expect(parseDuration('1m')).toBe(60000);
    expect(parseDuration('60m')).toBe(3600000);
  });

  it('parses hours', () => {
    expect(parseDuration('1h')).toBe(3600000);
    expect(parseDuration('2h')).toBe(7200000);
    expect(parseDuration('154h')).toBe(154 * 3600000);
  });

  it('throws on invalid format', () => {
    expect(() => parseDuration('1d')).toThrow('Invalid duration format');
    expect(() => parseDuration('abc')).toThrow('Invalid duration format');
    expect(() => parseDuration('60')).toThrow('Invalid duration format');
    expect(() => parseDuration('')).toThrow('Invalid duration format');
  });
});
