-- 014: Allow authenticated users to manage their own payment records
-- This enables client-side payment recording after Stripe confirms payment,
-- so revenue tracking works even if the Stripe webhook isn't configured.

-- Allow users to INSERT their own payments
CREATE POLICY "users_insert_own_payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant INSERT permission to authenticated users
GRANT INSERT ON payments TO authenticated;

-- Allow UPDATE for upsert deduplication
CREATE POLICY "users_update_own_payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

GRANT UPDATE ON payments TO authenticated;

-- Allow admin to DELETE (for diagnostics cleanup)
CREATE POLICY "admin_delete_payments" ON payments
  FOR DELETE USING (is_admin());

GRANT DELETE ON payments TO authenticated;
