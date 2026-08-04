-- Lot 0 « Intelligence Entreprise / Intelligence Sectorielle » — RPC d'hydratation.
--
-- 1. get_account_knowledge_context : ÉTENDUE (les 9 clés existantes sont
--    conservées à l'identique — le workflow n8n intel-030-account-knowledge est
--    déployé et les lit ; toute rupture de nom casserait la génération en prod).
--    Ajouts : accountFacts / factSources / factSourceLinks (socle de sourcing du
--    Lot 0) et folioSectorAnalysis (legacy Phase 2, isolé de folioAnalysisData
--    Phase 1). `signals` gagne primary_source_id — ajout additif.
--
-- 2. get_sector_intelligence_context : NOUVELLE. Hydrate un secteur entier pour
--    les futurs artefacts `sector_intelligence_analysis`.
--
-- Aucun changement de schéma : `ai_intelligence_results.result_type` est du
-- texte libre sans CHECK ni enum (vérifié sur pg_constraint), la valeur
-- "sector_intelligence_analysis" ne nécessite donc aucune migration d'enum.
--
-- Sécurité : SECURITY INVOKER + EXECUTE réservé à service_role, comme les RPC
-- d'hydratation sœurs (get_pitch_context, get_account_issues_context). Ces
-- fonctions sont appelées par n8n en service_role, qui contourne la RLS — c'est
-- donc le filtre `workspace_id = p_workspace_id`, répété dans CHAQUE
-- sous-requête, qui porte l'isolation multi-tenant. Vérifié en direct : un
-- workspace étranger renvoie company/sector à null et toutes les listes vides.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Connaissance compte — étendue
-- ─────────────────────────────────────────────────────────────────────────────

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
        'id', c.id, 'name', c.name, 'lifecycle_status', c.lifecycle_status,
        'sector', c.sector, 'sector_id', c.sector_id, 'segment', c.segment,
        'hq_location', c.hq_location, 'employee_count', c.employee_count,
        'priority', c.priority, 'description', c.description, 'website', c.website
      )
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'contacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ct.id, 'person_id', ct.person_id, 'full_name', p.full_name,
        'job_title', ct.job_title, 'department', ct.department,
        'relationship_role', ct.relationship_role, 'decision_power', ct.decision_power,
        'relationship_level', ct.relationship_level, 'is_priority', ct.is_priority
      )), '[]'::jsonb)
      from (
        select * from public.contacts
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
        order by occurred_at desc limit 15
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
        order by created_at desc limit 20
      ) o
    ),
    'missions', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from (
        select id, title, role_title, practice, status, start_date, end_date, gross_margin_pct
        from public.missions
        where company_id = p_company_id and workspace_id = p_workspace_id
        order by start_date desc nulls last limit 20
      ) m
    ),
    'signals', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'category', s.signal_category, 'type', s.signal_type,
        'title', s.title, 'summary', s.summary,
        'confidence_score', s.confidence_score, 'relevance_score', s.relevance_score,
        'urgency_score', s.urgency_score, 'detected_at', s.detected_at,
        'expires_at', s.expires_at, 'primary_source_id', s.primary_source_id
      ) order by s.detected_at desc), '[]'::jsonb)
      from (
        select * from public.account_signals
        where company_id = p_company_id and workspace_id = p_workspace_id
          and status not in ('dismissed', 'false_positive', 'expired', 'archived')
          and (expires_at is null or expires_at >= now())
        order by detected_at desc limit 30
      ) s
    ),
    -- Faits atomiques courants du compte (table account_facts). Le Lot 0 les
    -- expose pour que les futurs artefacts V2 puissent citer des faits déjà
    -- validés au lieu de les redécouvrir.
    'accountFacts', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.fact_type, f.fact_subtype nulls first), '[]'::jsonb)
      from (
        select af.id, af.fact_type, af.fact_subtype, af.cardinality,
               af.value_text, af.value_json, af.normalized_value, af.origin,
               af.confidence_score, af.primary_source_id, af.effective_at,
               af.verified_at, af.expires_at
        from public.account_facts af
        where af.workspace_id = p_workspace_id
          and af.target_type = 'company'
          and af.target_id = p_company_id
          and af.is_current = true
      ) f
    ),
    -- Sources citées par ces faits, dédupliquées : une source vaut pour
    -- plusieurs faits, la renvoyer une fois par fait gonflerait le payload sans
    -- rien apporter. Les faits pointent dedans via primary_source_id, les liens
    -- N:N via factSourceLinks ci-dessous.
    'factSources', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.collected_at desc), '[]'::jsonb)
      from (
        select src.id, src.source_type, src.source_name, src.source_url,
               src.canonical_url, src.published_at, src.collected_at,
               src.reliability_score, src.collection_method, src.evidence_excerpt
        from public.intelligence_sources src
        where src.workspace_id = p_workspace_id
          and (
            src.id in (
              select af.primary_source_id from public.account_facts af
              where af.workspace_id = p_workspace_id and af.target_type = 'company'
                and af.target_id = p_company_id and af.is_current = true
                and af.primary_source_id is not null
            )
            or src.id in (
              select l.source_id from public.intelligence_source_links l
              where l.workspace_id = p_workspace_id and l.object_type = 'fact'
                and l.object_id in (
                  select af.id from public.account_facts af
                  where af.workspace_id = p_workspace_id and af.target_type = 'company'
                    and af.target_id = p_company_id and af.is_current = true
                )
            )
          )
      ) s
    ),
    'factSourceLinks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fact_id', l.object_id, 'source_id', l.source_id, 'link_role', l.link_role
      )), '[]'::jsonb)
      from public.intelligence_source_links l
      where l.workspace_id = p_workspace_id and l.object_type = 'fact'
        and l.object_id in (
          select af.id from public.account_facts af
          where af.workspace_id = p_workspace_id and af.target_type = 'company'
            and af.target_id = p_company_id and af.is_current = true
        )
    ),
    -- FOLIO legacy, passthrough brut et NOMMÉ comme tel. Phase 1 et Phase 2
    -- restent deux clés distinctes : ce sont deux exports différents, les
    -- fusionner ferait perdre l'information de provenance.
    'folioAnalysisData', (
      select c.metadata->'analysis_data'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'folioSectorAnalysis', (
      select c.metadata->'sector_analysis'
      from public.companies c
      where c.id = p_company_id and c.workspace_id = p_workspace_id
    ),
    'processDiagnostic', (
      select r.content_json
      from public.ai_intelligence_results r
      where r.company_id = p_company_id and r.workspace_id = p_workspace_id
        and r.result_type = 'process_diagnostic' and r.status = 'succeeded'
      order by r.created_at desc limit 1
    ),
    'dataCutoffAt', now()
  )
