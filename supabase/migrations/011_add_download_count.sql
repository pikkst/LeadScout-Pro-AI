-- 011: Add download_count to query_history and update download logic
-- Allows re-downloading up to 10 times after first purchase

-- Add download_count column (0 = never downloaded)
ALTER TABLE query_history ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Backfill: set download_count = 1 for already downloaded queries
UPDATE query_history SET download_count = 1 WHERE downloaded = true AND download_count = 0;

-- Update the deduct_credit_for_download function to track count
CREATE OR REPLACE FUNCTION deduct_credit_for_download(
  target_user_id UUID,
  target_query_id UUID
) RETURNS json AS $$
DECLARE
  current_credits INTEGER;
  is_already_downloaded BOOLEAN;
  current_download_count INTEGER;
BEGIN
  -- Check if query was already downloaded (paid for)
  SELECT downloaded, COALESCE(download_count, 0)
  INTO is_already_downloaded, current_download_count
  FROM query_history
  WHERE id = target_query_id AND user_id = target_user_id;

  IF is_already_downloaded IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Query not found');
  END IF;

  -- If already downloaded: allow re-download up to 10 times, no credit charge
  IF is_already_downloaded = true THEN
    IF current_download_count >= 10 THEN
      RETURN json_build_object('success', false, 'error', 'Maximum re-download limit (10) reached');
    END IF;

    -- Increment download count, no credit deduction
    UPDATE query_history
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = target_query_id AND user_id = target_user_id;

    -- Get current credits for response
    SELECT credits INTO current_credits
    FROM user_profiles WHERE id = target_user_id;

    RETURN json_build_object(
      'success', true,
      'remaining_credits', current_credits,
      'download_count', current_download_count + 1,
      'is_redownload', true
    );
  END IF;

  -- First download: deduct credit
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

  -- Mark query as downloaded with count = 1
  UPDATE query_history
  SET downloaded = true,
      download_count = 1
  WHERE id = target_query_id AND user_id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'remaining_credits', current_credits - 1,
    'download_count', 1,
    'is_redownload', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
