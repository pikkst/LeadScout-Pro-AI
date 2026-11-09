-- LeadScout uses its own JWT sessions and Prisma database access.
-- The Supabase Data API roles must not access application tables directly.
-- Apply this migration through prisma migrate deploy so _prisma_migrations
-- remains the canonical migration ledger.

-- The PUBLIC pseudo-role grants implicit privileges to anon/authenticated.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Supabase may configure permissive default grants for tables created in
-- public. Prevent later Prisma migrations from silently exposing new objects.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated;

-- PUBLIC grants could bypass the explicit role revokes. Limit public's
-- default execution rights on functions created by the migration owner.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
