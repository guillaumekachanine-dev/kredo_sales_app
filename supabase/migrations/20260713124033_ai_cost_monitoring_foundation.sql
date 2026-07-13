-- ============================================================================
-- AI Cost Monitoring — Lot 0 (fondation)
-- ============================================================================
-- Contexte : audit live du 2026-07-13 a confirmé que le socle de mesure existe
-- à ~60% (tokens capturés sur 70/106 résultats) mais que le COÛT n'est JAMAIS
-- calculé (cost_estimate = 0/106, duration_ms = 0/106). Les colonnes rollup
-- ai_intelligence_runs.total_cost_estimate/total_tokens_* sont mortes (0 partout,
-- jamais écrites) — vérifié par grep : seul database.generated.ts les référence,
-- aucun code applicatif n'en dépend. Décision : les laisser mortes et construire
-- le modèle de coût entièrement en VUES (jamais recalculé côté front, doctrine
-- CJM/gross_margin_pct), sans trigger d'écriture sur les tables existantes.
--
-- ai_intelligence_results.started_at est TOUJOURS NULL (0/106) — la durée doit
-- être dérivée au niveau RUN (ai_intelligence_runs.completed_at − started_at,
-- 118/94 remplis), pas au niveau résultat.
--
-- Ce lot ne consomme aucun token LLM : uniquement SQL (table de prix + vues)
-- et une extension du reaper existant (ops-004) pour qu'il notifie au lieu de
-- reprendre les runs en silence.
-- ============================================================================

-- ── 1. Table de prix versionnée (effective-dated, même doctrine que
--       collaborator_compensation : une seule ligne "en vigueur" par modèle,
--       effective_to IS NULL) ──────────────────────────────────────────────

create table public.ai_model_pricing (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default private.current_workspace_id()
    references public.workspaces(id) on delete cascade,
  model text not null,
  input_price_per_mtok numeric(10,4) not null check (input_price_per_mtok >= 0),
  output_price_per_mtok numeric(10,4) not null check (output_price_per_mtok >= 0),
  effective_from date not null default current_date,
  effective_to date,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_model_pricing_effective_range_chk
    check (effective_to is null or effective_to > effective_from)
);

comment on table public.ai_model_pricing is
  'Grille tarifaire versionnée par modèle IA (effective-dated, même doctrine que '
  'collaborator_compensation). Source de vérité du coût — jamais recalculé côté front. '
  'Alimente v_ai_result_costs.';

-- Une seule ligne "courante" (effective_to IS NULL) par (workspace, modèle) —
-- pattern identique à collaborator_compensation.
create unique index ai_model_pricing_active_uniq
  on public.ai_model_pricing (workspace_id, model)
  where effective_to is null;

create index ai_model_pricing_workspace_id_idx
  on public.ai_model_pricing (workspace_id);

alter table public.ai_model_pricing enable row level security;

-- Motif RLS uniforme (pas de gate admin : c'est un référentiel de prix, pas
-- une donnée confidentielle comme la rémunération).
create policy ai_model_pricing_select on public.ai_model_pricing
  for select using (workspace_id = private.current_workspace_id());

create policy ai_model_pricing_insert on public.ai_model_pricing
  for insert with check (true);

create policy ai_model_pricing_update on public.ai_model_pricing
  for update using (workspace_id = private.current_workspace_id());

create policy ai_model_pricing_delete on public.ai_model_pricing
  for delete using (workspace_id = private.current_workspace_id());

create trigger set_updated_at_ai_model_pricing
  before update on public.ai_model_pricing
  for each row execute function private.set_updated_at();

