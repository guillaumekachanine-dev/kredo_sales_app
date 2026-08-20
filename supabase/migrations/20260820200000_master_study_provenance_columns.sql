-- Master Study — provenance et verrou de résolution (ADR-0021 §5, §6, MS-10, MS-12).
-- Additif uniquement : aucune table créée, aucune donnée existante modifiée.

alter table public.sector_intelligence
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null,
  add column study_snapshot_date date,
  add column resolution_locks jsonb not null default '{}'::jsonb;

alter table public.sector_events
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.sector_pain_points
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.sector_regulatory_items
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.value_chain_nodes
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.competitive_map_entries
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

-- Index : le rollback d'un run (ADR §5.3 — « supprimer/remplacer les lignes du
-- source_run_id concerné ») filtre ces 5 tables par ce champ.
create index if not exists sector_events_source_run_id_idx on public.sector_events(source_run_id);
create index if not exists sector_pain_points_source_run_id_idx on public.sector_pain_points(source_run_id);
create index if not exists sector_regulatory_items_source_run_id_idx on public.sector_regulatory_items(source_run_id);
create index if not exists value_chain_nodes_source_run_id_idx on public.value_chain_nodes(source_run_id);
create index if not exists competitive_map_entries_source_run_id_idx on public.competitive_map_entries(source_run_id);

comment on column public.sector_intelligence.resolution_locks is
  'ADR-0021 §6 — verrou de résolution par champ scalaire. Clé = nom de colonne
   (''attractiveness_score'' | ''market_size_eur_bn'' | ''market_growth_pct''), valeur = motif
   (''explicit_unknown'' | ''not_applicable''). Une clé présente BLOQUE l''héritage macro dans
   v_sector_knowledge_resolved, même si la colonne source vaut NULL. Écrit uniquement par
   l''importeur Master Study (L2) — jamais par le client. NE JAMAIS stocker ce mécanisme dans
   `caveats` : cette colonne est résolue par substitution du blob ENTIER, y écrire efface les
   caveats du macro (même défaut que la migration 071 a corrigé pour `playbook`).';

-- ── Deux fonctions de résolution — schéma `private` ────────────────────────

create or replace function private.sector_resolve_scalar(p_segment numeric, p_macro numeric, p_locked boolean)
returns numeric language sql immutable parallel safe set search_path = '' as $$
  select case when p_locked then null else coalesce(p_segment, p_macro) end;
$$;

comment on function private.sector_resolve_scalar(numeric, numeric, boolean) is
  'ADR-0021 §6 — résout un scalaire segment/macro. Un verrou (p_locked=true) force NULL même si
   le segment ou le macro porte une valeur : le verrou l''emporte toujours.';

create or replace function private.sector_scalar_level(p_segment numeric, p_locked boolean)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when p_locked then 'locked' when p_segment is not null then 'segment' else 'macro' end;
$$;

comment on function private.sector_scalar_level(numeric, boolean) is
  'ADR-0021 §6 — provenance d''un scalaire résolu : locked (segment étudié, non publiable),
   segment (le segment porte sa propre valeur), macro (hérité).';

grant execute on function private.sector_resolve_scalar(numeric, numeric, boolean) to authenticated, service_role;
grant execute on function private.sector_scalar_level(numeric, boolean) to authenticated, service_role;

-- ── Réécriture de la vue — DROP + CREATE ────────────────────────────────────

drop view if exists public.v_sector_knowledge_resolved;

create view public.v_sector_knowledge_resolved
with (security_invoker = true) as
select
  s.workspace_id,
  s.id as segment_id, s.name as segment_name, s.slug as segment_slug, s.status as segment_status,
  m.id as macro_id, m.name as macro_name, m.slug as macro_slug, m.status as macro_status,

  coalesce(nullif(btrim(s.description), ''), m.description) as description,

  private.sector_resolve_scalar(s.attractiveness_score, m.attractiveness_score,
    s.resolution_locks ? 'attractiveness_score') as attractiveness_score,
  private.sector_resolve_scalar(s.market_size_eur_bn, m.market_size_eur_bn,
    s.resolution_locks ? 'market_size_eur_bn') as market_size_eur_bn,
  private.sector_resolve_scalar(s.market_growth_pct, m.market_growth_pct,
    s.resolution_locks ? 'market_growth_pct') as market_growth_pct,

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
  private.sector_scalar_level(s.attractiveness_score, s.resolution_locks ? 'attractiveness_score') as attractiveness_score_level,
  private.sector_scalar_level(s.market_size_eur_bn, s.resolution_locks ? 'market_size_eur_bn') as market_size_eur_bn_level,
  private.sector_scalar_level(s.market_growth_pct, s.resolution_locks ? 'market_growth_pct') as market_growth_pct_level,

  s.source_run_id,
  s.study_snapshot_date,

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
    or s.resolution_locks ?| array['attractiveness_score','market_size_eur_bn','market_growth_pct']
  ) as has_segment_knowledge
from public.sector_intelligence s
left join public.sector_intelligence m on m.id = s.parent_id
where s.level = 'segment';

comment on view public.v_sector_knowledge_resolved is
  'Lot 0 (migration 069) + L1 ADR-0021 (provenance/verrou). 1 ligne par fiche sector_intelligence
   de niveau segment. Les 3 champs scalaires portent désormais un niveau à 3 valeurs
   (segment/macro/locked) : locked signifie « le segment a été étudié, la valeur n''est pas
   publiable », distinct de macro (« pas de connaissance segment »). Ne jamais confondre les
   deux dans l''UI.';

grant select on public.v_sector_knowledge_resolved to authenticated, service_role;
