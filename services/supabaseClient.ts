import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://levkpmoensvpteltohsd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldmtwbW9lbnN2cHRlbHRvaHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjU5OTgsImV4cCI6MjA4NjA0MTk5OH0.QdAAS86SxUzZYnw88ywEM8aMO0vxvQL1-oHBSTP2Sso';

console.log('Supabase Config:', { 
  url: supabaseUrl ? 'Set' : 'Missing', 
  key: supabaseAnonKey ? 'Set' : 'Missing'
});

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required - please set environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required - please set environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface QueryHistory {
  id: string;
  user_id: string;
  query: string;
  location: string;
  focus: string;
  intensity: string;
  results: any;
  cost: number;
  downloaded: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  stripe_payment_id: string;
  credits_added: number;
  created_at: string;
}