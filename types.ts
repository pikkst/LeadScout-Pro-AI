
export type LeadFocus = 'events' | 'investors' | 'manufacturing' | 'marketing' | 'tech' | 'real_estate' | 'healthcare' | 'legal';

export interface CompanyLead {
  id: string;
  name: string;
  website: string;
  category: string;
  email: string;
  description: string;
  sourceUrl?: string;
  isVerified?: boolean;
  emailConfidence?: number;
}

export interface SearchState {
  isSearching: boolean;
  progress: number;
  currentAgent: string;
  logs: string[];
}

export enum AgentTask {
  INITIALIZING = 'Initializing Agents',
  SEARCHING = 'Scouring Web for Leads',
  EXTRACTING = 'Extracting Contact Details',
  VERIFYING = 'Verifying Lead Quality',
  COMPLETED = 'Mission Accomplished'
}
