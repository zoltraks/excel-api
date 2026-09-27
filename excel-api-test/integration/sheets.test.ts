import { obtainToken, apiGet, bearerHeader } from '../helpers.js';

describe('Sheets', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('returns sheet metadata', async () => {
    const res = await apiGet('/workbooks/simple/sheets/Sheet1', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      name: string;
      row_count: number;
      column_count: number;
      header_row?: number;
      first_data_row?: number;
    };
    expect(body.name).toBe('Sheet1');
    expect(body.row_count).toBeGreaterThanOrEqual(11);
    expect(body.column_count).toBeGreaterThanOrEqual(3);
  });

  it('returns 404 for an unknown sheet', async () => {
    const res = await apiGet('/workbooks/simple/sheets/NoSuchSheet', bearerHeader(token));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('SHEET_NOT_FOUND');
  });

  it('returns column definitions', async () => {
    const res = await apiGet('/workbooks/simple/sheets/Sheet1/columns', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      source: string;
      columns: Array<{ index: number; letter: string; id: string }>;
    };
    expect(body.source).toBe('header_row');
    expect(body.columns.length).toBeGreaterThanOrEqual(3);
    expect(body.columns[0].id).toBe('ID');
    expect(body.columns[1].id).toBe('Name');
    expect(body.columns[2].id).toBe('Value');
    expect(body.columns[0].letter).toBe('A');
  });

  it('reports multi header-mode metadata and columns', async () => {
    const metaRes = await apiGet('/workbooks/multi-header/sheets/data', bearerHeader(token));
    expect(metaRes.status).toBe(200);
    const meta = (await metaRes.json()) as {
      mode: string;
      header_row?: number;
      first_data_row?: number;
    };
    expect(meta.mode).toBe('table');
    expect(meta.header_row).toBe(1);
    expect(meta.first_data_row).toBe(4);

    const colsRes = await apiGet('/workbooks/multi-header/sheets/data/columns', bearerHeader(token));
    expect(colsRes.status).toBe(200);
    const cols = (await colsRes.json()) as {
      source: string;
      columns: Array<{ index: number; letter: string; id: string; type?: string; descriptions?: Record<string, string> }>;
    };
    expect(cols.source).toBe('multi_row');
    expect(cols.columns.map((c) => c.id)).toEqual(['id', 'name', 'amount']);
    expect(cols.columns[0].type).toBe('number');
    expect(cols.columns[0].descriptions?.default).toBe('order id');
  });

  it('reads multi-mode records starting after the header rows', async () => {
    const res = await apiGet('/workbooks/multi-header/sheets/data/records', bearerHeader(token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ index: number; data: Record<string, unknown> }>;
      total: number;
    };
    expect(body.total).toBe(2);
    expect(body.items[0].index).toBe(1);
    expect(body.items[0].data).toEqual({ id: 1, name: 'alpha', amount: 10.5 });
  });
});
