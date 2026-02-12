import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isRecovery: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  updateCredits: (amount: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    let initialized = false;

    // Fail-safe: ensure loading stops after 10 seconds
    const loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached, stopping loading state');
      setLoading(false);
    }, 10000);

    const initializeAuth = async () => {
      console.log('Initializing auth...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session:', session ? `Found (${session.user.email})` : 'None', error || '');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        initialized = true;
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    initializeAuth();

    // Listen for auth changes AFTER initialization
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event);
        // Skip events during initialization — handled by getSession above
        if (!initialized) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery detected');
          setIsRecovery(true);
        } else if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAdmin(false);
          setIsRecovery(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const fetchUserProfile = async (userId: string, userEmail?: string) => {
    console.log('fetchUserProfile START for:', userId, userEmail);
    try {
      // Timeout wrapper — don't let the REST call hang forever
      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timed out after 5s')), 5000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      console.log('fetchUserProfile result:', { hasData: !!data, error: error?.message, is_admin: data?.is_admin });

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it with 1 free trial credit
        console.log('Profile not found, creating new profile with 1 free credit...');
        const email = userEmail || user?.email || '';
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            full_name: email.split('@')[0],
            credits: 1
          })
          .select()
          .single();

        if (!createError && newProfile) {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
          setIsAdmin(newProfile.is_admin === true);
        } else {
          console.error('Error creating profile:', createError);
          setProfile({
            id: userId,
            email: email,
            full_name: email.split('@')[0],
            credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          setIsAdmin(false);
        }
      } else if (!error && data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
        setIsAdmin(data.is_admin === true);
      } else {
        console.error('Error fetching profile:', error);
        const email = userEmail || user?.email || '';
        setProfile({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          credits: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      const email = userEmail || user?.email || '';
      setProfile({
        id: userId,
        email: email,
        full_name: email.split('@')[0],
        credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsAdmin(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('Starting simple signUp for:', email);
    
    // Use basic Supabase signup without custom options
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
        // Remove custom emailRedirectTo - let Supabase handle it
      }
    });

    if (!error && data.user) {
      console.log('SignUp successful with Supabase default flow');
    } else {
      console.error('SignUp error:', error);
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const resetPasswordForEmail = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/'
    });
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setIsRecovery(false);
    }
    return { data, error };
  };

  const clearRecovery = () => {
    setIsRecovery(false);
  };

  const updateCredits = async (amount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ credits: profile!.credits + amount })
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, credits: profile.credits + amount });
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchUserProfile(user.id, user.email);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin,
    isRecovery,
    signUp,
    signIn,
    signOut,
    updateCredits,
    refreshProfile,
    resetPasswordForEmail,
    updatePassword,
    clearRecovery
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};