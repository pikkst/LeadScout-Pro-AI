import { api } from './apiClient';

export type AppTab = 'scout' | 'outreach' | 'relationships' | 'crm' | 'dashboard' | 'revenue' | 
'calendar' | 'documents' | 'analytics' | 'settings' | 'team' | 'conversations';

export interface ActivationStep {
  id: string;
  label: string;
  complete: boolean;
  action: AppTab | 'template';
}

export interface ActivationState {
  templateId: string | null;
  dismissed: boolean;
  complete: boolean;
  progress: number;
  steps: ActivationStep[];
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
}

export interface DeliverabilityStatus {
  configured: boolean;
  verifiedAt: string | null;
  paused: boolean;
  reasons: string[];
  sent24Hours: number;
  dailySendLimit: number;
  sent30Days: number;
  bounced30Days: number;
  complained30Days: number;
  bounceRate: number;
  complaintRate: number;
  bounceThresholdPercent: number;
  complaintThresholdPercent: number;
  suppressionCount: number;
  sender: { email: string; domain: string };
  publicBooking: { url: string; domain: string; isLocal: boolean; domainsAligned: boolean };
  guidance: Array<{ id: string; ok: boolean; label: string }>;
}

export interface CommandCenterData {
  generatedAt: string;
  counts: { overdueReplies: number; approvals: number; meetings: number; failedSends: number };
  actions: Array<{ id: string; priority: string; type: string; title: string; detail: string; target: AppTab; entityId: string }>;
  highValueLeads: Array<{ id: string; name: string; stage: string; estimatedValue: number; aiScore: number }>;
  deliverability: DeliverabilityStatus;
  funnel: Record<string, number>;
}

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: string;
  source: string;
  createdAt: string;
}

export const fetchActivationState = () => api<ActivationState>('/activation/state');
export const fetchOnboardingTemplates = () => api<OnboardingTemplate[]>('/activation/templates');
export const applyOnboardingTemplate = (templateId: string) => api<{ state: ActivationState }>('/activation/template', { method: 'POST', body: JSON.stringify({ templateId }) });
export const setWizardDismissed = (dismissed: boolean) => api<{ ok: boolean }>('/activation/wizard', { method: 'PATCH', body: JSON.stringify({ dismissed }) });
export const fetchCommandCenter = () => api<CommandCenterData>('/activation/command-center');
export const fetchComplianceStatus = () => api<DeliverabilityStatus>('/compliance/status');
export const fetchSuppressions = () => api<SuppressionEntry[]>('/compliance/suppressions');
export const addSuppression = (email: string, reason: string) => api<SuppressionEntry>('/compliance/suppressions', { method: 'POST', body: JSON.stringify({ email, reason }) });
export const deleteSuppression = (email: string) => api<{ ok: boolean }>(`/compliance/suppressions/${encodeURIComponent(email)}`, { method: 'DELETE' });
export const saveCompliancePolicy = (policy: { dailySendLimit: number; bounceThresholdPercent: number; complaintThresholdPercent: number }) => api<DeliverabilityStatus>('/compliance/policy', { method: 'PUT', body: JSON.stringify(policy) });
export const savePublicBookingUrl = (url: string) => api<DeliverabilityStatus>('/compliance/public-booking-url', { method: 'PUT', body: JSON.stringify({ url }) });
