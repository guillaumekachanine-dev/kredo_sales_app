-- ADR-0020 M-4 — complément du garde-fou posé par 20260818101855.
--
-- La migration précédente excluait les résultats de mission de la latérale `res`
-- (bool_or(phase = …) + count_results) mais laissait la latérale `runs` compter
-- TOUS les runs d'un compte. Un run de mission ouvert depuis un compte aurait donc :
--   * gonflé count_runs,
--   * écrasé latest_run_at / latest_run_status avec la mission,
-- pendant que count_results, lui, l'ignorait — incohérence introduite par le garde-fou
-- partiel (countRuns > 0 avec countResults = 0), et « compte analysé récemment » faux.
--
-- Consommateurs réels de ces colonnes, vérifiés :
--   src/lib/intelligence/intelligence-data.ts, src/lib/prospection/portfolio-account-metrics.ts,
--   src/features/business-intelligence/data/get-portfolio-intelligence-snapshot.ts
--   (+ v_crm_account_list, qui lit cette vue et hérite donc du garde-fou).
--
-- La vue redevient homogène : elle décrit l'état d'analyse ADR-0007 d'un compte,
-- missions exclues de bout en bout. Le suivi d'exécution des missions se fait par
-- run_type LIKE 'mission:%', jamais par cette vue (M-3/M-4).
--
-- Non-régression prouvée : empreinte md5 des 112 lignes (has_* + count_runs +
-- count_results + latest_run_*) identique avant/après — 05e2eb9cb202dbde6747623e747c40b3.
create or replace view public.v_ai_intelligence_summary
with (security_invoker = true)
as
select c.id as company_id,
    c.name as company_name,
    c.sector,
    c.priority,
    c.legacy_folio_score,
    res.has_client_analysis,
    res.has_sector_analysis,
    res.has_process_diagnostic,
    res.has_roadmap,
    c.meta_has_analysis_data as has_legacy_analysis,
    c.meta_has_sector_analysis as has_legacy_sector,
    c.meta_has_pitches as has_legacy_pitches,
    runs.latest_run_at,
    runs.latest_run_status,
    coalesce(runs.count_runs, (0)::bigint) as count_runs,
    coalesce(res.count_results, (0)::bigint) as count_results
from ((companies c
left join lateral (
    select bool_or((r.phase = 1)) as has_client_analysis,
        bool_or((r.phase = 2)) as has_sector_analysis,
        bool_or((r.phase = 3)) as has_process_diagnostic,
        bool_or((r.phase = 4)) as has_roadmap,
        count(*) as count_results
    from ai_intelligence_results r
    where ((r.company_id = c.id)
      and (r.status = 'succeeded'::ai_result_status)
      and not exists (
        select 1
        from ai_intelligence_runs mission_run
        where mission_run.id = r.run_id
          and mission_run.run_type like 'mission:%'
      ))
) res on (true))
left join lateral (
    select max(run.created_at) as latest_run_at,
        (array_agg(run.status order by run.created_at desc))[1] as latest_run_status,
        count(*) as count_runs
    from ai_intelligence_runs run
    where ((run.company_id = c.id)
      and (run.run_type is null or run.run_type not like 'mission:%'))
) runs on (true));
