import { obtainToken, apiGet, apiPost, apiPut, bearerHeader } from '../helpers.js';

interface BatchResult {
  results: Array<{ op: string; status: string; index?: number; error?: string }>;
  applied_at: string;
}

describe('Batch Operations', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('executes batch record operations and returns per-operation results', async () => {
    const res = await apiPost(
      '/workbooks/styled/sheets/Sheet1/operations',
      {
        operations: [
          { op: 'add', data: { ID: 9101, Name: 'batch-a', Value: 1 } },
          { op: 'add', data: { ID: 9102, Name: 'batch-b', Value: 2 } },
          { op: 'update', row_index: 1, data: { Name: 'batch-updated' } },
        ],
      },
      bearerHeader(token),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as BatchResult;
    expect(body.results).toHaveLength(3);
    for (const r of body.results) {
      expect(r.status).toBe('ok');
    }
    expect(body.results[0].op).toBe('add');
    expect(typeof body.results[0].index).toBe('number');
    expect(body.results[2].op).toBe('update');
    expect(body.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Writes must be persisted — batch is a real open/save cycle
    const list = (await (
      await apiGet('/workbooks/styled/sheets/Sheet1/records', bearerHeader(token))
    ).json()) as { items: Array<{ data: Record<string, unknown> }> };
    expect(list.items.some((r) => r.data['ID'] === 9101)).toBe(true);
    expect(list.items.some((r) => r.data['ID'] === 9102)).toBe(true);
    expect(list.items[0].data['Name']).toBe('batch-updated');
  });

  it('executes batch cell operations', async () => {
    const res = await apiPost(
      '/workbooks/styled/sheets/Sheet1/cells/operations',
      {
        operations: [
          { op: 'update', ref: 'E1', value: 'batch-hdr' },
          { op: 'update', ref: 'E2', value: 42 },
          { op: 'clear', ref: 'E1' },
        ],
      },
      bearerHeader(token),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as BatchResult;
    expect(body.results).toHaveLength(3);
    expect(body.results.every((r) => r.status === 'ok')).toBe(true);

    const cell = await apiGet('/workbooks/styled/sheets/Sheet1/cells/E2', bearerHeader(token));
    expect(cell.status).toBe(200);
    const cellBody = (await cell.json()) as { value: unknown };
    expect(cellBody.value).toBe(42);
  });

  it('reports partial failures without aborting the batch', async () => {
    const res = await apiPost(
      '/workbooks/styled/sheets/Sheet1/operations',
      {
        operations: [
          { op: 'add', data: { ID: 9103, Name: 'batch-ok', Value: 3 } },
          { op: 'update', row_index: 999999, data: { Name: 'no-such-row' } },
        ],
      },
      bearerHeader(token),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as BatchResult;
    expect(body.results).toHaveLength(2);
    expect(body.results[0].status).toBe('ok');
    expect(body.results[1].status).toBe('error');
  });

  it('rejects a batch request without operations', async () => {
    const res = await apiPost(
      '/workbooks/styled/sheets/Sheet1/operations',
      {},
      bearerHeader(token),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('INVALID_REQUEST');
  });

  it('rejects a record add without data', async () => {
    const res = await apiPost(
      '/workbooks/styled/sheets/Sheet1/records',
      {},
      bearerHeader(token),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('INVALID_REQUEST');
  });

  it('rejects a cell write without value', async () => {
    const res = await apiPut(
      '/workbooks/styled/sheets/Sheet1/cells/Z99',
      {},
      bearerHeader(token),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('INVALID_REQUEST');
  });
});
