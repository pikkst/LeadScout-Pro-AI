import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  updateCredits: (amount: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  useEffect(() => {
    // Fail-safe: ensure loading stops after 5 seconds
    const loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached, stopping loading state');
      setLoading(false);
    }, 5000);

    const initializeAuth = async () => {
      console.log('Initializing auth with simple Supabase flow...');

      // Get initial session - let Supabase handle everything
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session retrieved:', session ? 'Found' : 'None', error);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('User found, fetching profile...');
          // Small delay to ensure session is fully established
          setTimeout(async () => {
            await fetchUserProfile(session.user.id, session.user.email);
          }, 100);
        }
        
        console.log('Auth initialization complete');
        setLoading(false);
        clearTimeout(loadingTimeout);
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Small delay to ensure session is fully established
          setTimeout(async () => {
            await fetchUserProfile(session.user.id, session.user.email);
          }, 100);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const fetchUserProfile = async (userId: string, userEmail?: string) => {
    console.log('Fetching user profile for:', userId, userEmail);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

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
    signUp,
    signIn,
    signOut,
    updateCredits,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};