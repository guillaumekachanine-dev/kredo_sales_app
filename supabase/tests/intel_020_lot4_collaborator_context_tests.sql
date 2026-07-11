begin;

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'assertion_failed: %', p_message;
  end if;
end;
$$;

create temp table pg_temp.intel_020_lot4_context (
  workspace_id uuid not null,
  collaborator_id uuid not null,
  mission_id uuid,
  manager_profile_id uuid
) on commit drop;

insert into pg_temp.intel_020_lot4_context
select
  c.workspace_id,
  c.id,
  (
    select m.id
    from public.missions m
    where m.workspace_id = c.workspace_id
      and m.collaborator_id = c.id
    order by case when m.status = 'active' then 0 else 1 end,
      m.start_date desc nulls last,
      m.created_at desc
    limit 1
  ),
  c.manager_profile_id
from public.collaborators c
where (select count(*) from public.profiles p where p.workspace_id = c.workspace_id) = 1
order by c.created_at
limit 1;

select pg_temp.assert_true(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collaborators'
      and column_name = 'manager_profile_id'
  ),
  'manager_profile_id must exist on collaborators.'
);

select pg_temp.assert_true(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.collaborators'::regclass
      and contype = 'f'
      and confrelid = 'public.profiles'::regclass
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.collaborators'::regclass and attname = 'manager_profile_id')
      ]
  ),
  'manager_profile_id must reference profiles.'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.collaborators c
    where c.manager_profile_id is not null
      and (select count(*) from public.profiles p where p.workspace_id = c.workspace_id) <> 1
  ),
  'Backfill must not select a manager when a workspace has zero or multiple profiles.'
);

create temp table pg_temp.intel_020_lot4_backfill_probe (
  workspace_id integer not null,
  profile_id integer not null,
  collaborator_id integer not null,
  manager_profile_id integer
) on commit drop;

insert into pg_temp.intel_020_lot4_backfill_probe (
  workspace_id,
  profile_id,
  collaborator_id,
  manager_profile_id
)
values
  (1, 10, 100, null),
  (2, 20, 200, null),
  (2, 21, 200, null);

with single_profile_workspace as (
  select
    workspace_id,
    (array_agg(profile_id order by profile_id))[1] as profile_id
  from pg_temp.intel_020_lot4_backfill_probe
  group by workspace_id
  having count(*) = 1
)
update pg_temp.intel_020_lot4_backfill_probe collaborator
set manager_profile_id = single_profile_workspace.profile_id
from single_profile_workspace
where collaborator.workspace_id = single_profile_workspace.workspace_id
  and collaborator.manager_profile_id is null;

select pg_temp.assert_true(
  (select manager_profile_id = 10 from pg_temp.intel_020_lot4_backfill_probe where collaborator_id = 100)
    and (select manager_profile_id is null from pg_temp.intel_020_lot4_backfill_probe where collaborator_id = 200 limit 1),
  'The backfill algorithm must assign only mono-profile workspaces and leave multi-profile workspaces unchanged.'
);

select pg_temp.assert_true(
  (select count(*) = 1 from pg_temp.intel_020_lot4_context),
  'A mono-profile collaborator is required to test the RPC.'
);

do $$
declare
  v_context jsonb;
  v_requested jsonb;
begin
  select public.get_collaborator_communication_context(workspace_id, collaborator_id)
    into v_context
  from pg_temp.intel_020_lot4_context;

  perform pg_temp.assert_true(v_context is not null, 'Valid collaborator context must not be null.');
  perform pg_temp.assert_true(
    v_context ?& array[
      'collaborator', 'person', 'managerProfile', 'currentMission', 'recentMissions',
      'jobProfile', 'skills', 'availability', 'recentActivity', 'recentAbsences'
    ],
    'RPC JSON shape must contain every stable key.'
  );
  perform pg_temp.assert_true(
    v_context->'collaborator'->>'id' = (select collaborator_id::text from pg_temp.intel_020_lot4_context),
    'RPC collaborator must match the requested collaborator.'
  );
  perform pg_temp.assert_true(
    coalesce(jsonb_typeof(v_context->'recentMissions'), '') = 'array'
      and coalesce(jsonb_typeof(v_context->'skills'), '') = 'array'
      and coalesce(jsonb_typeof(v_context->'recentActivity'), '') = 'array'
      and coalesce(jsonb_typeof(v_context->'recentAbsences'), '') = 'array',
    'RPC list fields must always be arrays.'
  );

  if (select mission_id from pg_temp.intel_020_lot4_context) is not null then
    select public.get_collaborator_communication_context(workspace_id, collaborator_id, mission_id)
      into v_requested
    from pg_temp.intel_020_lot4_context;
    perform pg_temp.assert_true(
      v_requested->'currentMission'->>'id' = (select mission_id::text from pg_temp.intel_020_lot4_context),
      'Explicitly requested mission must be selected when it belongs to the collaborator workspace.'
    );
  end if;
end;
$$;

select pg_temp.assert_true(
  public.get_collaborator_communication_context(gen_random_uuid(), (select collaborator_id from pg_temp.intel_020_lot4_context)) is null,
  'A collaborator requested from another workspace must be inaccessible.'
);

select pg_temp.assert_true(
  public.get_collaborator_communication_context((select workspace_id from pg_temp.intel_020_lot4_context), gen_random_uuid()) is null,
  'An unknown collaborator must return null.'
);

rollback;
