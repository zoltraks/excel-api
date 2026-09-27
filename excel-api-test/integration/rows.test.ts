import { obtainToken, apiGet, apiPost, apiPut, apiDelete, bearerHeader } from '../helpers.js';

interface RecordList {
  items: Array<{ index: number; data: Record<string, unknown> }>;
  total: number;
  offset: number;
  limit: number;
  format: string;
}

describe('Records', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('lists records with pagination', async () => {
    const res = await apiGet('/workbooks/simple/sheets/Sheet1/records', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as RecordList;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(10);
    expect(body.format).toBe('native');
    expect(body.items[0]).toHaveProperty('index');
    expect(body.items[0]).toHaveProperty('data');

    const page1 = (await (
      await apiGet('/workbooks/simple/sheets/Sheet1/records?offset=0&limit=3', bearerHeader(token))
    ).json()) as RecordList;
    const page2 = (await (
      await apiGet('/workbooks/simple/sheets/Sheet1/records?offset=3&limit=3', bearerHeader(token))
    ).json()) as RecordList;
    expect(page1.items).toHaveLength(3);
    expect(page2.items).toHaveLength(3);
    expect(page1.items.map((r) => r.index)).not.toEqual(page2.items.map((r) => r.index));
  });

  it('creates, updates, and deletes a record', async () => {
    const create = await apiPost(
      '/workbooks/styled/sheets/Sheet1/records',
      { data: { ID: 9001, Name: 'itest-create', Value: 1 } },
      bearerHeader(token),
    );
    expect(create.status).toBe(201);
    const created = (await create.json()) as { index: number };
    expect(typeof created.index).toBe('number');

    const update = await apiPut(
      `/workbooks/styled/sheets/Sheet1/records/${created.index}`,
      { data: { Name: 'itest-updated' } },
      bearerHeader(token),
    );
    expect(update.status).toBe(200);

    const list = (await (
      await apiGet(`/workbooks/styled/sheets/Sheet1/records`, bearerHeader(token))
    ).json()) as RecordList;
    const row = list.items.find((r) => r.index === created.index);
    expect(row).toBeDefined();
    expect(row?.data['Name']).toBe('itest-updated');
    expect(row?.data['ID']).toBe(9001);

    const del = await apiDelete(
      `/workbooks/styled/sheets/Sheet1/records/${created.index}`,
      bearerHeader(token),
    );
    expect([200, 204]).toContain(del.status);
    const after = (await (
      await apiGet(`/workbooks/styled/sheets/Sheet1/records`, bearerHeader(token))
    ).json()) as RecordList;
    expect(after.items.find((r) => r.data['ID'] === 9001)).toBeUndefined();
  });

  it('preserves displaced rows when inserting with after_row', async () => {
    const before = (await (
      await apiGet('/workbooks/formulas/sheets/Sheet1/records', bearerHeader(token))
    ).json()) as RecordList;
    const originalRows = before.items.map((r) => r.data);

    const insert = await apiPost(
      '/workbooks/formulas/sheets/Sheet1/records',
      { data: { A: 9002, B: 'itest-insert' }, after_row: 1 },
      bearerHeader(token),
    );
    expect(insert.status).toBe(201);
    const inserted = (await insert.json()) as { index: number };
    // after_row 1 = insert after record index 1 → new record is index 2
    expect(inserted.index).toBe(2);

    const after = (await (
      await apiGet('/workbooks/formulas/sheets/Sheet1/records', bearerHeader(token))
    ).json()) as RecordList;
    expect(after.total).toBe(before.total + 1);
    expect(after.items[0].data).toEqual(originalRows[0]);
    expect(after.items[1].data['B']).toBe('itest-insert');
    // Row displaced from index 2 must still exist at index 3 — not overwritten
    expect(after.items[2].data).toEqual(originalRows[1]);
  });
});
