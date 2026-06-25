-- ============================================================
-- 033_fixed_price_projects
-- 3 tables : projects · project_phases · project_team_members
-- Engagements forfaitaires, centre de services, mixtes
-- + Bibliothèque de fiches de référence commerciale
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.project_status AS ENUM (
  'draft', 'active', 'delivered', 'closed', 'cancelled'
);

CREATE TYPE public.project_phase_status AS ENUM (
  'planned', 'in_progress', 'completed', 'blocked'
);

CREATE TYPE public.project_ref_status AS ENUM (
  'not_reference', 'draft', 'approved', 'archived'
);

CREATE TYPE public.project_ref_visibility AS ENUM (
  'named', 'anonymized', 'confidential'
);

-- ============================================================
-- 2. TABLE projects
-- ============================================================

CREATE TABLE public.projects (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Rattachements
  company_id            uuid            NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  opportunity_id        uuid            REFERENCES public.opportunities(id) ON DELETE SET NULL,
  offer_id              uuid            REFERENCES public.offers(id) ON DELETE SET NULL,
  engagement_type_id    uuid            REFERENCES public.offer_engagement_types(id) ON DELETE SET NULL,

  -- Identité
  code                  text,
  title                 text            NOT NULL,
  owner_id              uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Pilotage
  status                public.project_status NOT NULL DEFAULT 'draft',
  start_date_planned    date,
  end_date_planned      date,
  start_date_actual     date,
  end_date_actual       date,
  progress_pct          smallint        NOT NULL DEFAULT 0
                                        CHECK (progress_pct BETWEEN 0 AND 100),

  -- Finance
  contract_amount       numeric(12,2),
  cost_target           numeric(12,2),
  cost_actual           numeric(12,2)   NOT NULL DEFAULT 0,
  target_margin_pct     numeric(5,2)    GENERATED ALWAYS AS (
                          ROUND((contract_amount - cost_target) / NULLIF(contract_amount, 0) * 100, 2)
                        ) STORED,
  actual_margin_pct     numeric(5,2)    GENERATED ALWAYS AS (
                          ROUND((contract_amount - cost_actual) / NULLIF(contract_amount, 0) * 100, 2)
                        ) STORED,

  -- Contenu fiche projet
  description           text,
  scope                 jsonb           NOT NULL DEFAULT '{}',
  deliverables          text[]          NOT NULL DEFAULT '{}',
  technologies          text[]          NOT NULL DEFAULT '{}',
  lessons_learned       text,
  billing_milestones    jsonb           NOT NULL DEFAULT '[]',

  -- Référence commerciale
  ref_status            public.project_ref_status     NOT NULL DEFAULT 'not_reference',
  ref_visibility        public.project_ref_visibility NOT NULL DEFAULT 'named',
  ref_anonymized_label  text,

  -- Extensible
  tags                  text[]          NOT NULL DEFAULT '{}',
  metadata              jsonb           NOT NULL DEFAULT '{}',
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),

  -- Contraintes
  CONSTRAINT projects_code_workspace_uniq  UNIQUE (workspace_id, code),
  CONSTRAINT projects_dates_planned_check  CHECK (end_date_planned IS NULL OR start_date_planned IS NULL OR end_date_planned >= start_date_planned),
  CONSTRAINT projects_dates_actual_check   CHECK (end_date_actual IS NULL OR start_date_actual IS NULL OR end_date_actual >= start_date_actual),
  CONSTRAINT projects_cost_positive        CHECK (cost_actual >= 0)
);

-- ============================================================
-- 3. TABLE project_phases
-- ============================================================

CREATE TABLE public.project_phases (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id            uuid            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  sort_order            smallint        NOT NULL DEFAULT 0,
  label                 text            NOT NULL,
  status                public.project_phase_status NOT NULL DEFAULT 'planned',

  start_date_planned    date,
  end_date_planned      date,
  start_date_actual     date,
  end_date_actual       date,
  planned_days          numeric(6,1),
  consumed_days         numeric(6,1)    NOT NULL DEFAULT 0,
  deliverables          text[]          NOT NULL DEFAULT '{}',
  notes                 text,

  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT phases_dates_planned_check CHECK (end_date_planned IS NULL OR start_date_planned IS NULL OR end_date_planned >= start_date_planned),
  CONSTRAINT phases_consumed_positive   CHECK (consumed_days >= 0)
);

-- ============================================================
-- 4. TABLE project_team_members
-- ============================================================

CREATE TABLE public.project_team_members (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id            uuid            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  collaborator_id       uuid            REFERENCES public.collaborators(id) ON DELETE SET NULL,

  role_label            text            NOT NULL,
  seniority             text            CHECK (seniority IS NULL OR seniority IN ('junior', 'confirme', 'senior', 'expert', 'lead')),
  is_external           boolean         NOT NULL DEFAULT false,
  is_project_lead       boolean         NOT NULL DEFAULT false,
  allocation_pct        smallint        CHECK (allocation_pct IS NULL OR allocation_pct BETWEEN 1 AND 100),
  planned_days          numeric(6,1),
  actual_days           numeric(6,1)    NOT NULL DEFAULT 0,
  daily_cost            numeric(10,2),
  start_date            date,
  end_date              date,
  contribution          text,

  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT team_member_identity CHECK (collaborator_id IS NOT NULL OR role_label IS NOT NULL),
  CONSTRAINT team_actual_positive CHECK (actual_days >= 0)
);

-- ============================================================
-- 5. TRIGGERS updated_at + audit
-- ============================================================

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_project_team_members_updated_at
  BEFORE UPDATE ON public.project_team_members
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

CREATE TRIGGER trg_project_phases_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

CREATE TRIGGER trg_project_team_members_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_team_members
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX idx_projects_workspace          ON public.projects(workspace_id);
CREATE INDEX idx_projects_company            ON public.projects(company_id);
CREATE INDEX idx_projects_opportunity        ON public.projects(opportunity_id);
CREATE INDEX idx_projects_status             ON public.projects(workspace_id, status);
CREATE INDEX idx_projects_ref_status         ON public.projects(workspace_id, ref_status) WHERE ref_status != 'not_reference';
CREATE INDEX idx_projects_technologies_gin   ON public.projects USING gin(technologies);

CREATE INDEX idx_project_phases_project      ON public.project_phases(project_id);
CREATE INDEX idx_project_phases_workspace    ON public.project_phases(workspace_id);

CREATE INDEX idx_project_team_project        ON public.project_team_members(project_id);
CREATE INDEX idx_project_team_collaborator   ON public.project_team_members(collaborator_id) WHERE collaborator_id IS NOT NULL;
CREATE INDEX idx_project_team_workspace      ON public.project_team_members(workspace_id);

-- ============================================================
-- 7. RLS — motif uniforme workspace (4 policies par table)
-- ============================================================

ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- projects
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (true);
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- project_phases
CREATE POLICY "project_phases_select" ON public.project_phases
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "project_phases_insert" ON public.project_phases
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_phases_update" ON public.project_phases
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "project_phases_delete" ON public.project_phases
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- project_team_members
CREATE POLICY "project_team_members_select" ON public.project_team_members
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "project_team_members_insert" ON public.project_team_members
  FOR INSERT WITH CHECK (true);
CREATE POLICY "project_team_members_update" ON public.project_team_members
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "project_team_members_delete" ON public.project_team_members
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- ============================================================
-- 8. GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_phases       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_team_members TO authenticated;

GRANT ALL ON public.projects             TO service_role;
GRANT ALL ON public.project_phases       TO service_role;
GRANT ALL ON public.project_team_members TO service_role;
