-- Read-only verification: every Prisma model table (plus migration ledger)
-- must deny Data API access regardless of grants inherited by users.
-- Do not assume all objects in public are owned by LeadScout.
DO $verify$
DECLARE
  table_name text;
  rel regclass;
  rel_rls boolean;
BEGIN
  FOR table_name IN
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
    ) AS leadscout_tables(name)
  LOOP
    rel := to_regclass(format('public.%I', table_name));
    IF rel IS NULL THEN
      RAISE EXCEPTION 'LeadScout relation missing: public.%', table_name;
    END IF;

    SELECT c.relrowsecurity INTO rel_rls FROM pg_class c WHERE c.oid = rel;
    IF NOT rel_rls THEN
      RAISE EXCEPTION 'RLS disabled: public.%', table_name;
    END IF;

    IF has_table_privilege('anon', rel, 'SELECT')
       OR has_table_privilege('anon', rel, 'INSERT')
       OR has_table_privilege('anon', rel, 'UPDATE')
       OR has_table_privilege('anon', rel, 'DELETE')
       OR has_table_privilege('authenticated', rel, 'SELECT')
       OR has_table_privilege('authenticated', rel, 'INSERT')
       OR has_table_privilege('authenticated', rel, 'UPDATE')
       OR has_table_privilege('authenticated', rel, 'DELETE')
    THEN
      RAISE EXCEPTION 'Data API grants found: public.%', table_name;
    END IF;
  END LOOP;
END
$verify$;
