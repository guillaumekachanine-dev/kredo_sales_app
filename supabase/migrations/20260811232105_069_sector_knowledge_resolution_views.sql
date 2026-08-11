-- ============================================================================
-- 069 — Résolution sectorielle héritée (segment → macro), en LECTURE seule.
--
-- Chantier « Connaissance & intelligence sectorielle », Lot 0.
-- Décision D-B : la résolution se fait à la LECTURE, jamais par recopie.
-- Aucune table créée, aucune donnée écrite. `companies.sector_id` est conservé
-- comme projection, écrite par `apply_account_classification()` seule ; ce lot
-- cesse simplement de le LIRE comme source de connaissance sectorielle.
--
-- Deux vues, toutes deux `security_invoker = true` (convention migrations
-- 060/067 : la RLS de l'appelant doit s'appliquer, sinon fuite de workspace).
--
-- Substitution pour les champs scalaires et le playbook, UNION pour les items :
-- un item de segment n'est pas une « version » d'un item de macro, ce sont
-- deux faits distincts.
-- ============================================================================

-- ── Helpers de résolution (schéma `private` : non exposés par PostgREST) ────

-- « Rempli » au sens de ce lot : ni NULL, ni null JSON, ni [], ni {}, ni "".
-- Les 36 segments issus du seed de taxonomie portent les 4 clés de playbook
-- avec des tableaux VIDES : sans ce test, une fusion naïve écraserait les
-- 13 playbooks macro réellement remplis.
create or replace function private.jsonb_is_filled(p_value jsonb)
returns boolean language sql immutable parallel safe as $$
  select p_value is not null
     and jsonb_typeof(p_value) <> 'null'
     and p_value <> '[]'::jsonb
     and p_value <> '{}'::jsonb
     and p_value <> '""'::jsonb;
$$;

comment on function private.jsonb_is_filled(jsonb) is
  'Lot 0 résolution sectorielle : une valeur jsonb porte-t-elle du contenu ? NULL, null JSON, [], {} et "" comptent pour vide.';

-- Fusion CLÉ PAR CLÉ, jamais blob entier.
create or replace function private.merge_sector_playbook(p_segment jsonb, p_macro jsonb)
returns jsonb language sql immutable parallel safe as $$
  select coalesce(jsonb_object_agg(merged.k, merged.v) filter (where merged.v is not null), '{}'::jsonb)
  from (
    select k,
      case when private.jsonb_is_filled(coalesce(p_segment, '{}'::jsonb) -> k) then p_segment -> k
           else coalesce(p_macro, '{}'::jsonb) -> k end as v
    from jsonb_object_keys(coalesce(p_segment, '{}'::jsonb) || coalesce(p_macro, '{}'::jsonb)) as k
  ) merged;
$$;

comment on function private.merge_sector_playbook(jsonb, jsonb) is
  'Fusion clé par clé du playbook segment sur le playbook macro : pour chaque clé, le tableau du segment s''il est non vide, sinon celui du macro.';

-- `practices_fit` est un vecteur de scores numériques ; les 37 segments de seed
-- le portent à zéro sur les 4 practices. Un 0 y vaut donc « non renseigné » —
-- sans ce test, un segment de seed masquerait le profil de son macro.
create or replace function private.merge_sector_practices_fit(p_segment jsonb, p_macro jsonb)
returns jsonb language sql immutable parallel safe as $$
  select coalesce(jsonb_object_agg(merged.k, merged.v) filter (where merged.v is not null), '{}'::jsonb)
  from (
    select k,
      case when private.jsonb_is_filled(coalesce(p_segment, '{}'::jsonb) -> k)
                and not (jsonb_typeof(p_segment -> k) = 'number' and (p_segment ->> k)::numeric = 0)
             then p_segment -> k
           else coalesce(p_macro, '{}'::jsonb) -> k end as v
    from jsonb_object_keys(coalesce(p_segment, '{}'::jsonb) || coalesce(p_macro, '{}'::jsonb)) as k
  ) merged;
$$;

comment on function private.merge_sector_practices_fit(jsonb, jsonb) is
  'Fusion clé par clé de practices_fit ; un score numérique à 0 est traité comme non renseigné (squelette de seed) et laisse passer la valeur macro.';

