-- ============================================================
-- ADR-0011 Lot 2 — Schéma du Score de Priorité Commerciale.
--
-- 3 tables + 1 vue, alimentées par le futur moteur TypeScript
-- (Lot 3, src/lib/account-scoring/) déclenché par une Server
-- Action (`recomputeAccountScore`, session utilisateur standard
-- — pas de service_role requis, cf. RLS 4-policy uniforme
-- ci-dessous, calqué sur intelligence_document_versions qui suit
-- le même pattern d'écriture côté Server Action).
--
-- Décisions actées dans l'ADR-0011 (non renégociées ici) :
--   - UNE seule grille de pondération V1, pas de `score_profile`
--     (acquisition/expansion/rétention/réactivation) — un
--     `lifecycle_multiplier` par composant suffit et évite de
--     maintenir 4 grilles sans matière statistique pour les
--     valider (95 comptes, 15 avec pipe).
--   - `companies.legacy_folio_score` (ADR-0011 Lot 0) n'est PAS
--     une source du nouveau score — le moteur (Lot 3) lira
--     `account_signals` (peuplé Lot 1) et les données brutes
--     (opportunities, contacts, missions...), jamais ce champ.
--   - Runs et composants sont APPEND-ONLY : un recalcul crée une
--     nouvelle ligne, jamais un UPDATE d'un run existant (comme
--     ai_intelligence_runs). Pas de colonne updated_at, pas de
--     trigger set_updated_at/log_audit — l'historique tient dans
--     la succession des runs, pas dans le trigger.
--
-- Pattern défense-en-profondeur repris de
-- private.validate_account_signal() (créé au Lot 1 précédent,
-- déjà en place sur account_signals) : trigger BEFORE
-- INSERT/UPDATE qui vérifie que workspace_id de l'enfant
-- correspond bien au workspace_id du parent référencé, en plus
-- de la RLS (défense en profondeur, pas une redite de la RLS).
-- ============================================================

