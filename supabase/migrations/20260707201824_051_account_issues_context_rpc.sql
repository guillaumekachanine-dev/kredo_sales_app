-- ADR-0012 Lot 4 — RPC unique d'hydratation de contexte pour la génération de
-- "cartographie des enjeux" (workflow n8n intel-031-issues-map, étape 3 de la
-- chaîne de décision). Même pattern que get_account_knowledge_context/get_pitch_context.
--
-- Entrées (D-3/D-5) : relationnel KREDO (haute confiance), FOLIO + diagnostic
-- process en passthrough brut, snapshot sectoriel mutualisé (pain points +
-- réglementaire, si sector_id renseigné), catalogue d'offres allégé (pour taguer
-- l'actionnabilité kredo_fit, PAS pour vendre — cf. ADR §4 étape 3, exclut la
-- recommandation d'offre qui reste l'étape 4), et les enjeux déjà ouverts (pour
-- que le LLM évite de proposer des doublons exacts sur un refresh — best-effort,
-- pas une déduplication garantie en V1).
--
-- Version réellement appliquée : 20260707201824. Testée en direct sur Voyage
-- Privé (sectorContext=null, sans sector_id) et Ascoma (sectorContext peuplé :
-- 8 pain points dont "Mise en conformité DORA", 5 échéances réglementaires
-- dont GAFI/DORA/Solvabilité II).

create or replace function public.get_account_issues_context(
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
        'employee_count', c.employee_count,
        'description', c.description
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ct.id,
        'full_name', p.full_name,
        'job_title', ct.job_title,
        'relationship_role', ct.relationship_role,
        'decision_power', ct.decision_power,
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
               target_daily_rate, next_action_label, next_action_at
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
        'urgency_score', s.urgency_score,
        'detected_at', s.detected_at
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
    'folioAnalysisData', (
      select c.metadata->'analysis_data'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
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
    -- Snapshot sectoriel mutualisé (D-6, déterministe) — seulement si sector_id renseigné.
    'sectorContext', (
      select jsonb_build_object(
        'name', si.name,
        'painPoints', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'title', spp.title, 'description', spp.description,
            'frequency_count', spp.frequency_count, 'kredo_practice', spp.kredo_practice
          ) order by spp.frequency_count desc), '[]'::jsonb)
          from public.sector_pain_points spp
          where spp.sector_id = si.id
          limit 8
        ),
        'regulatoryDeadlines', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'name', sri.name, 'deadline_date', sri.deadline_date,
            'urgency', sri.urgency, 'is_commercial_window', sri.is_commercial_window
          ) order by sri.deadline_date asc nulls last), '[]'::jsonb)
          from public.sector_regulatory_items sri
          where sri.sector_id = si.id
          limit 5
        )
      )
      from public.companies c
      join public.sector_intelligence si on si.id = c.sector_id
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    -- Catalogue allégé (actionnabilité seulement, pas la vente — étape 4).
    'offersCatalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'practice', op.name
      )), '[]'::jsonb)
      from public.offers o
      join public.offer_practices op on op.id = o.practice_id
      where o.workspace_id = p_workspace_id and o.is_active
    ),
    -- Anti-doublon best-effort (pas une garantie) : enjeux déjà ouverts.
    'existingOpenIssues', (
      select coalesce(jsonb_agg(jsonb_build_object('title', ai.title, 'category', ai.category)), '[]'::jsonb)
      from public.account_issues ai
      where ai.company_id = p_company_id and ai.workspace_id = p_workspace_id and ai.status = 'open'
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_account_issues_context(uuid, uuid) from public;
grant execute on function public.get_account_issues_context(uuid, uuid) to service_role;

comment on function public.get_account_issues_context(uuid, uuid) is
  'ADR-0012 Lot 4 — hydratation déterministe pour le workflow n8n intel-031-issues-map (étape 3, "Cartographie des enjeux"). Appelée en service_role depuis n8n, comme get_account_knowledge_context/get_pitch_context.';
