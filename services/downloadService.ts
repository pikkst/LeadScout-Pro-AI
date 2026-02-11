import { supabase } from './supabaseClient';

/**
 * Server-side secure CSV download.
 * Credits are deducted atomically on the server — cannot be bypassed client-side.
 */
export const downloadCSVSecure = async (
  queryId: string
): Promise<{ csv: string; filename: string; remaining_credits: number }> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Get current session for auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to download');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/download-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({ queryId }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    if (response.status === 402) {
      throw new Error('Insufficient credits. Please purchase more credits.');
    }
    throw new Error(data.error || 'Download failed');
  }

  return {
    csv: data.csv,
    filename: data.filename,
    remaining_credits: data.remaining_credits,
  };
};

/**
 * Trigger browser download of CSV content
 */
export const triggerCSVDownload = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
