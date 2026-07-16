-- ============================================================
-- Matching CV — Lot 0. RPC unique d'hydratation de contexte pour
-- le moteur de matching déterministe TypeScript (src/lib/staffing-matching/).
-- Même pattern que get_account_score_context (ADR-0011 Lot 3) :
-- un seul appel remplace N requêtes REST. Appelée en session
-- utilisateur (SECURITY INVOKER, RLS normal) depuis la Server Action
-- runOpportunityMatching, PAS depuis n8n — aucun LLM dans cette chaîne.
--
-- Direction : Besoin (opportunité) -> Profils (pool candidats + collab dispos).
-- Pool retenu (décision de cadrage) :
--   * candidats "actionnables" : nouveau / qualifie / en_process / propose / vivier
--     (exclus : refuse, ko_manager, indisponible, archive, recrute)
--   * collaborateurs "dispos ou dispos proches" : intercontrat (dispo aujourd'hui)
--     ou en_mission dont une mission active se termine sous 120 jours.
-- La RPC N'ATTRIBUE AUCUN SCORE : elle ne fait qu'hydrater. Toute la
-- pondération/normalisation vit dans le moteur TS (explicable, versionné).
-- ============================================================

-- Helper (défini AVANT get_matching_context : une fonction SQL-language valide
-- son corps à la création, donc la fonction référencée doit déjà exister).
-- Agrégat des compétences d'une personne (level/years/confidence), factorisé
-- pour éviter la duplication entre la branche candidat et collaborateur.
CREATE OR REPLACE FUNCTION public._matching_person_skills(
  p_person_id uuid,
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'skillId', ps.skill_id,
    'level', ps.level,
    'years', ps.years,
    'confidence', ps.confidence
  )), '[]'::jsonb)
  FROM public.person_skills ps
  WHERE ps.person_id = p_person_id AND ps.workspace_id = p_workspace_id
$$;

CREATE OR REPLACE FUNCTION public.get_matching_context(
  p_workspace_id uuid,
  p_opportunity_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'need', (
      SELECT jsonb_build_object(
        'id', o.id,
        'title', o.title,
        'practice', o.practice,
        'seniority', o.seniority,
        'location', o.location,
        'remotePolicy', o.remote_policy,
        'startDate', o.start_date,
        'durationDays', o.duration_days,
        'targetDailyRate', o.target_daily_rate,
        'needSummary', coalesce(o.need_summary, ''),
        'skills', coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'skillId', os.skill_id,
            'skillName', s.name,
            'importance', os.importance,
            'minLevel', os.min_level,
            'minYears', os.min_years,
            'weight', os.weight
          ) ORDER BY os.weight DESC NULLS LAST)
          FROM public.opportunity_skills os
          JOIN public.skills s ON s.id = os.skill_id
          WHERE os.opportunity_id = o.id AND os.workspace_id = p_workspace_id
        ), '[]'::jsonb)
      )
      FROM public.opportunities o
      WHERE o.id = p_opportunity_id AND o.workspace_id = p_workspace_id
    ),
    'profiles', coalesce((
      SELECT jsonb_agg(profile ORDER BY profile->>'fullName')
      FROM (
        -- ── Candidats actionnables ─────────────────────────────
        SELECT jsonb_build_object(
          'sourceType', 'candidate',
          'sourceId', cd.id,
          'personId', cd.person_id,
          'fullName', p.full_name,
          'currentTitle', cd.current_title,
          'seniority', cd.seniority,
          'expectedDailyRate', cd.expected_daily_rate,
          'availableFrom', cd.available_from,
          'availabilityStatus', cd.status,
          'mobility', cd.mobility,
          'maxCommuteMinutes', cd.max_commute_minutes,
          'remotePreference', cd.remote_preference,
          'practiceLabel', op.name,
          'sectorContext', cd.sector_context,
          'jobProfileId', cd.job_profile_id,
          'hasCandidateProfile', true,
          'skills', public._matching_person_skills(cd.person_id, p_workspace_id)
        ) AS profile
        FROM public.candidates cd
        JOIN public.persons p ON p.id = cd.person_id
        LEFT JOIN public.offer_practices op ON op.id = cd.practice_id
        WHERE cd.workspace_id = p_workspace_id
          AND cd.status IN ('nouveau', 'qualifie', 'en_process', 'propose', 'vivier')

        UNION ALL

        -- ── Collaborateurs dispos ou dispos proches ────────────
        SELECT jsonb_build_object(
          'sourceType', 'collaborator',
          'sourceId', co.id,
          'personId', co.person_id,
          'fullName', p.full_name,
          'currentTitle', co.current_title,
          'seniority', co.seniority,
          -- TJM/coût interne = donnée confidentielle (RLS admin) : jamais exposée ici.
          'expectedDailyRate', NULL,
          'availableFrom', CASE
            WHEN co.status = 'intercontrat' THEN current_date
            ELSE (
              SELECT min(m.end_date)
              FROM public.missions m
              WHERE m.collaborator_id = co.id AND m.status = 'active' AND m.end_date IS NOT NULL
            )
          END,
          'availabilityStatus', co.status,
          'mobility', NULL,
          'maxCommuteMinutes', NULL,
          'remotePreference', NULL,
          'practiceLabel', co.practice,
          'sectorContext', NULL,
          'jobProfileId', co.job_profile_id,
          'hasCandidateProfile', EXISTS (
            SELECT 1 FROM public.candidates cx
            WHERE cx.person_id = co.person_id AND cx.workspace_id = p_workspace_id
          ),
          'skills', public._matching_person_skills(co.person_id, p_workspace_id)
        ) AS profile
        FROM public.collaborators co
        JOIN public.persons p ON p.id = co.person_id
        WHERE co.workspace_id = p_workspace_id
          AND (
            co.status = 'intercontrat'
            OR EXISTS (
              SELECT 1 FROM public.missions m
              WHERE m.collaborator_id = co.id
                AND m.status = 'active'
                AND m.end_date IS NOT NULL
                AND m.end_date <= current_date + 120
            )
          )
      ) pool
    ), '[]'::jsonb),
    'dataCutoffAt', now()
  )
$$;

REVOKE ALL ON FUNCTION public.get_matching_context(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public._matching_person_skills(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_matching_context(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._matching_person_skills(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_matching_context(uuid, uuid) IS
  'Matching CV Lot 0 — hydratation déterministe (besoin + pool profils) pour le moteur TS src/lib/staffing-matching/. SECURITY INVOKER, GRANT authenticated : déclenché par l''utilisateur connecté (bouton "Trouver les profils"), pas par n8n. Aucun score attribué ici, aucune donnée de coût confidentielle exposée.';
