-- Migration 025: Absences datées, fermetures client, compensation C17-C19, vues analytiques
-- Contexte : onglet "Activité & Congés" du module Consultants
-- Les CRA (mission_activity_reports) contiennent déjà les agrégats mensuels.
-- Cette migration ajoute le détail daté pour le planning + les vues de rentabilité.

------------------------------------------------------------------------
-- 1. TYPE ENUM pour les absences
------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.absence_type AS ENUM (
    'conge_paye',
    'rtt',
    'maladie',
    'sans_solde',
    'contrainte_perso',
    'formation',
    'fermeture_client',
    'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

------------------------------------------------------------------------
-- 2. TABLE collaborator_absences
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collaborator_absences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT private.current_workspace_id()
                     REFERENCES public.workspaces(id),
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  absence_type  public.absence_type NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  duration_days numeric(4,1) NOT NULL CHECK (duration_days > 0),
  notes         text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_absences_collaborator ON public.collaborator_absences(collaborator_id);
CREATE INDEX idx_absences_dates ON public.collaborator_absences(start_date, end_date);
CREATE INDEX idx_absences_type ON public.collaborator_absences(absence_type);

-- Triggers
CREATE TRIGGER trg_collaborator_absences_updated_at
  BEFORE UPDATE ON public.collaborator_absences
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_collaborator_absences_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.collaborator_absences
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

-- RLS
ALTER TABLE public.collaborator_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY collaborator_absences_select ON public.collaborator_absences
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY collaborator_absences_insert ON public.collaborator_absences
  FOR INSERT WITH CHECK (true);
CREATE POLICY collaborator_absences_update ON public.collaborator_absences
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY collaborator_absences_delete ON public.collaborator_absences
  FOR DELETE USING (workspace_id = private.current_workspace_id());

------------------------------------------------------------------------
-- 3. TABLE client_closures
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_closures (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL DEFAULT private.current_workspace_id()
                     REFERENCES public.workspaces(id),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  label         text NOT NULL,
  is_recurring  boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_closure_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_closures_company ON public.client_closures(company_id);
CREATE INDEX idx_closures_dates ON public.client_closures(start_date, end_date);

-- Triggers
CREATE TRIGGER trg_client_closures_updated_at
  BEFORE UPDATE ON public.client_closures
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_client_closures_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.client_closures
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

-- RLS
ALTER TABLE public.client_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_closures_select ON public.client_closures
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY client_closures_insert ON public.client_closures
  FOR INSERT WITH CHECK (true);
CREATE POLICY client_closures_update ON public.client_closures
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY client_closures_delete ON public.client_closures
  FOR DELETE USING (workspace_id = private.current_workspace_id());

------------------------------------------------------------------------
-- 4. SEED collaborator_compensation pour C17, C18, C19
--    CJM cible ~300 → gross_annual ~45000, charges 0.45, 218j, taci 1.0
--    Vérif : 45000 * 1.45 / 218 = 299.31 ≈ 300 (arrondi cohérent avec missions)
------------------------------------------------------------------------
INSERT INTO public.collaborator_compensation
  (workspace_id, collaborator_id, effective_from, gross_annual, charges_rate, working_days_per_year, taci, variable_pay, notes)
VALUES
  -- C17 : entry_date 2026-03-01
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd89a8db6-92df-4eac-81de-acd6589163fe', '2026-03-01', 45000, 0.45, 218, 1.0, 0, 'Seed migration 025'),
  -- C18 : entry_date 2026-03-01
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '4ea54181-4a9e-47b4-9cea-701ebbda648e', '2026-03-01', 45000, 0.45, 218, 1.0, 0, 'Seed migration 025'),
  -- C19 : entry_date 2026-03-01
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd2300abd-401f-476b-a406-69b4e3445d31', '2026-03-01', 45000, 0.45, 218, 1.0, 0, 'Seed migration 025')
ON CONFLICT DO NOTHING;

------------------------------------------------------------------------
-- 5. SEED collaborator_absences
--    Génération de dates réalistes cohérentes avec les agrégats CRA.
--    Règle : congés ≥3j → semaine complète ; 0.5j → demi-journée isolée ;
--    maladie → blocs courts en début/milieu de mois.
------------------------------------------------------------------------
INSERT INTO public.collaborator_absences
  (workspace_id, collaborator_id, absence_type, start_date, end_date, duration_days, notes)
VALUES
  -- Antoine F. : avr 5j CP, mai 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '184081cc-52ab-45fe-a3e4-0fed5a95e60f', 'conge_paye', '2026-04-13', '2026-04-17', 5, 'Vacances Pâques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '184081cc-52ab-45fe-a3e4-0fed5a95e60f', 'conge_paye', '2026-05-18', '2026-05-22', 5, 'Vacances mai'),

  -- Chloé B. : jan 1j maladie, fév 5j CP, mar 5j CP, mai 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '446aa994-f01e-4902-9ae0-3ea26b57029b', 'maladie', '2026-01-12', '2026-01-12', 1, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '446aa994-f01e-4902-9ae0-3ea26b57029b', 'conge_paye', '2026-02-16', '2026-02-20', 5, 'Vacances février'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '446aa994-f01e-4902-9ae0-3ea26b57029b', 'conge_paye', '2026-03-23', '2026-03-27', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '446aa994-f01e-4902-9ae0-3ea26b57029b', 'conge_paye', '2026-05-18', '2026-05-22', 5, 'Pont Ascension'),

  -- Clara N. : jan 0.5j CP, mar 5j CP + 2j maladie, avr 5j CP, mai 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd29c84fb-682e-4621-99fa-9d31f8819595', 'conge_paye', '2026-01-30', '2026-01-30', 0.5, 'Demi-journée'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd29c84fb-682e-4621-99fa-9d31f8819595', 'conge_paye', '2026-03-09', '2026-03-13', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd29c84fb-682e-4621-99fa-9d31f8819595', 'maladie', '2026-03-23', '2026-03-24', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd29c84fb-682e-4621-99fa-9d31f8819595', 'conge_paye', '2026-04-13', '2026-04-17', 5, 'Vacances Pâques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd29c84fb-682e-4621-99fa-9d31f8819595', 'conge_paye', '2026-05-04', '2026-05-08', 5, 'Pont mai'),

  -- Elodie R. : fév 1j maladie, mar 5j CP, avr 3j CP, mai 2j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'e34c3aca-9122-4f27-b706-da564976d4af', 'maladie', '2026-02-09', '2026-02-09', 1, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'e34c3aca-9122-4f27-b706-da564976d4af', 'conge_paye', '2026-03-23', '2026-03-27', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'e34c3aca-9122-4f27-b706-da564976d4af', 'conge_paye', '2026-04-27', '2026-04-29', 3, 'Pont mai'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'e34c3aca-9122-4f27-b706-da564976d4af', 'conge_paye', '2026-05-25', '2026-05-26', 2, 'CP mai'),

  -- Emma D. : mar 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f3ce20f6-ed3b-4166-ba99-06d751222a1c', 'conge_paye', '2026-03-02', '2026-03-06', 5, 'Vacances mars'),

  -- Hugo M. : jan 1j CP, mar 2j maladie, avr 0.5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'b20c95a7-865e-4138-ba0c-b81e782feb9e', 'conge_paye', '2026-01-19', '2026-01-19', 1, 'CP isolé'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'b20c95a7-865e-4138-ba0c-b81e782feb9e', 'maladie', '2026-03-16', '2026-03-17', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'b20c95a7-865e-4138-ba0c-b81e782feb9e', 'conge_paye', '2026-04-24', '2026-04-24', 0.5, 'Demi-journée'),

  -- Inès C. : jan 0.5j CP + 1j maladie, fév 2j maladie, mar 5j CP, avr 3j CP, mai 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae69cfa2-0644-48f8-9a8a-ed4443f407f2', 'conge_paye', '2026-01-09', '2026-01-09', 0.5, 'Demi-journée'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae69cfa2-0644-48f8-9a8a-ed4443f407f2', 'maladie', '2026-01-26', '2026-01-26', 1, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae69cfa2-0644-48f8-9a8a-ed4443f407f2', 'maladie', '2026-02-23', '2026-02-24', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae69cfa2-0644-48f8-9a8a-ed4443f407f2', 'conge_paye', '2026-03-09', '2026-03-13', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae69cfa2-0644-48f8-9a8a-ed4443f407f2', 'conge_paye', '2026-04-27', '2026-04-29', 3, 'Pont mai'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae69cfa2-0644-48f8-9a8a-ed4443f407f2', 'conge_paye', '2026-05-11', '2026-05-15', 5, 'Vacances mai'),

  -- Julien D. : jan 2j CP, fév 1j maladie, mar 5.5j CP + 2j maladie
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd805858e-1f02-4542-837c-8f89b94939ed', 'conge_paye', '2026-01-22', '2026-01-23', 2, 'CP janvier'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd805858e-1f02-4542-837c-8f89b94939ed', 'maladie', '2026-02-16', '2026-02-16', 1, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd805858e-1f02-4542-837c-8f89b94939ed', 'conge_paye', '2026-03-09', '2026-03-13', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd805858e-1f02-4542-837c-8f89b94939ed', 'conge_paye', '2026-03-16', '2026-03-16', 0.5, 'Demi-journée'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd805858e-1f02-4542-837c-8f89b94939ed', 'maladie', '2026-03-26', '2026-03-27', 2, NULL),

  -- Karim B. : mar 5j CP, avr 2j CP + 15j non-billable (intercontrat), mai 3j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '303266fc-f707-40bf-8815-06b3573d8f00', 'conge_paye', '2026-03-23', '2026-03-27', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '303266fc-f707-40bf-8815-06b3573d8f00', 'conge_paye', '2026-04-27', '2026-04-28', 2, 'CP avril'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '303266fc-f707-40bf-8815-06b3573d8f00', 'autre', '2026-04-01', '2026-04-21', 15, 'Intercontrat / formation interne'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '303266fc-f707-40bf-8815-06b3573d8f00', 'conge_paye', '2026-05-04', '2026-05-06', 3, 'Pont mai'),

  -- Lucas G. : mai 3j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'ae8bcc51-f520-4768-9c01-b1f5394a9510', 'conge_paye', '2026-05-25', '2026-05-27', 3, 'CP mai'),

  -- Marie P. : avr 2j maladie, mai 2j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'c88b90df-ed96-4ab8-a9c8-24963eef1da2', 'maladie', '2026-04-06', '2026-04-07', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'c88b90df-ed96-4ab8-a9c8-24963eef1da2', 'conge_paye', '2026-05-25', '2026-05-26', 2, 'CP mai'),

  -- Nicolas V. : jan 2j CP, fév 5j CP + 1j maladie, mar 5j CP, avr 5.5j CP, mai 0.5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'conge_paye', '2026-01-22', '2026-01-23', 2, 'CP janvier'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'conge_paye', '2026-02-09', '2026-02-13', 5, 'Vacances février'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'maladie', '2026-02-23', '2026-02-23', 1, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'conge_paye', '2026-03-02', '2026-03-06', 5, 'Vacances mars'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'conge_paye', '2026-04-07', '2026-04-11', 5, 'Vacances Pâques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'conge_paye', '2026-04-24', '2026-04-24', 0.5, 'Demi-journée'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'f822736f-5852-4129-8a8b-e01abed60462', 'conge_paye', '2026-05-29', '2026-05-29', 0.5, 'Demi-journée'),

  -- Paul A. : jan 1j maladie, fév 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd6e1409e-f988-4ad8-ae75-1c0d388c775b', 'maladie', '2026-01-07', '2026-01-07', 1, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'd6e1409e-f988-4ad8-ae75-1c0d388c775b', 'conge_paye', '2026-02-16', '2026-02-20', 5, 'Vacances février'),

  -- Sarah M. : avr 3j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'c9795bef-9e01-461e-ae6d-818e3b46c847', 'conge_paye', '2026-04-13', '2026-04-15', 3, 'Pont Pâques'),

  -- Sophie T. : fév 5j CP, mar 2j maladie, avr 5j CP, mai 5j CP
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '9df1d98f-a189-443a-acd8-b4e1da553b03', 'conge_paye', '2026-02-09', '2026-02-13', 5, 'Vacances février'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '9df1d98f-a189-443a-acd8-b4e1da553b03', 'maladie', '2026-03-02', '2026-03-03', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '9df1d98f-a189-443a-acd8-b4e1da553b03', 'conge_paye', '2026-04-13', '2026-04-17', 5, 'Vacances Pâques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '9df1d98f-a189-443a-acd8-b4e1da553b03', 'conge_paye', '2026-05-04', '2026-05-08', 5, 'Pont mai'),

  -- Thomas L. : jan 2j maladie, fév 10j maladie (arrêt long), mar 2j maladie, avr 2j CP, mai 1j maladie
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '11561913-e942-498f-9243-7f993ba26b70', 'maladie', '2026-01-19', '2026-01-20', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '11561913-e942-498f-9243-7f993ba26b70', 'maladie', '2026-02-02', '2026-02-13', 10, 'Arrêt maladie prolongé'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '11561913-e942-498f-9243-7f993ba26b70', 'maladie', '2026-03-09', '2026-03-10', 2, NULL),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '11561913-e942-498f-9243-7f993ba26b70', 'conge_paye', '2026-04-27', '2026-04-28', 2, 'CP avril'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '11561913-e942-498f-9243-7f993ba26b70', 'maladie', '2026-05-19', '2026-05-19', 1, NULL);

