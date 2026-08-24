-- =============================================================================
-- KREDO — Batterie de mesure de performance base de données
-- =============================================================================
-- Usage : exécuter AVANT toute optimisation (snapshot "avant"), puis APRÈS
-- chaque lot. Coller les résultats dans docs/AUDIT-PERFORMANCE-KREDO.md.
--
-- ⚠️ Ne modifie RIEN. Lecture seule intégrale.
--
-- Reset du compteur entre deux mesures (optionnel, à faire en connaissance
-- de cause — on perd l'historique) :
--     SELECT pg_stat_statements_reset();
-- Préférer noter la date du snapshot et raisonner en delta.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- M1. Top consommateurs de temps d'exécution
-- -----------------------------------------------------------------------------
-- Lecture : la colonne `pct` dit où part réellement le temps CPU de la base.
-- Baseline 2026-07-29 : 79,7 % = polling WAL Realtime (535 001 appels).
-- -----------------------------------------------------------------------------
SELECT
  round(total_exec_time::numeric, 1)                                        AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2)                                         AS mean_ms,
  round(max_exec_time::numeric, 1)                                          AS max_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct,
  left(regexp_replace(query, '\s+', ' ', 'g'), 200)                         AS q
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 30;


-- -----------------------------------------------------------------------------
-- M2. Requêtes applicatives seules (hors Realtime / introspection PostgREST)
-- -----------------------------------------------------------------------------
-- C'est CE tableau qui reflète l'expérience utilisateur réelle.
-- Baseline 2026-07-29 : v_crm_account_list 90 ms moyen / 1052 ms max,
--                       v_ai_intelligence_summary 64 ms moyen / 1256 ms max.
-- -----------------------------------------------------------------------------
SELECT
  round(total_exec_time::numeric, 1) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2)  AS mean_ms,
  round(max_exec_time::numeric, 1)   AS max_ms,
  round(rows::numeric / nullif(calls, 0), 1) AS avg_rows,
  left(regexp_replace(query, '\s+', ' ', 'g'), 200) AS q
FROM pg_stat_statements
WHERE query LIKE '%pgrst_source%'
ORDER BY total_exec_time DESC
LIMIT 25;


-- -----------------------------------------------------------------------------
-- M3. Pression de lecture par table — détection des scans séquentiels
-- -----------------------------------------------------------------------------
-- `pct_seq` à 100 % sur une table à 1 ligne n'est PAS un problème en soi.
-- Le signal utile est le VOLUME d'appels : `profiles` à 689 232 seq_scan
-- signifie que la fonction RLS current_workspace_id() est appelée 689k fois.
-- -----------------------------------------------------------------------------
SELECT
  relname,
  n_live_tup,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE WHEN seq_scan + coalesce(idx_scan, 0) > 0
       THEN round(100.0 * seq_scan / (seq_scan + coalesce(idx_scan, 0)), 1)
  END AS pct_seq,
  round(seq_tup_read::numeric / nullif(seq_scan, 0), 0) AS avg_rows_per_seqscan,
  pg_size_pretty(pg_total_relation_size(relid))         AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_tup_read DESC NULLS LAST
LIMIT 30;


-- -----------------------------------------------------------------------------
-- M4. Politiques RLS non optimisées (InitPlan manquant)
-- -----------------------------------------------------------------------------
-- Une policy `workspace_id = private.current_workspace_id()` réévalue la
-- fonction pour CHAQUE ligne scannée. La forme
-- `workspace_id = (SELECT private.current_workspace_id())` la force en InitPlan
-- : un seul appel par requête.
-- Baseline 2026-07-29 : 186 non wrappées / 245 policies au total.
-- -----------------------------------------------------------------------------
SELECT
  count(*) FILTER (
    WHERE qual LIKE '%(select%current_workspace_id%'
       OR with_check LIKE '%(select%current_workspace_id%'
  ) AS wrapped_initplan,
  count(*) FILTER (
    WHERE (qual LIKE '%current_workspace_id%' OR with_check LIKE '%current_workspace_id%')
      AND qual NOT LIKE '%(select%current_workspace_id%'
      AND coalesce(with_check, '') NOT LIKE '%(select%current_workspace_id%'
  ) AS unwrapped,
  count(*) AS total
