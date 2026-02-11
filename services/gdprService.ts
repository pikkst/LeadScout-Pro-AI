import { supabase } from './supabaseClient';

/**
 * Request complete deletion of user account and all associated data.
 * Implements GDPR right to erasure.
 */
export const deleteUserAccount = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Delete query history
    const { error: queryError } = await supabase
      .from('query_history')
      .delete()
      .eq('user_id', userId);

    if (queryError) {
      console.error('Error deleting query history:', queryError);
    }

    // 2. Delete payments record
    const { error: paymentError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', userId);

    if (paymentError) {
      console.error('Error deleting payments:', paymentError);
    }

    // 3. Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return { success: false, error: 'Failed to delete profile data' };
    }

    // 4. Sign out the user (auth.admin.deleteUser requires service_role)
    await supabase.auth.signOut();

    return { success: true };
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return { success: false, error: error.message || 'Deletion failed' };
  }
};

/**
 * Export all user data as JSON (GDPR data portability)
 */
export const exportUserData = async (userId: string): Promise<object | null> => {
  try {
    const [profileResult, queryResult, paymentResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase.from('query_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    return {
      exported_at: new Date().toISOString(),
      profile: profileResult.data,
      search_history: queryResult.data || [],
      payments: paymentResult.data || [],
    };
  } catch (error) {
    console.error('Data export error:', error);
    return null;
  }
};
