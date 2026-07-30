import { api } from './client';
import type {
  Asset, Finding, Scan, Remediation, Ticket, Report, User,
  ActivityLog, DashboardSummary, PaginatedResponse,
} from '../types';

export const assetsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Asset>>(`/api/assets${q}`);
  },
  get: (id: string) => api.get<Asset>(`/api/assets/${id}`),
  create: (body: Partial<Asset>) => api.post<Asset>('/api/assets', body),
  update: (id: string, body: Partial<Asset>) => api.patch<Asset>(`/api/assets/${id}`, body),
  remove: (id: string) => api.delete(`/api/assets/${id}`),
  getFindings: (id: string) => api.get<{ data: Finding[] }>(`/api/assets/${id}/findings`),
  getScans: (id: string) => api.get<{ data: Scan[] }>(`/api/assets/${id}/scans`),
  getActivity: (id: string) => api.get<{ data: ActivityLog[] }>(`/api/assets/${id}/activity`),
  updateCriticality: (id: string, criticality: string) => api.patch<Asset>(`/api/assets/${id}/criticality`, { criticality }),
  updateOwner: (id: string, owner: string) => api.patch<Asset>(`/api/assets/${id}/owner`, { owner }),
  addTag: (id: string, tag: string) => api.post<Asset>(`/api/assets/${id}/tags`, { tag }),
  removeTag: (id: string, tag: string) => api.delete<Asset>(`/api/assets/${id}/tags/${tag}`),
};

export const findingsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Finding>>(`/api/findings${q}`);
  },
  get: (id: string) => api.get<Finding>(`/api/findings/${id}`),
  create: (body: Partial<Finding>) => api.post<Finding>('/api/findings', body),
  acknowledge: (id: string) => api.post<Finding>(`/api/findings/${id}/acknowledge`, {}),
  falsePositive: (id: string) => api.post<Finding>(`/api/findings/${id}/false-positive`, {}),
  reopen: (id: string) => api.post<Finding>(`/api/findings/${id}/reopen`, {}),
  startRemediation: (id: string) => api.post<{ remediationId: string }>(`/api/findings/${id}/start-remediation`, {}),
  linkTicket: (id: string, ticketId: string) => api.post<Finding>(`/api/findings/${id}/link-ticket`, { ticketId }),
  getActivity: (id: string) => api.get<{ data: ActivityLog[] }>(`/api/findings/${id}/activity`),
  bulkAcknowledge: (ids: string[]) => api.post('/api/findings/bulk/acknowledge', { ids }),
  bulkFalsePositive: (ids: string[]) => api.post('/api/findings/bulk/false-positive', { ids }),
  bulkAssignOwner: (ids: string[], assignedTo: string) => api.post('/api/findings/bulk/assign-owner', { ids, assignedTo }),
};

export const scansApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Scan>>(`/api/scans${q}`);
  },
  get: (id: string) => api.get<Scan>(`/api/scans/${id}`),
  create: (body: { name: string; type: string; target?: string; assetId?: string }) => api.post<Scan>('/api/scans', body),
  cancel: (id: string) => api.post<Scan>(`/api/scans/${id}/cancel`, {}),
  getActivity: (id: string) => api.get<{ data: ActivityLog[] }>(`/api/scans/${id}/activity`),
};

export const remediationsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Remediation>>(`/api/remediations${q}`);
  },
  get: (id: string) => api.get<Remediation>(`/api/remediations/${id}`),
  create: (body: Partial<Remediation>) => api.post<Remediation>('/api/remediations', body),
  approve: (id: string) => api.post<Remediation>(`/api/remediations/${id}/approve`, {}),
  reject: (id: string) => api.post<Remediation>(`/api/remediations/${id}/reject`, {}),
  start: (id: string) => api.post<Remediation>(`/api/remediations/${id}/start`, {}),
  complete: (id: string) => api.post<Remediation>(`/api/remediations/${id}/complete`, {}),
};

export const ticketsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Ticket>>(`/api/tickets${q}`);
  },
  get: (id: string) => api.get<Ticket>(`/api/tickets/${id}`),
  create: (body: Partial<Ticket> & { findingId?: string }) => api.post<Ticket>('/api/tickets', body),
  update: (id: string, body: Partial<Ticket>) => api.patch<Ticket>(`/api/tickets/${id}`, body),
  linkFinding: (id: string, findingId: string) => api.post<Ticket>(`/api/tickets/${id}/link-finding`, { findingId }),
  unlinkFinding: (id: string) => api.post<Ticket>(`/api/tickets/${id}/unlink-finding`, {}),
};

export const reportsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<Report>>(`/api/reports${q}`);
  },
  get: (id: string) => api.get<Report>(`/api/reports/${id}`),
  create: (body: { name: string; type: string }) => api.post<Report>('/api/reports', body),
  getContent: (id: string) => api.get<{ content: Record<string, unknown> }>(`/api/reports/${id}/content`),
  regenerate: (id: string) => api.post<Report>(`/api/reports/${id}/regenerate`, {}),
};

export const usersApi = {
  list: () => api.get<{ data: User[]; total: number }>('/api/users'),
  get: (id: string) => api.get<User>(`/api/users/${id}`),
  create: (body: Partial<User>) => api.post<User>('/api/users', body),
  update: (id: string, body: Partial<User>) => api.patch<User>(`/api/users/${id}`, body),
};

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/api/dashboard/summary'),
  riskTrend: () => api.get<{ data: Array<{ date: string; critical: number; high: number; medium: number }> }>('/api/dashboard/risk-trend'),
  recentActivity: () => api.get<{ data: ActivityLog[] }>('/api/dashboard/recent-activity'),
  topRiskyAssets: () => api.get<{ data: Array<{ id: string; name: string; criticality: string; type: string; critical_count: string; high_count: string; total_findings: string }> }>('/api/dashboard/top-risky-assets'),
};

export const activityApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<PaginatedResponse<ActivityLog>>(`/api/activity${q}`);
  },
};

export const settingsApi = {
  get: () => api.get<Record<string, unknown>>('/api/settings'),
  update: (body: Record<string, unknown>) => api.patch<Record<string, unknown>>('/api/settings', body),
};
