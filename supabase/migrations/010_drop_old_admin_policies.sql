-- 010: Drop leftover admin policies from migration 003
-- These policies query auth.users directly, which the `authenticated`
-- role cannot access → "permission denied for table users".
-- Migration 009 already provides correct admin policies via is_admin().

-- Drop the 003-era admin policies that reference auth.users
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all queries" ON query_history;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

-- Also drop any leftover emergency/temp policies from 005/006
DROP POLICY IF EXISTS "Enable read access for authenticated users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for authenticated users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users to own queries" ON query_history;
DROP POLICY IF EXISTS "Enable insert access for authenticated users to own queries" ON query_history;
DROP POLICY IF EXISTS "Enable update access for authenticated users to own queries" ON query_history;
DROP POLICY IF EXISTS "Authenticated users can read all profiles (temp)" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all queries (temp)" ON query_history;

-- Grant base table permissions to authenticated role
-- (RLS policies control row-level access; these grants allow table-level access)
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON query_history TO authenticated;
GRANT SELECT ON payments TO authenticated;

-- Also grant to anon for edge functions that run pre-auth
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON query_history TO anon;
GRANT SELECT ON payments TO anon;