-- ------------------------------------------------------------
-- 1. account_score_runs — une ligne par recalcul de score
-- ------------------------------------------------------------
CREATE TABLE public.account_score_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score_version text NOT NULL,
  score_value numeric(5,2) NOT NULL CHECK (score_value BETWEEN 0 AND 100),
  score_band text NOT NULL CHECK (score_band IN ('A', 'B', 'C', 'D', 'U')),
  confidence_score numeric(5,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  lifecycle_context text NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  data_cutoff_at timestamptz NOT NULL,
  trigger_source text NOT NULL CHECK (trigger_source IN ('manual', 'weekly_brief', 'signal_update', 'import', 'system')),
  triggered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  input_hash text NOT NULL,
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.account_score_runs IS
  'ADR-0011 — un run = un calcul complet et historisé du Score de Priorité Commerciale pour un compte. Append-only : un recalcul insère une nouvelle ligne, jamais un UPDATE. score_band U = "Unqualified" (confidence_score trop faible pour afficher un chiffre, cf. règle UX ADR §4.2).';
COMMENT ON COLUMN public.account_score_runs.score_value IS 'Score 0-100, déterministe (voir account_score_components pour le détail pondéré).';
COMMENT ON COLUMN public.account_score_runs.confidence_score IS 'Fiabilité 0-100, DISTINCTE du score. Sous 40 : le chiffre doit être masqué côté UI (cf. ADR-0011 §4.2), seule la modale de détail le révèle.';
COMMENT ON COLUMN public.account_score_runs.lifecycle_context IS 'companies.lifecycle_status au moment du calcul (snapshot, pas une FK vivante) — pilote les lifecycle_multiplier appliqués par composant.';
COMMENT ON COLUMN public.account_score_runs.input_hash IS 'Hash du input_snapshot, permet de détecter qu''un recalcul manuel n''apporterait rien de nouveau (mêmes données sources).';

-- Index couvrant la FK company_id ET la requête "dernier run par compte"
CREATE INDEX account_score_runs_company_calculated_idx
  ON public.account_score_runs (workspace_id, company_id, calculated_at DESC);

-- Index couvrant la FK triggered_by (nullable, faible cardinalité de requêtes directes)
CREATE INDEX account_score_runs_triggered_by_idx
  ON public.account_score_runs (triggered_by) WHERE triggered_by IS NOT NULL;

ALTER TABLE public.account_score_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_score_runs_select ON public.account_score_runs
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY account_score_runs_insert ON public.account_score_runs
  FOR INSERT WITH CHECK (true);
CREATE POLICY account_score_runs_update ON public.account_score_runs
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY account_score_runs_delete ON public.account_score_runs
  FOR DELETE USING (workspace_id = private.current_workspace_id());

CREATE OR REPLACE FUNCTION private.validate_account_score_run()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_company_workspace uuid;
BEGIN
  SELECT workspace_id INTO v_company_workspace
  FROM public.companies
  WHERE id = NEW.company_id;

  IF v_company_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid score run company: %', NEW.company_id;
  END IF;

  IF NEW.workspace_id <> v_company_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between score run and company';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_account_score_run
  BEFORE INSERT OR UPDATE ON public.account_score_runs
  FOR EACH ROW EXECUTE FUNCTION private.validate_account_score_run();

-- ------------------------------------------------------------
-- 2. account_score_components — une ligne par facteur pris en
--    compte dans un run (C1 fit stratégique, C2 potentiel
--    économique, C3 signaux d'achat, C4 accès relationnel,
--    C5 momentum commercial, C6 valeur active — cf. ADR §4.1)
-- ------------------------------------------------------------
CREATE TABLE public.account_score_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  score_run_id uuid NOT NULL REFERENCES public.account_score_runs(id) ON DELETE CASCADE,
  component_key text NOT NULL,
  component_label text NOT NULL,
  raw_value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_score numeric(5,2) NOT NULL CHECK (normalized_score BETWEEN 0 AND 100),
  weight numeric(5,2) NOT NULL CHECK (weight >= 0),
  lifecycle_multiplier numeric(3,2) NOT NULL DEFAULT 1.0,
  weighted_contribution numeric(5,2) NOT NULL,
  confidence numeric(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  freshness_status text NOT NULL CHECK (freshness_status IN ('fresh', 'aging', 'stale', 'missing')),
  explanation text NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (score_run_id, component_key)
);

COMMENT ON TABLE public.account_score_components IS
  'ADR-0011 — détail explicable d''un composant de score au sein d''un run. La contrainte UNIQUE(score_run_id, component_key) sert aussi d''index couvrant la FK score_run_id (pas besoin d''un index dédié).';
COMMENT ON COLUMN public.account_score_components.freshness_status IS 'fresh/aging/stale/missing — pilote la confidence affichée dans la modale de détail (ADR §5).';
COMMENT ON COLUMN public.account_score_components.evidence_refs IS 'Tableau de {table, id} pointant vers les lignes sources (account_signals, opportunities, contacts...) ayant produit ce composant — traçabilité exigée par l''ADR (pas de score IA opaque).';

ALTER TABLE public.account_score_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_score_components_select ON public.account_score_components
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY account_score_components_insert ON public.account_score_components
  FOR INSERT WITH CHECK (true);
CREATE POLICY account_score_components_update ON public.account_score_components
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY account_score_components_delete ON public.account_score_components
  FOR DELETE USING (workspace_id = private.current_workspace_id());

CREATE OR REPLACE FUNCTION private.validate_account_score_component()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_run_workspace uuid;
BEGIN
  SELECT workspace_id INTO v_run_workspace
  FROM public.account_score_runs
  WHERE id = NEW.score_run_id;

  IF v_run_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid score component run: %', NEW.score_run_id;
  END IF;

  IF NEW.workspace_id <> v_run_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between score component and run';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_account_score_component
  BEFORE INSERT OR UPDATE ON public.account_score_components
  FOR EACH ROW EXECUTE FUNCTION private.validate_account_score_component();

-- ------------------------------------------------------------
-- 3. account_score_current — dernier run par compte
--    (source de vérité vivante consommée par l'app, ADR §6/§7)
-- ------------------------------------------------------------
CREATE VIEW public.account_score_current
  WITH (security_invoker = true)
AS
SELECT DISTINCT ON (company_id)
  id AS run_id,
  workspace_id,
  company_id,
  score_version,
  score_value,
  score_band,
  confidence_score,
  lifecycle_context,
  calculated_at,
  data_cutoff_at,
  trigger_source,
  summary
FROM public.account_score_runs
ORDER BY company_id, calculated_at DESC;

COMMENT ON VIEW public.account_score_current IS
  'ADR-0011 — seule vue à consommer côté app pour afficher le score courant d''un compte. security_invoker : le RLS de l''appelant s''applique (pas celui du définisseur), essentiel en multi-tenant.';

-- ------------------------------------------------------------
-- 4. account_score_feedback — retours utilisateur sur un run
--    (améliore le modèle dans le temps, ADR §7 — non branché
--    avant qu'un moteur de scoring existe réellement, Lot 3+)
-- ------------------------------------------------------------
CREATE TABLE public.account_score_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  score_run_id uuid NOT NULL REFERENCES public.account_score_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  agreement text NOT NULL CHECK (agreement IN ('too_high', 'too_low', 'right')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.account_score_feedback IS
  'ADR-0011 — retour qualitatif d''un utilisateur sur un run donné (score jugé trop haut/trop bas/juste). Alimente l''amélioration du modèle dans le temps, pas branché en V1 (Lot 3).';

CREATE INDEX account_score_feedback_run_idx
  ON public.account_score_feedback (workspace_id, score_run_id);
CREATE INDEX account_score_feedback_user_idx
  ON public.account_score_feedback (workspace_id, user_id);

ALTER TABLE public.account_score_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_score_feedback_select ON public.account_score_feedback
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY account_score_feedback_insert ON public.account_score_feedback
  FOR INSERT WITH CHECK (true);
CREATE POLICY account_score_feedback_update ON public.account_score_feedback
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY account_score_feedback_delete ON public.account_score_feedback
  FOR DELETE USING (workspace_id = private.current_workspace_id());

CREATE OR REPLACE FUNCTION private.validate_account_score_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_run_workspace uuid;
BEGIN
  SELECT workspace_id INTO v_run_workspace
  FROM public.account_score_runs
  WHERE id = NEW.score_run_id;

  IF v_run_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid score feedback run: %', NEW.score_run_id;
  END IF;

  IF NEW.workspace_id <> v_run_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between score feedback and run';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_account_score_feedback
  BEFORE INSERT OR UPDATE ON public.account_score_feedback
  FOR EACH ROW EXECUTE FUNCTION private.validate_account_score_feedback();
