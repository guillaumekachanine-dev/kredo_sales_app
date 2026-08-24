-- Migration : Neutralisation de l'exposition des signaux FOLIO legacy dans v_active_account_signals.
--
-- Conserve toutes les règles actuelles (status not in ('archived', 'dismissed'), fenêtre de 2 mois)
-- et ajoute un verrou explicite excluant les signatures FOLIO (signal_type folio_% ou dedupe_key folio:%).

create or replace view public.v_active_account_signals
with (security_invoker = true)
as
select
  id,
  workspace_id,
  company_id,
  signal_category,
  signal_type,
  title,
  summary,
  event_at,
  detected_at,
  last_evidence_at,
  expires_at,
  dedupe_key,
  confidence_score,
  relevance_score,
  urgency_score,
  potential_value_score,
  global_score,
  score_details,
  score_justification,
  taxonomy_version,
  scoring_rules_version,
  recommended_action,
  recommended_practice_id,
  suggested_contact_id,
  status,
  run_id,
  primary_source_id,
  created_at,
  updated_at
from public.account_signals
where status not in ('archived', 'dismissed')
  and detected_at >= current_timestamp - interval '2 months'
  and coalesce(signal_type, '') not like 'folio_%'
  and coalesce(dedupe_key, '') not like 'folio:%';

comment on view public.v_active_account_signals is
  'Signals still actionable: archived/dismissed, signals strictly older than two calendar months, and legacy FOLIO signals are excluded.';

revoke all on public.v_active_account_signals from public, anon;
grant select on public.v_active_account_signals to authenticated, service_role;
