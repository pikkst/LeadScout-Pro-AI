
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
  legacyLeadId?: string;
  messages: ConversationMessage[];
  connection?: ConnectionInfo;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  type: 'OUTREACH' | 'QUALIFICATION' | 'NURTURING' | 'CUSTOM';
  status: 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'ARCHIVED';
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  versions?: PlaybookVersion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookVersion {
  id: string;
  version: number;
  changelog: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ROLLED_BACK';
  isActive: boolean;
  rolledBackFromVersionId?: string;
  playbookId: string;
  playbook?: Playbook;
  steps?: PlaybookStep[];
  conditions?: PlaybookCondition[];
  actions?: PlaybookAction[];
  branches?: PlaybookBranch[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookStep {
  id: string;
  order: number;
  name: string;
  description: string;
  isActive: boolean;
  versionId: string;
  analytics?: StepLevelAnalytics;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookCondition {
  id: string;
  operator: string;
  value: string;
  field: string;
  description: string;
  versionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
  description: string;
  retryPolicy: 'NONE' | 'LINEAR' | 'EXPONENTIAL';
  maxAttempts: number;
  versionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookBranch {
  id: string;
  name: string;
  condition: string;
  targetStepOrder: number;
  versionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookTestRun {
  id: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  fakeLeadId?: string;
  executionLog: unknown[];
  startedAt?: string;
  completedAt?: string;
  createdById: string;
  createdByName?: string;
  versionId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookApproval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  versionId: string;
  requestedById: string;
  requestedByName?: string;
  createdAt?: string;
}

export interface StepLevelAnalytics {
  id: string;
  stepId: string;
  executions: number;
  positiveReplies: number;
  qualifiedMeetings: number;
  stageChanges: number;
  wins: number;
  revenue: number;
  dropoffRate: number;
  replyRate: number;
  conversionRate: number;
  confidenceInterval: number;
  sampleSizeWarning: boolean;
  lastCalculatedAt: string;
}

export interface PlaybookAttribution {
  id: string;
  outcome: 'POSITIVE_REPLY' | 'QUALIFIED_MEETING' | 'STAGE_CHANGE' | 'WIN' | 'REVENUE';
  outcomeValue?: number;
  metadata: Record<string, unknown>;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  pitchId?: string;
  stepId?: string;
  versionId: string;
  attributedAt: string;
}

export interface SequenceVersion {
  id: string;
  sequenceId: string;
  version: number;
  changelog: string;
  isActive: boolean;
  rolledBackFromVersionId?: string;
  stepsJson: string;
  abTests?: SequenceABTest[];
  executionLogs?: SequenceExecutionLog[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SequenceABTest {
  id: string;
  name: string;
  status: string;
  metric: string;
  minSampleSize: number;
  confidenceLevel: number;
  versionId: string;
  variants: ABTestVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  config: Record<string, unknown>;
  impressions: number;
  conversions: number;
  isControl: boolean;
  abTestId: string;
}

export interface SequenceDeliveryWindow {
  id: string;
  sequenceId?: string;
  playbookId?: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  timezone: string;
  respectRecipientTimezone: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SequenceSenderRotation {
  id: string;
  sequenceId?: string;
  playbookId?: string;
  senderIds: string[];
  rotationMode: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SequenceExecutionLog {
  id: string;
  executionId: string;
  versionId: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  retryPolicy: string;
  error?: string;
  executedAt?: string;
  createdAt?: string;
}

export interface QualificationPlaybook {
  id: string;
  name: string;
  description: string;
  framework: 'BANT' | 'MEDDPICC' | 'SPICED' | 'CUSTOM';
  isActive: boolean;
  isCustom: boolean;
  createdById: string;
  createdByName?: string;
  stages: QualificationStage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QualificationStage {
  id: string;
  name: string;
  key: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  playbookId: string;
  playbook?: QualificationPlaybook;
  criterions: QualificationCriterion[];
  dealQualifications: DealQualification[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QualificationCriterion {
  id: string;
  name: string;
  description: string;
  evidenceType: string;
  options?: string;
  isRequired: boolean;
  stageId: string;
  stage?: QualificationStage;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealQualification {
  id: string;
  dealId: string;
  stageId: string;
  stage: QualificationStage;
  evidence: string;
  isMet: boolean;
  checkedById?: string;
  checkedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealQueue {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  items: QueueItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QueueItem {
  id: string;
  queueId: string;
  queue?: DealQueue;
  leadId?: string;
  dealId?: string;
  opportunityId?: string;
  status: string;
  priority: string;
  notes: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  slaDueAt?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkloadCap {
  id: string;
  userId: string;
  maxActiveLeads: number;
  maxActiveDeals: number;
  maxQueueItems: number;
  currentLoad: number;
  alertThreshold: number;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OutboundWebhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  timeoutMs: number;
  lastError?: string;
  lastSuccessAt?: string;
  createdById: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationMapping {
  id: string;
  provider: string;
  mappingType: string;
  mapping: Record<string, unknown>;
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Phase3Signal {
  id: string;
  type: string;
  source: string;
  evidence: string;
  confidence: number;
  isVerified: boolean;
  ingestedAt: string;
  verifiedAt?: string;
  accountSignals?: Array<{ accountId: string; relevance: number; freshness: number; context?: string }>;
}

export interface Phase3AccountRank {
  id: string;
  accountId: string;
  account?: {
    id: string;
    name: string;
    domain?: string;
    industry?: string;
    contacts?: Array<{ id: string; fullName: string; email: string }>;
  };
  fitScore: number;
  timingScore: number;
  relationshipScore: number;
  valueScore: number;
  compositeScore: number;
  explanation: string;
  evidence: Array<{ type: string; confidence: number; relevance: number; context?: string; snippet?: string }>;
  calculatedAt: string;
}

export interface Phase3AgentDefinition {
  id: string;
  name: string;
  type: string;
  description: string;
  config: Record<string, unknown>;
  budget: number;
  spentBudget: number;
  permissions: Record<string, unknown>;
  approvalThreshold: number;
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: { runs: number };
}

export interface Phase3AgentRun {
  id: string;
  definitionId: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  cost: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  approvals: Array<{ id: string; status: string }>;
}

export interface Phase3PackItem {
  id: string;
  packId: string;
  playbookId: string;
  sortOrder: number;
  playbook?: { id: string; name: string; type: string; status: string };
}

export interface Phase3Pack {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: string;
  vertical?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: Phase3PackItem[];
  createdBy?: { id: string; name: string; email: string };
}