------------------------------------------------------------------------
-- 6. SEED client_closures
------------------------------------------------------------------------
INSERT INTO public.client_closures
  (workspace_id, company_id, start_date, end_date, label, is_recurring, notes)
VALUES
  -- Noël 2026 — tous les clients publics/grands comptes
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '51789a67-16d6-43e7-ade5-05b14f6b5416', '2026-12-24', '2027-01-02', 'Fermeture Noël', true, 'CHU de Nice — fermeture annuelle'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', 'e9c1a061-d27d-4979-b575-3cb7cbb14b2c', '2026-12-24', '2027-01-02', 'Fermeture Noël', true, 'CASA — fermeture annuelle'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '083ac179-8528-49cc-8aac-efb0f38534cf', '2026-12-24', '2027-01-02', 'Fermeture Noël', true, 'Centre Lacassagne — fermeture annuelle'),
  -- Été 2026 — semaine du 15 août
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '51789a67-16d6-43e7-ade5-05b14f6b5416', '2026-08-10', '2026-08-21', 'Fermeture été', true, 'CHU de Nice — 2 semaines été'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '083ac179-8528-49cc-8aac-efb0f38534cf', '2026-08-10', '2026-08-21', 'Fermeture été', true, 'Centre Lacassagne — 2 semaines été'),
  -- Pont Ascension
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a', '00a54430-f85d-4a6d-866d-d6e7c8034853', '2026-05-14', '2026-05-15', 'Pont Ascension', false, 'BP Med — pont offert');

