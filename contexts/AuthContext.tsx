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

    // Handle email confirmation from URL
    const handleEmailConfirmation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        console.log('Handling email confirmation...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (!error && data.session) {
          console.log('Email confirmation successful');
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          console.error('Email confirmation error:', error);
        }
      }
    };

    const initializeAuth = async () => {
      console.log('Initializing auth...');
      await handleEmailConfirmation();

      // Get initial session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session retrieved:', session ? 'Found' : 'None', error);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('User found, fetching profile...');
          await fetchUserProfile(session.user.id, session.user.email);
          setIsAdmin(session.user.email === 'huntersest@gmail.com');
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
          await fetchUserProfile(session.user.id, session.user.email);
          setIsAdmin(session.user.email === 'huntersest@gmail.com');
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
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile...');
        const email = userEmail || user?.email || '';
        const isAdminUser = email === 'huntersest@gmail.com';
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            full_name: isAdminUser ? 'Admin User' : email.split('@')[0],
            credits: isAdminUser ? 1000 : 0 // Give admin 1000 credits
          })
          .select()
          .single();

        if (!createError && newProfile) {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        } else {
          console.error('Error creating profile:', createError);
          // Set a default profile to avoid blocking
          setProfile({
            id: userId,
            email: email,
            full_name: email.split('@')[0],
            credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } else if (!error && data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
      } else {
        console.error('Error fetching profile:', error);
        // Set a default profile to avoid blocking
        const email = userEmail || user?.email || '';
        setProfile({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          credits: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Set a default profile to avoid blocking
      const email = userEmail || user?.email || '';
      setProfile({
        id: userId,
        email: email,
        full_name: email.split('@')[0],
        credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        emailRedirectTo: 'https://pikkst.github.io/LeadScout-Pro-AI/dashboard'
      }
    });

    if (!error && data.user) {
      // Create user profile
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        credits: 0
      });
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

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    updateCredits
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};