create or replace function private.sector_playbook_source_level(p_segment jsonb, p_macro jsonb)
returns text language sql immutable parallel safe as $$
  select case when exists (
    select 1 from jsonb_object_keys(coalesce(p_segment, '{}'::jsonb)) as k
    where private.jsonb_is_filled(p_segment -> k)
  ) then 'segment' else 'macro' end;
$$;

comment on function private.sector_playbook_source_level(jsonb, jsonb) is
  'Provenance dominante d''un playbook résolu : segment dès qu''au moins une clé du segment porte du contenu, macro sinon.';

create or replace function private.sector_practices_fit_source_level(p_segment jsonb, p_macro jsonb)
returns text language sql immutable parallel safe as $$
  select case when exists (
    select 1 from jsonb_object_keys(coalesce(p_segment, '{}'::jsonb)) as k
    where private.jsonb_is_filled(p_segment -> k)
      and not (jsonb_typeof(p_segment -> k) = 'number' and (p_segment ->> k)::numeric = 0)
  ) then 'segment' else 'macro' end;
$$;

comment on function private.sector_practices_fit_source_level(jsonb, jsonb) is
  'Provenance dominante de practices_fit résolu, en traitant un score à 0 comme non renseigné.';

grant execute on function private.jsonb_is_filled(jsonb) to authenticated, service_role;
grant execute on function private.merge_sector_playbook(jsonb, jsonb) to authenticated, service_role;
grant execute on function private.merge_sector_practices_fit(jsonb, jsonb) to authenticated, service_role;
grant execute on function private.sector_playbook_source_level(jsonb, jsonb) to authenticated, service_role;
grant execute on function private.sector_practices_fit_source_level(jsonb, jsonb) to authenticated, service_role;

-- ── Vue 1 — champs scalaires et playbook résolus ───────────────────────────

drop view if exists public.v_sector_knowledge_resolved;

create view public.v_sector_knowledge_resolved
with (security_invoker = true) as
select
  s.workspace_id,
  s.id as segment_id, s.name as segment_name, s.slug as segment_slug, s.status as segment_status,
  m.id as macro_id, m.name as macro_name, m.slug as macro_slug, m.status as macro_status,

  coalesce(nullif(btrim(s.description), ''), m.description) as description,
  coalesce(s.attractiveness_score, m.attractiveness_score) as attractiveness_score,
  coalesce(s.market_size_eur_bn, m.market_size_eur_bn) as market_size_eur_bn,
  coalesce(s.market_growth_pct, m.market_growth_pct) as market_growth_pct,
  coalesce(nullif(btrim(s.digital_maturity), ''), m.digital_maturity) as digital_maturity,
  coalesce(s.avg_tjm_min, m.avg_tjm_min) as avg_tjm_min,
  coalesce(s.avg_tjm_max, m.avg_tjm_max) as avg_tjm_max,
  case when private.jsonb_is_filled(s.key_players_paca)
       then s.key_players_paca else m.key_players_paca end as key_players_paca,
  case when private.jsonb_is_filled(s.key_players_national)
       then s.key_players_national else m.key_players_national end as key_players_national,
  case when private.jsonb_is_filled(s.caveats)
       then s.caveats else m.caveats end as caveats,
  private.merge_sector_playbook(s.playbook, m.playbook) as playbook,
  private.merge_sector_practices_fit(s.practices_fit, m.practices_fit) as practices_fit,

  case when nullif(btrim(s.description), '') is not null then 'segment' else 'macro' end as description_level,
  private.sector_playbook_source_level(s.playbook, m.playbook) as playbook_level,
  private.sector_practices_fit_source_level(s.practices_fit, m.practices_fit) as practices_fit_level,

  (
    nullif(btrim(s.description), '') is not null
    or s.attractiveness_score is not null
    or s.market_size_eur_bn is not null
    or s.market_growth_pct is not null
    or nullif(btrim(s.digital_maturity), '') is not null
    or s.avg_tjm_min is not null
    or s.avg_tjm_max is not null
    or private.jsonb_is_filled(s.key_players_paca)
    or private.jsonb_is_filled(s.key_players_national)
    or private.sector_playbook_source_level(s.playbook, m.playbook) = 'segment'
    or private.sector_practices_fit_source_level(s.practices_fit, m.practices_fit) = 'segment'
  ) as has_segment_knowledge