------------------------------------------------------------------------
-- 7. VUE v_collaborator_activity_summary
--    Une ligne par collaborateur × mois, avec KPI activité + finance
------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_collaborator_activity_summary
WITH (security_invoker = true) AS
SELECT
  mar.collaborator_id,
  p.full_name,
  c.entry_date,
  c.status as collab_status,
  mar.period_start,
  -- Activité
  mar.business_days,
  mar.billable_days,
  mar.pto_days,
  mar.sick_days,
  mar.non_billable_days,
  mar.activity_rate_percent,
  mar.status as cra_status,
  -- Finance
  mar.tjm_snapshot,
  mar.cjm_snapshot,
  -- CA réel du mois
  ROUND(mar.billable_days * mar.tjm_snapshot, 2) as revenue,
  -- Coût employeur réel du mois (le consultant coûte même quand il ne facture pas)
  ROUND(
    COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot)
    * mar.business_days,
    2
  ) as employer_cost,
  -- Marge réelle = CA - coût employeur réel
  ROUND(
    mar.billable_days * mar.tjm_snapshot
    - COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot)
      * mar.business_days,
    2
  ) as real_margin,
  -- Taux de marge réelle
  CASE WHEN mar.billable_days * mar.tjm_snapshot > 0 THEN
    ROUND(
      (mar.billable_days * mar.tjm_snapshot
       - COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot)
         * mar.business_days)
      / (mar.billable_days * mar.tjm_snapshot) * 100,
      1
    )
  END as real_margin_pct,
  -- Marge théorique mission (pour comparaison)
  m.gross_margin_pct as theoretical_margin_pct,
  -- Coût journalier employeur (pour affichage)
  ROUND(
    COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot),
    2
  ) as daily_employer_cost,
  -- Salaire brut annuel (admin only — filtré par la vue security_invoker + RLS compensation)
  cc.gross_annual

