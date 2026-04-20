// Shared test utilities

const API_URL = process.env.API_URL ?? 'http://localhost:8443';
const CLIENT_ID = process.env.EXCEL_API_TEST_CLIENT_ID ?? 'test-client';
const CLIENT_SECRET = process.env.EXCEL_API_TEST_SECRET ?? 'test-secret';
const STATIC_TOKEN = process.env.EXCEL_API_TEST_TOKEN ?? 'test-static-token';

export async function getApiUrl(): Promise<string> {
  return API_URL;
}

export async function obtainToken(): Promise<string> {
  const url = `${API_URL}/auth/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function staticTokenHeader(): Record<string, string> {
  return { Authorization: `Token ${STATIC_TOKEN}` };
}

export function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function apiGet(
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${API_URL}${path}`, { headers });
}

export async function apiPost(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
