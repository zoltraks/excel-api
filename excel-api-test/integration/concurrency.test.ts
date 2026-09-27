import { obtainToken, apiGet, apiPost, bearerHeader } from '../helpers.js';

interface RecordList {
  items: Array<{ index: number; data: Record<string, unknown> }>;
  total: number;
}

describe('Concurrency', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('serializes concurrent writes to the same workbook without loss', async () => {
    const before = (await (
      await apiGet('/workbooks/simple/sheets/Sheet1/records', bearerHeader(token))
    ).json()) as RecordList;

    const N = 8;
    const writes = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        apiPost(
          '/workbooks/simple/sheets/Sheet1/records',
          { data: { ID: 9500 + i, Name: `conc-${i}`, Value: i } },
          bearerHeader(token),
        ),
      ),
    );
    for (const res of writes) {
      expect(res.status).toBe(201);
    }

    const after = (await (
      await apiGet('/workbooks/simple/sheets/Sheet1/records?limit=1000', bearerHeader(token))
    ).json()) as RecordList;
    expect(after.total).toBe(before.total + N);
    const ids = new Set(after.items.map((r) => r.data['ID']));
    for (let i = 0; i < N; i++) {
      expect(ids.has(9500 + i)).toBe(true);
    }
  });
});
