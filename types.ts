
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
  stage?: string;
  notes?: string;
  phone?: string;
  estimatedValue?: number; // Potential monthly value in EUR
  aiScore?: number;        // AI conversion probability 0-100
  aiScoreReason?: string;  // Explanation for AI score
  enrichmentData?: {
    companySize?: string;
    employeeCount?: number;
    techStack?: string[];
    recentNews?: string[];
    decisionMakers?: Array<{ name: string; title: string }>;
  };
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

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  triggerStage: string;
  isActive: boolean;
  steps: SequenceStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SequenceStep {
  id: string;
  order: number;
  delayDays: number;
  actionType: 'EMAIL' | 'TASK' | 'WEBHOOK';
  subject?: string;
  body?: string;
  taskName?: string;
  isActive: boolean;
  triggerEvent?: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'FAILED';
  eventDelayDays?: number;
  stopOnEvent?: boolean;
}

export interface SequenceExecution {
  id: string;
  leadId: string;
  sequenceId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'STOPPED';
  currentStep: number;
  startedAt: string;
  completedAt?: string;
  nextRunAt?: string;
  lastEventCheckedAt?: string;
  sequence?: FollowUpSequence;
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
  status: 'Draft' | 'Sending' | 'Sent' | 'Delivered' | 'Replied' | 'Failed';
  sentAt?: string;
  scheduledSendAt?: string;
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

export interface StagePrediction {
  predictedStage: string;
  probability: number;
  estimatedDays: number;
  reasoning: string;
}

export interface AiForecast {
  next30Days: { estimatedDeals: number; estimatedValue: number };
  next90Days: { estimatedDeals: number; estimatedValue: number };
  confidence: number;
  assumptions: string[];
}

export interface MeetingPrep {
  talkingPoints: string[];
  winThemes: string[];
  potentialObjections: string[];
  recommendedApproach: string;
}

export interface SendTimeRecord {
  id: string;
  leadId: string;
  agentId?: string;
  recommendedHour: number;
  recommendedDay: string;
  confidence: number;
  reason: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface MonitoringAlert {
  id: string;
  leadId: string;
  type: string;
  title: string;
  description: string;
  source?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CoachingInsight {
  id: string;
  agentId: string;
  insightType: string;
  title: string;
  description: string;
  priority: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}

export interface CompetitorInsight {
  competitor: string;
  recentMoves: string[];
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
}

export interface ConversationMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderEmail: string;
  recipientEmails: string[];
  subject: string;
  textBody: string;
  occurredAt: string;
  isRead: boolean;
  intent?: string;
  sentiment?: string;
}

export interface ConnectionInfo {
  provider: string;
  accountEmail: string;
}

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  summary?: string;
  suggestedReply?: string;
  messages: ConversationMessage[];
  connection?: ConnectionInfo;
}
