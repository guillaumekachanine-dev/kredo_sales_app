-- ADR-0021 amendement (2026-08-21) — troisième statut de résolution : "estimated".
-- Décision Guillaume : traiter "aucune source unique ne publie le chiffre exact du segment"
-- comme "à trianguler depuis une décomposition officielle sourcée", pas comme "inconnu".
-- Distinct de not_published/not_applicable (qui bloquent la valeur ET l'héritage) :
-- "estimated" porte une vraie valeur segment, jamais héritée du macro, affichée avec un
-- badge de provenance distinct de "segment" (résolution propre) et "locked" (verrouillé).

create or replace function private.sector_resolve_scalar(
  p_segment numeric,
  p_macro numeric,
  p_lock_status text
)
returns numeric
language sql
immutable parallel safe
set search_path = ''
as $function$
  select case
    when p_lock_status in ('not_published', 'not_applicable') then null
    else coalesce(p_segment, p_macro)
  end;
$function$;

create or replace function private.sector_scalar_level(
  p_segment numeric,
  p_lock_status text
)
returns text
language sql
immutable parallel safe
set search_path = ''
as $function$
  select case
    when p_lock_status in ('not_published', 'not_applicable') then 'locked'
    when p_lock_status = 'estimated' then 'estimated'
    when p_segment is not null then 'segment'
    else 'macro'
  end;
$function$;

create or replace view public.v_sector_knowledge_resolved
with (security_invoker = true) as
select
  s.workspace_id,
  s.id as segment_id,
  s.name as segment_name,
  s.slug as segment_slug,
  s.status as segment_status,
  m.id as macro_id,
  m.name as macro_name,
  m.slug as macro_slug,
  m.status as macro_status,
  coalesce(nullif(btrim(s.description), ''), m.description) as description,
  private.sector_resolve_scalar(s.attractiveness_score, m.attractiveness_score, s.resolution_locks ->> 'attractiveness_score') as attractiveness_score,
  private.sector_resolve_scalar(s.market_size_eur_bn, m.market_size_eur_bn, s.resolution_locks ->> 'market_size_eur_bn') as market_size_eur_bn,
  private.sector_resolve_scalar(s.market_growth_pct, m.market_growth_pct, s.resolution_locks ->> 'market_growth_pct') as market_growth_pct,
  coalesce(nullif(btrim(s.digital_maturity), ''), m.digital_maturity) as digital_maturity,
  coalesce(s.avg_tjm_min, m.avg_tjm_min) as avg_tjm_min,
  coalesce(s.avg_tjm_max, m.avg_tjm_max) as avg_tjm_max,
  case when private.jsonb_is_filled(s.key_players_paca) then s.key_players_paca else m.key_players_paca end as key_players_paca,
  case when private.jsonb_is_filled(s.key_players_national) then s.key_players_national else m.key_players_national end as key_players_national,
  case when private.jsonb_is_filled(s.caveats) then s.caveats else m.caveats end as caveats,
  private.merge_sector_playbook(s.playbook, m.playbook) as playbook,
  private.merge_sector_practices_fit(s.practices_fit, m.practices_fit) as practices_fit,
  case when nullif(btrim(s.description), '') is not null then 'segment' else 'macro' end as description_level,
  private.sector_playbook_source_level(s.playbook, m.playbook) as playbook_level,
  private.sector_practices_fit_source_level(s.practices_fit, m.practices_fit) as practices_fit_level,
  private.sector_scalar_level(s.attractiveness_score, s.resolution_locks ->> 'attractiveness_score') as attractiveness_score_level,
  private.sector_scalar_level(s.market_size_eur_bn, s.resolution_locks ->> 'market_size_eur_bn') as market_size_eur_bn_level,
  private.sector_scalar_level(s.market_growth_pct, s.resolution_locks ->> 'market_growth_pct') as market_growth_pct_level,
  s.source_run_id,
  s.study_snapshot_date,
  (nullif(btrim(s.description), '') is not null
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
    or s.resolution_locks ?| array['attractiveness_score', 'market_size_eur_bn', 'market_growth_pct']
  ) as has_segment_knowledge
from sector_intelligence s
left join sector_intelligence m on m.id = s.parent_id
where s.level = 'segment';

drop function if exists private.sector_resolve_scalar(numeric, numeric, boolean);
drop function if exists private.sector_scalar_level(numeric, boolean);
