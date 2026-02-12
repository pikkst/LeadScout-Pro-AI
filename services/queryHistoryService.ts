import { supabase, QueryHistory } from './supabaseClient';
import { CompanyLead, LeadFocus } from '../types';

export const saveQueryToHistory = async (
  userId: string,
  query: string,
  location: string,
  focus: LeadFocus,
  intensity: 'standard' | 'deep',
  results: CompanyLead[]
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('query_history')
      .insert({
        user_id: userId,
        query: `${focus} leads in ${location}`,
        location,
        focus,
        intensity,
        results,
        cost: 1, // 1 credit per download
        downloaded: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving query history:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error saving query history:', error);
    return null;
  }
};

export const getUserQueryHistory = async (userId: string): Promise<QueryHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('query_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching query history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching query history:', error);
    return [];
  }
};

export const markQueryAsDownloaded = async (queryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('query_history')
      .update({ downloaded: true })
      .eq('id', queryId);

    if (error) {
      console.error('Error marking query as downloaded:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking query as downloaded:', error);
    return false;
  }
};

export const getQueryById = async (queryId: string): Promise<QueryHistory | null> => {
  try {
    const { data, error } = await supabase
      .from('query_history')
      .select('*')
      .eq('id', queryId)
      .single();

    if (error) {
      console.error('Error fetching query:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching query:', error);
    return null;
  }
};