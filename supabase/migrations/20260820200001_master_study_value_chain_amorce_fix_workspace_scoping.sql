-- =============================================================================
-- Master Study L2 — Valeur chaine amorce E4, RPC transactionnelle E4 et
-- extension source_run_id sur ingest_competitive_map_batch.
-- =============================================================================

-- 1. Élargissement des contraintes value_chain_nodes
-- La contrainte calée sur les 5 maillons du BTP ne tient plus dès qu'un
-- deuxième secteur est cartographié (ADR-0021 §9.1, amorce E4).
alter table public.value_chain_nodes
  drop constraint if exists value_chain_nodes_maillon_check;
alter table public.value_chain_nodes
  add constraint value_chain_nodes_maillon_check check (maillon >= 1);

-- E4 amorce un maillon sans connaître sa captation de valeur (c'est le travail de E6,
-- arbitrage humain). Un nœud 'chaine' peut donc exister avec capture_valeur NULL —
-- vcn_capture_justifiee (capture_valeur et sa justification vont ensemble) reste seule
-- garante de la cohérence quand la captation EST renseignée.
alter table public.value_chain_nodes
  drop constraint if exists vcn_capture_si_chaine;

comment on constraint value_chain_nodes_maillon_check on public.value_chain_nodes is
  'Plancher à 1, pas de plafond : le plafond à 5 (BTP) ne generalise pas — Parfumerie en a 6.';

