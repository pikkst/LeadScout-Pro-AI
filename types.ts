
export type LeadFocus =
  | 'voip_carriers'
  | 'sms_aggregators'
  | 'fintech'
  | 'ecommerce'
  | 'call_centers'
  | 'mvnos'
  | 'enterprise_saas'
  | 'manufacturing'
  | 'industrial'
  | 'retail'
  | 'technology'
  | 'it_services'
  | 'software'
  | 'healthcare'
  | 'finance'
  | 'real_estate'
  | 'construction'
  | 'energy'
  | 'logistics'
  | 'travel_hospitality'
  | 'media'
  | 'education'
  | 'professional_services'
  | 'telecom'
  | 'automotive'
  | 'food_beverage';

export interface CompanyLead {
  id: string;
  name: string;
  website: string;
  domain?: string;
  category: string;
  email: string;
  description: string;
  sourceUrl?: string;
  isVerified?: boolean;
  source?: 'AI_SCOUT' | 'MANUAL' | 'CSV_IMPORT' | 'PITCH_REPLY' | 'OTHER';
  // CRM Properties
  stage?: 'Discovered' | 'Contacted' | 'Negotiation' | 'Signed' | 'Active' | 'Archived';
  notes?: string;
  phone?: string;
  estimatedValue?: number; // Potential monthly value in EUR
  assignedAgent?: string;
  assignedAgentId?: string;
  createdById?: string;
  focus?: string;
  createdAt?: string;
  lastContactedAt?: string;
  followUpTask?: {
    id: string;
    taskName: string;
    dueDate: string;
    isCompleted?: boolean;
    notes?: string;
  };
  scheduledMeetings?: ScheduledMeeting[];
  customFieldValues?: Array<{
    id: string;
    fieldId: string;
    key?: string;
    name?: string;
    type?: string;
    value: string;
  }>;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
  options?: string;
  isRequired?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealStage {
  id: string;
  name: string;
  key: string;
  color: string;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduledMeeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  type: 'Call' | 'Meeting' | 'Demo' | 'Follow-up';
  agenda?: string;
  link?: string;
}

export interface SearchState {
  isSearching: boolean;
  progress: number;
  currentAgent: string;
  logs: string[];
}

export enum AgentTask {
  INITIALIZING = 'Initializing Agents',
  SEARCHING = 'Web Scouting & Search',
  EXTRACTING = 'Extracting Contact Info',
  VERIFYING = 'Verifying Authenticity',
  COMPLETED = 'Scouting Mission Completed'
}

export interface OutreachPitch {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  language: string;
  status: 'Draft' | 'Sent' | 'Delivered' | 'Replied' | 'Failed';
  sentAt?: string;
  opened?: boolean;
  events?: PitchEvent[];
}

export interface PitchTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  focus?: string;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PitchEvent {
  id: string;
  pitchId: string;
  type: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'FAILED';
  createdAt: string;
}
