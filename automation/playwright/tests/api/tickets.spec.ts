import { test, expect } from '../../fixtures';

test.describe('Tickets API', () => {
  test('GET /api/tickets returns list', async ({ apiClient }) => {
    const res = await apiClient.get('/api/tickets');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('POST /api/tickets creates ticket', async ({ apiClient }) => {
    const res = await apiClient.post('/api/tickets', {
      title: 'API Test Ticket',
      priority: 'high',
      description: 'Created by Playwright',
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('API Test Ticket');
    expect(body.status).toBe('open');
  });

  test('PATCH /api/tickets/:id updates status', async ({ apiClient }) => {
    const createRes = await apiClient.post('/api/tickets', { title: 'Status Update Test', priority: 'low' });
    const ticket = await createRes.json();

    const res = await apiClient.patch(`/api/tickets/${ticket.id}`, { status: 'in_progress' });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('in_progress');
  });
});
