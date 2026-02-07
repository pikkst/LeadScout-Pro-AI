-- Fix missing INSERT policy for user_profiles table
-- This allows authenticated users to create their own profiles

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;