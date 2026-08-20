-- Master Study L3/L4 — ingest_master_study_e4 promeut désormais status → 'active'.
--
-- Trouvé en vérification indépendante du pilote (2026-08-20, HANDOFF-L0-L1-ADR-0021.md §4.7) :
-- la RPC ne touchait jamais sector_intelligence.status. Un segment ingéré restait 'development',
-- ce qui le rendait invisible pour Prospection · Fenêtres (get-playbook-sectors.ts filtre
-- status='active'), alors même que son étude venait d'être réellement produite et vérifiée.
-- Corrigé au cas par cas par UPDATE ponctuel sur le pilote ; Guillaume a tranché le 20/08 que
-- la promotion doit devenir systématique dans la RPC, pas un geste humain répété à chaque run.
--
-- Inconditionnel, à l'image du reste de la fonction : une ingestion réussie de master_study_e4
-- signifie par construction qu'une étude a été validée (G0/G1 avec réserves documentées, G3
-- rendu par un humain avant --live — voir docs/MASTER-STUDY/registre/HANDOFF-L3-GEMINI.md §0) et
-- doit donc être exposée. Ne jamais rétrograder ('watch' → 'development' par exemple) : cette RPC
-- ne fait que promouvoir, jamais dégrader.

create or replace function public.ingest_master_study_e4(p_payload jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_segment_id uuid := (p_payload->>'segment_id')::uuid;
  v_workspace_id uuid;
  v_owner_id uuid;
  v_run_id uuid;
  v_document_id uuid;
  v_updated integer;
begin
  select workspace_id into v_workspace_id
  from public.sector_intelligence
  where id = v_segment_id;

  if v_workspace_id is null then
    raise exception 'Segment introuvable : %', v_segment_id;
  end if;

  v_owner_id := coalesce(
    auth.uid(),
    (select owner_id from public.workspaces where id = v_workspace_id),
    (select id from public.profiles where workspace_id = v_workspace_id limit 1)
  );

  insert into public.ai_intelligence_runs (
    workspace_id, run_type, status, trigger_source, input_snapshot, config,
    started_at, completed_at, primary_entity_type, primary_entity_id,
    owner_id
  ) values (
    v_workspace_id, 'master_study', 'succeeded', 'manual',
    p_payload->'run'->'input_snapshot', p_payload->'run'->'config',
    now(), now(), 'sector', v_segment_id,
    v_owner_id
  ) returning id into v_run_id;

  insert into public.intelligence_documents (
    workspace_id, title, document_type, status, current_content_text, current_content_json,
    primary_entity_type, primary_entity_id, scope_json, data_cutoff_at,
    owner_id
  ) values (
    v_workspace_id, p_payload->'document'->>'title', 'master_study', 'ready',
    p_payload->'document'->>'content_text', p_payload->'document'->'content_json',
    'sector', v_segment_id, p_payload->'document'->'scope_json',
    (p_payload->>'study_snapshot_date')::timestamptz,
    v_owner_id
  ) returning id into v_document_id;

  insert into public.intelligence_document_versions (
    workspace_id, document_id, version_number, origin, content_text, content_json,
    created_by
  ) values (
    v_workspace_id, v_document_id, 1, 'imported',
    p_payload->'document'->>'content_text', p_payload->'document'->'content_json',
    v_owner_id
  );

  update public.sector_intelligence
  set
    description = coalesce(p_payload->'sector_patch'->>'description', description),
    market_size_eur_bn = case when p_payload->'sector_patch' ? 'market_size_eur_bn'
      then (p_payload->'sector_patch'->>'market_size_eur_bn')::numeric else market_size_eur_bn end,
    market_growth_pct = case when p_payload->'sector_patch' ? 'market_growth_pct'
      then (p_payload->'sector_patch'->>'market_growth_pct')::numeric else market_growth_pct end,
    resolution_locks = coalesce(resolution_locks, '{}'::jsonb) || coalesce(p_payload->'sector_patch'->'resolution_locks', '{}'::jsonb),
    playbook = coalesce(playbook, '{}'::jsonb) || coalesce(p_payload->'sector_patch'->'playbook_patch', '{}'::jsonb),
    caveats = coalesce(caveats, '{}'::jsonb) || coalesce(p_payload->'sector_patch'->'caveats_patch', '{}'::jsonb),
    source_run_id = v_run_id,
    study_snapshot_date = (p_payload->>'study_snapshot_date')::date,
    status = 'active'
  where id = v_segment_id and workspace_id = v_workspace_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sector_intelligence non mis à jour pour %', v_segment_id;
  end if;

  delete from public.sector_events where sector_id = v_segment_id and source_run_id = v_run_id;
  if p_payload ? 'events' and jsonb_array_length(p_payload->'events') > 0 then
    insert into public.sector_events (workspace_id, sector_id, title, event_type, description, event_date,
        source_url, commercial_opportunity, source_run_id)
    select v_workspace_id, v_segment_id, e->>'title', e->>'event_type', e->>'description',
        (e->>'event_date')::date, e->>'source_url', e->>'commercial_opportunity', v_run_id
    from jsonb_array_elements(p_payload->'events') e;
  end if;

  delete from public.sector_pain_points where sector_id = v_segment_id and source_run_id = v_run_id;
  if p_payload ? 'pain_points' and jsonb_array_length(p_payload->'pain_points') > 0 then
    insert into public.sector_pain_points (workspace_id, sector_id, title, frequency_count, source_company_ids, source_run_id)
    select v_workspace_id, v_segment_id, p->>'title', (p->>'frequency_count')::integer,
        coalesce(array(select jsonb_array_elements_text(p->'source_company_ids'))::uuid[], '{}'), v_run_id
    from jsonb_array_elements(p_payload->'pain_points') p;
  end if;

  delete from public.sector_regulatory_items where sector_id = v_segment_id and source_run_id = v_run_id;
  if p_payload ? 'regulatory_items' and jsonb_array_length(p_payload->'regulatory_items') > 0 then
    insert into public.sector_regulatory_items (workspace_id, sector_id, name, authority, deadline_date,
        source_url, commercial_angle, kredo_practice, is_commercial_window, urgency, source_run_id)
    select v_workspace_id, v_segment_id, r->>'name', r->>'authority', (r->>'deadline_date')::date,
        r->>'source_url', r->>'commercial_angle', r->>'kredo_practice',
        coalesce((r->>'is_commercial_window')::boolean, false), coalesce(r->>'urgency', 'medium'), v_run_id
    from jsonb_array_elements(p_payload->'regulatory_items') r;
  end if;

  delete from public.value_chain_nodes where sector_id = v_segment_id and source_run_id = v_run_id;
  if p_payload ? 'value_chain_nodes' and jsonb_array_length(p_payload->'value_chain_nodes') > 0 then
    insert into public.value_chain_nodes (workspace_id, sector_id, couche, maillon, rang, label, description, confiance, source_run_id)
    select v_workspace_id, v_segment_id, 'chaine', (n->>'maillon')::integer, 1, n->>'label', n->>'description', coalesce(n->>'confiance', 'moyenne'), v_run_id
    from jsonb_array_elements(p_payload->'value_chain_nodes') n;
  end if;

  return jsonb_build_object('run_id', v_run_id, 'document_id', v_document_id, 'segment_id', v_segment_id);
end;
$function$;

comment on function public.ingest_master_study_e4(jsonb) is
  'Ingestion transactionnelle E4 -> canon. Promeut sector_intelligence.status à ''active'' '
  'inconditionnellement (jamais de rétrogradation) — décision Guillaume 2026-08-20, suite au '
  'défaut trouvé sur le pilote seg-parfumerie-compositions-b2b (status resté development, '
  'segment invisible en Prospection).';
