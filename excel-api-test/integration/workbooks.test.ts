import { obtainToken, apiGet, bearerHeader } from '../helpers.js';

describe('Workbooks', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('lists registered workbooks', async () => {
    const res = await apiGet('/workbooks', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown };
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('returns 404 for unknown workbook', async () => {
    const res = await apiGet('/workbooks/nonexistent', bearerHeader(token));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('WORKBOOK_NOT_FOUND');
  });
});
