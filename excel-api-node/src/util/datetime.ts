// Local-time timestamp helpers - the API convention is
// "YYYY-MM-DD hh:mm:ss.fff" in local server time, no zone suffix.

const LOCAL_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/;

export function formatLocalTime(date: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}.${p(date.getMilliseconds(), 3)}`;
}

export function parseTimestamp(value: string): number {
  if (LOCAL_RE.test(value)) {
    return new Date(value.replace(' ', 'T')).getTime();
  }
  return Date.parse(value);
}
