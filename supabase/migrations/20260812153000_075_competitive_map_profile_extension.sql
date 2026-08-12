-- =============================================================================
-- 075 — Cartographie concurrentielle : accessibilité, profil narratif, étalon
-- =============================================================================
-- Lot 1 du chantier « Business Intelligence > Environnement concurrentiel »
-- (document directeur §4). Extension MINIMALE de la migration 074 : aucune
-- table nouvelle, aucune donnée analytique déplacée.
--
-- ⚠️ Numérotation : le slot 073 est pris deux fois en local
-- (20260812110000_073_account_facts_identite_france, NON appliquée en prod, et
-- 20260812124353_074_competitive_map_ingestion, appliquée en prod sous le nom
-- « 073_competitive_map_ingestion »). Le préfixe local 075 continue la
-- séquence du dépôt ; la clé réelle reste le timestamp.
--
-- Ce que la migration ajoute :
--   A. competitive_map_entries.accessibilite_score smallint 1..5 — l'axe Y de
--      la matrice cible (doc 08 §3.2 : X = appétence /35, Y = accessibilité).
--      NULL assumé : un acteur sans accessibilité reste « Non positionné »,
--      jamais une valeur de remplacement inventée (§7.2 du directeur).
--   B. competitive_map_entries.profile_json jsonb not null default '{}' — le
--      narratif propre à une étude (proposition de valeur, dépendances,
--      chaîne de valeur, triggers, trous, sources…), sans multiplier les
--      colonnes. Les données qui ont déjà une destination canonique
--      (account_facts pour les faits chiffrés sourcés, D-4 ADR-0019) n'y vont
--      PAS.
--   C. ingest_competitive_map_batch persiste ces deux champs + is_benchmark_account.
--
-- Rien d'autre ne change : mêmes règles resolved→attach / ambiguous→arbitrage
-- / not_found→mapped, même clé d'upsert (company_id, sector_id,
-- study_snapshot_date) donc même snapshot = mise à jour, nouvelle date =
-- nouvelle ligne d'historique.
--
-- Rollback :
--   -- restaurer le corps de la fonction depuis 20260812124353_074_*.sql
--   alter table public.competitive_map_entries
--     drop column accessibilite_score, drop column profile_json;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A + B. Les deux colonnes
-- -----------------------------------------------------------------------------
alter table public.competitive_map_entries
  add column accessibilite_score smallint
    check (accessibilite_score between 1 and 5),
  add column profile_json jsonb not null default '{}'::jsonb;

comment on column public.competitive_map_entries.accessibilite_score is
  'Composante « accessibilité » de l''appétence (1-5), extraite du bloc appetence du livrable. Axe Y de la matrice concurrentielle. NULL = non renseigné par l''étude : l''acteur reste hors matrice (« Non positionné »), jamais repositionné par une valeur par défaut.';

comment on column public.competitive_map_entries.profile_json is
  'Narratif propre à une étude, non normalisable en colonnes : proposition_valeur, dependances_cles, differenciateurs, modele_economique, chaine_valeur, priorites_strategiques, chantiers_technologiques, trigger_events, a_ne_pas_dire, trous, sources. Ne porte JAMAIS de fait chiffré sourcé (CA, effectif) — ceux-ci vont dans account_facts (ADR-0019 D-4).';

-- -----------------------------------------------------------------------------
-- C. ingest_competitive_map_batch — persistance des 3 champs
-- -----------------------------------------------------------------------------
-- Reprise intégrale du corps de la migration 074, à trois différences près :
--   * lecture de accessibiliteScore / profileJson / isBenchmarkAccount ;
--   * insertion et upsert de accessibilite_score, profile_json, is_benchmark_account ;
--   * garde-fou : profileJson non-objet -> '{}' plutôt qu'une erreur de lot.
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
        confiance, source_document_id, study_snapshot_date, profile_json
      ) values (
        v_workspace_id, v_company_id, v_sector_id, v_segment_id, v_benchmark, v_category,
        v_item ->> 'positioning', v_item ->> 'forces', v_item ->> 'vulnerabilite', v_item ->> 'angleEntree',
        nullif(v_item ->> 'empreinteMetier', '')::smallint, nullif(v_item ->> 'maturiteNumerique', '')::smallint,
        v_accessibilite,
        nullif(v_item ->> 'appetenceScore', '')::smallint, coalesce((v_item ->> 'appetenceProvisoire')::boolean, true),
        v_confiance, null, v_study_date, v_profile
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
  'ADR-0019 Lot 5 + BI Environnement concurrentiel Lot 1 — écrit atomiquement (par entrée) une cartographie concurrentielle déjà arbitrée : rattachement ou création mapped/competitive_map, competitive_map_entries (dont accessibilite_score, profile_json, is_benchmark_account), account_facts sourcés (revenue_estimate/headcount_france). Jamais de segment créé à la volée (§9/§12.1 REFERENTIEL-CLASSIFICATION).';

revoke all on function public.ingest_competitive_map_batch(jsonb, text) from public;
grant execute on function public.ingest_competitive_map_batch(jsonb, text) to authenticated, service_role;

-- =============================================================================
-- POST-MIGRATION — hors transaction
-- =============================================================================
-- 1. npm run db:types  (competitive_map_entries gagne 2 colonnes)
-- =============================================================================
