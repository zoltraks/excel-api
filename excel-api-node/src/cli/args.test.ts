import { describe, it, expect } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('returns empty object for no args', () => {
    expect(parseArgs([])).toEqual({});
  });

  it('parses --work', () => {
    expect(parseArgs(['--work', '/some/path'])).toEqual({ workDir: '/some/path' });
  });

  it('parses --config', () => {
    expect(parseArgs(['--config', 'config/custom.yaml'])).toEqual({ configPath: 'config/custom.yaml' });
  });

  it('parses --access', () => {
    expect(parseArgs(['--access', 'config/access.yaml'])).toEqual({ accessPath: 'config/access.yaml' });
  });

  it('parses --life', () => {
    expect(parseArgs(['--life', '60s'])).toEqual({ life: '60s' });
  });

  it('parses all args together', () => {
    expect(parseArgs(['--work', '/w', '--config', 'c.yaml', '--access', 'a.yaml', '--life', '30m'])).toEqual({
      workDir: '/w',
      configPath: 'c.yaml',
      accessPath: 'a.yaml',
      life: '30m',
    });
  });

  it('ignores unknown flags', () => {
    expect(parseArgs(['--unknown', 'val', '--work', '/w'])).toEqual({ workDir: '/w' });
  });

  it('ignores flag without value at end', () => {
    expect(parseArgs(['--work'])).toEqual({});
  });
});
