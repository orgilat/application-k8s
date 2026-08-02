import { test, expect } from '../../fixtures';

test.describe('Remediations API', () => {
  test('GET /api/remediations returns list', async ({ apiClient }) => {
    const res = await apiClient.get('/api/remediations');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('POST /api/remediations creates remediation', async ({ apiClient }) => {
    const res = await apiClient.post('/api/remediations', {
      title: 'API Test Remediation',
      description: 'Test remediation',
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('API Test Remediation');
    expect(body.status).toBe('pending');
  });

  test('approve and start remediation flow', async ({ apiClient }) => {
    const createRes = await apiClient.post('/api/remediations', { title: 'Flow Test Remediation' });
    const rem = await createRes.json();

    const approveRes = await apiClient.post(`/api/remediations/${rem.id}/approve`, {});
    expect(approveRes.ok()).toBeTruthy();
    const approved = await approveRes.json();
    expect(approved.status).toBe('approved');

    const startRes = await apiClient.post(`/api/remediations/${rem.id}/start`, {});
    expect(startRes.ok()).toBeTruthy();
    const started = await startRes.json();
    expect(started.status).toBe('in_progress');
  });
});
