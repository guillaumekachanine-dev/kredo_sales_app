-- =============================================================================
-- 074 — Ingestion des cartographies concurrentielles (ADR-0019 Lot 5)
-- =============================================================================
-- Numérotée 074 et non 073 : le slot 073 a été pris entre-temps par le
-- chantier parallèle "Socle Identité France" (commit fb5559eb,
-- 20260812110000_073_account_facts_identite_france.sql), déjà committé. Même
-- collision de numérotation locale que documentée pour 018/019 (CLAUDE.md).
-- =============================================================================
-- Fait autorité : docs/adr/ADR-0019-profondeur-de-compte-et-ingestion-cartographie.md
--   D-4 (faits sourcés vs analyse — jamais dans les colonnes canoniques de
--   companies avant conversion) et D-5 (resolved/ambiguous/not_found, aucune
--   création automatique en cas d'ambiguïté).
--
-- Deux fonctions :
--   1. public.resolve_company_candidates(p_name, p_siren) — SECURITY INVOKER,
--      lecture seule, RLS du workspace de l'appelant. Réutilise
--      public.kredo_normalize_company_name(), jamais réimplémentée côté
--      TypeScript (même doctrine que la résolution sectorielle du Lot 0
--      sector_knowledge : la logique de rapprochement ne vit qu'en SQL).
--      Le mécanisme AccountScanResolution référencé par l'ADR n'est qu'un
--      CONTRAT (resolved/ambiguous/not_found + candidats) ; sa résolution
--      réelle passait jusqu'ici exclusivement par le workflow n8n
--      intel-010-refresh. L'ADR exclut explicitement un nouveau workflow n8n
--      pour ce lot — cette fonction réutilise le contrat, pas le workflow.
--   2. public.ingest_competitive_map_batch(p_decisions, p_reason) — SECURITY
--      DEFINER. `authenticated` n'a que SELECT sur account_facts et
--      intelligence_sources (RLS vérifiée en base) : toute écriture passe par
--      cette RPC, sur le modèle de apply_account_classification (068).
--      Jamais de segment créé à la volée (REFERENTIEL-CLASSIFICATION §9/§12.1) :
--      un slug inconnu met l'item en erreur, jamais un insert dans
--      sector_intelligence.
--
-- Rollback :
--   drop function public.ingest_competitive_map_batch(jsonb, text);
--   drop function public.resolve_company_candidates(text, text);
--   drop extension if exists pg_trgm;
-- =============================================================================

create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- A. resolve_company_candidates — lecture seule, RLS du workspace appelant
-- -----------------------------------------------------------------------------
create or replace function public.resolve_company_candidates(
  p_name text,
  p_siren text default null
)
returns table (
  company_id   uuid,
  name         text,
  siren        text,
  match_method text,
  match_score  numeric
)
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
  with normalized as (
    select public.kredo_normalize_company_name(p_name) as norm
  )
  select
    c.id,
    c.name,
    c.siren,
    case
      when p_siren is not null and c.siren = p_siren then 'siren'
      when c.name_normalized = (select norm from normalized) then 'exact_name'
      else 'fuzzy_name'
    end as match_method,
    case
      when p_siren is not null and c.siren = p_siren then 1.0::numeric
      when c.name_normalized = (select norm from normalized) then 1.0::numeric
      else similarity(c.name_normalized, (select norm from normalized))::numeric
    end as match_score
  from public.companies c
  where c.workspace_id = private.current_workspace_id()
    and (
      (p_siren is not null and c.siren = p_siren)
      or c.name_normalized = (select norm from normalized)
      or similarity(c.name_normalized, (select norm from normalized)) > 0.35
    )
  order by match_score desc
  limit 5
$function$;

comment on function public.resolve_company_candidates(text, text) is
  'ADR-0019 Lot 5 — résolution SQL pure (siren exact > nom normalisé exact > similarité pg_trgm) contre les comptes du workspace courant. Réutilise kredo_normalize_company_name, jamais dupliquée côté TypeScript.';

grant execute on function public.resolve_company_candidates(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- B. ingest_competitive_map_batch — écriture atomique par entrée
-- -----------------------------------------------------------------------------
-- p_decisions : tableau JSON, un objet par compte de la cartographie déjà
-- arbitré côté client (le navigateur ne transmet jamais une valeur canonique
-- « en confiance » : chaque entrée a été vue et validée dans le bac
-- d'arbitrage avant l'appel).
--
-- {
--   "action": "attach" | "create",
--   "companyId": uuid | null,           -- requis si action=attach
--   "name": text | null,                -- requis si action=create
--   "siren": text | null,
--   "segmentSlug": text,                -- doit exister dans sector_intelligence
--   "category": "leader"|"challenger"|"mid_market"|"outsider_emergent"|"outsider_niche",
--   "positioning": text | null,
--   "forces": text | null,
--   "vulnerabilite": text | null,
--   "angleEntree": text | null,
--   "empreinteMetier": int 1-5 | null,
--   "maturiteNumerique": int 1-5 | null,
--   "appetenceScore": int 0-35 | null,
--   "appetenceProvisoire": bool,
--   "confiance": "haute"|"moyenne"|"faible",
--   "studySnapshotDate": date (ISO),
--   "caMeur": numeric | null,
--   "exercice": int | null,
--   "perimetreCa": text | null,
--   "effectifFrance": int | null
-- }
--
-- Chaque entrée est traitée dans sa propre sous-transaction implicite (bloc
-- exception) : une erreur sur un compte n'annule pas les autres, même
-- doctrine que skippedAxes dans apply_account_classification (068).
create or replace function public.ingest_competitive_map_batch(
  p_decisions jsonb,
  p_reason text default null
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
        workspace_id, company_id, sector_id, segment_id, category,
        positioning, forces, vulnerabilite, angle_entree,
        empreinte_metier, maturite_numerique, appetence_score, appetence_provisoire,
        confiance, source_document_id, study_snapshot_date
      ) values (
        v_workspace_id, v_company_id, v_sector_id, v_segment_id, v_category,
        v_item ->> 'positioning', v_item ->> 'forces', v_item ->> 'vulnerabilite', v_item ->> 'angleEntree',
        nullif(v_item ->> 'empreinteMetier', '')::smallint, nullif(v_item ->> 'maturiteNumerique', '')::smallint,
        nullif(v_item ->> 'appetenceScore', '')::smallint, coalesce((v_item ->> 'appetenceProvisoire')::boolean, true),
        v_confiance, null, v_study_date
      )
      on conflict (company_id, sector_id, study_snapshot_date) do update set
        segment_id = excluded.segment_id,
        category = excluded.category,
        positioning = excluded.positioning,
        forces = excluded.forces,
        vulnerabilite = excluded.vulnerabilite,
        angle_entree = excluded.angle_entree,
        empreinte_metier = excluded.empreinte_metier,
        maturite_numerique = excluded.maturite_numerique,
        appetence_score = excluded.appetence_score,
        appetence_provisoire = excluded.appetence_provisoire,
        confiance = excluded.confiance,
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

comment on function public.ingest_competitive_map_batch(jsonb, text) is
  'ADR-0019 Lot 5 — écrit atomiquement (par entrée) une cartographie concurrentielle déjà arbitrée : rattachement ou création mapped/competitive_map, competitive_map_entries, account_facts sourcés (revenue_estimate/headcount_france). Jamais de segment créé à la volée (§9/§12.1 REFERENTIEL-CLASSIFICATION).';

revoke all on function public.ingest_competitive_map_batch(jsonb, text) from public;
grant execute on function public.ingest_competitive_map_batch(jsonb, text) to authenticated, service_role;

-- =============================================================================
-- POST-MIGRATION — hors transaction
-- =============================================================================
-- 1. npm run db:types
-- =============================================================================
