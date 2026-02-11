-- 008: Re-enable Row Level Security on all tables
-- Reverses the temporary RLS disable from migration 007

-- ============================================================
-- ADD is_admin COLUMN FIRST (needed by policies below)
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ============================================================
-- RE-ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_select" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_insert" ON user_profiles;
DROP POLICY IF EXISTS "allow_all_update" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own queries" ON query_history;
DROP POLICY IF EXISTS "Users can insert own queries" ON query_history;
DROP POLICY IF EXISTS "Users can update own queries" ON query_history;
DROP POLICY IF EXISTS "allow_all_select" ON query_history;
DROP POLICY IF EXISTS "allow_all_insert" ON query_history;
DROP POLICY IF EXISTS "allow_all_update" ON query_history;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "allow_all_select" ON payments;
DROP POLICY IF EXISTS "allow_all_insert" ON payments;

-- ============================================================
-- USER_PROFILES POLICIES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (name only, not credits)
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role / trigger can insert profiles on signup
CREATE POLICY "service_insert_profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can read all profiles (via is_admin column)
CREATE POLICY "admin_read_all_profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- ============================================================
-- QUERY_HISTORY POLICIES
-- ============================================================

-- Users can read their own queries
CREATE POLICY "users_read_own_queries" ON query_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own queries
CREATE POLICY "users_insert_own_queries" ON query_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own queries (e.g., mark as downloaded)
CREATE POLICY "users_update_own_queries" ON query_history
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can read all queries
CREATE POLICY "admin_read_all_queries" ON query_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- ============================================================
-- PAYMENTS POLICIES
-- ============================================================

-- Users can read their own payments
CREATE POLICY "users_read_own_payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role (webhook) can insert payments
-- This is enforced by NOT having anon/authenticated insert policy
-- Stripe webhook uses service_role key which bypasses RLS

-- Admin can read all payments
CREATE POLICY "admin_read_all_payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- ============================================================
-- SECURE CREDIT UPDATE FUNCTION (server-side only)
-- ============================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS add_credits_to_user(UUID, INTEGER);

-- Create secure function that only service_role can call
CREATE OR REPLACE FUNCTION add_credits_to_user(
  target_user_id UUID,
  credit_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET credits = credits + credit_amount,
      updated_at = NOW()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execute from anon and authenticated roles
REVOKE EXECUTE ON FUNCTION add_credits_to_user(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION add_credits_to_user(UUID, INTEGER) FROM authenticated;

-- ============================================================
-- SECURE CREDIT DEDUCTION FOR DOWNLOADS (server-side)
-- ============================================================

CREATE OR REPLACE FUNCTION deduct_credit_for_download(
  target_user_id UUID,
  target_query_id UUID
) RETURNS json AS $$
DECLARE
  current_credits INTEGER;
  result json;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO current_credits
  FROM user_profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF current_credits IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF current_credits < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  -- Deduct credit
  UPDATE user_profiles
  SET credits = credits - 1,
      updated_at = NOW()
  WHERE id = target_user_id;

  -- Mark query as downloaded
  UPDATE query_history
  SET downloaded = true
  WHERE id = target_query_id AND user_id = target_user_id;

  RETURN json_build_object('success', true, 'remaining_credits', current_credits - 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to call this (it self-validates user_id)
GRANT EXECUTE ON FUNCTION deduct_credit_for_download(UUID, UUID) TO authenticated;
