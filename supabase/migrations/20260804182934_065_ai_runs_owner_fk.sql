-- ─────────────────────────────────────────────────────────────────────────────
-- 065 — Clé étrangère manquante ai_intelligence_runs.owner_id → profiles.id
--
-- Contexte : owner_id a été déclaré `uuid not null default auth.uid()` dans
-- 006_ai_intelligence.sql SANS `REFERENCES`. Conséquence directe et jamais
-- détectée : PostgREST refuse l'embed `owner:profiles(full_name)` (PGRST200,
-- HTTP 400), donc la requête du journal d'exécution de /automations échouait
-- à chaque chargement et la section restait vide depuis sa mise en service.
--
-- ON DELETE RESTRICT : même doctrine que intelligence_documents.owner_id
-- (migration 042), seul autre owner_id NOT NULL référençant profiles — on ne
-- détruit pas l'historique d'exécution en supprimant un profil.
--
-- Vérifié avant application : 0 run orphelin (216 runs, 1 seul owner distinct,
-- présent dans profiles), et pose de la contrainte validée en dry-run ROLLBACK.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.ai_intelligence_runs
  add constraint ai_intelligence_runs_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete restrict;

-- Index couvrant la nouvelle FK — même exigence que les 39 index posés en
-- migration 056 (advisor `unindexed_foreign_keys` doit rester à 0). Sert aussi
-- l'agrégation par owner_id de v_ai_cost_timeline.
create index if not exists idx_ai_intelligence_runs_owner_id
  on public.ai_intelligence_runs (owner_id);

comment on constraint ai_intelligence_runs_owner_id_fkey on public.ai_intelligence_runs is
  'Ajoutée en 065. Absente depuis 006_ai_intelligence : sans elle, PostgREST ne peut pas résoudre owner:profiles(...) et toute requête portant cet embed échoue en PGRST200.';
