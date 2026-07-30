import { test, expect } from '../../fixtures';

test.describe('Scans API', () => {
  let createdScanId: string;

  test('GET /api/scans returns list', async ({ apiClient }) => {
    const res = await apiClient.get('/api/scans');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('POST /api/scans creates scan', async ({ apiClient }) => {
    const res = await apiClient.post('/api/scans', {
      name: 'API Test Scan',
      type: 'vulnerability_scan',
      target: '10.0.0.1',
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('API Test Scan');
    expect(body.status).toBe('queued');
    createdScanId = body.id;
  });

  test('GET /api/scans/:id returns scan', async ({ apiClient }) => {
    const listRes = await apiClient.get('/api/scans');
    const list = await listRes.json();
    if (list.data.length === 0) return;
    const id = list.data[0].id;

    const res = await apiClient.get(`/api/scans/${id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(id);
  });

  test('POST /api/scans/:id/cancel cancels scan', async ({ apiClient }) => {
    const createRes = await apiClient.post('/api/scans', {
      name: 'Cancel Test Scan',
      type: 'exposure_scan',
    });
    const scan = await createRes.json();

    const res = await apiClient.post(`/api/scans/${scan.id}/cancel`, {});
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('canceled');
  });
});
