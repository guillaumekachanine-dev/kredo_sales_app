-- Lot 0 — réalignement canonique repo/live sans tables fonctionnelles MVP.
-- Objectif :
-- 1. rétablir des helpers workspace cohérents dans le schéma private ;
-- 2. réaligner les tables CRM / AI / sectorielles déjà utilisées par le code ;
-- 3. corriger la contrainte interactions.type pour changement_etape ;
-- 4. rapprocher les politiques RLS ciblées du schéma live.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- Helpers canoniques du schéma live.
CREATE OR REPLACE FUNCTION private.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  select workspace_id
  from public.profiles
  where id = (select auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, diff)
  VALUES (
    coalesce(NEW.workspace_id, OLD.workspace_id),
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    END
  );

  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (coalesce(NEW.raw_user_meta_data ->> 'workspace_name', 'Espace Kredo'), NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.profiles (id, workspace_id, email, full_name, role)
  VALUES (
    NEW.id,
    new_workspace_id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    'owner'
  );

  RETURN NEW;
END;
$$;

-- Defaults workspace_id alignés avec le live pour les tables CRM déjà utilisées.
ALTER TABLE public.persons
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.companies
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.contacts
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.opportunities
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.opportunity_contacts
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.interactions
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.ai_intelligence_runs
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.ai_intelligence_results
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

ALTER TABLE public.ai_intelligence_logs
  ALTER COLUMN workspace_id SET DEFAULT private.current_workspace_id();

-- Companies : colonnes live manquantes dans le repo + FK sectorielle.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS revenue text,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS sector_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'size_band'
      AND is_generated <> 'ALWAYS'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies DROP COLUMN size_band';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'size_band'
      AND is_generated = 'ALWAYS'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.companies
      ADD COLUMN size_band text
      GENERATED ALWAYS AS (
        CASE
          WHEN employee_count IS NULL THEN NULL::text
          WHEN employee_count <= 20 THEN '1-20'::text
          WHEN employee_count <= 100 THEN '21-100'::text
          WHEN employee_count <= 500 THEN '101-500'::text
          WHEN employee_count <= 1000 THEN '501-1000'::text
          WHEN employee_count <= 5000 THEN '1001-5000'::text
          ELSE '+5k'::text
        END
      ) STORED
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_sector_id_fkey'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_sector_id_fkey
      FOREIGN KEY (sector_id)
      REFERENCES public.sector_intelligence(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_sector_id
  ON public.companies USING btree (sector_id)
  WHERE sector_id IS NOT NULL;

-- Contacts : suppression de la colonne legacy absente du live.
ALTER TABLE public.contacts
  DROP COLUMN IF EXISTS notes;

-- Opportunités : alignement avec les colonnes et contraintes live.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS sector_id uuid,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS required_headcount smallint,
  ADD COLUMN IF NOT EXISTS requires_staffing boolean;

ALTER TABLE public.opportunities
  ALTER COLUMN stage SET DEFAULT 'non_traitee',
  ALTER COLUMN opened_at SET DEFAULT now(),
  ALTER COLUMN required_headcount SET DEFAULT 1,
  ALTER COLUMN requires_staffing SET DEFAULT false;

UPDATE public.opportunities
SET required_headcount = 1
WHERE required_headcount IS NULL;

UPDATE public.opportunities
SET requires_staffing = false
WHERE requires_staffing IS NULL;

ALTER TABLE public.opportunities
  ALTER COLUMN required_headcount SET NOT NULL,
  ALTER COLUMN requires_staffing SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'opportunities_stage_check'
      AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities DROP CONSTRAINT opportunities_stage_check;
  END IF;
END $$;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_stage_check
  CHECK (
    stage = ANY (
      ARRAY[
        'qualification'::text,
        'recherche_profil'::text,
        'cv_envoyes'::text,
        'entretien_client'::text,
        'gagne'::text,
        'perdu'::text,
        'abandonne'::text,
        'non_traitee'::text
      ]
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'opportunities_required_headcount_check'
      AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities DROP CONSTRAINT opportunities_required_headcount_check;
  END IF;
END $$;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_required_headcount_check
  CHECK (required_headcount > 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'opportunities_sector_id_fkey'
      AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_sector_id_fkey
      FOREIGN KEY (sector_id)
      REFERENCES public.sector_intelligence(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_opportunities_sector_id
  ON public.opportunities USING btree (sector_id)
  WHERE sector_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_staffing_stage
  ON public.opportunities USING btree (workspace_id, stage)
  WHERE opportunity_type = 'staffing'::text;

CREATE INDEX IF NOT EXISTS idx_opportunities_requires_staffing_stage
  ON public.opportunities USING btree (workspace_id, stage)
  WHERE requires_staffing = true;

-- Interactions : correction minimale de compatibilité applicative.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interactions_type_check'
      AND conrelid = 'public.interactions'::regclass
  ) THEN
    ALTER TABLE public.interactions DROP CONSTRAINT interactions_type_check;
  END IF;
END $$;

ALTER TABLE public.interactions
  ADD CONSTRAINT interactions_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'appel'::text,
        'email'::text,
        'rdv'::text,
        'linkedin'::text,
        'dejeuner'::text,
        'evenement'::text,
        'relance'::text,
        'negociation'::text,
        'envoi_offre'::text,
        'reunion'::text,
        'autre'::text,
        'changement_etape'::text
      ]
    )
  );

-- Politiques RLS des tables ciblées réalignées avec la forme live.
DROP POLICY IF EXISTS persons_select ON public.persons;
DROP POLICY IF EXISTS persons_insert ON public.persons;
DROP POLICY IF EXISTS persons_update ON public.persons;
DROP POLICY IF EXISTS persons_delete ON public.persons;

CREATE POLICY persons_select ON public.persons
  AS PERMISSIVE FOR SELECT TO public
  USING (workspace_id = private.current_workspace_id());

CREATE POLICY persons_insert ON public.persons
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY persons_update ON public.persons
  AS PERMISSIVE FOR UPDATE TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY persons_delete ON public.persons
  AS PERMISSIVE FOR DELETE TO public
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS companies_select ON public.companies;
DROP POLICY IF EXISTS companies_insert ON public.companies;
DROP POLICY IF EXISTS companies_update ON public.companies;
DROP POLICY IF EXISTS companies_delete ON public.companies;

CREATE POLICY companies_select ON public.companies
  AS PERMISSIVE FOR SELECT TO public
  USING (workspace_id = private.current_workspace_id());

CREATE POLICY companies_insert ON public.companies
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY companies_update ON public.companies
  AS PERMISSIVE FOR UPDATE TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY companies_delete ON public.companies
  AS PERMISSIVE FOR DELETE TO public
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS contacts_select ON public.contacts;
DROP POLICY IF EXISTS contacts_insert ON public.contacts;
DROP POLICY IF EXISTS contacts_update ON public.contacts;
DROP POLICY IF EXISTS contacts_delete ON public.contacts;

CREATE POLICY contacts_select ON public.contacts
  AS PERMISSIVE FOR SELECT TO public
  USING (workspace_id = private.current_workspace_id());

CREATE POLICY contacts_insert ON public.contacts
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY contacts_update ON public.contacts
  AS PERMISSIVE FOR UPDATE TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY contacts_delete ON public.contacts
  AS PERMISSIVE FOR DELETE TO public
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS opportunities_select ON public.opportunities;
DROP POLICY IF EXISTS opportunities_insert ON public.opportunities;
DROP POLICY IF EXISTS opportunities_update ON public.opportunities;
DROP POLICY IF EXISTS opportunities_delete ON public.opportunities;

CREATE POLICY opportunities_select ON public.opportunities
  AS PERMISSIVE FOR SELECT TO public
  USING (workspace_id = private.current_workspace_id());

CREATE POLICY opportunities_insert ON public.opportunities
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY opportunities_update ON public.opportunities
  AS PERMISSIVE FOR UPDATE TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY opportunities_delete ON public.opportunities
  AS PERMISSIVE FOR DELETE TO public
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS opportunity_contacts_select ON public.opportunity_contacts;
DROP POLICY IF EXISTS opportunity_contacts_insert ON public.opportunity_contacts;
DROP POLICY IF EXISTS opportunity_contacts_update ON public.opportunity_contacts;
DROP POLICY IF EXISTS opportunity_contacts_delete ON public.opportunity_contacts;

CREATE POLICY opportunity_contacts_select ON public.opportunity_contacts
  AS PERMISSIVE FOR SELECT TO public
  USING (workspace_id = private.current_workspace_id());

CREATE POLICY opportunity_contacts_insert ON public.opportunity_contacts
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY opportunity_contacts_update ON public.opportunity_contacts
  AS PERMISSIVE FOR UPDATE TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY opportunity_contacts_delete ON public.opportunity_contacts
  AS PERMISSIVE FOR DELETE TO public
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS interactions_select ON public.interactions;
DROP POLICY IF EXISTS interactions_insert ON public.interactions;
DROP POLICY IF EXISTS interactions_update ON public.interactions;
DROP POLICY IF EXISTS interactions_delete ON public.interactions;

CREATE POLICY interactions_select ON public.interactions
  AS PERMISSIVE FOR SELECT TO public
  USING (workspace_id = private.current_workspace_id());

CREATE POLICY interactions_insert ON public.interactions
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY interactions_update ON public.interactions
  AS PERMISSIVE FOR UPDATE TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY interactions_delete ON public.interactions
  AS PERMISSIVE FOR DELETE TO public
  USING (workspace_id = private.current_workspace_id());

DROP POLICY IF EXISTS ai_intelligence_runs_select ON public.ai_intelligence_runs;
DROP POLICY IF EXISTS ai_intelligence_runs_insert ON public.ai_intelligence_runs;
DROP POLICY IF EXISTS ai_intelligence_runs_update ON public.ai_intelligence_runs;
DROP POLICY IF EXISTS ai_intelligence_runs_delete ON public.ai_intelligence_runs;

CREATE POLICY ai_intelligence_runs_select ON public.ai_intelligence_runs
  AS PERMISSIVE FOR SELECT TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_runs_insert ON public.ai_intelligence_runs
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_runs_update ON public.ai_intelligence_runs
  AS PERMISSIVE FOR UPDATE TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id)
  WITH CHECK ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_runs_delete ON public.ai_intelligence_runs
  AS PERMISSIVE FOR DELETE TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id);

