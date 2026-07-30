import { APIRequestContext } from '@playwright/test';

export const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'test-user',
  'x-user-role': 'admin',
};

export class ApiClient {
  constructor(private request: APIRequestContext) {}

  async get(path: string) {
    return this.request.get(`${API_BASE}${path}`, { headers: DEFAULT_HEADERS });
  }

  async post(path: string, body: unknown) {
    return this.request.post(`${API_BASE}${path}`, { headers: DEFAULT_HEADERS, data: body });
  }

  async patch(path: string, body: unknown) {
    return this.request.patch(`${API_BASE}${path}`, { headers: DEFAULT_HEADERS, data: body });
  }

  async delete(path: string) {
    return this.request.delete(`${API_BASE}${path}`, { headers: DEFAULT_HEADERS });
  }
}
