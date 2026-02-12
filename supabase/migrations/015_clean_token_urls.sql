-- Clean up access tokens from page_visits page_url field (security fix)
-- These contain JWT tokens with user emails and IDs

-- Delete rows where page_url contains access_token (these leak auth data)
DELETE FROM page_visits 
WHERE page_url LIKE '%access_token%' 
   OR page_url LIKE '%token_type=bearer%'
   OR page_url LIKE '%error=access_denied%';

-- Update any remaining hash URLs to just the path
UPDATE page_visits 
SET page_url = split_part(page_url, '#', 1)
WHERE page_url LIKE '%#%';
