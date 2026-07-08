-- Migration: champs d'intelligence scalaires pour la liste CRM comptes
-- Objectif : alimenter les colonnes cockpit sans transférer metadata ni hydrater
-- les objets riches de la fiche compte.

create index if not exists idx_ai_intelligence_results_commercial_strategy_company
  on public.ai_intelligence_results (company_id)
  where status = 'succeeded'
    and result_type = 'commercial_strategy';

create or replace view public.v_crm_account_list
  with (security_invoker = true)
as
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
  (c.metadata ->> 'logo_path')                                   as logo_path,
  ((c.metadata -> 'contact_stats') ->> 'nb_contacts')::integer   as nb_contacts,
  ((c.metadata -> 'contact_stats') ->> 'nb_with_email')::integer as nb_with_email,
  (
    c.metadata ? 'analysis_data'
    and jsonb_typeof(c.metadata -> 'analysis_data') = 'object'
    and c.metadata -> 'analysis_data' <> '{}'::jsonb
  )                                                               as has_study,
  si.name                                                         as sector_attachment_name,
  coalesce(aws.is_enabled, false)                                 as has_dedicated_watch,
  coalesce(ais.has_client_analysis, false)                        as has_client_analysis,
  coalesce(ais.has_sector_analysis, false)                        as has_sector_analysis,
  coalesce(ais.has_process_diagnostic, false)                     as has_process_diagnostic,
  coalesce(ais.has_roadmap, false)                                as has_roadmap,
  coalesce(ais.has_legacy_analysis, false)                        as has_legacy_analysis,
  coalesce(ais.has_legacy_sector, false)                          as has_legacy_sector,
  exists (
    select 1
    from public.account_issues ai
    where ai.company_id = c.id
      and ai.status = 'open'
  )                                                               as has_account_issues,
  exists (
    select 1
    from public.ai_intelligence_results air
    where air.company_id = c.id
      and air.status = 'succeeded'
      and air.result_type = 'commercial_strategy'
  )                                                               as has_commercial_strategy
from public.companies c
left join public.sector_intelligence si
  on si.id = c.sector_id
left join public.account_watch_settings aws
  on aws.company_id = c.id
left join public.v_ai_intelligence_summary ais
  on ais.company_id = c.id;

comment on view public.v_crm_account_list is
  'Vue légère de la liste CRM comptes. Expose uniquement les colonnes nécessaires '
  'à l''affichage de la liste comptes sans transférer le blob metadata complet. '
  'Inclut des indicateurs scalaires pour cockpit, veille dédiée et rattachement '
  'sectoriel. security_invoker = true garantit que les politiques RLS de la table '
  'companies et des relations s''appliquent bien à l''utilisateur appelant.';
