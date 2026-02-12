-- 013: Page visits tracking table
-- Tracks visitor sessions: referrer, page, duration, device info

CREATE TABLE IF NOT EXISTS page_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON page_visits(user_id);

-- Enable RLS
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (including anonymous visitors)
CREATE POLICY "Anyone can insert page visits" ON page_visits
  FOR INSERT WITH CHECK (true);

-- Only admins can SELECT
CREATE POLICY "admin_read_all_page_visits" ON page_visits
  FOR SELECT USING (is_admin());

-- Grant anonymous insert access
GRANT INSERT ON page_visits TO anon;
GRANT INSERT ON page_visits TO authenticated;
GRANT SELECT ON page_visits TO authenticated;
