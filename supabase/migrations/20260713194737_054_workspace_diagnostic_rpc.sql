-- ADR-0014 Lot 5 — snapshot déterministe et transverse du centre de profit.
--
-- La fonction expose uniquement des agrégats et les quelques libellés nécessaires
-- à l'action. Elle ne renvoie ni salaire, ni CJM individuel, ni coût employeur.
-- Le workflow n8n l'appelle avec une clé service_role après création d'un run
-- authentifié côté Next.js.

create or replace function public.get_workspace_diagnostic_context(
  p_workspace_id uuid,
  p_as_of_date date default current_date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with
  open_opportunities as (
    select o.*
    from public.opportunities o
    where o.workspace_id = p_workspace_id
      and o.stage not in ('gagne', 'perdu', 'abandonne', 'win', 'lost')
  ),
  weighted_pipe as (
    select coalesce(sum(coalesce(o.weighted_gain, 0)), 0)::numeric as total
    from open_opportunities o
  ),
  previous_month_pipe as (
    -- Reconstruction best-effort du portefeuille qui existait à la fin du mois
    -- précédent. Le modèle ne possède pas d'historique de changement de stage ou
    -- de montant : cette valeur est donc explicitement caveatée dans la sortie.
    select coalesce(sum(coalesce(o.weighted_gain, 0)), 0)::numeric as total
    from public.opportunities o
    where o.workspace_id = p_workspace_id
      and o.created_at::date < date_trunc('month', p_as_of_date)::date
      and (
        o.closed_at is null
        or o.closed_at::date >= date_trunc('month', p_as_of_date)::date
      )
  ),
  latest_activity as (
    select distinct on (mar.collaborator_id, mar.mission_id)
      mar.collaborator_id,
      mar.mission_id,
      mar.status,
      mar.period_start,
      mar.business_days,
      mar.billable_days,
      mar.tjm_snapshot,
      mar.cjm_snapshot
    from public.mission_activity_reports mar
    where mar.workspace_id = p_workspace_id
      and mar.period_start <= p_as_of_date
    order by mar.collaborator_id, mar.mission_id, mar.period_start desc
  ),
  ytd_activity as (
    select
      mar.collaborator_id,
      round(
        sum(mar.billable_days) / nullif(sum(mar.business_days), 0) * 100,
        1
      ) as activity_rate
    from public.mission_activity_reports mar
    where mar.workspace_id = p_workspace_id
      and mar.period_start >= date_trunc('year', p_as_of_date)::date
      and mar.period_start <= p_as_of_date
    group by mar.collaborator_id
  ),
  skill_demand as (
    select
      os.skill_id,
      s.name as skill_name,
      round(sum(
        coalesce(os.weight, 0)
        * case os.importance
            when 'indispensable' then 1.5
            when 'souhaitee' then 1.15
            when 'bonus' then 0.75
            else 1
          end
      )::numeric, 2) as demand_score
    from public.opportunity_skills os
    join open_opportunities o on o.id = os.opportunity_id
    join public.skills s on s.id = os.skill_id
    where os.workspace_id = p_workspace_id
    group by os.skill_id, s.name
  ),
  skill_supply as (
    select
      ps.skill_id,
      round(sum(coalesce(ps.level, 0)::numeric / 5), 2) as supply_score
    from public.person_skills ps
    join public.collaborators c
      on c.person_id = ps.person_id
     and c.workspace_id = p_workspace_id
     and c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
    where ps.workspace_id = p_workspace_id
    group by ps.skill_id
  ),
  last_six_months as (
    select p.*
    from public.pnl_monthly p
    where p.workspace_id = p_workspace_id
      and p.period_month <= date_trunc('month', p_as_of_date)::date
    order by p.period_month desc
    limit 6
  ),
  finance_trend as (
    select
      count(*) as months_count,
      avg(revenue_total) filter (where recency_rank <= 3) as recent_avg,
      avg(revenue_total) filter (where recency_rank > 3) as prior_avg
    from (
      select
        lsm.revenue_total,
        row_number() over (order by lsm.period_month desc) as recency_rank
      from last_six_months lsm
    ) ranked
  )
  select jsonb_build_object(
    'workspace', (
      select jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'asOfDate', p_as_of_date,
        'dataCutoffAt', now(),
        'caveats', jsonb_build_array(
          'pipeWeightedPrevMonth est une reconstruction à partir du snapshot courant : les changements historiques de stage et de montant ne sont pas stockés.',
          'hiringFunnelSnapshot est une photographie des étapes actuelles, pas un taux de conversion temporel.',
          'Les marges exposées sont des pourcentages ; aucun salaire, CJM individuel ou coût employeur brut n''est transmis au modèle.'
        )
      )
      from public.workspaces w
      where w.id = p_workspace_id
    ),
    'commerce', jsonb_build_object(
      'pipeWeighted', (select wp.total from weighted_pipe wp),
      'pipeWeightedPrevMonth', (select pmp.total from previous_month_pipe pmp),
      'oppsByStage', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'stage', grouped.stage,
          'count', grouped.opportunity_count,
          'weighted', grouped.weighted
        ) order by grouped.weighted desc), '[]'::jsonb)
        from (
          select
            o.stage,
            count(*) as opportunity_count,
            coalesce(sum(coalesce(o.weighted_gain, 0)), 0) as weighted
          from open_opportunities o
          group by o.stage
        ) grouped
      ),
      'stagnatingOpps', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', stale.id,
          'title', stale.title,
          'companyName', stale.company_name,
          'stage', stale.stage,
          'weighted', stale.weighted_gain,
          'lastUpdatedAt', stale.updated_at
        ) order by stale.updated_at), '[]'::jsonb)
        from (
          select o.id, o.title, c.name as company_name, o.stage,
                 coalesce(o.weighted_gain, 0) as weighted_gain, o.updated_at
          from open_opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          where o.updated_at::date < p_as_of_date - 30
          order by o.updated_at
          limit 10
        ) stale
      ),
      'topClientConcentration', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'companyName', concentration.company_name,
          'pctOfPipe', concentration.pct_of_pipe,
          'weighted', concentration.weighted
        ) order by concentration.weighted desc), '[]'::jsonb)
        from (
          select
            coalesce(c.name, 'Compte non renseigné') as company_name,
            sum(coalesce(o.weighted_gain, 0)) as weighted,
            round(
              sum(coalesce(o.weighted_gain, 0))
              / nullif((select wp.total from weighted_pipe wp), 0)
              * 100,
              1
            ) as pct_of_pipe
          from open_opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          group by coalesce(c.name, 'Compte non renseigné')
          order by weighted desc
          limit 3
        ) concentration
      ),
      'oppsWithoutRecentAction', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', inactive.id,
          'title', inactive.title,
          'companyName', inactive.company_name,
          'stage', inactive.stage,
          'weighted', inactive.weighted_gain,
          'lastInteractionAt', inactive.last_interaction_at
        ) order by inactive.weighted_gain desc), '[]'::jsonb)
        from (
          select
            o.id,
            o.title,
            c.name as company_name,
            o.stage,
            coalesce(o.weighted_gain, 0) as weighted_gain,
            max(i.occurred_at) as last_interaction_at
          from open_opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          left join public.interactions i
            on i.workspace_id = p_workspace_id
           and (i.opportunity_id = o.id or (i.opportunity_id is null and i.company_id = o.company_id))
          group by o.id, o.title, c.name, o.stage, o.weighted_gain
          having max(i.occurred_at)::date is null
              or max(i.occurred_at)::date < p_as_of_date - 15
          order by coalesce(o.weighted_gain, 0) desc
          limit 10
        ) inactive
      ),
      'scoreBandDistribution', jsonb_build_object(
        'A', (select count(*) from public.account_score_current s where s.workspace_id = p_workspace_id and s.score_band = 'A'),
        'B', (select count(*) from public.account_score_current s where s.workspace_id = p_workspace_id and s.score_band = 'B'),
        'C', (select count(*) from public.account_score_current s where s.workspace_id = p_workspace_id and s.score_band = 'C'),
        'D', (select count(*) from public.account_score_current s where s.workspace_id = p_workspace_id and s.score_band = 'D'),
        'U', (select count(*) from public.account_score_current s where s.workspace_id = p_workspace_id and (s.score_band = 'U' or s.score_band is null))
      )
    ),
    'delivery', jsonb_build_object(
      'activeMissionsCount', (
        select count(*) from public.missions m
        where m.workspace_id = p_workspace_id and m.status = 'active'
      ),
      'missionsEndingSoon', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', ending.id,
          'title', ending.title,
          'client', ending.client,
          'practice', ending.practice,
          'endDate', ending.end_date,
          'marginPct', ending.gross_margin_pct
        ) order by ending.end_date), '[]'::jsonb)
        from (
          select m.id, m.title, c.name as client, m.practice, m.end_date, m.gross_margin_pct
          from public.missions m
          join public.companies c
            on c.id = m.company_id and c.workspace_id = p_workspace_id
          where m.workspace_id = p_workspace_id
            and m.status = 'active'
            and m.end_date between p_as_of_date and p_as_of_date + 60
          order by m.end_date
          limit 12
        ) ending
      ),
      'avgOccupancyRate', (
        select round(avg(ya.activity_rate), 1) from ytd_activity ya
      ),
      'marginAlerts', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'collaborator', alert.full_name,
          'mission', alert.mission_title,
          'marginPct', alert.margin_pct
        ) order by alert.margin_pct), '[]'::jsonb)
        from (
          select
            p.full_name,
            m.title as mission_title,
            round(
              (
                la.billable_days * la.tjm_snapshot
                - la.business_days * la.cjm_snapshot
              ) / nullif(la.billable_days * la.tjm_snapshot, 0) * 100,
              1
            ) as margin_pct
          from latest_activity la
          join public.collaborators c
            on c.id = la.collaborator_id and c.workspace_id = p_workspace_id
          join public.persons p
            on p.id = c.person_id and p.workspace_id = p_workspace_id
          join public.missions m
            on m.id = la.mission_id and m.workspace_id = p_workspace_id
          where m.status = 'active'
            and la.billable_days * la.tjm_snapshot > 0
            and (
              la.billable_days * la.tjm_snapshot
              - la.business_days * la.cjm_snapshot
            ) / nullif(la.billable_days * la.tjm_snapshot, 0) * 100 < 15
          order by margin_pct
          limit 12
        ) alert
      ),
      'craNotValidatedCount', (
        select count(*) from latest_activity la where la.status <> 'validated'
      ),
      'negativeMarginCount', (
        select count(*) from public.missions m
        where m.workspace_id = p_workspace_id
          and m.status = 'active'
          and m.gross_margin_pct < 0
      )
    ),
    'finance', jsonb_build_object(
      'last6Months', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'month', chronological.period_month,
          'revenue', chronological.revenue_total,
          'grossMargin', chronological.gross_margin_value,
          'grossMarginPct', chronological.gross_margin_percent,
          'opProfit', chronological.operating_profit_value
        ) order by chronological.period_month), '[]'::jsonb)
        from last_six_months chronological
      ),
      'ytdRevenue', (
        select coalesce(sum(p.revenue_total), 0)
        from public.pnl_monthly p
        where p.workspace_id = p_workspace_id
          and p.period_month >= date_trunc('year', p_as_of_date)::date
          and p.period_month <= date_trunc('month', p_as_of_date)::date
      ),
      'ytdGrossMarginPct', (
        select round(
          sum(coalesce(p.gross_margin_value, 0))
          / nullif(sum(p.revenue_total), 0)
          * 100,
          1
        )
        from public.pnl_monthly p
        where p.workspace_id = p_workspace_id
          and p.period_month >= date_trunc('year', p_as_of_date)::date
          and p.period_month <= date_trunc('month', p_as_of_date)::date
      ),
      'trend', (
        select case
          when ft.months_count < 6 or ft.prior_avg is null or ft.prior_avg = 0 then 'insufficient_data'
          when ft.recent_avg > ft.prior_avg * 1.05 then 'hausse'
          when ft.recent_avg < ft.prior_avg * 0.95 then 'baisse'
          else 'stable'
        end
        from finance_trend ft
      )
    ),
    'team', jsonb_build_object(
      'totalCollaborators', (
        select count(*) from public.collaborators c
        where c.workspace_id = p_workspace_id
          and c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
      ),
      'avgActivityRateYtd', (
        select round(avg(ya.activity_rate), 1) from ytd_activity ya
      ),
      'collaboratorsBelow70', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', low.collaborator_id,
          'name', low.full_name,
          'rate', low.activity_rate,
          'mission', low.mission_title
        ) order by low.activity_rate), '[]'::jsonb)
        from (
          select
            c.id as collaborator_id,
            p.full_name,
            ya.activity_rate,
            (
              select m.title
              from public.missions m
              where m.workspace_id = p_workspace_id
                and m.collaborator_id = c.id
                and m.status = 'active'
              order by m.end_date nulls last
              limit 1
            ) as mission_title
          from ytd_activity ya
          join public.collaborators c
            on c.id = ya.collaborator_id and c.workspace_id = p_workspace_id
          join public.persons p
            on p.id = c.person_id and p.workspace_id = p_workspace_id
          where c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
            and ya.activity_rate < 70
          order by ya.activity_rate
          limit 12
        ) low
      ),
      'intercontractRisk', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', risk.collaborator_id,
          'name', risk.full_name,
          'missionEndDate', risk.mission_end_date,
          'plannedAbsenceDays', risk.planned_absence_days
        ) order by risk.mission_end_date nulls first), '[]'::jsonb)
        from (
          select
            c.id as collaborator_id,
            p.full_name,
            max(m.end_date) as mission_end_date,
            coalesce((
              select sum(a.duration_days)
              from public.collaborator_absences a
              where a.workspace_id = p_workspace_id
                and a.collaborator_id = c.id
                and a.start_date <= p_as_of_date + 60
                and a.end_date >= p_as_of_date
            ), 0) as planned_absence_days
          from public.collaborators c
          join public.persons p
            on p.id = c.person_id and p.workspace_id = p_workspace_id
          left join public.missions m
            on m.workspace_id = p_workspace_id
           and m.collaborator_id = c.id
           and m.status = 'active'
          where c.workspace_id = p_workspace_id
            and c.status in ('actif', 'en_mission', 'intercontrat', 'preavis')
          group by c.id, p.full_name
          having max(m.end_date) is null
              or max(m.end_date) <= p_as_of_date + 60
          order by max(m.end_date) nulls first
          limit 12
        ) risk
      ),
      'topSkillGaps', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'skill', gaps.skill_name,
          'demandScore', gaps.demand_score,
          'supplyScore', gaps.supply_score
        ) order by gaps.gap desc), '[]'::jsonb)
        from (
          select
            sd.skill_name,
            sd.demand_score,
            coalesce(ss.supply_score, 0) as supply_score,
            sd.demand_score - coalesce(ss.supply_score, 0) as gap
          from skill_demand sd
          left join skill_supply ss on ss.skill_id = sd.skill_id
          order by gap desc
          limit 5
        ) gaps
      ),
      'upcomingAbsences', (
        select coalesce(sum(a.duration_days), 0)
        from public.collaborator_absences a
        where a.workspace_id = p_workspace_id
          and a.start_date <= p_as_of_date + 30
          and a.end_date >= p_as_of_date
      )
    ),
    'recruitment', jsonb_build_object(
      'hiringFunnelSnapshot', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'step', funnel.current_step,
          'count', funnel.process_count
        ) order by funnel.process_count desc), '[]'::jsonb)
        from (
          select hp.current_step, count(*) as process_count
          from public.candidate_hiring_processes hp
          where hp.workspace_id = p_workspace_id
            and hp.status = 'active'
          group by hp.current_step
        ) funnel
      ),
      'oppsWithoutCandidate', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', uncovered.id,
          'title', uncovered.title,
          'companyName', uncovered.company_name,
          'requiredHeadcount', uncovered.required_headcount
        ) order by uncovered.required_headcount desc), '[]'::jsonb)
        from (
          select o.id, o.title, c.name as company_name, o.required_headcount
          from public.opportunities o
          left join public.companies c
            on c.id = o.company_id and c.workspace_id = p_workspace_id
          where o.workspace_id = p_workspace_id
            and o.stage = 'recherche_profil'
            and not exists (
              select 1
              from public.opportunity_candidates oc
              where oc.workspace_id = p_workspace_id
                and oc.opportunity_id = o.id
                and oc.status not in ('refuse_client', 'refuse_candidat', 'abandonne')
            )
          order by o.required_headcount desc
          limit 10
        ) uncovered
      ),
      'openJobProfilesCount', (
        select count(*) from public.job_profiles jp
        where jp.workspace_id = p_workspace_id and jp.is_active
      )
    )
  )
$function$;

revoke all on function public.get_workspace_diagnostic_context(uuid, date) from public;
revoke all on function public.get_workspace_diagnostic_context(uuid, date) from anon;
revoke all on function public.get_workspace_diagnostic_context(uuid, date) from authenticated;
grant execute on function public.get_workspace_diagnostic_context(uuid, date) to service_role;

comment on function public.get_workspace_diagnostic_context(uuid, date) is
  'ADR-0014 Lot 5 — snapshot agrégé, déterministe et sans coûts individuels pour intel-040-workspace-diagnostic. Exécution réservée à service_role.';