-- Seed : claude-sonnet-5, tarif intro (2$/10$ par Mtok, jusqu'au 31/08/2026)
-- puis tarif standard (3$/15$) à partir du 01/09/2026. effective_from du tarif
-- intro fixé au 01/01/2026 pour couvrir sans risque tout l'historique existant
-- (premier run réel observé : 2026-06-13). Idempotent (NOT EXISTS), pas de
-- dépendance à un ID généré codé en dur.
insert into public.ai_model_pricing
  (workspace_id, model, input_price_per_mtok, output_price_per_mtok, effective_from, effective_to, source)
select w.id, v.model, v.input_price, v.output_price, v.eff_from, v.eff_to, v.source
from public.workspaces w
cross join (values
  ('claude-sonnet-5', 2.00::numeric, 10.00::numeric, date '2026-01-01', date '2026-08-31', 'anthropic_intro_pricing_2026'),
  ('claude-sonnet-5', 3.00::numeric, 15.00::numeric, date '2026-09-01', null::date,        'anthropic_standard_pricing_2026')
) as v(model, input_price, output_price, eff_from, eff_to, source)
where not exists (
  select 1 from public.ai_model_pricing p
  where p.workspace_id = w.id and p.model = v.model and p.effective_from = v.eff_from
);

-- ── Index ciblé unique (pas d'over-indexing à 130 lignes) ──────────────────
-- Un seul index ajouté, utilisé par 3 des 4 vues ci-dessous (fenêtre 30j par
-- run_type). À 130 lignes un index n'apporte rien de mesurable ; il est ajouté
-- par anticipation de la croissance (crons de veille récurrents), pas parce
-- que la table le justifie aujourd'hui.
create index if not exists ai_intelligence_runs_run_type_created_at_idx
  on public.ai_intelligence_runs (run_type, created_at desc);

-- ── 2. Vue de base : coût par résultat (phase) ─────────────────────────────
-- Distingue deux types de trous de données, pour ne jamais afficher un coût
-- silencieusement compris comme "gratuit" :
--   tokens_missing   : le workflow a un modèle mais n'a pas émis de tokens
--                      (ex. intel-010-refresh, callback à corriger)
--   pricing_missing  : tokens présents mais aucune ligne de prix ne matche
--                      (modèle non répertorié dans ai_model_pricing)
create view public.v_ai_result_costs
with (security_invoker = true) as
select
  res.id as result_id,
  res.run_id,
  res.workspace_id,
  res.owner_id,
  res.company_id,
  res.phase,
  res.result_type,
  res.status,
  res.model_used,
  res.tokens_input,
  res.tokens_output,
  res.created_at,
  res.completed_at,
  pr.input_price_per_mtok,
  pr.output_price_per_mtok,
  (res.model_used is not null and (res.tokens_input is null or res.tokens_output is null))
    as tokens_missing,
  (res.model_used is not null and res.tokens_input is not null and res.tokens_output is not null
    and pr.id is null) as pricing_missing,
  case
    when res.model_used is not null and res.tokens_input is not null and res.tokens_output is not null
      and pr.id is not null
    then round(
      (res.tokens_input::numeric * pr.input_price_per_mtok / 1000000)
      + (res.tokens_output::numeric * pr.output_price_per_mtok / 1000000),
      6
    )
    else null
  end as cost_estimate
from public.ai_intelligence_results res
left join lateral (
  select p.id, p.input_price_per_mtok, p.output_price_per_mtok
  from public.ai_model_pricing p
  where p.workspace_id = res.workspace_id
    and p.model = res.model_used
    and res.created_at::date >= p.effective_from
    and (p.effective_to is null or res.created_at::date < p.effective_to)
  order by p.effective_from desc
  limit 1
) pr on true;

comment on view public.v_ai_result_costs is
  'Coût dérivé par résultat (phase) — tokens × prix résolu à la date du résultat. '
  'tokens_missing/pricing_missing distinguent "callback incomplet" de "modèle non tarifé", '
  'jamais un $0.00 silencieux. Base des vues run/health/timeline ci-dessous.';

-- ── 3. Rollup par run : coût total + durée (jamais recalculé côté front) ───
-- Le coût total d'un run est NULL (pas 0, pas partiel) dès qu'UN SEUL de ses
-- résultats a un trou de données — évite de sous-estimer silencieusement un
-- run multi-phase partiellement instrumenté.
create view public.v_ai_run_costs
with (security_invoker = true) as
select
  r.id as run_id,
  r.workspace_id,
  r.owner_id,
  r.company_id,
  r.run_type,
  r.status,
  r.trigger_source,
  r.created_at,
  r.started_at,
  r.completed_at,
  r.failed_at,
  case
    when r.started_at is not null and r.completed_at is not null
    then (extract(epoch from (r.completed_at - r.started_at)) * 1000)::integer
    else null
  end as duration_ms,
  count(rc.result_id) as result_count,
  coalesce(sum(rc.tokens_input), 0) as tokens_input,
  coalesce(sum(rc.tokens_output), 0) as tokens_output,
  case
    when bool_or(rc.pricing_missing) or bool_or(rc.tokens_missing) then null
    else sum(rc.cost_estimate)
  end as cost_estimate,
  bool_or(rc.pricing_missing) as has_pricing_gap,
  bool_or(rc.tokens_missing) as has_tokens_gap
from public.ai_intelligence_runs r
left join public.v_ai_result_costs rc on rc.run_id = r.id
group by r.id, r.workspace_id, r.owner_id, r.company_id, r.run_type, r.status, r.trigger_source,
         r.created_at, r.started_at, r.completed_at, r.failed_at;

comment on view public.v_ai_run_costs is
  'Coût + durée par run (agrégat des phases). Coût NULL (jamais partiel) si un '
  'trou de données existe sur au moins une phase — has_pricing_gap/has_tokens_gap '
  'expliquent pourquoi. Durée dérivée de ai_intelligence_runs.started_at/completed_at '
  '(le seul niveau où ces colonnes sont réellement remplies).';

-- ── 4. Santé des workflows : succès, latence, runs bloqués ─────────────────
-- Seuils "bloqué maintenant" alignés sur les défauts de reap_stale_intelligence_runs
-- (15 min queued / 30 min running) — cohérence avec le reaper ops-004.
create view public.v_workflow_health
with (security_invoker = true) as
select
  r.workspace_id,
  r.run_type,
  count(*) filter (where r.created_at >= now() - interval '30 days') as runs_30d,
  count(*) filter (where r.status = 'succeeded' and r.created_at >= now() - interval '30 days')
    as succeeded_30d,
  count(*) filter (where r.status = 'failed' and r.created_at >= now() - interval '30 days')
    as failed_30d,
  round(
    100.0 * count(*) filter (where r.status = 'succeeded' and r.created_at >= now() - interval '30 days')
    / nullif(count(*) filter (
        where r.status in ('succeeded', 'failed') and r.created_at >= now() - interval '30 days'
      ), 0),
    1
  ) as success_rate_pct_30d,
  count(*) filter (
    where r.status = 'running' and coalesce(r.started_at, r.created_at) < now() - interval '30 minutes'
  ) as stuck_running_now,
  count(*) filter (
    where r.status = 'queued' and r.created_at < now() - interval '15 minutes'
  ) as stuck_queued_now,
  max(r.created_at) as last_run_at,
  max(r.created_at) filter (where r.status = 'succeeded') as last_success_at,
  max(r.created_at) filter (where r.status = 'failed') as last_failure_at,
  percentile_cont(0.5) within group (
    order by extract(epoch from (r.completed_at - r.started_at)) * 1000
  ) filter (
    where r.started_at is not null and r.completed_at is not null
      and r.created_at >= now() - interval '30 days'
  ) as p50_duration_ms,
  percentile_cont(0.95) within group (
    order by extract(epoch from (r.completed_at - r.started_at)) * 1000
  ) filter (
    where r.started_at is not null and r.completed_at is not null
      and r.created_at >= now() - interval '30 days'
  ) as p95_duration_ms
from public.ai_intelligence_runs r
group by r.workspace_id, r.run_type;

comment on view public.v_workflow_health is
  'Santé par workflow (run_type) : taux de succès 30j, p50/p95 de durée, compteurs '
  'de runs actuellement bloqués (mêmes seuils que reap_stale_intelligence_runs). '
  'Alimente l''onglet Santé de /automatisations.';

-- ── 5. Statistiques de coût par workflow (alimente les hints sous boutons) ─
create view public.v_workflow_cost_stats
with (security_invoker = true) as
select
  rc.workspace_id,
  rc.run_type,
  count(*) as runs_total,
  count(*) filter (where rc.created_at >= now() - interval '30 days') as runs_30d,
  round(avg(rc.cost_estimate) filter (where rc.created_at >= now() - interval '30 days'), 4)
    as avg_cost_30d,
  round(avg(rc.cost_estimate), 4) as avg_cost_all_time,
  round(avg(rc.tokens_input) filter (where rc.created_at >= now() - interval '30 days'))
    as avg_tokens_input_30d,
  round(avg(rc.tokens_output) filter (where rc.created_at >= now() - interval '30 days'))
    as avg_tokens_output_30d,
  sum(rc.cost_estimate) filter (where rc.created_at >= now() - interval '30 days') as total_cost_30d,
  bool_or(rc.has_pricing_gap) as has_pricing_gap,
  bool_or(rc.has_tokens_gap) as has_tokens_gap
from public.v_ai_run_costs rc
group by rc.workspace_id, rc.run_type;

comment on view public.v_workflow_cost_stats is
  'Moyennes de coût par workflow (30j + all-time). Source unique du composant '
  '<WorkflowCostHint> affiché sous les boutons de déclenchement IA.';

-- ── 6. Timeline de coût : jour × workflow × utilisateur ────────────────────
create view public.v_ai_cost_timeline
with (security_invoker = true) as
select
  rc.workspace_id,
  rc.owner_id,
  rc.run_type,
  rc.created_at::date as day,
  count(*) as runs,
  sum(rc.tokens_input) as tokens_input,
  sum(rc.tokens_output) as tokens_output,
  sum(rc.cost_estimate) as cost_estimate,
  bool_or(rc.has_pricing_gap) as has_pricing_gap,
  bool_or(rc.has_tokens_gap) as has_tokens_gap
from public.v_ai_run_costs rc
group by rc.workspace_id, rc.owner_id, rc.run_type, (rc.created_at::date);

comment on view public.v_ai_cost_timeline is
  'Coût agrégé par jour × workflow × utilisateur (owner_id). Alimente le graphique '
  'temporel et l''attribution par utilisateur de l''onglet Coûts.';

-- ── 7. Reaper (ops-004) étendu : notifie au lieu de reprendre en silence ───
-- Signature et valeur de retour inchangées (aucun appelant applicatif trouvé
-- par grep, seul database.generated.ts référence le nom — sûr à remplacer).
-- Un run repris crée désormais une notification in-app pour son owner, avec
-- un deep_link vers /automatisations. related_document_id reste NULL : sa FK
-- pointe vers intelligence_documents, pas vers ai_intelligence_runs — pas de
-- table pivot pour "notification liée à un run" aujourd'hui, le deep_link
-- textuel suffit pour ce cas d'usage.
create or replace function public.reap_stale_intelligence_runs(
  queued_timeout_minutes integer default 15,
  running_timeout_minutes integer default 30
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  reaped int;
begin
  with stale as (
    update ai_intelligence_runs r
    set status = 'failed',
        failed_at = now(),
        error_message = coalesce(
          r.error_message,
          format('Run repris automatiquement (ops-004) : statut %s dépassant le seuil de reprise.', r.status)
        )
    where (r.status = 'queued'
           and r.created_at < now() - make_interval(mins => queued_timeout_minutes))
       or (r.status = 'running'
           and coalesce(r.started_at, r.created_at) < now() - make_interval(mins => running_timeout_minutes))
    returning r.id, r.workspace_id, r.owner_id, r.run_type
  )
  insert into user_notifications (workspace_id, user_id, notification_type, title, body, deep_link)
  select
    s.workspace_id,
    s.owner_id,
    'ai_run_reaped',
    'Run IA repris automatiquement',
    format('Le workflow "%s" a dépassé son délai d''exécution et a été marqué en échec.', s.run_type),
    '/automatisations'
  from stale s;

  get diagnostics reaped = row_count;
  return reaped;
end;
$function$;

comment on function public.reap_stale_intelligence_runs is
  'ops-004 — reprend les runs bloqués (queued/running au-delà des seuils) en '
  'failed ET notifie l''owner in-app (Lot 0 monitoring IA, 2026-07-13). '
  'À appeler périodiquement (cf. migration cron séparée).';
