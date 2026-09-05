-- ADR-0022 §3.2 et §3.5 — le sujet sur le digest, et la vue du mode corpus.

-- ── 1. Le sujet, le segment vise, le corpus employe, le mode de declenchement ──
alter table public.veille_digests
  add column if not exists topic_key        text not null default 'global',
  add column if not exists topic_sector_id  uuid null references public.sector_intelligence(id),
  add column if not exists source_corpus_id uuid null references public.source_corpora(id),
  -- NULLABLE a dessein : les 10 digests anterieurs n'ont pas de provenance tracable
  -- (1 seule correlation avec `ai_intelligence_runs` sur 10, et plusieurs digests hors
  -- creneau cron). NULL = provenance historique inconnue ; le workflow la renseigne
  -- systematiquement a partir du Lot 2. Ne jamais backfiller a 'scheduled' : ce serait
  -- inventer un fait.
  add column if not exists generation_mode  text null;

alter table public.veille_digests
  drop constraint if exists veille_digests_generation_mode_check;
alter table public.veille_digests
  add constraint veille_digests_generation_mode_check
  check (generation_mode is null or generation_mode in ('scheduled', 'manual'));

comment on column public.veille_digests.topic_key is
  'ADR-0022 : cle du sujet — ''global'', une cle du registre TS DIGEST_PRESETS (''ia'', ''llm''...), '
  'ou LE SLUG d''un segment sector_intelligence. Jamais la valeur litterale ''segment'' : deux '
  'segments differents entreraient alors en collision sur la cle d''unicite le meme jour.';
comment on column public.veille_digests.generation_mode is
  'ADR-0022 : ''scheduled'' (cron) | ''manual'' (webhook). NULL = digest anterieur au Lot 2, provenance inconnue.';

-- ── 2. La cle d'unicite porte desormais le sujet ───────────────────────────────
-- Un index unique PARTIEL (WHERE generation_mode=...) serait inutilisable :
-- PostgREST ne sait pas emettre la clause WHERE qu'exige l'inference d'index partiel
-- dans ON CONFLICT, et l'upsert du workflow cesserait de fonctionner.
-- La cle a trois colonnes preserve l'idempotence du cron (topic_key='global') et
-- donne une semantique lisible : un digest par sujet et par jour.
alter table public.veille_digests
  drop constraint if exists veille_digests_workspace_id_digest_date_key;
alter table public.veille_digests
  add constraint veille_digests_workspace_id_digest_date_topic_key
  unique (workspace_id, digest_date, topic_key);

-- ── 3. Index ───────────────────────────────────────────────────────────────────
-- Couverture des deux nouvelles FK (convention du depot).
create index if not exists idx_veille_digests_topic_sector_id
  on public.veille_digests (topic_sector_id) where topic_sector_id is not null;
create index if not exists idx_veille_digests_source_corpus_id
  on public.veille_digests (source_corpus_id) where source_corpus_id is not null;
-- Lecture « le dernier digest de ce sujet » : la cle d'unicite ci-dessus ordonne
-- par digest_date APRES workspace_id mais avant topic_key, elle ne sert pas ce filtre.
create index if not exists idx_veille_digests_ws_topic_date
  on public.veille_digests (workspace_id, topic_key, digest_date desc);

-- ── 4. La seule source de verite du mode corpus (ADR-0022 §3.5) ────────────────
-- Ne JAMAIS filtrer `v_effective_watch_sources` sur `corpus_id` a la place : son
-- DISTINCT ON (usage_scope, company_id, source_id) ORDER BY priority fait gagner la
-- ligne `origin='system'`, qui porte `corpus_id = NULL`. Le filtre supprimerait
-- precisement les sources partagees entre un corpus et le socle (OpenAI, One Useful Thing).
--
-- Volontairement SANS `co.enabled_for_news` : ce drapeau gouverne l'entree d'un corpus
-- dans le digest du CRON (branche 2 de v_effective_watch_sources). Un corpus thematique
-- est importe avec enabled_for_news = false precisement pour ne pas elargir le cron en
-- silence (ADR-0022 §3.6) ; il doit rester selectionnable en mode corpus explicite.
create or replace view public.v_corpus_news_sources
with (security_invoker = true) as
select
  co.id            as corpus_id,
  co.slug          as corpus_slug,
  co.scope_kind    as corpus_scope_kind,
  sc.id            as source_id,
  sc.source_key,
  sc.name          as source_name,
  sc.publisher,
  sc.domain,
  sc.search_domain,
  sc.collection_url,
  case when sc.collection_url is not null then 'rss' else 'site_search' end as collection_mode,
  sc.family,
  sc.kredo_category,
  sc.origin,
  coalesce(sci.utility_score, 0) as utility_score,
  case when sci.pack = 'minimal' then 0 else 1 end
    + case when sci.automation_fit = 'manual_only' then 1 else 0 end as priority
from public.source_corpora co
join public.source_corpus_items sci on sci.corpus_id = co.id
join public.source_catalog sc       on sc.id = sci.source_id
where co.activation_state = 'active'
  and co.is_current
  and sci.is_enabled
  and sci.news_eligible
  and sc.is_active
  and sc.content_temporality <> 'static'
  and sc.validation_status <> all (array['rejected', 'unreachable']);

comment on view public.v_corpus_news_sources is
  'ADR-0022 §3.5 — sources collectables d''un corpus pour un digest en mode corpus. '
  'Reapplique EN SQL, une seule fois, les garde-fous de selection ; ne jamais les recopier '
  'dans un noeud Code n8n. Ne pas remplacer par un filtre corpus_id sur v_effective_watch_sources.';
