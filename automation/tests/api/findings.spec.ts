import { test, expect } from '../../fixtures';

test.describe('Findings API', () => {
  test('GET /api/findings returns list', async ({ apiClient }) => {
    const res = await apiClient.get('/api/findings');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('POST /api/findings creates finding', async ({ apiClient }) => {
    const res = await apiClient.post('/api/findings', {
      title: 'API Test Finding',
      severity: 'medium',
      category: 'misconfiguration',
      description: 'Test finding created by Playwright',
      recommendation: 'Fix it',
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('API Test Finding');
  });

  test('POST /api/findings/:id/acknowledge changes status', async ({ apiClient }) => {
    const listRes = await apiClient.get('/api/findings?status=open&pageSize=5');
    const list = await listRes.json();
    if (list.data.length === 0) return;
    const id = list.data[0].id;

    const res = await apiClient.post(`/api/findings/${id}/acknowledge`, {});
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('acknowledged');
  });

  test('POST /api/findings/bulk/acknowledge', async ({ apiClient }) => {
    const res = await apiClient.post('/api/findings', {
      title: 'Bulk Test 1', severity: 'low', category: 'exposure',
    });
    const finding = await res.json();

    const bulkRes = await apiClient.post('/api/findings/bulk/acknowledge', { ids: [finding.id] });
    expect(bulkRes.ok()).toBeTruthy();
  });
});
