export type AssetType = 'server' | 'domain' | 'ip' | 'container' | 'database' | 'bucket' | 'application';
export type AssetProvider = 'aws' | 'azure' | 'gcp' | 'on-prem';
export type AssetEnvironment = 'prod' | 'staging' | 'dev';
export type Criticality = 'low' | 'medium' | 'high' | 'critical';
export type AssetStatus = 'active' | 'inactive' | 'unknown';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  provider: AssetProvider;
  environment: AssetEnvironment;
  criticality: Criticality;
  status: AssetStatus;
  owner: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'acknowledged' | 'false_positive' | 'remediation_pending' | 'remediation_in_progress' | 'resolved';
export type FindingCategory = 'exposure' | 'misconfiguration' | 'vulnerability' | 'leaked_secret' | 'weak_auth' | 'public_access';

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  assetId: string | null;
  assetName?: string;
  category: FindingCategory;
  description: string;
  recommendation: string;
  evidence: Record<string, unknown>;
  firstDetectedAt: string;
  lastSeenAt: string;
  assignedTo: string | null;
  ticketId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
export type ScanType = 'asset_discovery' | 'vulnerability_scan' | 'exposure_scan' | 'compliance_scan';

export interface Scan {
  id: string;
  name: string;
  type: ScanType;
  status: ScanStatus;
  target: string | null;
  assetId: string | null;
  assetName?: string;
  progress: number;
  findingsCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RemediationStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';

export interface Remediation {
  id: string;
  title: string;
  description: string | null;
  findingId: string | null;
  findingTitle?: string;
  status: RemediationStatus;
  assignedTo: string | null;
  approvedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'blocked' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  createdBy: string | null;
  findingId: string | null;
  findingTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'executive_summary' | 'critical_findings' | 'asset_inventory' | 'remediation_status';
export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  content: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'security_analyst' | 'automation_engineer' | 'viewer';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  totalAssets: number;
  criticalFindings: number;
  openFindings: number;
  scansRunning: number;
  remediationsPending: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
