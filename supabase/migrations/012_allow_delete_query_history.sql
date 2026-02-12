-- 012: Allow users to delete their own query_history rows
-- The deleteQuery() function uses .delete() but no DELETE grant or RLS policy existed.

-- 1. Grant DELETE permission on query_history to authenticated users
GRANT DELETE ON query_history TO authenticated;

-- 2. RLS policy: users can only delete their own rows
CREATE POLICY "Users can delete own queries"
  ON query_history
  FOR DELETE
  USING (auth.uid() = user_id);