FROM mission_activity_reports mar
JOIN collaborators c ON c.id = mar.collaborator_id
JOIN persons p ON p.id = c.person_id
JOIN missions m ON m.id = mar.mission_id
LEFT JOIN collaborator_compensation cc
  ON cc.collaborator_id = mar.collaborator_id
  AND cc.effective_to IS NULL;

------------------------------------------------------------------------
-- 8. VUE v_collaborator_ytd_activity
--    Taux d'activité YTD pondéré par collaborateur
------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_collaborator_ytd_activity
WITH (security_invoker = true) AS
SELECT
  c.id as collaborator_id,
  p.full_name,
  c.entry_date,
  EXTRACT(YEAR FROM MIN(mar.period_start))::int as year,
  COUNT(DISTINCT mar.period_start) as months_covered,
  SUM(mar.business_days) as total_business_days,
  SUM(mar.billable_days) as total_billable_days,
  SUM(mar.pto_days) as total_pto_days,
  SUM(mar.sick_days) as total_sick_days,
  SUM(mar.non_billable_days) as total_non_billable_days,
  -- Taux d'activité YTD pondéré (pas la moyenne des %)
  ROUND(SUM(mar.billable_days) / NULLIF(SUM(mar.business_days), 0) * 100, 1)
    as ytd_activity_rate,
  -- TACI cible pour comparaison
  COALESCE(cc.taci, 1.0) as taci_target,
  -- Écart vs cible
  ROUND(
    SUM(mar.billable_days) / NULLIF(SUM(mar.business_days), 0) * 100
    - COALESCE(cc.taci, 1.0) * 100,
    1
  ) as gap_vs_target,
  -- Finance YTD
  ROUND(SUM(mar.billable_days * mar.tjm_snapshot), 2) as ytd_revenue,
  ROUND(
    SUM(
      COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot)
      * mar.business_days
    ),
    2
  ) as ytd_employer_cost,
  ROUND(
    SUM(mar.billable_days * mar.tjm_snapshot)
    - SUM(
        COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot)
        * mar.business_days
      ),
    2
  ) as ytd_real_margin

