-- 20260706120000_veille_actualite.sql
-- Feature "Veille & Actualité" — digests hebdomadaires générés par n8n (workflow
-- "KREDO — Veille Hebdomadaire IA & Marché") et persistés pour affichage dans l'app.
--
-- ⚠️ Migration reconstruite par Claude Code à partir des colonnes utilisées dans
-- kredo_n8n_workflow_veille_v1.0.md (nœuds C1, C2, F1, F2, F3) : le document source
-- ne contenait PAS de SQL exécutable malgré ce qu'annonce le handoff — voir rapport
-- de livraison. NE PAS APPLIQUER sans validation explicite de Guillaume.

create table if not exists public.veille_digests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default private.current_workspace_id() references public.workspaces(id),
  digest_date date not null,
  titre_digest text not null,
  resume_hebdo text not null,
  super_short_summary text not null,
  model_classement text not null,
  model_analyse text not null,
  nb_candidats_evalues integer not null default 0,
  nb_sources_actives integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, digest_date)
);

create table if not exists public.veille_articles (
  id uuid primary key default gen_random_uuid(),
  digest_id uuid not null references public.veille_digests(id) on delete cascade,
  workspace_id uuid not null default private.current_workspace_id() references public.workspaces(id),
  selection_rank smallint not null,
  titre_fr text not null,
  source_name text not null,
  url text not null,
  url_hash text not null,
  published_at timestamptz,
  resume text not null,
  analyse_kredo text not null,
  action_commerciale text not null,
  secteur_principal text not null default 'transverse',
  secteur_secondaire text not null default '',
  categorie text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index couvrant le SEUL pattern de lecture réel du nœud C1 (GET filtré sur
-- created_at, url_hash simplement renvoyé puis dédupliqué en JS côté n8n —
-- jamais filtré en SQL). (workspace_id, created_at) sert la RLS + le filtre
-- de récence ; INCLUDE (url_hash) rend le scan index-only (pas d'accès heap).
-- Pas d'index dédié sur url_hash seul : aucune requête ne filtre dessus.
create index if not exists idx_veille_articles_workspace_created
  on public.veille_articles (workspace_id, created_at) include (url_hash);

-- Index sur la FK digest_id : indispensable (Postgres n'indexe jamais les FK
-- automatiquement), sert le ON DELETE CASCADE et un futur listing par digest.
create index if not exists idx_veille_articles_digest_id
  on public.veille_articles (digest_id);

-- Pas d'index supplémentaire sur veille_digests : la contrainte UNIQUE
-- (workspace_id, digest_date) crée déjà un btree (workspace_id, digest_date)
-- que Postgres peut parcourir dans les deux sens (ORDER BY digest_date DESC
-- l'utilise nativement, pas besoin d'un second index dupliqué en DESC).

alter table public.veille_digests enable row level security;
alter table public.veille_articles enable row level security;

-- ⚠️ private.current_workspace_id() enveloppée dans (select ...) : sans ce
-- wrapping, Postgres réévalue la fonction à CHAQUE ligne scannée au lieu de
-- la mettre en cache une fois par requête (règle security-rls-performance).
create policy veille_digests_select on public.veille_digests
  for select using (workspace_id = (select private.current_workspace_id()));
create policy veille_digests_insert on public.veille_digests
  for insert with check (true);
create policy veille_digests_update on public.veille_digests
  for update using (workspace_id = (select private.current_workspace_id()));
create policy veille_digests_delete on public.veille_digests
  for delete using (workspace_id = (select private.current_workspace_id()));

create policy veille_articles_select on public.veille_articles
  for select using (workspace_id = (select private.current_workspace_id()));
create policy veille_articles_insert on public.veille_articles
  for insert with check (true);
create policy veille_articles_update on public.veille_articles
  for update using (workspace_id = (select private.current_workspace_id()));
create policy veille_articles_delete on public.veille_articles
  for delete using (workspace_id = (select private.current_workspace_id()));

create trigger trg_veille_digests_updated_at before update on public.veille_digests
  for each row execute function private.set_updated_at();
create trigger trg_veille_articles_updated_at before update on public.veille_articles
  for each row execute function private.set_updated_at();

create trigger trg_veille_digests_audit after insert or update or delete on public.veille_digests
  for each row execute function private.log_audit();
create trigger trg_veille_articles_audit after insert or update or delete on public.veille_articles
  for each row execute function private.log_audit();
