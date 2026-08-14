-- Veille ciblée comptes — cycle de vie, archivage et promotions de signaux.
--
-- `detected_at` est le timestamp métier utilisé par l'application pour dater
-- et ordonner les signaux. Le seuil reste calculé dans PostgreSQL afin de
-- conserver exactement la sémantique de deux mois calendaires.

create or replace function public.archive_stale_account_signals()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  archived_count integer;
begin
  update public.account_signals
  set
    status = 'archived',
    updated_at = current_timestamp
  where detected_at < current_timestamp - interval '2 months'
    and status not in ('archived', 'dismissed');

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

comment on function public.archive_stale_account_signals() is
  'Archive idempotently account signals strictly older than two calendar months, using detected_at.';

revoke all on function public.archive_stale_account_signals() from public, anon, authenticated;
grant execute on function public.archive_stale_account_signals() to service_role;

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
  and detected_at >= current_timestamp - interval '2 months';

comment on view public.v_active_account_signals is
  'Signals still actionable: archived/dismissed and signals strictly older than two calendar months are excluded.';

revoke all on public.v_active_account_signals from public, anon;
grant select on public.v_active_account_signals to authenticated, service_role;

alter table public.sector_news
  add column source_account_signal_id uuid null
  references public.account_signals(id) on delete set null;

comment on column public.sector_news.source_account_signal_id is
  'Account signal promoted into sector knowledge; preserves origin traceability.';

create unique index sector_news_source_account_signal_target_uidx
  on public.sector_news(workspace_id, sector_id, source_account_signal_id)
  where source_account_signal_id is not null;

create index sector_news_source_account_signal_idx
  on public.sector_news(source_account_signal_id)
  where source_account_signal_id is not null;

create table public.sector_playbook_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default private.current_workspace_id()
    references public.workspaces(id) on delete cascade,
  sector_id uuid not null
    references public.sector_intelligence(id) on delete cascade,
  account_signal_id uuid not null
    references public.account_signals(id) on delete restrict,
  promoted_by uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default current_timestamp,
  unique (workspace_id, sector_id, account_signal_id)
);

comment on table public.sector_playbook_signals is
  'Minimal traceable relation for account signals promoted into an existing sector playbook.';

create index sector_playbook_signals_sector_idx
  on public.sector_playbook_signals(workspace_id, sector_id, created_at desc);

create index sector_playbook_signals_signal_idx
  on public.sector_playbook_signals(account_signal_id);

alter table public.sector_playbook_signals enable row level security;

create policy sector_playbook_signals_select
on public.sector_playbook_signals
for select
to authenticated
using (workspace_id = (select private.current_workspace_id()));

revoke all on public.sector_playbook_signals from public, anon;
grant select on public.sector_playbook_signals to authenticated;
grant select, insert, update, delete on public.sector_playbook_signals to service_role;
