import { test, expect } from '../../fixtures';

test.describe('Assets API', () => {
  test('GET /api/assets returns paginated list', async ({ apiClient }) => {
    const res = await apiClient.get('/api/assets');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.total).toBeGreaterThan(0);
  });

  test('POST /api/assets creates asset', async ({ apiClient }) => {
    const res = await apiClient.post('/api/assets', {
      name: 'api-test-asset',
      type: 'server',
      provider: 'aws',
      environment: 'dev',
      criticality: 'low',
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('api-test-asset');
    expect(body.id).toBeTruthy();
  });

  test('GET /api/assets/:id returns asset', async ({ apiClient }) => {
    const listRes = await apiClient.get('/api/assets');
    const list = await listRes.json();
    const id = list.data[0].id;

    const res = await apiClient.get(`/api/assets/${id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(id);
  });

  test('PATCH /api/assets/:id/criticality updates criticality', async ({ apiClient }) => {
    const listRes = await apiClient.get('/api/assets');
    const list = await listRes.json();
    const id = list.data[0].id;

    const res = await apiClient.patch(`/api/assets/${id}/criticality`, { criticality: 'high' });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.criticality).toBe('high');
  });

  test('PATCH /api/assets/:id/owner updates owner', async ({ apiClient }) => {
    const listRes = await apiClient.get('/api/assets');
    const list = await listRes.json();
    const id = list.data[0].id;

    const res = await apiClient.patch(`/api/assets/${id}/owner`, { owner: 'api-test@example.com' });
    expect(res.ok()).toBeTruthy();
  });
});