$$;

-- NOTE GRANTS : Supabase applique des ALTER DEFAULT PRIVILEGES sur le schéma
-- public qui accordent EXECUTE à anon/authenticated sur TOUTE nouvelle fonction.
-- `revoke ... from public` ne les retire pas (ce sont des grants explicites, pas
-- un héritage de PUBLIC) : il faut les révoquer nommément, sinon le commentaire
-- « réservé service_role » serait faux. Constat vérifié sur pg_proc.proacl.
revoke all on function public.get_account_knowledge_context(uuid, uuid) from public;
revoke execute on function public.get_account_knowledge_context(uuid, uuid) from anon, authenticated;
grant execute on function public.get_account_knowledge_context(uuid, uuid) to service_role;

comment on function public.get_account_knowledge_context(uuid, uuid) is
  'Lot 0 Intelligence — hydratation compte pour intel-030-account-knowledge et les futurs artefacts account_knowledge V2. Relationnel KREDO + faits atomiques sourcés + FOLIO legacy isolé (Phase 1 folioAnalysisData / Phase 2 folioSectorAnalysis). Appelée en service_role : l''isolation repose sur p_workspace_id, filtré dans chaque sous-requête.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Intelligence sectorielle — nouvelle
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_sector_intelligence_context(
  p_workspace_id uuid,
  p_sector_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  -- Périmètre calculé une seule fois puis réutilisé : les comptes du secteur
  -- conditionnent faits, sources, signaux et artefacts. Le recalculer dans
  -- chaque sous-requête multiplierait les scans de `companies`.
  with scoped_companies as (
    select c.id, c.name, c.legal_name, c.lifecycle_status, c.segment,
           c.hq_location, c.employee_count, c.priority, c.website
    from public.companies c
    where c.workspace_id = p_workspace_id
      and c.sector_id = p_sector_id
  )
  select jsonb_build_object(
    'sector', (
      select to_jsonb(s)
      from (
        select si.id, si.name, si.slug, si.description, si.status,
               si.attractiveness_score, si.market_size_eur_bn, si.market_growth_pct,
               si.digital_maturity, si.practices_fit, si.key_players_paca,
               si.key_players_national, si.avg_tjm_min, si.avg_tjm_max,
               si.playbook, si.caveats, si.updated_at
        from public.sector_intelligence si
        where si.id = p_sector_id and si.workspace_id = p_workspace_id
      ) s
    ),
    'companies', (
      select coalesce(jsonb_agg(to_jsonb(sc) order by sc.name), '[]'::jsonb)
      from scoped_companies sc
    ),
    'approvedFacts', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.company_id, f.fact_type), '[]'::jsonb)
      from (
        select af.id, af.target_id as company_id, af.fact_type, af.fact_subtype,
               af.cardinality, af.value_text, af.value_json, af.normalized_value,
               af.origin, af.confidence_score, af.primary_source_id,
               af.effective_at, af.verified_at
        from public.account_facts af
        where af.workspace_id = p_workspace_id
          and af.target_type = 'company'
          and af.is_current = true
          and af.target_id in (select id from scoped_companies)
      ) f
    ),
    'factSources', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.collected_at desc), '[]'::jsonb)
      from (
        select src.id, src.source_type, src.source_name, src.source_url,
               src.published_at, src.collected_at, src.reliability_score,
               src.collection_method, src.evidence_excerpt
        from public.intelligence_sources src
        where src.workspace_id = p_workspace_id
          and src.id in (
            select af.primary_source_id
            from public.account_facts af
            where af.workspace_id = p_workspace_id
              and af.target_type = 'company'
              and af.is_current = true
              and af.primary_source_id is not null
              and af.target_id in (select id from scoped_companies)
            union
            select l.source_id
            from public.intelligence_source_links l
            where l.workspace_id = p_workspace_id
              and l.object_type = 'fact'
              and l.object_id in (
                select af.id from public.account_facts af
                where af.workspace_id = p_workspace_id
                  and af.target_type = 'company'
                  and af.is_current = true
                  and af.target_id in (select id from scoped_companies)
              )
          )
      ) s
    ),
    'accountSignals', (
      select coalesce(jsonb_agg(to_jsonb(sg) order by sg.detected_at desc), '[]'::jsonb)
      from (
        select s.id, s.company_id, s.signal_category, s.signal_type, s.title,
               s.summary, s.confidence_score, s.relevance_score, s.urgency_score,
               s.global_score, s.detected_at, s.expires_at, s.primary_source_id
        from public.account_signals s
        where s.workspace_id = p_workspace_id
          and s.company_id in (select id from scoped_companies)
          and s.status not in ('dismissed', 'false_positive', 'expired', 'archived')
          and (s.expires_at is null or s.expires_at >= now())
        order by s.detected_at desc
        limit 200
      ) sg
    ),
    'painPoints', (
      select coalesce(jsonb_agg(to_jsonb(pp) order by pp.frequency_count desc), '[]'::jsonb)
      from (
        select p.id, p.title, p.description, p.frequency_count,
               p.source_company_ids, p.kredo_practice, p.verbatim
        from public.sector_pain_points p
        where p.sector_id = p_sector_id and p.workspace_id = p_workspace_id
      ) pp
    ),
    'regulatoryItems', (
      select coalesce(jsonb_agg(to_jsonb(ri) order by ri.deadline_date nulls last), '[]'::jsonb)
      from (
        select r.id, r.name, r.authority, r.description, r.deadline_date,
               r.urgency, r.kredo_practice, r.commercial_angle,
               r.is_commercial_window, r.source_url
        from public.sector_regulatory_items r
        where r.sector_id = p_sector_id and r.workspace_id = p_workspace_id
      ) ri
    ),
    'events', (
      select coalesce(jsonb_agg(to_jsonb(ev) order by ev.event_date desc nulls last), '[]'::jsonb)
      from (
        select e.id, e.title, e.event_type, e.description, e.event_date,
               e.source_url, e.commercial_opportunity, e.status
        from public.sector_events e
        where e.sector_id = p_sector_id and e.workspace_id = p_workspace_id
      ) ev
    ),
    'news', (
      select coalesce(jsonb_agg(to_jsonb(nw) order by nw.published_at desc nulls last), '[]'::jsonb)
      from (
        select n.id, n.title, n.source, n.url, n.summary, n.published_at,
               n.relevance_score, n.tags, n.is_trigger_event
        from public.sector_news n
        where n.sector_id = p_sector_id and n.workspace_id = p_workspace_id
        order by n.published_at desc nulls last
        limit 100
      ) nw
    ),
    -- Fenêtres commerciales en RÉFÉRENCES seulement ({source_table, id}) : leur
    -- contenu est déjà renvoyé dans regulatoryItems/events. Les recopier ici
    -- dupliquerait la donnée et créerait deux versions à maintenir.
    'commercialWindowRefs', (
      select coalesce(jsonb_agg(windows.w), '[]'::jsonb)
      from (
        select jsonb_build_object('source_table', 'sector_regulatory_items', 'id', r.id) as w
        from public.sector_regulatory_items r
        where r.sector_id = p_sector_id and r.workspace_id = p_workspace_id
          and r.is_commercial_window = true
        union all
        select jsonb_build_object('source_table', 'sector_events', 'id', e.id)
        from public.sector_events e
        where e.sector_id = p_sector_id and e.workspace_id = p_workspace_id
          and e.commercial_opportunity is not null
      ) windows
    ),
    -- Dernier artefact account_knowledge par compte du secteur : matière
    -- d'agrégation pour l'analyse sectorielle. DISTINCT ON borne à 1 par compte
    -- (l'historique complet ferait exploser le payload sans valeur ajoutée).
    'recentAccountKnowledge', (
      select coalesce(jsonb_agg(to_jsonb(ak)), '[]'::jsonb)
      from (
        select distinct on (r.company_id)
          r.company_id, r.id as result_id, r.created_at, r.content_json
        from public.ai_intelligence_results r
        where r.workspace_id = p_workspace_id
          and r.result_type = 'account_knowledge'
          and r.status = 'succeeded'
          and r.company_id in (select id from scoped_companies)
        order by r.company_id, r.created_at desc
      ) ak
    ),
    'dataCutoffAt', now()
  )
$$;

revoke all on function public.get_sector_intelligence_context(uuid, uuid) from public;
revoke execute on function public.get_sector_intelligence_context(uuid, uuid) from anon, authenticated;
grant execute on function public.get_sector_intelligence_context(uuid, uuid) to service_role;

comment on function public.get_sector_intelligence_context(uuid, uuid) is
  'Lot 0 Intelligence — hydratation sectorielle pour les futurs artefacts sector_intelligence_analysis (schema_version 1). Rattachement au SECTEUR uniquement : aucune donnée propre à un compte ouvert. Appelée en service_role : l''isolation repose sur p_workspace_id, filtré dans chaque sous-requête.';
