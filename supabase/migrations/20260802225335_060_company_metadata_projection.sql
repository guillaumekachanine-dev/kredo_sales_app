-- =============================================================================
-- 060 — Projection scalaire de companies.metadata + dé-fan-out de la vue
--       d'intelligence (Audit de performance, Lot 5)
-- =============================================================================
--
-- MESURE À L'ORIGINE DE CETTE MIGRATION (session authentifiée, cache chaud,
-- 2 passes de préchauffage, EXPLAIN ANALYZE BUFFERS TIMING OFF) :
--
--   select id, name              from v_crm_account_list  →   1,2 ms /  122 buffers
--   select id, logo_path         from v_crm_account_list  →   8,1 ms /  569 buffers
--   les 17 colonnes de PostgREST from v_crm_account_list  →  39,4 ms / 2685 buffers
--   les 12 colonnes de PostgREST from v_ai_intelligence_summary → 23,0 ms / 1378 buffers
--
-- `companies.metadata` pèse 14 Ko en moyenne (max 20 Ko, 1,36 Mo au total) : il
-- est donc stocké hors-ligne en TOAST et compressé. Chaque référence à
-- `metadata` dans la liste de sélection d'une vue provoque une **détoastification
-- complète** de la valeur — décompression comprise. `v_crm_account_list` en
-- comptait 6 (logo_path, nb_contacts, nb_with_email, et 3 dans has_study),
-- `v_ai_intelligence_summary` 3. Coût mesuré : ~6,9 ms et ~447 buffers par
-- référence et par passe sur 96 lignes.
--
-- Autrement dit : 97 % du temps de la vue la plus lente de l'application était
-- de la décompression répétée d'un blob JSON qui n'est jamais renvoyé.
--
-- CORRECTIF : projeter une fois pour toutes, à l'écriture, les scalaires dérivés
-- de `metadata` dans des colonnes générées STORED. Elles sont minuscules
-- (max 174 octets pour contact_stats, 58 caractères pour logo_path), donc
-- stockées inline : les vues n'ouvrent plus jamais le TOAST.
--
-- ⚠️ Contrainte rencontrée : `jsonb_build_object()` est STABLE, pas IMMUTABLE —
-- inutilisable dans une colonne générée. Les expressions ci-dessous n'emploient
-- que des opérateurs vérifiés IMMUTABLE (`->`, `->>`, `?`, `jsonb_typeof`, `<>`),
-- et **aucun cast de donnée utilisateur** : les casts `::integer` restent dans la
-- vue, donc le mode de défaillance d'une valeur JSON malformée reste identique à
-- aujourd'hui (erreur en lecture) et ne remonte pas en écriture sur `companies`.
--
-- Second correctif, indépendant : `v_ai_intelligence_summary` joignait
-- `ai_intelligence_runs` ET `ai_intelligence_results` sur la même ligne
-- `companies`, produisant un produit cartésien (96 comptes → 786 lignes
-- intermédiaires) que `count(DISTINCT ...)` devait ensuite dédupliquer. Le coût
-- est négligeable aux volumes actuels mais croît en O(runs × résultats) par
-- compte — un compte porte déjà 27 runs et 23 résultats. Remplacé par deux
-- agrégats latéraux indépendants, sémantiquement identiques.
--
-- ÉQUIVALENCE PROUVÉE en transaction annulée avant application :
--   `EXCEPT ALL` dans les deux sens sur les deux vues → 0 ligne d'écart
--   (96 lignes de chaque côté).
--
-- ⚠️ `security_invoker = true` est reconduit explicitement sur les deux vues.
-- L'omettre ferait exécuter les vues avec les droits du propriétaire (postgres),
-- ce qui contournerait la RLS et exposerait tous les workspaces.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Projection scalaire de companies.metadata
-- -----------------------------------------------------------------------------
alter table public.companies
  add column meta_logo_path           text    generated always as (metadata ->> 'logo_path') stored,
  add column meta_contact_stats       jsonb   generated always as (metadata -> 'contact_stats') stored,
  add column meta_has_study           boolean generated always as (
        metadata ? 'analysis_data'
    and jsonb_typeof(metadata -> 'analysis_data') = 'object'
    and (metadata -> 'analysis_data') <> '{}'::jsonb) stored,
  add column meta_has_analysis_data   boolean generated always as (metadata ? 'analysis_data') stored,
  add column meta_has_sector_analysis boolean generated always as (metadata ? 'sector_analysis') stored,
  add column meta_has_pitches         boolean generated always as (metadata ? 'pitches') stored;

comment on column public.companies.meta_logo_path is
  'Projection générée de metadata->>''logo_path''. Existe pour que les vues de liste n''aient pas à détoaster le blob metadata (14 Ko) à chaque lecture — cf. migration 060 / Audit de performance Lot 5.';
comment on column public.companies.meta_contact_stats is
  'Projection générée de metadata->''contact_stats'' (objet minuscule, stocké inline). Les casts ::integer restent côté vue, volontairement.';
comment on column public.companies.meta_has_study is
  'Projection générée : metadata.analysis_data est un objet non vide. Source de v_crm_account_list.has_study.';