FROM collaborators c
JOIN persons p ON p.id = c.person_id
JOIN mission_activity_reports mar ON mar.collaborator_id = c.id
LEFT JOIN collaborator_compensation cc
  ON cc.collaborator_id = c.id
  AND cc.effective_to IS NULL
WHERE mar.period_start >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY c.id, p.full_name, c.entry_date, cc.taci, cc.gross_annual, cc.charges_rate, cc.working_days_per_year;

------------------------------------------------------------------------
-- 9. VUE v_profitability_alerts
------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_profitability_alerts
WITH (security_invoker = true) AS
WITH monthly AS (
  SELECT
    mar.collaborator_id,
    p.full_name,
    mar.period_start,
    mar.activity_rate_percent,
    mar.sick_days,
    mar.status as cra_status,
    CASE WHEN mar.billable_days * mar.tjm_snapshot > 0 THEN
      ROUND(
        (mar.billable_days * mar.tjm_snapshot
         - COALESCE(cc.gross_annual * (1 + cc.charges_rate) / cc.working_days_per_year, mar.cjm_snapshot)
           * mar.business_days)
        / (mar.billable_days * mar.tjm_snapshot) * 100,
        1
      )
    ELSE -100.0
    END as real_margin_pct
  FROM mission_activity_reports mar
  JOIN collaborators c ON c.id = mar.collaborator_id
  JOIN persons p ON p.id = c.person_id
  LEFT JOIN collaborator_compensation cc
    ON cc.collaborator_id = mar.collaborator_id
    AND cc.effective_to IS NULL
  WHERE mar.period_start >= DATE_TRUNC('year', CURRENT_DATE)
)
SELECT
  collaborator_id,
  full_name,
  period_start,
  activity_rate_percent,
  real_margin_pct,
  cra_status,
  -- Alertes flag
  activity_rate_percent < 70 as alert_low_activity,
  real_margin_pct < 15 as alert_low_margin,
  real_margin_pct < 0 as alert_negative_margin,
  sick_days >= 5 as alert_high_sick_days,
  cra_status != 'validated' as alert_cra_not_validated
FROM monthly;