from public.sector_intelligence s
left join public.sector_intelligence m on m.id = s.parent_id
where s.level = 'segment';

comment on view public.v_sector_knowledge_resolved is
  'Lot 0 — 1 ligne par fiche sector_intelligence de niveau segment, champs scalaires / playbook / practices_fit résolus par héritage du macro parent. Substitution (pas union) : le segment prime champ par champ quand il est rempli. description_level / playbook_level / practices_fit_level portent la provenance, l''UI doit pouvoir dire « hérité du macro-secteur ».';

-- ── Vue 2 — items visibles depuis un segment (union segment + macro) ───────

drop view if exists public.v_sector_knowledge_items;

create view public.v_sector_knowledge_items
with (security_invoker = true) as
with scopes as (
  select s.id as segment_id, s.parent_id as macro_id, s.id as source_sector_id, 'segment'::text as resolved_level
  from public.sector_intelligence s
  where s.level = 'segment'
  union all
  select s.id, s.parent_id, s.parent_id, 'macro'::text
  from public.sector_intelligence s
  where s.level = 'segment' and s.parent_id is not null
)
select
  sc.segment_id, sc.macro_id, sc.source_sector_id, sc.resolved_level,
  'regulatory'::text     as item_kind,
  r.id                   as item_id,
  r.workspace_id,
  r.name                 as title,
  r.description          as description,
  r.source_url           as source_url,
  r.authority            as authority,
  r.kredo_practice       as kredo_practice,
  r.commercial_angle     as commercial_angle,
  r.is_commercial_window as is_commercial_window,
  r.deadline_date        as deadline_date,
  r.urgency              as urgency,
  null::text             as event_type,
  null::date             as event_date,
  null::text             as event_status,
  null::text             as commercial_opportunity,
  null::timestamptz      as published_at,
  null::numeric          as relevance_score,
  null::boolean          as is_trigger_event,
  null::text             as news_source,
  null::integer          as frequency_count,
  null::uuid[]           as source_company_ids,
  null::text             as verbatim,
  r.created_at, r.updated_at
from scopes sc
join public.sector_regulatory_items r on r.sector_id = sc.source_sector_id

union all
select
  sc.segment_id, sc.macro_id, sc.source_sector_id, sc.resolved_level,
  'pain_point'::text, p.id, p.workspace_id,
  p.title, p.description, null::text, null::text,
  p.kredo_practice, null::text, null::boolean,
  null::date, null::text,
  null::text, null::date, null::text, null::text,
  null::timestamptz, null::numeric, null::boolean, null::text,
  p.frequency_count, p.source_company_ids, p.verbatim,
  p.created_at, p.updated_at
from scopes sc
join public.sector_pain_points p on p.sector_id = sc.source_sector_id

union all
select
  sc.segment_id, sc.macro_id, sc.source_sector_id, sc.resolved_level,
  'event'::text, e.id, e.workspace_id,
  e.title, e.description, e.source_url, null::text,
  null::text, null::text, null::boolean,
  null::date, null::text,
  e.event_type, e.event_date, e.status, e.commercial_opportunity,
  null::timestamptz, null::numeric, null::boolean, null::text,
  null::integer, null::uuid[], null::text,
  e.created_at, e.updated_at
from scopes sc
join public.sector_events e on e.sector_id = sc.source_sector_id

union all
select
  sc.segment_id, sc.macro_id, sc.source_sector_id, sc.resolved_level,
  'news'::text, n.id, n.workspace_id,
  n.title, n.summary, n.url, null::text,
  null::text, null::text, null::boolean,
  null::date, null::text,
  null::text, null::date, null::text, null::text,
  n.published_at, n.relevance_score, n.is_trigger_event, n.source,
  null::integer, null::uuid[], null::text,
  n.created_at, n.created_at
from scopes sc
join public.sector_news n on n.sector_id = sc.source_sector_id;

comment on view public.v_sector_knowledge_items is
  'Lot 0 — 1 ligne par item de connaissance sectorielle VISIBLE depuis un segment. UNION segment + macro parent (jamais substitution : un item de segment ne masque pas un item de macro). resolved_level porte la provenance.';

grant select on public.v_sector_knowledge_resolved to authenticated, service_role;
grant select on public.v_sector_knowledge_items to authenticated, service_role;
