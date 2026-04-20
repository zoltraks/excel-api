import { getApiUrl } from '../helpers.js';

describe('GET /openapi.yaml', () => {
  it('returns specification without authorization', async () => {
    const url = await getApiUrl();
    const res = await fetch(`${url}/openapi.yaml`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toMatch(/yaml/);
  });

  it('contains openapi version field', async () => {
    const url = await getApiUrl();
    const res = await fetch(`${url}/openapi.yaml`);
    const text = await res.text();
    expect(text).toContain('openapi:');
    expect(text).toContain('3.1.0');
  });
});