comment on column public.companies.meta_has_analysis_data is
  'Projection générée : présence de la clé metadata.analysis_data (FOLIO legacy). Source de v_ai_intelligence_summary.has_legacy_analysis.';
comment on column public.companies.meta_has_sector_analysis is
  'Projection générée : présence de la clé metadata.sector_analysis (FOLIO legacy). Source de v_ai_intelligence_summary.has_legacy_sector.';
comment on column public.companies.meta_has_pitches is
  'Projection générée : présence de la clé metadata.pitches (FOLIO legacy). Source de v_ai_intelligence_summary.has_legacy_pitches.';

-- -----------------------------------------------------------------------------
-- 2. v_ai_intelligence_summary — projection + suppression du produit cartésien
-- -----------------------------------------------------------------------------
create or replace view public.v_ai_intelligence_summary
with (security_invoker = true) as
select
  c.id   as company_id,
  c.name as company_name,
  c.sector,
  c.priority,
  c.legacy_folio_score,
  res.has_client_analysis,
  res.has_sector_analysis,
  res.has_process_diagnostic,
  res.has_roadmap,
  c.meta_has_analysis_data   as has_legacy_analysis,
  c.meta_has_sector_analysis as has_legacy_sector,
  c.meta_has_pitches         as has_legacy_pitches,
  runs.latest_run_at,
  runs.latest_run_status,
  coalesce(runs.count_runs, 0::bigint)   as count_runs,
  coalesce(res.count_results, 0::bigint) as count_results
from public.companies c
-- `status = 'succeeded'` était déjà porté par la condition de jointure d'origine :
-- le prédicat `r.status = 'succeeded'` des bool_or() y était donc redondant.
left join lateral (
  select bool_or(r.phase = 1) as has_client_analysis,
         bool_or(r.phase = 2) as has_sector_analysis,
         bool_or(r.phase = 3) as has_process_diagnostic,
         bool_or(r.phase = 4) as has_roadmap,
         count(*)             as count_results
  from public.ai_intelligence_results r
  where r.company_id = c.id
    and r.status = 'succeeded'::ai_result_status
) res on true
left join lateral (
  select max(run.created_at)                                    as latest_run_at,
         (array_agg(run.status order by run.created_at desc))[1] as latest_run_status,
         count(*)                                               as count_runs
  from public.ai_intelligence_runs run
  where run.company_id = c.id
) runs on true;

-- -----------------------------------------------------------------------------
-- 3. v_crm_account_list — projection (structure de jointure inchangée)
-- -----------------------------------------------------------------------------
create or replace view public.v_crm_account_list
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.sector,
  c.segment,
  c.revenue,
  c.employee_count,
  c.size_band,
  c.hq_location,
  c.priority,
  c.lifecycle_status,
  c.legacy_folio_score,
  c.website,
  c.description,
  c.meta_logo_path                                   as logo_path,
  (c.meta_contact_stats ->> 'nb_contacts')::integer   as nb_contacts,
  (c.meta_contact_stats ->> 'nb_with_email')::integer as nb_with_email,
  c.meta_has_study                                   as has_study,
  si.name                                            as sector_attachment_name,
  coalesce(aws.is_enabled, false)                    as has_dedicated_watch,
  coalesce(ais.has_client_analysis, false)           as has_client_analysis,
  coalesce(ais.has_sector_analysis, false)           as has_sector_analysis,
  coalesce(ais.has_process_diagnostic, false)        as has_process_diagnostic,
  coalesce(ais.has_roadmap, false)                   as has_roadmap,
  coalesce(ais.has_legacy_analysis, false)           as has_legacy_analysis,
  coalesce(ais.has_legacy_sector, false)             as has_legacy_sector,
  (exists (select 1
             from public.account_issues ai
            where ai.company_id = c.id
              and ai.status = 'open'::account_issue_status)) as has_account_issues,
  (exists (select 1
             from public.ai_intelligence_results air
            where air.company_id = c.id
              and air.status = 'succeeded'::ai_result_status
              and air.result_type = 'commercial_strategy')) as has_commercial_strategy
from public.companies c
  left join public.sector_intelligence si        on si.id = c.sector_id
  left join public.account_watch_settings aws    on aws.company_id = c.id
  left join public.v_ai_intelligence_summary ais on ais.company_id = c.id;

-- -----------------------------------------------------------------------------
-- 4. Statistiques du planificateur
-- -----------------------------------------------------------------------------
-- `companies` vient d'être réécrite par l'ajout des colonnes générées.
-- Constat de l'audit au passage : `last_analyze` était NULL sur la quasi-totalité
-- des tables du schéma — les statistiques n'avaient jamais été collectées, et
-- `reltuples` dérivait fortement (opportunity_candidates : 8 estimées / 34 réelles).
-- Un ANALYZE global est exécuté hors migration (opération de maintenance, pas de
-- schéma) ; ici on se limite aux tables que cette migration touche.
analyze public.companies;
analyze public.ai_intelligence_results;
analyze public.ai_intelligence_runs;
