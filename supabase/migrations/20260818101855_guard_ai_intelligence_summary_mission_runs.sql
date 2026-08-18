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
    where (run.company_id = c.id)
) runs on (true));
