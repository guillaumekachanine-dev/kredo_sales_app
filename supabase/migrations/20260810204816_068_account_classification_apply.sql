-- =============================================================================
-- 068 — Application transactionnelle d'une classification de compte
--       (ADR-0019 Lot 4)
-- =============================================================================
-- Fait autorité : docs/FEATURES/sector_intelligence/taxonomie-sectorielle/
-- REFERENTIEL-CLASSIFICATION.md — §5 (spécification des 7 axes), §10 (contrôles
-- obligatoires AVANT écriture), §12 (interdits absolus).
--
-- Pourquoi une RPC dédiée et non `enrichment_proposals` :
--   le §10 pose quatre contrôles BLOQUANTS qui portent sur plusieurs champs à la
--   fois. `private.perform_proposal_apply` applique une proposition par
--   attribut, indépendamment des autres : il permettrait d'écrire `segment_id`
--   sans son macro et violerait le contrôle 2 par construction. Une
--   classification est un acte atomique, elle s'applique comme telle.
--
-- Le navigateur ne transmet JAMAIS une valeur à écrire : il envoie l'id du
-- résultat de scan et la liste des axes acceptés. La fonction relit le contenu
-- depuis `ai_intelligence_results.content_json` — même doctrine que
-- `import_account_scan_contacts`.
--
-- Rollback :
--   drop function public.apply_account_classification(uuid, text[], text);
--   drop function private.classification_relation_conflict(uuid, text);
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Garde-fou §12.9 — « ne jamais classer une ESN ou un partenaire en prospect »
-- -----------------------------------------------------------------------------
-- Le statut relationnel est le SEUL des 7 axes dont la source de vérité est
-- interne (missions, opportunités gagnées) et non documentaire. Une recherche
-- web ne peut pas l'établir : elle peut au mieux constater qu'aucune relation
-- n'est publique, ce qui n'est pas la même chose. Rétrograder en `prospect` un
-- compte qui porte une mission active détruirait la motion commerciale ET, par
-- le trigger de projection, son `lifecycle_status`.
create or replace function private.classification_relation_conflict(
  p_company_id uuid,
  p_relation_type text
)
returns text
language plpgsql
stable
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_has_active_mission boolean;
  v_has_won_opportunity boolean;
begin
  if p_relation_type is null or p_relation_type not in ('prospect', 'pair_partenaire') then
    return null;
  end if;

  select exists (
    select 1 from public.missions m
     where m.company_id = p_company_id and m.status = 'active'
  ) into v_has_active_mission;

  if v_has_active_mission then
    return format(
      'Statut « %s » refusé : ce compte porte au moins une mission active. Le statut relationnel se déduit de la relation réelle, pas d''une recherche documentaire (REFERENTIEL §12.9).',
      p_relation_type
    );
  end if;

  select exists (
    select 1 from public.opportunities o
     where o.company_id = p_company_id and o.stage = 'gagne'
  ) into v_has_won_opportunity;

  if v_has_won_opportunity then
    return format(
      'Statut « %s » refusé : ce compte porte au moins une opportunité gagnée (REFERENTIEL §12.9).',
      p_relation_type
    );
  end if;

  return null;
end;
$function$;

comment on function private.classification_relation_conflict(uuid, text) is
  'REFERENTIEL-CLASSIFICATION §12.9 — refuse une rétrogradation en prospect/pair_partenaire contredite par les missions actives ou les opportunités gagnées du compte.';

