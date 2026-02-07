-- Debug and fix RLS policies for user_profiles and query_history
-- Add proper authentication checks

-- Drop existing policies and recreate them with better error handling
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;  
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own queries" ON query_history;
DROP POLICY IF EXISTS "Users can insert own queries" ON query_history;
DROP POLICY IF EXISTS "Users can update own queries" ON query_history;

-- Recreate user_profiles policies with explicit auth checks
CREATE POLICY "Enable read access for authenticated users to own profile" ON user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Enable insert access for authenticated users to own profile" ON user_profiles  
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Enable update access for authenticated users to own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Recreate query_history policies  
CREATE POLICY "Enable read access for authenticated users to own queries" ON query_history
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Enable insert access for authenticated users to own queries" ON query_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Enable update access for authenticated users to own queries" ON query_history  
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);