-- 2. RPC transactionnelle d'ingestion E4
create or replace function private.ingest_master_study_e4(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segment_id uuid := (p_payload->>'segment_id')::uuid;
  v_workspace_id uuid;
  v_owner_id uuid;
  v_run_id uuid;
  v_document_id uuid;
  v_updated integer;
begin
  -- Le workspace est dérivé du SEGMENT CIBLE, pas de `private.current_workspace_id()`.
  -- Cette RPC n'est jamais appelée depuis un Server Action (session utilisateur) : son
  -- seul appelant est `scripts/ingest-master-study.mts`, avec la clé service-role. Sous
  -- ce rôle, `auth.uid()` ne résout à rien et `current_workspace_id()` renverrait NULL —
  -- ce qui aurait fait échouer ce test sur CHAQUE appel, jamais exercé en `--dry-run`.
  select workspace_id into v_workspace_id
  from public.sector_intelligence
  where id = v_segment_id;

  if v_workspace_id is null then
    raise exception 'Segment introuvable : %', v_segment_id;
  end if;

  -- Résolution du propriétaire du document (auth.uid() ou owner du workspace ou profil actif)
  v_owner_id := coalesce(
    auth.uid(),
    (select owner_id from public.workspaces where id = v_workspace_id),
    (select id from public.profiles where workspace_id = v_workspace_id limit 1)
  );

  -- 1. Le run (company_id volontairement omis => NULL, ADR MS-9b)
  --    workspace_id explicite partout : sous service-role, DEFAULT current_workspace_id()
  --    résoudrait NULL sur les 3 tables qui l'utilisent comme défaut.
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

  -- 2. Le document archivé
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

  -- 3. sector_intelligence — patch scalaire + fusion clé par clé playbook/caveats
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
    study_snapshot_date = (p_payload->>'study_snapshot_date')::date
  where id = v_segment_id and workspace_id = v_workspace_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sector_intelligence non mis à jour pour %', v_segment_id;
  end if;

  -- 4. Tables d'items — idempotent sur CE run_id (rejeu du même run_id remplace ses
  --    propres lignes, jamais celles d'un autre — ADR §7.3 point 9)
  --    workspace_id explicite : ces 4 tables N'ONT AUCUN DÉFAUT sur cette colonne
  --    (vérifié en base, contrairement aux 3 tables ci-dessus) — l'omettre échouait
  --    sur une violation NOT NULL, quel que soit l'appelant, dès le premier item.
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
$$;

grant execute on function private.ingest_master_study_e4(jsonb) to authenticated, service_role;

-- 3. Extension de public.ingest_competitive_map_batch avec p_source_run_id optionnel
drop function if exists public.ingest_competitive_map_batch(jsonb, text);

create or replace function public.ingest_competitive_map_batch(
  p_decisions jsonb,
  p_reason text default null,
  p_source_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_workspace_id   uuid;
  v_item           jsonb;
  v_action         text;
  v_company_id     uuid;
  v_name           text;
  v_siren          text;
  v_segment_slug   text;
  v_segment_id     uuid;
  v_sector_id      uuid;
  v_category       text;
  v_confiance      text;
  v_study_date     date;
  v_ca_meur        numeric;
  v_effectif       int;
  v_source_id      uuid;
  v_source_key     text;
  v_first_segment  text;
  v_first_date     text;
  v_created        jsonb := '[]'::jsonb;
  v_attached       jsonb := '[]'::jsonb;
  v_errors         jsonb := '[]'::jsonb;
  v_confidence_num numeric;
  v_norm_value     text;
  v_profile        jsonb;
  v_benchmark      boolean;
  v_accessibilite  smallint;
begin
  perform private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();

  if p_decisions is null or jsonb_typeof(p_decisions) <> 'array' then
    raise exception using errcode='P0001', message='invalid_payload',
      detail='p_decisions doit être un tableau JSON.';
  end if;

  -- Une seule source par lot d'import : la provenance de tous les faits
  -- chiffrés de cette cartographie (D-4). Clé déterministe -> ré-import
  -- idempotent de la même étude.
  v_first_segment := p_decisions -> 0 ->> 'segmentSlug';
  v_first_date    := p_decisions -> 0 ->> 'studySnapshotDate';
  v_source_key    := 'competitive_map:' || coalesce(v_first_segment, 'inconnu') || ':' ||
                      coalesce(v_first_date, to_char(now(), 'YYYY-MM-DD'));

  insert into public.intelligence_sources (
    workspace_id, source_type, source_name, source_key,
    collection_method, technical_metadata
  ) values (
    v_workspace_id, 'other',
    'Cartographie concurrentielle — import du ' || to_char(now(), 'YYYY-MM-DD'),
    v_source_key, 'import', jsonb_build_object('reason', p_reason)
  )
  on conflict (workspace_id, source_key) do update
    set collected_at = now()
  returning id into v_source_id;

  for v_item in select * from jsonb_array_elements(p_decisions) loop
    begin
      v_action       := v_item ->> 'action';
      v_company_id   := nullif(v_item ->> 'companyId', '')::uuid;
      v_name         := nullif(btrim(coalesce(v_item ->> 'name', '')), '');
      v_siren        := nullif(btrim(coalesce(v_item ->> 'siren', '')), '');
      v_segment_slug := nullif(btrim(coalesce(v_item ->> 'segmentSlug', '')), '');
      v_category     := v_item ->> 'category';
      v_confiance    := v_item ->> 'confiance';
      v_study_date   := (v_item ->> 'studySnapshotDate')::date;
      v_ca_meur      := nullif(v_item ->> 'caMeur', '')::numeric;
      v_effectif     := nullif(v_item ->> 'effectifFrance', '')::int;
      v_benchmark    := coalesce((v_item ->> 'isBenchmarkAccount')::boolean, false);
      v_accessibilite := nullif(v_item ->> 'accessibiliteScore', '')::smallint;

      -- Un profil absent, nul ou non-objet ne doit jamais faire échouer une
      -- entrée : la colonne est NOT NULL DEFAULT '{}', on s'y ramène.
      v_profile := v_item -> 'profileJson';
      if v_profile is null or jsonb_typeof(v_profile) <> 'object' then
        v_profile := '{}'::jsonb;
      end if;

      if v_action not in ('attach', 'create') then
        raise exception using errcode='P0001', message='invalid_action';
      end if;

      if v_segment_slug is null then
        raise exception using errcode='P0001', message='segment_required';
      end if;

      -- §9/§12.1 REFERENTIEL-CLASSIFICATION : jamais de création de segment
      -- à la volée, même par un pipeline d'ingestion.
      select si.id, si.parent_id into v_segment_id, v_sector_id
        from public.sector_intelligence si
       where si.workspace_id = v_workspace_id
         and si.slug = v_segment_slug
         and si.level = 'segment';

      if v_segment_id is null then
        raise exception using errcode='P0001', message='unknown_segment',
          detail=format('Le segment « %s » n''existe pas dans le référentiel.', v_segment_slug);
      end if;

      if v_sector_id is null then
        raise exception using errcode='P0001', message='segment_without_macro';
      end if;

      if v_category not in ('leader','challenger','mid_market','outsider_emergent','outsider_niche') then
        raise exception using errcode='P0001', message='invalid_category';
      end if;

      if v_confiance not in ('haute','moyenne','faible') then
        raise exception using errcode='P0001', message='invalid_confiance';
      end if;

      if v_study_date is null then
        raise exception using errcode='P0001', message='invalid_study_snapshot_date';
      end if;

      if v_accessibilite is not null and v_accessibilite not between 1 and 5 then
        raise exception using errcode='P0001', message='invalid_accessibilite_score';
      end if;

      if v_action = 'create' then
        if v_name is null then
          raise exception using errcode='P0001', message='name_required';
        end if;

        -- D-3 : un compte mapped n'est pas un compte réel. relation_type est
        -- NOT NULL sur un domaine fermé à 4 valeurs (§5.8) qui ne porte pas de
        -- valeur « concurrent » : 'prospect' est la plus neutre, cohérente
        -- avec l'ancien défaut de colonne d'avant la migration 066.
        begin
          insert into public.companies (
            workspace_id, name, siren, depth_level, origin,
            segment_id, sector_id, relation_type
          ) values (
            v_workspace_id, v_name, v_siren, 'mapped', 'competitive_map',
            v_segment_id, v_sector_id, 'prospect'
          )
          returning id into v_company_id;
        exception when unique_violation then
          raise exception using errcode='P0001', message='siren_conflict',
            detail=format('Un compte porte déjà le SIREN « %s ».', v_siren);
        end;

        v_created := v_created || jsonb_build_object('companyId', v_company_id, 'name', v_name);
      else
        if v_company_id is null then
          raise exception using errcode='P0001', message='company_id_required';
        end if;

        if not exists (
          select 1 from public.companies
           where id = v_company_id and workspace_id = v_workspace_id
        ) then
          raise exception using errcode='P0001', message='company_not_found';
        end if;

        v_attached := v_attached || jsonb_build_object('companyId', v_company_id);
      end if;

      insert into public.competitive_map_entries (
        workspace_id, company_id, sector_id, segment_id, is_benchmark_account, category,
        positioning, forces, vulnerabilite, angle_entree,
        empreinte_metier, maturite_numerique, accessibilite_score,
        appetence_score, appetence_provisoire,
        confiance, source_document_id, study_snapshot_date, profile_json, source_run_id
      ) values (
        v_workspace_id, v_company_id, v_sector_id, v_segment_id, v_benchmark, v_category,
        v_item ->> 'positioning', v_item ->> 'forces', v_item ->> 'vulnerabilite', v_item ->> 'angleEntree',
        nullif(v_item ->> 'empreinteMetier', '')::smallint, nullif(v_item ->> 'maturiteNumerique', '')::smallint,
        v_accessibilite,
        nullif(v_item ->> 'appetenceScore', '')::smallint, coalesce((v_item ->> 'appetenceProvisoire')::boolean, true),
        v_confiance, null, v_study_date, v_profile, p_source_run_id
      )
      on conflict (company_id, sector_id, study_snapshot_date) do update set
        segment_id = excluded.segment_id,
        is_benchmark_account = excluded.is_benchmark_account,
        category = excluded.category,
        positioning = excluded.positioning,
        forces = excluded.forces,
        vulnerabilite = excluded.vulnerabilite,
        angle_entree = excluded.angle_entree,
        empreinte_metier = excluded.empreinte_metier,
        maturite_numerique = excluded.maturite_numerique,
        accessibilite_score = excluded.accessibilite_score,
        appetence_score = excluded.appetence_score,
        appetence_provisoire = excluded.appetence_provisoire,
        confiance = excluded.confiance,
        profile_json = excluded.profile_json,
        source_run_id = coalesce(p_source_run_id, competitive_map_entries.source_run_id),
        updated_at = now();

      v_confidence_num := case v_confiance
        when 'haute' then 0.9
        when 'moyenne' then 0.6
        else 0.3
      end;

      if v_ca_meur is not null then
        v_norm_value := v_ca_meur::text;
        insert into public.account_facts (
          workspace_id, target_type, target_id, fact_type, cardinality,
          value_json, normalized_value, normalized_value_hash,
          origin, confidence_score, primary_source_id, is_current
        ) values (
          v_workspace_id, 'company', v_company_id, 'revenue_estimate', 'single',
          jsonb_build_object(
            'amountMeur', v_ca_meur,
            'exercice', nullif(v_item ->> 'exercice', '')::int,
            'perimetre', v_item ->> 'perimetreCa'
          ),
          v_norm_value, md5(v_norm_value),
          'external', v_confidence_num, v_source_id, true
        )
        on conflict (workspace_id, target_type, target_id, fact_type, coalesce(fact_subtype, ''))
          where is_current and cardinality = 'single'
        do update set
          value_json = excluded.value_json,
          normalized_value = excluded.normalized_value,
          normalized_value_hash = excluded.normalized_value_hash,
          confidence_score = excluded.confidence_score,
          primary_source_id = excluded.primary_source_id,
          updated_at = now();
      end if;

      if v_effectif is not null then
        v_norm_value := v_effectif::text;
        insert into public.account_facts (
          workspace_id, target_type, target_id, fact_type, cardinality,
          value_text, normalized_value, normalized_value_hash,
          origin, confidence_score, primary_source_id, is_current
        ) values (
          v_workspace_id, 'company', v_company_id, 'headcount_france', 'single',
          v_norm_value, v_norm_value, md5(v_norm_value),
          'external', v_confidence_num, v_source_id, true
        )
        on conflict (workspace_id, target_type, target_id, fact_type, coalesce(fact_subtype, ''))
          where is_current and cardinality = 'single'
        do update set
          value_text = excluded.value_text,
          normalized_value = excluded.normalized_value,
          normalized_value_hash = excluded.normalized_value_hash,
          confidence_score = excluded.confidence_score,
          primary_source_id = excluded.primary_source_id,
          updated_at = now();
      end if;

    exception when others then
      v_errors := v_errors || jsonb_build_object(
        'name', coalesce(v_name, v_item ->> 'name'),
        'code', sqlerrm,
        'sqlstate', sqlstate
      );
    end;
  end loop;

  return jsonb_build_object(
    'created', v_created,
    'attached', v_attached,
    'errors', v_errors
  );
end;
$function$;

comment on function public.ingest_competitive_map_batch(jsonb, text, uuid) is
  'ADR-0019 Lot 5 + BI Environnement concurrentiel Lot 1 + ADR-0021 L2 — écrit atomiquement (par entrée) une cartographie concurrentielle déjà arbitrée avec option source_run_id : rattachement ou création mapped/competitive_map, competitive_map_entries (dont accessibilite_score, profile_json, is_benchmark_account, source_run_id), account_facts sourcés (revenue_estimate/headcount_france).';

revoke all on function public.ingest_competitive_map_batch(jsonb, text, uuid) from public;
grant execute on function public.ingest_competitive_map_batch(jsonb, text, uuid) to authenticated, service_role;
