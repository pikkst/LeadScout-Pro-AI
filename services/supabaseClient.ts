import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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