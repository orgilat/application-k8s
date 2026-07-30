import { test, expect } from '../../fixtures';
import { API_BASE } from '../../helpers/apiClient';

test.describe('Health endpoints', () => {
  test('GET /health returns ok', async ({ apiClient }) => {
    const res = await apiClient.get('/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /ready returns ready', async ({ apiClient }) => {
    const res = await apiClient.get('/ready');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ready');
  });
});
