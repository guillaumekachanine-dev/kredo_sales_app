-- ADR-0012 Lot 2 — RPC unique d'hydratation de contexte pour la génération de
-- "connaissance compte" (workflow n8n intel-030-account-knowledge, étape 1 de
-- la chaîne de décision). Même pattern que get_pitch_context/get_account_score_context :
-- un seul appel, appelé par n8n en service_role (pas de session utilisateur).
--
-- Relationnel KREDO d'abord (contacts/interactions/opportunités/missions/signaux
-- — haute confiance, provenance="relational"), FOLIO en passthrough brut (basse
-- confiance, provenance="folio_legacy" à l'usage côté prompt), diagnostic process
-- en passthrough si déjà généré (D-2 : enrichissement optionnel, pas un prérequis).
--
-- Version réellement appliquée : 20260707183536 (Supabase utilise le timestamp
-- comme clé, pas le nom — cf. project-migration-drift). Testée en direct sur
-- Voyage Privé (7 missions, 1 opportunité, 6 contacts, 5 signaux FOLIO, diagnostic).

create or replace function public.get_account_knowledge_context(
  p_workspace_id uuid,
  p_company_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'company', (
      select jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'lifecycle_status', c.lifecycle_status,
        'sector', c.sector,
        'sector_id', c.sector_id,
        'segment', c.segment,
        'hq_location', c.hq_location,
        'employee_count', c.employee_count,
        'priority', c.priority,
        'description', c.description,
        'website', c.website
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ct.id,
        'person_id', ct.person_id,
        'full_name', p.full_name,
        'job_title', ct.job_title,
        'department', ct.department,
        'relationship_role', ct.relationship_role,
        'decision_power', ct.decision_power,
        'relationship_level', ct.relationship_level,
        'is_priority', ct.is_priority
      )), '[]'::jsonb)
      from (
        select *
        from public.contacts
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by is_priority desc, relationship_level desc nulls last
        limit 50
      ) ct
      join public.persons p on p.id = ct.person_id
    ),
    'recentInteractions', (
      select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
      from (
        select id, contact_id, type, occurred_at, summary, sentiment, next_action
        from public.interactions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by occurred_at desc
        limit 15
      ) i
    ),
    'opportunities', (
      select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      from (
        select id, title, stage, opportunity_type, estimated_gain, weighted_gain,
               target_daily_rate, next_action_label, next_action_at, closed_at,
               win_reason, loss_reason
        from public.opportunities
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by created_at desc
        limit 20
      ) o
    ),
    'missions', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select id, title, role_title, practice, status, start_date, end_date, gross_margin_pct
        from public.missions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by start_date desc nulls last
        limit 20
      ) m
    ),
    'signals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'category', s.signal_category,
        'type', s.signal_type,
        'title', s.title,
        'summary', s.summary,
        'confidence_score', s.confidence_score,
        'relevance_score', s.relevance_score,
        'urgency_score', s.urgency_score,
        'detected_at', s.detected_at,
        'expires_at', s.expires_at
      ) order by s.detected_at desc), '[]'::jsonb)
      from (
        select *
        from public.account_signals
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and status not in ('dismissed', 'false_positive', 'expired', 'archived')
          and (expires_at is null or expires_at >= now())
        order by detected_at desc
        limit 30
      ) s
    ),
    -- Passthrough brut (basse confiance, D-3 provenance="folio_legacy") : le
    -- workflow LLM décide comment l'incorporer, cette RPC ne le réinterprète pas.
    'folioAnalysisData', (
      select c.metadata->'analysis_data'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    -- Enrichissement optionnel (D-2) : dernier diagnostic process réussi, s'il existe.
    'processDiagnostic', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id
        and r.workspace_id = p_workspace_id
        and r.result_type = 'process_diagnostic'
        and r.status = 'succeeded'
      order by r.created_at desc
      limit 1
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_account_knowledge_context(uuid, uuid) from public;
grant execute on function public.get_account_knowledge_context(uuid, uuid) to service_role;

comment on function public.get_account_knowledge_context(uuid, uuid) is
  'ADR-0012 Lot 2 — hydratation déterministe pour le workflow n8n intel-030-account-knowledge (étape 1, "Connaissance compte"). Appelée en service_role depuis n8n, comme get_pitch_context/get_account_summary_facts. Relationnel KREDO en premier (haute confiance), FOLIO/diagnostic en passthrough brut pour laisser le LLM juger de leur intégration.';