DROP POLICY IF EXISTS ai_intelligence_results_select ON public.ai_intelligence_results;
DROP POLICY IF EXISTS ai_intelligence_results_insert ON public.ai_intelligence_results;
DROP POLICY IF EXISTS ai_intelligence_results_update ON public.ai_intelligence_results;
DROP POLICY IF EXISTS ai_intelligence_results_delete ON public.ai_intelligence_results;

CREATE POLICY ai_intelligence_results_select ON public.ai_intelligence_results
  AS PERMISSIVE FOR SELECT TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_results_insert ON public.ai_intelligence_results
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_results_update ON public.ai_intelligence_results
  AS PERMISSIVE FOR UPDATE TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id)
  WITH CHECK ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_results_delete ON public.ai_intelligence_results
  AS PERMISSIVE FOR DELETE TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id);

DROP POLICY IF EXISTS ai_intelligence_logs_select ON public.ai_intelligence_logs;
DROP POLICY IF EXISTS ai_intelligence_logs_insert ON public.ai_intelligence_logs;

CREATE POLICY ai_intelligence_logs_select ON public.ai_intelligence_logs
  AS PERMISSIVE FOR SELECT TO public
  USING ((SELECT private.current_workspace_id()) = workspace_id);

CREATE POLICY ai_intelligence_logs_insert ON public.ai_intelligence_logs
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((SELECT private.current_workspace_id()) = workspace_id);

DROP POLICY IF EXISTS workspace_isolation ON public.sector_intelligence;
DROP POLICY IF EXISTS workspace_isolation ON public.sector_news;
DROP POLICY IF EXISTS workspace_isolation ON public.sector_events;
DROP POLICY IF EXISTS workspace_isolation ON public.sector_pain_points;
DROP POLICY IF EXISTS workspace_isolation ON public.sector_regulatory_items;

CREATE POLICY workspace_isolation ON public.sector_intelligence
  AS PERMISSIVE FOR ALL TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY workspace_isolation ON public.sector_news
  AS PERMISSIVE FOR ALL TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY workspace_isolation ON public.sector_events
  AS PERMISSIVE FOR ALL TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY workspace_isolation ON public.sector_pain_points
  AS PERMISSIVE FOR ALL TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

CREATE POLICY workspace_isolation ON public.sector_regulatory_items
  AS PERMISSIVE FOR ALL TO public
  USING (workspace_id = private.current_workspace_id())
  WITH CHECK (workspace_id = private.current_workspace_id());

COMMIT;
