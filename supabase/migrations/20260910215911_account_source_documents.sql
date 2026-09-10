-- Account Intelligence — store des documents réellement récupérés (INTEL-035).
-- Corpus : docs/FEATURES/cockpit_intelligence_features/account_intelligence/05-CONTRAT-SOURCE-PLAN-INTEL-035.md
-- Rollback : drop table public.account_source_documents cascade;
--
-- Pourquoi une table plutôt qu'une colonne sur intelligence_sources : cette dernière ne porte
-- qu'`evidence_excerpt`, un EXTRAIT. Y loger un corps de page de 14 000 caractères serait un
-- mensonge sémantique durable. C'est la seule addition de schéma du chantier (corpus, 06 §1).
--
-- Doctrine portée par le schéma lui-même (axiome A2 du corpus) : « on ne propose que ce qu'on a
-- lu ». La contrainte `asd_lu_ou_injoignable` rend impossible l'enregistrement d'un document
-- présenté comme exploitable sans texte extrait — c'est la traduction en DDL du défaut qui a
-- motivé tout le chantier (4 runs V4 publiés `succeeded` avec external_pages_fetched = 0).

create table public.account_source_documents (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  run_id            uuid not null references public.ai_intelligence_runs(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,

  -- Identification du document
  url               text not null,
  canonical_url     text,
  domain            text not null,
  title             text,
  published_at      timestamptz,

  -- Rôle dans le plan de sources
  kind              text not null check (kind in (
                      'registry', 'company_official', 'press', 'specialised_study',
                      'regulatory', 'job_board', 'internal')),
  serves_modules    text[] not null default '{}',
  reason            text,
  origin            text not null check (origin in ('discovered', 'manual', 'corpus', 'catalog')),
  source_catalog_id uuid references public.source_catalog(id) on delete set null,

  -- Résultat de la récupération
  status            text not null check (status in ('retrieved', 'unreachable')),
  fetched_at        timestamptz,
  http_status       integer,
  collection_method text,
  content_hash      text,
  extracted_text    text,
  extracted_chars   integer check (extracted_chars is null or extracted_chars >= 0),
  failure_reason    text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- A2 — un document « retrieved » a été lu, sinon il n'est pas « retrieved ».
  constraint asd_lu_ou_injoignable check (
    (status = 'retrieved'
      and content_hash is not null
      and extracted_text is not null
      and extracted_chars is not null
      and extracted_chars > 0
      and fetched_at is not null
      and failure_reason is null)
    or
    (status = 'unreachable'
      and failure_reason is not null
      and extracted_text is null
      and content_hash is null)
  )
);

comment on table public.account_source_documents is
  'Documents externes réellement récupérés par INTEL-035 pour un run Account Intelligence. Store de preuve immuable : la curation (approuvé / exclu) vit dans l''artefact account_source_plan, pas ici.';
comment on column public.account_source_documents.run_id is
  'Le run INTEL-035 qui a récupéré le document. Le run INTEL-030 consommateur cite ces lignes par leur id — il ne refetch jamais.';
comment on column public.account_source_documents.status is
  '`retrieved` = texte extrait disponible. `unreachable` = échec, avec motif. Aucun troisième état : une URL sélectionnée mais non tentée n''entre pas dans cette table.';
comment on column public.account_source_documents.content_hash is
  'SHA-256 du texte extrait. Sert la déduplication intra-run et la détection de page inchangée entre deux runs.';
comment on column public.account_source_documents.extracted_text is
  'Corps de page nettoyé. C''est ce que le LLM lit — jamais le HTML brut, jamais un snippet de moteur de recherche.';
comment on column public.account_source_documents.serves_modules is
  'Identifiants canoniques de modules (corpus, 03 §3), jamais des libellés d''interface.';
comment on column public.account_source_documents.failure_reason is
  'Obligatoire et exclusif au statut `unreachable`. Rendu à l''utilisateur : c''est ce qui rend le mode dégradé visible au lieu de silencieux.';

-- Déduplication : un même contenu n'est pas stocké deux fois dans un run.
create unique index asd_unique_content on public.account_source_documents (run_id, content_hash)
  where content_hash is not null;
-- Une URL n'est tentée qu'une fois par run, succès ou échec.
create unique index asd_unique_url     on public.account_source_documents (run_id, url);

create index asd_company_idx   on public.account_source_documents (company_id, status, fetched_at desc);
create index asd_run_idx       on public.account_source_documents (run_id);
create index asd_workspace_idx on public.account_source_documents (workspace_id);

create trigger trg_account_source_documents_updated_at before update
  on public.account_source_documents
  for each row execute function private.set_updated_at();

-- RLS — motif des tables de preuve du domaine intelligence (intelligence_sources,
-- account_facts, account_signals) : LECTURE SEULE côté client, écriture exclusivement
-- service-role depuis le callback n8n. La curation ne mute pas ce store.
alter table public.account_source_documents enable row level security;

create policy workspace_read on public.account_source_documents for select
  using (workspace_id = (select private.current_workspace_id()));

grant select on public.account_source_documents to anon, authenticated;
grant select, insert, update, delete on public.account_source_documents to service_role;
