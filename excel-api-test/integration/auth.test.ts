import { getApiUrl, obtainToken, staticTokenHeader, apiGet } from '../helpers.js';

describe('Authorization', () => {
  it('obtains a JWT via client_credentials grant', async () => {
    const token = await obtainToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('accesses workbooks with Bearer token', async () => {
    const token = await obtainToken();
    const res = await apiGet('/workbooks', { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
  });

  it('accesses workbooks with static token', async () => {
    const res = await apiGet('/workbooks', staticTokenHeader());
    expect(res.status).toBe(200);
  });

  it('rejects requests without authorization', async () => {
    const res = await apiGet('/workbooks');
    expect(res.status).toBe(401);
  });
});
