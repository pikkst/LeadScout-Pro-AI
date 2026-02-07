-- Completely disable RLS temporarily for debugging
-- WARNING: This removes all security - use only for debugging!

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE query_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Add a simple function to re-enable RLS later
CREATE OR REPLACE FUNCTION enable_rls_security() RETURNS void AS $$
BEGIN
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE query_history ENABLE ROW LEVEL SECURITY; 
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
END;
$$ LANGUAGE plpgsql;