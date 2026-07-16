-- Transactional RPC to promote a financial model to a reference

BEGIN;

CREATE OR REPLACE FUNCTION public.promote_financial_model_to_reference(p_model_id uuid)
RETURNS TABLE (
  model_id uuid,
  document_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_model public.financial_models%ROWTYPE;
  v_old_ref_id uuid;
  v_doc_id uuid;
  v_company_name text;
  v_opportunity_name text;
  v_profile_name text;
  v_promoted_by_name text;
  v_content_text text;
  v_content_json jsonb;
BEGIN
  -- 1. vérifier utilisateur, workspace et droits
  v_workspace_id := private.current_workspace_id();
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL OR v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié ou workspace manquant.' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'Utilisateur non autorisé dans ce workspace.' USING errcode = '42501';
  END IF;

  -- 2. verrouiller la simulation cible
  SELECT * INTO v_model
  FROM public.financial_models
  WHERE id = p_model_id AND workspace_id = v_workspace_id
  FOR UPDATE;

  IF v_model.id IS NULL THEN
    RAISE EXCEPTION 'Simulation introuvable dans ce workspace.' USING errcode = 'P0002';
  END IF;

  -- Vérifier verrouillage (converti ou archivé)
  IF v_model.status = 'archived' OR v_model.status = 'converted' THEN
    RAISE EXCEPTION 'La simulation est verrouillée et ne peut pas être promue.' USING errcode = 'L0001';
  END IF;

  -- 3. vérifier tous les critères d'éligibilité
  IF v_model.mode != 'full' THEN
    RAISE EXCEPTION 'La simulation doit être en mode complet (full) pour être promue.' USING errcode = 'L0001';
  END IF;

  IF v_model.company_id IS NULL THEN
    RAISE EXCEPTION 'Le compte client est obligatoire.' USING errcode = 'L0001';
  END IF;

  IF v_model.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'L''opportunité est obligatoire.' USING errcode = 'L0001';
  END IF;

  -- vérifier l'appartenance de l'opportunité au compte
  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities
    WHERE id = v_model.opportunity_id AND company_id = v_model.company_id AND workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'L''opportunité sélectionnée n''appartient pas au compte client choisi.' USING errcode = 'L0001';
  END IF;

  -- vérifier ressource valide
  IF v_model.resource_type = 'collaborator' AND v_model.collaborator_id IS NULL THEN
    RAISE EXCEPTION 'Un collaborateur valide doit être renseigné.' USING errcode = 'L0001';
  ELSIF v_model.resource_type = 'candidate' AND v_model.candidate_id IS NULL THEN
    RAISE EXCEPTION 'Un candidat valide doit être renseigné.' USING errcode = 'L0001';
  ELSIF v_model.resource_type = 'external' AND (v_model.resource_label IS NULL OR trim(v_model.resource_label) = '') THEN
    RAISE EXCEPTION 'Le libellé de la ressource externe est obligatoire.' USING errcode = 'L0001';
  END IF;

  -- vérifier profil ou rôle renseigné
  IF v_model.job_profile_id IS NULL THEN
    RAISE EXCEPTION 'Le profil ou rôle de la ressource est obligatoire.' USING errcode = 'L0001';
  END IF;

  -- vérifier start_date et end_date explicites
  IF v_model.start_date IS NULL OR v_model.end_date IS NULL THEN
    RAISE EXCEPTION 'Les dates de début et de fin de la mission doivent être explicites.' USING errcode = 'L0001';
  END IF;

  -- vérifier non simple projection de fin d'année
  IF v_model.projection_basis = 'year_end_default' THEN
    RAISE EXCEPTION 'La date de fin ne doit pas être une simple projection de fin d''année.' USING errcode = 'L0001';
  END IF;

  -- vérifier sale_daily_rate > 0
  IF v_model.sale_daily_rate IS NULL OR v_model.sale_daily_rate <= 0 THEN
    RAISE EXCEPTION 'Le TJM de vente doit être supérieur à zéro.' USING errcode = 'L0001';
  END IF;

  -- vérifier production_days > 0
  IF v_model.production_days IS NULL OR v_model.production_days <= 0 THEN
    RAISE EXCEPTION 'Le nombre de jours de production doit être supérieur à zéro.' USING errcode = 'L0001';
  END IF;

  -- vérifier warnings bloquants
  IF v_model.warnings @> '[{"code": "negative_margin"}]'::jsonb THEN
    RAISE EXCEPTION 'La marge commerciale est négative.' USING errcode = 'L0001';
  END IF;

  IF v_model.warnings @> '[{"code": "sales_rate_below_productive_cost"}]'::jsonb THEN
    RAISE EXCEPTION 'Le TJM de vente est inférieur au CJM productif calculé.' USING errcode = 'L0001';
  END IF;

  -- 4. verrouiller l'éventuelle référence active de l'opportunité
  SELECT id INTO v_old_ref_id
  FROM public.financial_models
  WHERE opportunity_id = v_model.opportunity_id
    AND workspace_id = v_workspace_id
    AND status = 'reference'
  FOR UPDATE;

  -- 5. passer l'ancienne référence en superseded
  IF v_old_ref_id IS NOT NULL AND v_old_ref_id != p_model_id THEN
    UPDATE public.financial_models
    SET status = 'superseded',
        superseded_by_id = p_model_id,
        superseded_at = now()
    WHERE id = v_old_ref_id;
  END IF;

  -- 6. passer la nouvelle simulation en reference
  UPDATE public.financial_models
  SET status = 'reference',
      promoted_by = v_user_id,
      promoted_at = now()
  WHERE id = p_model_id;

  -- 7. Récupérer les noms pour le document assaini
  SELECT name INTO v_company_name FROM public.companies WHERE id = v_model.company_id AND workspace_id = v_workspace_id;
  SELECT name INTO v_opportunity_name FROM public.opportunities WHERE id = v_model.opportunity_id AND workspace_id = v_workspace_id;
  SELECT title INTO v_profile_name FROM public.job_profiles WHERE id = v_model.job_profile_id AND workspace_id = v_workspace_id;
  IF v_profile_name IS NULL THEN
    v_profile_name := v_model.profile_name_snapshot;
  END IF;
  SELECT full_name INTO v_promoted_by_name FROM public.profiles WHERE id = v_user_id AND workspace_id = v_workspace_id;

  -- 8. Construire les données assainies
  v_content_json := jsonb_build_object(
    'company_id', v_model.company_id,
    'company_name', v_company_name,
    'opportunity_id', v_model.opportunity_id,
    'opportunity_name', v_opportunity_name,
    'resource_type', v_model.resource_type,
    'resource_label', v_model.resource_label,
    'profile_name', v_profile_name,
    'start_date', v_model.start_date,
    'end_date', v_model.end_date,
    'business_days', v_model.business_days,
    'production_days', v_model.production_days,
    'sale_daily_rate', v_model.sale_daily_rate,
    'revenue_total', v_model.revenue_total,
    'expenses_total', v_model.expenses_total,
    'gross_margin_pct', v_model.gross_margin_pct,
    'warnings', v_model.warnings,
    'calculation_version', v_model.calculation_version,
    'promoted_at', now(),
    'promoted_by_name', v_promoted_by_name
  );

  v_content_text := '# Référence Financière : ' || v_model.title || E'\n\n' ||
    '**Compte Client** : ' || coalesce(v_company_name, 'Non renseigné') || E'\n' ||
    '**Opportunité** : ' || coalesce(v_opportunity_name, 'Non renseignée') || E'\n' ||
    '**Ressource** : ' || coalesce(v_model.resource_label, 'Non renseignée') || ' (' || coalesce(v_model.resource_type, '') || ')' || E'\n' ||
    '**Profil / Rôle** : ' || coalesce(v_profile_name, 'Non renseigné') || E'\n\n' ||
    '## Paramètres de la Mission' || E'\n' ||
    '- **Date de Début** : ' || coalesce(to_char(v_model.start_date, 'DD/MM/YYYY'), 'Non renseignée') || E'\n' ||
    '- **Date de Fin** : ' || coalesce(to_char(v_model.end_date, 'DD/MM/YYYY'), 'Non renseignée') || E'\n' ||
    '- **Jours Ouvrés** : ' || coalesce(v_model.business_days::text, '0') || E'\n' ||
    '- **Jours de Production** : ' || coalesce(v_model.production_days::text, '0') || E'\n\n' ||
    '## Éléments Financiers' || E'\n' ||
    '- **Taux Journalier Moyen (TJM) Vente** : ' || coalesce(v_model.sale_daily_rate::text, '0') || ' EUR' || E'\n' ||
    '- **Chiffre d''Affaires Projeté** : ' || coalesce(v_model.revenue_total::text, '0') || ' EUR' || E'\n' ||
    '- **Total Frais Mission** : ' || coalesce(v_model.expenses_total::text, '0') || ' EUR' || E'\n' ||
    '- **Pourcentage de Marge Commerciale** : ' || coalesce(v_model.gross_margin_pct::text, '0') || ' %' || E'\n\n' ||
    '## Traçabilité' || E'\n' ||
    '- **Version du Moteur** : ' || coalesce(v_model.calculation_version, 'N/A') || E'\n' ||
    '- **Promu le** : ' || to_char(now(), 'DD/MM/YYYY HH24:MI:SS') || ' par ' || coalesce(v_promoted_by_name, 'N/A') || E'\n';

  -- 9. créer ou retrouver idempotemment un intelligence_document de type financial_reference
  SELECT id INTO v_doc_id
  FROM public.intelligence_documents
  WHERE source_financial_model_id = p_model_id
    AND document_type = 'financial_reference'
    AND workspace_id = v_workspace_id;

  IF v_doc_id IS NULL THEN
    INSERT INTO public.intelligence_documents (
      workspace_id,
      owner_id,
      title,
      document_type,
      status,
      current_content_text,
      current_content_json,
      primary_entity_type,
      primary_entity_id,
      source_financial_model_id
    ) VALUES (
      v_workspace_id,
      v_user_id,
      v_model.title,
      'financial_reference',
      'ready',
      v_content_text,
      v_content_json,
      'opportunity',
      v_model.opportunity_id,
      p_model_id
    ) RETURNING id INTO v_doc_id;
  ELSE
    -- Mettre à jour le document existant
    UPDATE public.intelligence_documents
    SET title = v_model.title,
        status = 'ready',
        current_content_text = v_content_text,
        current_content_json = v_content_json,
        updated_at = now()
    WHERE id = v_doc_id;
  END IF;

  -- 10. créer sa première version (ou version suivante)
  DECLARE
    v_next_version integer;
  BEGIN
    SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
    FROM public.intelligence_document_versions
    WHERE document_id = v_doc_id AND workspace_id = v_workspace_id;

    INSERT INTO public.intelligence_document_versions (
      workspace_id,
      document_id,
      version_number,
      origin,
      content_text,
      content_json,
      created_by
    ) VALUES (
      v_workspace_id,
      v_doc_id,
      v_next_version,
      'generated',
      v_content_text,
      v_content_json,
      v_user_id
    );
  END;

  -- 11. créer les liens documentaires vers :
  -- - company
  -- - opportunity
  -- - collaborator ou candidate selon la ressource
  
  -- Link company
  INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
  VALUES (v_workspace_id, v_doc_id, 'company', v_model.company_id)
  ON CONFLICT (document_id, entity_type, entity_id) DO NOTHING;

  -- Link opportunity
  INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
  VALUES (v_workspace_id, v_doc_id, 'opportunity', v_model.opportunity_id)
  ON CONFLICT (document_id, entity_type, entity_id) DO NOTHING;

  -- Link resource
  IF v_model.resource_type = 'collaborator' AND v_model.collaborator_id IS NOT NULL THEN
    INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
    VALUES (v_workspace_id, v_doc_id, 'collaborator', v_model.collaborator_id)
    ON CONFLICT (document_id, entity_type, entity_id) DO NOTHING;
  ELSIF v_model.resource_type = 'candidate' AND v_model.candidate_id IS NOT NULL THEN
    INSERT INTO public.intelligence_document_links (workspace_id, document_id, entity_type, entity_id)
    VALUES (v_workspace_id, v_doc_id, 'candidate', v_model.candidate_id)
    ON CONFLICT (document_id, entity_type, entity_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT p_model_id, v_doc_id;
END;
$$;

COMMIT;