FROM pg_policies
WHERE schemaname = 'public';

-- Détail ligne à ligne (pour construire la migration de correction)
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%current_workspace_id%' OR with_check LIKE '%current_workspace_id%')
  AND qual NOT LIKE '%(select%current_workspace_id%'
  AND coalesce(with_check, '') NOT LIKE '%(select%current_workspace_id%'
ORDER BY tablename, policyname;


-- -----------------------------------------------------------------------------
-- M5. Volatilité des fonctions appelées par les RLS
-- -----------------------------------------------------------------------------
-- Doivent être STABLE. VOLATILE = réévaluation garantie par ligne.
-- Baseline 2026-07-29 : les 3 sont STABLE — OK, le problème est en M4.
-- -----------------------------------------------------------------------------
SELECT n.nspname AS schema, p.proname,
       CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE'
                          WHEN 's' THEN 'STABLE'
                          WHEN 'v' THEN 'VOLATILE' END AS volatility,
       p.prosecdef AS security_definer,
       p.procost
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('private', 'public')
  AND p.proname IN ('current_workspace_id', 'is_workspace_admin', 'require_current_workspace')
ORDER BY 1, 2;


-- -----------------------------------------------------------------------------
-- M6. Surface Realtime — coût de la réplication logique
-- -----------------------------------------------------------------------------
-- Chaque table publiée fait décoder son WAL et évaluer les RLS pour chaque
-- abonné. Baseline 2026-07-29 : 3 tables publiées, mais 79,7 % du temps CPU.
-- -----------------------------------------------------------------------------
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY 2;

SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;


-- -----------------------------------------------------------------------------
-- M7. Volume d'écriture — ce qui alimente le WAL (donc le coût Realtime)
-- -----------------------------------------------------------------------------
-- Les triggers `log_audit` écrivent dans audit_log à chaque mutation :
-- chaque ligne écrite devient du WAL que Realtime doit décoder.
-- -----------------------------------------------------------------------------
SELECT relname,
       n_tup_ins, n_tup_upd, n_tup_del,
       n_tup_hot_upd,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
LIMIT 15;


-- -----------------------------------------------------------------------------
-- M8. Index — inventaire (NE PAS supprimer en masse, cf. Session 26)
-- -----------------------------------------------------------------------------
-- Un index "unused" sur un projet à faible trafic reflète l'absence de charge,
-- pas une redondance. Ce relevé sert de suivi, pas de liste de suppression.
-- Baseline 2026-07-29 : 188 unused / 426 total.
-- -----------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0) AS unused_indexes,
  (SELECT count(*) FROM pg_indexes         WHERE schemaname = 'public')                    AS total_indexes,
  (SELECT count(*) FROM pg_policies        WHERE schemaname = 'public')                    AS total_policies,
  (SELECT count(*) FROM pg_tables          WHERE schemaname = 'public')                    AS tables,
  (SELECT count(*) FROM pg_views           WHERE schemaname = 'public')                    AS views,
  (SELECT count(*) FROM pg_trigger t
     JOIN pg_class c     ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND NOT t.tgisinternal)                                      AS triggers,
  pg_size_pretty(pg_database_size(current_database()))                                     AS db_size;


-- -----------------------------------------------------------------------------
-- M9. Plans réels des vues les plus coûteuses
-- -----------------------------------------------------------------------------
-- À exécuter en session AUTHENTIFIÉE pour que les RLS s'appliquent (sinon le
-- plan mesuré n'est pas celui que subit l'utilisateur).
-- Remplacer <WORKSPACE_ID> avant exécution.
-- -----------------------------------------------------------------------------
-- EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM v_crm_account_list;
-- EXPLAIN (ANALYZE, BUFFERS, VERBOSE) SELECT * FROM v_ai_intelligence_summary;
