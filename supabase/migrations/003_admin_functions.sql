-- Add admin role to existing admin user
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'huntersest@gmail.com';

-- Create admin policy for viewing all user profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create admin policy for viewing all queries
CREATE POLICY "Admins can view all queries" ON query_history
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create admin policy for viewing all payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create analytics functions
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json AS $$
DECLARE
    total_users INTEGER;
    total_revenue DECIMAL(10,2);
    total_queries INTEGER;
    total_downloads INTEGER;
    active_users INTEGER;
BEGIN
    -- Get total users
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    
    -- Get total revenue
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue 
    FROM payments WHERE status = 'completed';
    
    -- Get total queries
    SELECT COUNT(*) INTO total_queries FROM query_history;
    
    -- Get total downloads
    SELECT COUNT(*) INTO total_downloads 
    FROM query_history WHERE downloaded = true;
    
    -- Get active users (users who made queries in last 30 days)
    SELECT COUNT(DISTINCT user_id) INTO active_users 
    FROM query_history 
    WHERE created_at >= NOW() - INTERVAL '30 days';
    
    RETURN json_build_object(
        'total_users', total_users,
        'total_revenue', total_revenue,
        'total_queries', total_queries,
        'total_downloads', total_downloads,
        'active_users', active_users
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create revenue by date function
CREATE OR REPLACE FUNCTION get_revenue_by_date(days INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, revenue DECIMAL(10,2)) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.created_at::date as date,
        SUM(p.amount) as revenue
    FROM payments p
    WHERE p.status = 'completed'
    AND p.created_at >= NOW() - (days || ' days')::interval
    GROUP BY p.created_at::date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create top locations function
CREATE OR REPLACE FUNCTION get_top_locations(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(location TEXT, query_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qh.location,
        COUNT(*) as query_count
    FROM query_history qh
    GROUP BY qh.location
    ORDER BY query_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;