// Canonical duration string parser

export function parseDuration(duration: string): number {
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
