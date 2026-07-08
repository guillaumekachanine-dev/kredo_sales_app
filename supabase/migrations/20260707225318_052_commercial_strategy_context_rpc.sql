-- ADR-0012 Lot 5 — RPC unique d'hydratation de contexte pour la génération de
-- "stratégie commerciale" (workflow n8n intel-032-strategy, étape 4 de la
-- chaîne de décision : "Comment transformer les enjeux du compte en discours
-- commercial, offres KREDO et séquences d'approche plausibles ?").
-- Même pattern que get_account_knowledge_context/get_account_issues_context.
--
-- Différence volontaire vs get_account_issues_context (étape 3, catalogue
-- "allégé" pour juger l'actionnabilité seulement) : ici le catalogue d'offres
-- est COMPLET (description, cas d'usage, mots-clés, grille tarifaire agrégée
-- par practice) car l'étape 4 EST l'étape de vente — c'est elle qui doit
-- argumenter, pas seulement taguer.
--
-- Reprend aussi le matching heuristique missions.practice -> offer_practices.slug
-- introduit par get_pitch_context (ADR-0009) pour suggérer les offres de
-- cross-sell/upsell cohérentes avec ce qui est déjà livré chez le compte — même
-- dette documentée (pas de FK missions.practice_id), dupliquée ici à dessein
-- (chaque RPC d'hydratation reste self-contained, D-7 : un workflow fin par
-- étape, pas d'orchestrateur branchu partageant du SQL commun).

create or replace function public.get_commercial_strategy_context(
  p_workspace_id uuid,
  p_company_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with delivered_practice_slugs as (
    select distinct
      case m.practice
        when 'Cloud' then 'cloud-engineering'
        when 'Cybersecurity' then 'cybersecurity'
        when 'Data' then 'data-ai'
        when 'Design' then 'digital-experience'
        when 'Digital' then 'digital-business-solutions'
        when 'Mobile' then 'digital-experience'
        when 'Product Management' then 'digital-experience'
        when 'Project Management' then 'project-agile-delivery'
        when 'QA' then 'quality-engineering-testing'
        else null
      end as slug
    from public.missions m
    where m.company_id = p_company_id
      and m.workspace_id = p_workspace_id
      and m.status = 'active'
  )
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
    -- Le vrai nouvel input par rapport aux étapes précédentes : les enjeux
    -- déjà cartographiés et ouverts (Lot 4), source de vérité de la matrice.
    'openIssues', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ai.id,
        'title', ai.title,
        'category', ai.category,
        'problem_statement', ai.problem_statement,
        'evidence_level', ai.evidence_level,
        'importance', ai.importance,
        'urgency', ai.urgency,
        'kredo_fit', ai.kredo_fit,
        'contact_ids', ai.contact_ids
      ) order by ai.importance desc, ai.urgency desc), '[]'::jsonb)
      from public.account_issues ai
      where ai.company_id = p_company_id
        and ai.workspace_id = p_workspace_id
        and ai.status = 'open'
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
    -- Catalogue complet (pas allégé, cf. commentaire de tête).
    'offersCatalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'practice', op.name,
        'practice_slug', op.slug,
        'short_description', o.short_description,
        'use_cases', o.use_cases,
        'keywords', o.keywords
      ) order by op.sort_order, o.sort_order), '[]'::jsonb)
      from public.offers o
      join public.offer_practices op on op.id = o.practice_id
      where o.workspace_id = p_workspace_id and o.is_active
    ),
    'pricingByPractice', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'practice', agg.practice_name,
        'practice_slug', agg.practice_slug,
        'tjm_min', agg.tjm_min,
        'tjm_max', agg.tjm_max,
        'tjm_recommended_avg', agg.tjm_recommended_avg
      )), '[]'::jsonb)
      from (
        select
          op.id as practice_id,
          op.name as practice_name,
          op.slug as practice_slug,
          min(g.tjm_min) as tjm_min,
          max(g.tjm_max) as tjm_max,
          round(avg(g.tjm_recommended)) as tjm_recommended_avg
        from public.offer_pricing_grids g
        join public.offer_practices op on op.id = g.practice_id
        where g.workspace_id = p_workspace_id
        group by op.id, op.name, op.slug
      ) agg
    ),
    'deliveredPractices', (
      select coalesce(jsonb_agg(distinct dps.slug), '[]'::jsonb)
      from delivered_practice_slugs dps
      where dps.slug is not null
    ),
    -- Snapshot sectoriel mutualisé (D-6, déterministe) — pain points + calendrier
    -- réglementaire + playbook + practices_fit, seulement si sector_id renseigné.
    'sectorPlaybook', (
      select jsonb_build_object(
        'name', si.name,
        'practices_fit', si.practices_fit,
        'playbook', si.playbook,
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
    'previousPitches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'content_json', r.content_json,
        'created_at', r.created_at
      )), '[]'::jsonb)
      from (
        select * from public.ai_intelligence_results
        where company_id = p_company_id
          and workspace_id = p_workspace_id
          and result_type = 'commercial_pitch'
        order by created_at desc
        limit 2
      ) r
    ),
    -- Anti-répétition best-effort sur refresh (comme existingOpenIssues au Lot 4).
    'previousStrategy', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id
        and r.workspace_id = p_workspace_id
        and r.result_type = 'commercial_strategy'
        and r.status = 'succeeded'
      order by r.created_at desc
      limit 1
    ),
    'scores', jsonb_build_object(
      'conviction', public.compute_conviction_score_v1(p_company_id),
      'investment', public.compute_investment_score_v1(p_company_id)
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_commercial_strategy_context(uuid, uuid) from public;
grant execute on function public.get_commercial_strategy_context(uuid, uuid) to service_role;

comment on function public.get_commercial_strategy_context(uuid, uuid) is
  'ADR-0012 Lot 5 — hydratation déterministe pour le workflow n8n intel-032-strategy (étape 4, "Stratégie commerciale"). Appelée en service_role depuis n8n, comme get_account_knowledge_context/get_account_issues_context.';
