-- 009: Fix infinite recursion in RLS policies
-- The admin policies on user_profiles query user_profiles itself,
-- which triggers the same RLS check, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function to bypass RLS when checking admin status.

-- ============================================================
-- 1. Create a helper function that bypasses RLS to check admin
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 2. Drop the recursive admin policies
-- ============================================================

DROP POLICY IF EXISTS "admin_read_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admin_read_all_queries" ON query_history;
DROP POLICY IF EXISTS "admin_read_all_payments" ON payments;

-- ============================================================
-- 3. Recreate admin policies using the helper function
-- ============================================================

-- Admin can read all profiles
CREATE POLICY "admin_read_all_profiles" ON user_profiles
  FOR SELECT USING (is_admin());

-- Admin can read all queries
CREATE POLICY "admin_read_all_queries" ON query_history
  FOR SELECT USING (is_admin());

-- Admin can read all payments
CREATE POLICY "admin_read_all_payments" ON payments
  FOR SELECT USING (is_admin());
