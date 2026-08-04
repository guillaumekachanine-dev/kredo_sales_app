create unique index if not exists intelligence_documents_strategic_watch_period_uidx
  on public.intelligence_documents (workspace_id, period_start, period_end)
  where document_type = 'strategic_watch_analysis'
    and status <> 'archived';

create or replace function public.upsert_strategic_watch_document(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_source_result_id uuid,
  p_title text,
  p_content_text text,
  p_content_json jsonb,
  p_period_start date,
  p_period_end date,
  p_data_cutoff_at timestamptz,
  p_scope_json jsonb,
  p_brief_json jsonb,
  p_source_refs jsonb,
  p_qa_flags jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_document_id uuid;
  v_next_version integer;
begin
  -- Sérialise uniquement les générations d'un même workspace et d'une même
  -- période, y compris lorsqu'aucune ligne document n'existe encore.
  perform pg_advisory_xact_lock(
    hashtextextended(p_workspace_id::text || ':' || p_period_start::text || ':' || p_period_end::text, 0)
  );

  select d.id, d.version_number
    into v_document_id, v_next_version
  from public.intelligence_documents d
  where d.workspace_id = p_workspace_id
    and d.document_type = 'strategic_watch_analysis'
    and d.period_start = p_period_start
    and d.period_end = p_period_end
    and d.status <> 'archived'
  for update;

  if v_document_id is null then
    insert into public.intelligence_documents (
      workspace_id,
      owner_id,
      title,
      document_type,
      status,
      current_content_text,
      current_content_json,
      data_cutoff_at,
      period_start,
      period_end,
      scope_json,
      source_result_id,
      tags,
      version_number
    ) values (
      p_workspace_id,
      p_actor_user_id,
      p_title,
      'strategic_watch_analysis',
      'ready',
      nullif(btrim(p_content_text), ''),
      coalesce(p_content_json, '{}'::jsonb),
      p_data_cutoff_at,
      p_period_start,
      p_period_end,
      p_scope_json,
      p_source_result_id,
      array['veille', 'analyse stratégique'],
      1
    )
    returning id into v_document_id;

    insert into public.intelligence_document_versions (
      workspace_id,
      document_id,
      version_number,
      origin,
      source_result_id,
      content_text,
      content_json,
      brief_json,
      source_refs,
      qa_flags,
      change_note,
      created_by
    ) values (
      p_workspace_id,
      v_document_id,
      1,
      'generated',
      p_source_result_id,
      nullif(btrim(p_content_text), ''),
      coalesce(p_content_json, '{}'::jsonb),
      p_brief_json,
      coalesce(p_source_refs, '[]'::jsonb),
      coalesce(p_qa_flags, '[]'::jsonb),
      'Première analyse de la période',
      p_actor_user_id
    );
    return v_document_id;
  end if;

  if exists (
    select 1
    from public.intelligence_document_versions v
    where v.document_id = v_document_id
      and v.source_result_id = p_source_result_id
  ) then
    return v_document_id;
  end if;

  v_next_version := v_next_version + 1;

  insert into public.intelligence_document_versions (
    workspace_id,
    document_id,
    version_number,
    origin,
    source_result_id,
    content_text,
    content_json,
    brief_json,
    source_refs,
    qa_flags,
    change_note,
    created_by
  ) values (
    p_workspace_id,
    v_document_id,
    v_next_version,
    'regenerated',
    p_source_result_id,
    nullif(btrim(p_content_text), ''),
    coalesce(p_content_json, '{}'::jsonb),
    p_brief_json,
    coalesce(p_source_refs, '[]'::jsonb),
    coalesce(p_qa_flags, '[]'::jsonb),
    'Analyse régénérée pour la même période',
    p_actor_user_id
  );

  update public.intelligence_documents
  set title = p_title,
      status = 'ready',
      current_content_text = nullif(btrim(p_content_text), ''),
      current_content_json = coalesce(p_content_json, '{}'::jsonb),
      data_cutoff_at = p_data_cutoff_at,
      scope_json = p_scope_json,
      source_result_id = p_source_result_id,
      version_number = v_next_version,
      updated_at = now()
  where id = v_document_id;

  return v_document_id;
end;
$$;

revoke all on function public.upsert_strategic_watch_document(
  uuid, uuid, uuid, text, text, jsonb, date, date, timestamptz, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.upsert_strategic_watch_document(
  uuid, uuid, uuid, text, text, jsonb, date, date, timestamptz, jsonb, jsonb, jsonb, jsonb
) to service_role;
