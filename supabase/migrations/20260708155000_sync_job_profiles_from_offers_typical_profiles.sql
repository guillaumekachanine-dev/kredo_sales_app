-- KREDO — Sync job_profiles from offers.typical_profiles
-- Date: 2026-07-08
-- Purpose:
--   Ensure every distinct profile listed in offers.typical_profiles exists in job_profiles.
--   Keep existing detailed rows untouched, insert only missing profiles, and realign the
--   practice_id when an existing title is attached to a different practice than the one
--   implied by offers.typical_profiles.
--
-- Quality rules:
--   - Idempotent: safe to run multiple times.
--   - No hard-coded UUIDs: all ids are resolved from live offers / offer_practices.
--   - No invented enrichment: inserted metadata keeps exact offer lineage; generated
--     mission/responsibilities/stack/KPIs are derived from offer fields only.

BEGIN;

with offer_profiles as (
  select
    o.workspace_id,
    o.practice_id,
    op.name as practice_name,
    op.slug as practice_slug,
    trim(profile) as title,
    o.id as offer_id,
    o.name as offer_name,
    o.slug as offer_slug,
    o.typical_deliverables,
    o.use_cases,
    o.keywords
  from offers o
  join offer_practices op on op.id = o.practice_id
  cross join unnest(o.typical_profiles) as profile
  where trim(profile) <> ''
), expected_base as (
  select
    workspace_id,
    title,
    min(practice_id::text)::uuid as practice_id,
    min(practice_name) as practice_name,
    min(practice_slug) as practice_slug,
    count(distinct practice_id) as practice_count
  from offer_profiles
  group by workspace_id, title
), expected as (
  select
    eb.*,
    coalesce((select array_agg(distinct p.offer_name order by p.offer_name) from offer_profiles p where p.workspace_id = eb.workspace_id and p.title = eb.title), '{}') as offer_names,
    coalesce((select array_agg(distinct kw order by kw) from offer_profiles p cross join unnest(p.keywords) kw where p.workspace_id = eb.workspace_id and p.title = eb.title and trim(kw) <> ''), '{}') as keywords,
    coalesce((select array_agg(distinct d order by d) from offer_profiles p cross join unnest(p.typical_deliverables) d where p.workspace_id = eb.workspace_id and p.title = eb.title and trim(d) <> ''), '{}') as deliverables,
    coalesce((select array_agg(distinct uc order by uc) from offer_profiles p cross join unnest(p.use_cases) uc where p.workspace_id = eb.workspace_id and p.title = eb.title and trim(uc) <> ''), '{}') as use_cases,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', x.offer_id, 'name', x.offer_name, 'slug', x.offer_slug) order by x.offer_name)
      from (
        select distinct p.offer_id, p.offer_name, p.offer_slug
        from offer_profiles p
        where p.workspace_id = eb.workspace_id and p.title = eb.title
      ) x
    ), '[]'::jsonb) as source_offers
  from expected_base eb
  where eb.practice_count = 1
)
insert into job_profiles (
  workspace_id,
  practice_id,
  title,
  main_mission,
  responsibilities,
  tech_stack,
  kpis,
  source,
  version,
  is_active,
  metadata
)
select
  e.workspace_id,
  e.practice_id,
  e.title,
  format(
    'Assurer le rôle de %s sur les offres %s de la practice %s, où ce profil est explicitement référencé comme profil mobilisable.',
    e.title,
    array_to_string(e.offer_names, ', '),
    e.practice_name
  ) as main_mission,
  array_remove(array[
    'Contribuer aux offres associées : ' || array_to_string(e.offer_names, ', '),
    case when cardinality(e.deliverables) > 0 then 'Produire ou contribuer aux livrables typiques : ' || array_to_string(e.deliverables[1:5], ', ') end,
    case when cardinality(e.use_cases) > 0 then 'Intervenir sur les cas d’usage associés : ' || array_to_string(e.use_cases[1:5], ', ') end,
    'Collaborer avec les équipes client et Kredo pour sécuriser le périmètre, la qualité et la valeur métier.'
  ], null) as responsibilities,
  e.keywords as tech_stack,
  array[
    'Adéquation du profil aux offres où il est référencé',
    'Qualité et conformité des livrables produits',
    'Respect des engagements de délai, périmètre et niveau de service',
    'Satisfaction client et contribution à la valeur métier'
  ] as kpis,
  'imported' as source,
  '2026.2' as version,
  true as is_active,
  jsonb_build_object(
    'imported_from', 'offers.typical_profiles',
    'source_version', '2026.2',
    'practice_name', e.practice_name,
    'practice_slug', e.practice_slug,
    'source_offers', e.source_offers,
    'offer_names', to_jsonb(e.offer_names),
    'raw_keywords', to_jsonb(e.keywords),
    'raw_use_cases', to_jsonb(e.use_cases),
    'raw_deliverables', to_jsonb(e.deliverables),
    'generated_fields_policy', 'mission/responsibilities/tech_stack/kpis derived only from offers.typical_profiles, offers.keywords, offers.use_cases and offers.typical_deliverables; no external enrichment'
  ) as metadata
from expected e
where not exists (
  select 1
  from job_profiles jp
  where jp.workspace_id = e.workspace_id
    and jp.title = e.title
)
on conflict (workspace_id, title) do nothing;

with offer_profiles as (
  select
    o.workspace_id,
    o.practice_id,
    op.name as practice_name,
    op.slug as practice_slug,
    trim(profile) as title
  from offers o
  join offer_practices op on op.id = o.practice_id
  cross join unnest(o.typical_profiles) as profile
  where trim(profile) <> ''
), expected as (
  select
    workspace_id,
    title,
    min(practice_id::text)::uuid as practice_id,
    min(practice_name) as practice_name,
    min(practice_slug) as practice_slug,
    count(distinct practice_id) as practice_count
  from offer_profiles
  group by workspace_id, title
)
update job_profiles jp
set
  practice_id = e.practice_id,
  updated_at = now(),
  metadata = jp.metadata || jsonb_build_object(
    'practice_realigned_from_offers_typical_profiles', true,
    'practice_realigned_at', now(),
    'previous_practice_id', jp.practice_id::text,
    'expected_practice_id', e.practice_id::text,
    'expected_practice_name', e.practice_name,
    'expected_practice_slug', e.practice_slug
  )
from expected e
where e.practice_count = 1
  and jp.workspace_id = e.workspace_id
  and jp.title = e.title
  and jp.practice_id <> e.practice_id;

COMMIT;

-- Optional post-run audit query:
-- with offer_profile_titles as (
--   select distinct o.workspace_id, trim(profile) as title
--   from offers o
--   cross join unnest(o.typical_profiles) as profile
--   where trim(profile) <> ''
-- )
-- select
--   count(*) as target_profiles,
--   count(jp.id) as profiles_present,
--   count(*) filter (where jp.id is null) as missing_profiles,
--   (select count(*) from job_profiles) as job_profiles_total
-- from offer_profile_titles opt
-- left join job_profiles jp
--   on jp.workspace_id = opt.workspace_id
--  and jp.title = opt.title;
