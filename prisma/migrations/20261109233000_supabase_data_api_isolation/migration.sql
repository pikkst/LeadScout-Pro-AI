-- LeadScout authenticates via Express JWT + server-side Prisma.
-- Provider-compatible: PostgreSQL 17, Neon, and Supabase.
-- This migration was not deployed to the original Supabase project; changing
-- its checksum is safe only for databases where it has never been applied.
-- Restrict only Prisma-owned relations. Never modify privileges for the
-- entire Supabase public schema: Supabase extensions/functions may use it.
--
-- PostgreSQL table owners (the server-side Prisma connection) bypass RLS
-- unless FORCE ROW LEVEL SECURITY is specified. Do not enable FORCE.
-- Keep the runtime database role private and never expose it to clients.

DO $leadscout$
DECLARE
  relation_name text;
  relation_oid regclass;
  seq_name text;
  data_api_roles text;
BEGIN
  -- Neon has no Supabase anon/authenticated roles. Revoke only the roles
  -- present, without creating provider-specific roles in a generic database.
  SELECT string_agg(quote_ident(rolname), ', ')
    INTO data_api_roles
  FROM pg_roles
  WHERE rolname IN ('anon', 'authenticated');
  FOR relation_name IN
    SELECT name FROM (VALUES
    ('users'),
    ('app_settings'),
    ('leads'),
    ('accounts'),
    ('contacts'),
    ('opportunities'),
    ('relationships'),
    ('follow_up_tasks'),
    ('meetings'),
    ('meeting_slots'),
    ('webhook_receipts'),
    ('availability_rules'),
    ('booking_links'),
    ('pitches'),
    ('activity_logs'),
    ('integration_connections'),
    ('oauth_sessions'),
    ('conversations'),
    ('conversation_messages'),
    ('timeline_entries'),
    ('external_calendar_events'),
    ('team_booking_pages'),
    ('team_booking_members'),
    ('pitch_events'),
    ('email_suppressions'),
    ('unsubscribe_links'),
    ('activation_events'),
    ('pitch_templates'),
    ('custom_field_definitions'),
    ('custom_field_values'),
    ('deal_stages'),
    ('follow_up_sequences'),
    ('sequence_steps'),
    ('sequence_executions'),
    ('deals'),
    ('commissions'),
    ('lead_routing_rules'),
    ('document_templates'),
    ('generated_documents'),
    ('api_keys'),
    ('lead_monitoring'),
    ('send_time_optimizations'),
    ('agent_coaching'),
    ('playbooks'),
    ('playbook_versions'),
    ('playbook_steps'),
    ('playbook_conditions'),
    ('playbook_actions'),
    ('playbook_branches'),
    ('playbook_test_runs'),
    ('playbook_approvals'),
    ('step_level_analytics'),
    ('playbook_attributions'),
    ('sequence_versions'),
    ('sequence_ab_tests'),
    ('ab_test_variants'),
    ('sequence_delivery_windows'),
    ('sequence_sender_rotations'),
    ('sequence_execution_logs'),
    ('qualification_playbooks'),
    ('qualification_stages'),
    ('qualification_criterions'),
    ('deal_qualifications'),
    ('deal_queues'),
    ('queue_items'),
    ('workload_caps'),
    ('outbound_webhooks'),
    ('integration_mappings'),
    ('playbook_packs'),
    ('pack_items'),
    ('agent_definitions'),
    ('agent_runs'),
    ('agent_approvals'),
    ('account_ranks'),
    ('signals'),
    ('account_signals'),
    ('workspace_learning_profiles'),
    ('_prisma_migrations')
    ) AS leadscout_relations(name)
  LOOP
    relation_oid := to_regclass(format('public.%I', relation_name));
    IF relation_oid IS NULL THEN
      RAISE EXCEPTION 'Expected LeadScout table public.% does not exist', relation_name;
    END IF;

    -- Enable RLS as defense-in-depth without changing ownership semantics.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name);
    -- On Supabase, explicitly revoke Data API grants; on Neon no such roles exist.
    IF data_api_roles IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s', relation_name, data_api_roles);
    END IF;

    -- Restrict sequences OWNED BY LeadScout columns only.
    FOR seq_name IN
      SELECT quote_ident(ns.nspname) || '.' || quote_ident(seq.relname)
      FROM pg_class tbl
      JOIN pg_depend dep ON dep.refobjid = tbl.oid
        AND dep.refobjsubid > 0 AND dep.deptype IN ('a', 'i')
      JOIN pg_class seq ON seq.oid = dep.objid AND seq.relkind = 'S'
      JOIN pg_namespace ns ON ns.oid = seq.relnamespace
      WHERE tbl.oid = relation_oid
    LOOP
      IF data_api_roles IS NOT NULL THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM %s', seq_name, data_api_roles);
      END IF;
    END LOOP;
  END LOOP;
END
$leadscout$;
