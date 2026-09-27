import { obtainToken, apiGet, apiPut, bearerHeader } from '../helpers.js';

describe('File Locking', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('returns lock status for a workbook', async () => {
    const res = await apiGet('/workbooks/simple/lock-status', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      locked: boolean;
      locked_by?: string | null;
      locked_since?: string | null;
      queue_depth: number;
    };
    expect(typeof body.locked).toBe('boolean');
    expect(typeof body.queue_depth).toBe('number');
  });

  it('releases the lock after a write completes', async () => {
    const write = await apiPut(
      '/workbooks/simple/sheets/Sheet1/cells/F1',
      { value: 'lock-probe' },
      bearerHeader(token),
    );
    expect(write.status).toBe(200);

    const res = await apiGet('/workbooks/simple/lock-status', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { locked: boolean; queue_depth: number };
    expect(body.locked).toBe(false);
    expect(body.queue_depth).toBe(0);
  });

  it('returns 404 lock status for an unknown workbook', async () => {
    const res = await apiGet('/workbooks/nonexistent/lock-status', bearerHeader(token));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('WORKBOOK_NOT_FOUND');
  });
});