-- -----------------------------------------------------------------------------
-- B. apply_account_classification — l'unique point d'écriture des 7 axes
-- -----------------------------------------------------------------------------
create or replace function public.apply_account_classification(
  p_result_id uuid,
  p_accepted_axes text[],
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_actor_id        uuid;
  v_workspace_id    uuid;
  v_company_id      uuid;
  v_content         jsonb;
  v_classification  jsonb;
  v_company         public.companies%rowtype;
  v_accepted        text[];
  v_axis            text;
  v_segment_slug    text;
  v_segment_id      uuid;
  v_macro_id        uuid;
  v_regime          text;
  v_modele          text;
  v_tier            text;
  v_relation        text;
  v_moment          text;
  v_moment_preuve   text;
  v_vertical        text[];
  v_confiance       text;
  v_note            text;
  v_tests           jsonb;
  v_failed_tests    int;
  v_conflict        text;
  v_applied         text[] := '{}';
  v_skipped         jsonb  := '[]'::jsonb;
begin
  v_actor_id     := private.require_authenticated_user();
  v_workspace_id := private.require_current_workspace();

  -- ── 1. Le résultat de scan, relu côté serveur ────────────────────────────
  select r.company_id, r.content_json
    into v_company_id, v_content
    from public.ai_intelligence_results r
   where r.id = p_result_id
     and r.workspace_id = v_workspace_id
     and r.result_type = 'account_scan'
     and r.status = 'succeeded'::ai_result_status;

  if v_company_id is null then
    raise exception using errcode='P0001', message='result_not_found',
      detail='Aucun résultat de scan appliquable pour cet identifiant dans le workspace courant.';
  end if;

  v_classification := v_content -> 'classification';

  if v_classification is null or jsonb_typeof(v_classification) <> 'object' then
    raise exception using errcode='P0001', message='classification_missing',
      detail='Ce résultat de scan ne porte pas de bloc de classification.';
  end if;

  select * into v_company from public.companies
   where id = v_company_id and workspace_id = v_workspace_id
   for update;

  if v_company.id is null then
    raise exception using errcode='P0001', message='company_not_found',
      detail='Le compte cible n''existe plus dans le workspace courant.';
  end if;

  v_accepted := coalesce(p_accepted_axes, '{}');

  foreach v_axis in array v_accepted loop
    if v_axis not in ('segment','regime_achat','modele_eco','moment','tier','vertical_client','relation_type') then
      raise exception using errcode='P0001', message='unknown_axis',
        detail=format('Axe de classification inconnu : %s', v_axis);
    end if;
  end loop;

  -- ── 2. Extraction ────────────────────────────────────────────────────────
  v_segment_slug  := nullif(btrim(coalesce(v_classification ->> 'segmentSlug', '')), '');
  v_regime        := nullif(btrim(coalesce(v_classification ->> 'regimeAchat', '')), '');
  v_modele        := nullif(btrim(coalesce(v_classification ->> 'modeleEco', '')), '');
  v_tier          := nullif(btrim(coalesce(v_classification ->> 'tier', '')), '');
  v_relation      := nullif(btrim(coalesce(v_classification ->> 'relationType', '')), '');
  v_moment        := nullif(btrim(coalesce(v_classification ->> 'moment', '')), '');
  v_moment_preuve := nullif(btrim(coalesce(v_classification ->> 'momentPreuve', '')), '');
  v_confiance     := nullif(btrim(coalesce(v_classification ->> 'classificationConfiance', '')), '');
  v_note          := nullif(btrim(coalesce(v_classification ->> 'classificationNote', '')), '');
  v_tests         := v_classification -> 'tests';

  select coalesce(array_agg(value::text), '{}')
    into v_vertical
    from jsonb_array_elements_text(
      case when jsonb_typeof(v_classification -> 'verticalClient') = 'array'
           then v_classification -> 'verticalClient' else '[]'::jsonb end
    ) as t(value);

  -- ── 3. §10.4 — la note documente ce qui est incertain ────────────────────
  if v_confiance is null or v_confiance not in ('haute','moyenne','faible') then
    raise exception using errcode='P0001', message='invalid_confidence',
      detail='classification_confiance doit valoir haute, moyenne ou faible (§5.9).';
  end if;

  if v_confiance <> 'haute' and v_note is null then
    raise exception using errcode='P0001', message='note_required',
      detail='Une confiance « moyenne » ou « faible » exige une note (§10 contrôle 4).';
  end if;

  -- ── 4. §12.8 — confiance « haute » incompatible avec un test en échec ────
  if jsonb_typeof(v_tests) = 'object' then
    select count(*) into v_failed_tests
      from jsonb_each(v_tests) as t(key, value)
     where value = 'false'::jsonb;

    if v_confiance = 'haute' and v_failed_tests > 0 then
      raise exception using errcode='P0001', message='confidence_inconsistent',
        detail='Confiance « haute » impossible avec un test des 4 en échec (§12.8).';
    end if;
  end if;

  -- ── 5. §10.1 + §10.2 — segment existant, macro DÉDUIT ────────────────────
  -- Le macro n'est jamais proposé : il est lu depuis `parent_id` (§5.1). Le
  -- contrôle 2 devient vrai par construction et non par vérification.
  if 'segment' = any (v_accepted) then
    if v_segment_slug is null then
      raise exception using errcode='P0001', message='segment_required',
        detail='L''axe segment est accepté mais aucun segment n''est proposé.';
    end if;

    select si.id, si.parent_id into v_segment_id, v_macro_id
      from public.sector_intelligence si
     where si.workspace_id = v_workspace_id
       and si.slug = v_segment_slug
       and si.level = 'segment';

    if v_segment_id is null then
      raise exception using errcode='P0001', message='unknown_segment',
        detail=format('Le segment « %s » n''existe pas dans le référentiel. Une IA ne crée jamais de segment (§9).', v_segment_slug);
    end if;

    if v_macro_id is null then
      raise exception using errcode='P0001', message='segment_without_macro',
        detail=format('Le segment « %s » n''a pas de macro parent : classification impossible (§10 contrôle 2).', v_segment_slug);
    end if;
  end if;

  -- ── 6. Domaines de valeurs ───────────────────────────────────────────────
  if 'regime_achat' = any (v_accepted)
     and (v_regime is null or v_regime not in ('commande_publique','regule','monaco','prive')) then
    raise exception using errcode='P0001', message='invalid_regime_achat',
      detail='Valeur hors domaine pour regime_achat (§5.3).';
  end if;

  if 'modele_eco' = any (v_accepted)
     and (v_modele is null or v_modele not in
          ('multi_sites','b2c_reseau','b2b_projet','industriel','editeur','captif','concession','institution')) then
    raise exception using errcode='P0001', message='invalid_modele_eco',
      detail='Valeur hors domaine pour modele_eco (§5.4).';
  end if;

  if 'tier' = any (v_accepted) and v_tier is not null
     and v_tier not in ('grand_compte','eti','pme') then
    raise exception using errcode='P0001', message='invalid_tier',
      detail='Valeur hors domaine pour tier (§5.6).';
  end if;

  if 'relation_type' = any (v_accepted)
     and (v_relation is null or v_relation not in ('prospect','client','ancien_client','pair_partenaire')) then
    raise exception using errcode='P0001', message='invalid_relation_type',
      detail='Valeur hors domaine pour relation_type (§5.8).';
  end if;

  -- ── 7. §10.6 / §12.5 — un `moment` n'existe qu'avec un fait daté ─────────
  if 'moment' = any (v_accepted) and v_moment is not null then
    if v_moment not in ('integration_post_ma','croissance_forte','retournement',
                        'renouvellement_concession','reorganisation_si','stable') then
      raise exception using errcode='P0001', message='invalid_moment',
        detail='Valeur hors domaine pour moment (§5.5).';
    end if;

    if v_moment_preuve is null then
      raise exception using errcode='P0001', message='moment_evidence_required',
        detail='Une trajectoire ne s''écrit qu''avec un fait daté et sourçable (§10 contrôle 6, §12.5).';
    end if;
  end if;

  -- ── 8. §10.3 — état FINAL de la fiche, pas la sélection ──────────────────
  -- Un axe écarté est licite si la colonne le porte déjà : les 96 comptes du
  -- parc sont classés, un rescan ne doit pas forcer à réécrire ce qui est juste.
  if not ('segment' = any (v_accepted)) and v_company.segment_id is null then
    raise exception using errcode='P0001', message='segment_required',
      detail='Le compte n''a pas de segment et l''axe est écarté (§10 contrôle 3).';
  end if;

  if not ('regime_achat' = any (v_accepted)) and v_company.regime_achat is null then
    raise exception using errcode='P0001', message='regime_achat_required',
      detail='Le compte n''a pas de regime_achat et l''axe est écarté (§10 contrôle 3).';
  end if;

  if not ('modele_eco' = any (v_accepted)) and v_company.modele_eco is null then
    raise exception using errcode='P0001', message='modele_eco_required',
      detail='Le compte n''a pas de modele_eco et l''axe est écarté (§10 contrôle 3).';
  end if;

  -- ── 9. §12.9 — le statut relationnel ne se déduit pas d'une recherche ────
  -- Non bloquant pour l'ensemble : l'axe est ignoré et rapporté. La fiche garde
  -- son statut réel, qui satisfait déjà le contrôle 3.
  if 'relation_type' = any (v_accepted) then
    v_conflict := private.classification_relation_conflict(v_company_id, v_relation);
    if v_conflict is not null then
      v_accepted := array_remove(v_accepted, 'relation_type');
      v_skipped := v_skipped || jsonb_build_object('axis','relation_type','reason',v_conflict);
    end if;
  end if;

  -- ── 10. Écriture ─────────────────────────────────────────────────────────
  -- `companies.sector` (texte libre historique) n'est JAMAIS touché : §12.3 et
  -- §10 contrôle 9. `lifecycle_status` non plus — c'est une projection tenue par
  -- le trigger `trg_companies_project_lifecycle_status` (migration 066).
  update public.companies set
    segment_id  = case when 'segment'         = any (v_accepted) then v_segment_id else segment_id end,
    sector_id   = case when 'segment'         = any (v_accepted) then v_macro_id   else sector_id  end,
    regime_achat= case when 'regime_achat'    = any (v_accepted) then v_regime     else regime_achat end,
    modele_eco  = case when 'modele_eco'      = any (v_accepted) then v_modele     else modele_eco end,
    tier        = case when 'tier'            = any (v_accepted) then v_tier       else tier end,
    relation_type = case when 'relation_type' = any (v_accepted) then v_relation   else relation_type end,
    moment      = case when 'moment'          = any (v_accepted) then v_moment     else moment end,
    vertical_client = case when 'vertical_client' = any (v_accepted) then v_vertical else vertical_client end,
    classification_confiance = v_confiance,
    classification_note      = v_note,
    classified_at            = now(),
    classified_by            = coalesce(p_reason, 'intel-010-refresh')
  where id = v_company_id;

  v_applied := v_accepted;

  return jsonb_build_object(
    'companyId',   v_company_id,
    'appliedAxes', to_jsonb(v_applied),
    'skippedAxes', v_skipped,
    'segmentId',   v_segment_id,
    'sectorId',    v_macro_id,
    'confiance',   v_confiance
  );
end;
$function$;

comment on function public.apply_account_classification(uuid, text[], text) is
  'ADR-0019 Lot 4 — applique atomiquement les 7 axes de classification depuis un résultat de scan. Contrôles §10 du REFERENTIEL-CLASSIFICATION appliqués avant écriture ; le macro est déduit du segment (contrôle 2 vrai par construction) ; companies.sector et lifecycle_status ne sont jamais écrits.';

revoke all on function public.apply_account_classification(uuid, text[], text) from public;
grant execute on function public.apply_account_classification(uuid, text[], text) to authenticated, service_role;

-- =============================================================================
-- POST-MIGRATION — hors transaction
-- =============================================================================
-- 1. npm run db:types
-- 2. Le workflow n8n intel-010-refresh doit être RÉIMPORTÉ sur le VPS pour
--    produire le bloc `classification` (patch livré dans le même lot).
-- =============================================================================
