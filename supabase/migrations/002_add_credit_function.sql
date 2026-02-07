-- Add RPC function for adding credits to user
CREATE OR REPLACE FUNCTION add_credits_to_user(user_id UUID, credit_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET credits = credits + credit_amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;