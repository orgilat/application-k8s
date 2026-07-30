import { test, expect } from '../../fixtures';

test.describe('Reports API', () => {
  test('GET /api/reports returns list', async ({ apiClient }) => {
    const res = await apiClient.get('/api/reports');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('POST /api/reports generates report', async ({ apiClient }) => {
    const res = await apiClient.post('/api/reports', {
      name: 'API Test Report',
      type: 'executive_summary',
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('API Test Report');
    expect(['queued', 'generating', 'ready']).toContain(body.status);
  });

  test('GET /api/reports/:id returns report', async ({ apiClient }) => {
    const listRes = await apiClient.get('/api/reports');
    const list = await listRes.json();
    if (list.data.length === 0) return;
    const id = list.data[0].id;

    const res = await apiClient.get(`/api/reports/${id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(id);
  });
});
