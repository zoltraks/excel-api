import { obtainToken, apiGet, bearerHeader } from '../helpers.js';

describe('Sheets', () => {
  let token: string;

  beforeAll(async () => {
    token = await obtainToken();
  });

  it('returns sheet metadata', async () => {
    // Placeholder — requires fixture workbook
    expect(true).toBe(true);
  });
});
