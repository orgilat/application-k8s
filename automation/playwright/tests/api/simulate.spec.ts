import { test, expect } from '../../fixtures';

test.describe('Simulate endpoints', () => {
  test('GET /api/simulate/slow responds after delay', async ({ apiClient, request }) => {
    const start = Date.now();
    const res = await apiClient.get('/api/simulate/slow?ms=500');
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.delayed).toBe(500);
  });

  test('GET /api/simulate/error returns 500', async ({ apiClient }) => {
    const res = await apiClient.get('/api/simulate/error?status=500');
    expect(res.status()).toBe(500);
  });

  test('GET /api/simulate/error returns 404', async ({ apiClient }) => {
    const res = await apiClient.get('/api/simulate/error?status=404');
    expect(res.status()).toBe(404);
  });

  test('GET /api/simulate/flaky sometimes succeeds', async ({ apiClient }) => {
    let anySuccess = false;
    for (let i = 0; i < 10; i++) {
      const res = await apiClient.get('/api/simulate/flaky?rate=0');
      if (res.ok()) { anySuccess = true; break; }
    }
    expect(anySuccess).toBeTruthy();
  });

  test('POST /api/simulate/generate-activity creates events', async ({ apiClient }) => {
    const res = await apiClient.post('/api/simulate/generate-activity', {});
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.generated).toBeGreaterThan(0);
  });
});
