-- =============================================================================
-- 061 — Entretien durable des statistiques du planificateur
--       (Audit de performance, suite du Lot 5)
-- =============================================================================
--
-- CONSTAT À L'ORIGINE (Lot 5, 2026-08-03) : `last_analyze` était NULL sur
-- **70 des 71 tables** du schéma public. Tous les plans d'exécution de cette base
-- reposaient donc sur des `reltuples` hérités de la création des tables, et la
-- dérive était mesurable : `opportunity_candidates` 8 estimées / 34 réelles
-- (× 4,25), `ai_intelligence_results` 107 / 150, `opportunities` 16 / 24.
--
-- POURQUOI L'AUTOANALYZE NE SE DÉCLENCHAIT PAS. Les seuils par défaut de
-- PostgreSQL sont dimensionnés pour des tables de millions de lignes :
--     autovacuum_analyze_threshold    = 50
--     autovacuum_analyze_scale_factor = 0.1   (10 %)
-- Il faut donc `50 + 10 % des lignes` modifications avant un analyse automatique.
-- Sur `opportunity_candidates` (34 lignes) cela fait 53 modifications ; sur
-- `companies` (96 lignes), 60. Ces seuils ne sont jamais atteints — d'où un unique
-- autoanalyze constaté sur toute la base en 20 jours.
--
-- CORRECTIF PRINCIPAL — déclenchement PAR LE CHANGEMENT, pas par l'horloge.
-- Un `ANALYZE` planifié suppose de savoir à quel rythme les données bougent.
-- Cette hypothèse est fragile par nature : l'activité de KREDO est irrégulière
-- (congés, démonstrations, imports de masse, backfills sectoriels). On abaisse
-- donc les seuils pour que l'autoanalyze fasse son travail — il s'adapte tout
-- seul au trafic réel, quel qu'il soit, sans qu'aucune estimation ne soit requise.
--     threshold 10 + scale_factor 0,05 donne :
--       opportunity_candidates (34)  → ~12 modifications
--       companies (96)               → ~15
--       contacts (642)               → ~42
--       audit_log (5 063)            → ~263
--
-- FILET DE SÉCURITÉ — `ANALYZE` global quotidien via pg_cron. Il couvre les cas
-- que l'autoanalyze ne voit pas : table jamais modifiée mais dont les statistiques
-- se périment après une restauration, ou démon autovacuum saturé. Quotidien et non
-- hebdomadaire parce que le coût est nul (base de 55 Mo, passage sous la seconde) :
-- ne pas être avare d'une opération gratuite dont on ne sait pas prédire le besoin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seuils d'autoanalyze adaptés à la taille réelle des tables
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'          -- tables ordinaires uniquement (ni vues ni partitions)
      and c.relpersistence = 'p'
    order by 1
  loop
    execute format(
      'alter table %s set (autovacuum_analyze_threshold = 10, autovacuum_analyze_scale_factor = 0.05)',
      r.tbl
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Filet de sécurité : ANALYZE global quotidien
-- -----------------------------------------------------------------------------
-- pg_cron exécute chaque commande dans sa propre transaction : `ANALYZE` y est
-- autorisé (contrairement à `VACUUM`). Le job tourne en tant que `postgres`,
-- propriétaire des tables, il les couvre donc toutes.
-- `cron.schedule` est un upsert par nom de job : la migration est rejouable.
select cron.schedule(
  'analyze-public-schema',
  '15 3 * * *',            -- 03:15 UTC, décalé du reaper qui tourne toutes les 10 min
  $$analyze$$
);

-- -----------------------------------------------------------------------------
-- 3. Amorçage
-- -----------------------------------------------------------------------------
-- Les nouveaux seuils ne valent que pour les modifications À VENIR : sans cette
-- passe, une table qui ne bouge plus resterait sur ses statistiques périmées
-- jusqu'au premier passage du cron.
analyze;
