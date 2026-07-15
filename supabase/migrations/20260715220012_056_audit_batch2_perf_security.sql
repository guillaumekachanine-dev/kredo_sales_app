-- 054 — Audit Batch 2 : performance & sécurité (préparé, NON appliqué)
-- =============================================================================
-- Origine : audit du 2026-07-15 (advisors Supabase security + performance).
-- Sûr à appliquer : purement additif (index) + resserrages non destructifs.
-- À relire avant `apply_migration` — cf. règle de réconciliation de schéma.
--
-- Contenu :
--   1. Index couvrants sur 39 clés étrangères non indexées
--   2. RLS user_notifications : auth.uid() -> (select auth.uid()) (initplan)
--   3. search_path fixé sur 3 fonctions (mutabilité)
--
-- HORS SQL (à faire au dashboard Supabase) :
--   - Auth > activer "Leaked password protection" (HaveIBeenPwned)
--   - Déplacer les extensions `vector` / `unaccent` hors du schéma public
--   - Vérifier le workspace scoping interne des fonctions SECURITY DEFINER
--     exposées à `authenticated` (apply/decide/validate_enrichment_proposal*,
--     import_account_scan_contacts) — sinon REVOKE EXECUTE FROM authenticated.
-- =============================================================================

-- ── 1. Index sur clés étrangères non couvertes ──────────────────────────────
-- Impact faible aujourd'hui (volumes bas) mais dette qui grossit : une FK non
-- indexée force un scan complet du parent sur DELETE/UPDATE et pénalise les
-- jointures. `IF NOT EXISTS` => ré-exécution idempotente.

CREATE INDEX IF NOT EXISTS idx_account_facts_primary_source_id ON account_facts (primary_source_id);
CREATE INDEX IF NOT EXISTS idx_account_facts_source_proposal_id ON account_facts (source_proposal_id);
CREATE INDEX IF NOT EXISTS idx_account_issues_company_id ON account_issues (company_id);
CREATE INDEX IF NOT EXISTS idx_account_roadmap_actions_company_id ON account_roadmap_actions (company_id);
CREATE INDEX IF NOT EXISTS idx_account_roadmap_actions_materialized_calendar_event_id ON account_roadmap_actions (materialized_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_account_roadmap_actions_materialized_opportunity_id ON account_roadmap_actions (materialized_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_account_roadmap_actions_materialized_task_id ON account_roadmap_actions (materialized_task_id);
CREATE INDEX IF NOT EXISTS idx_account_roadmap_actions_target_contact_id ON account_roadmap_actions (target_contact_id);
CREATE INDEX IF NOT EXISTS idx_account_score_components_workspace_id ON account_score_components (workspace_id);
CREATE INDEX IF NOT EXISTS idx_account_score_feedback_score_run_id ON account_score_feedback (score_run_id);
CREATE INDEX IF NOT EXISTS idx_account_score_feedback_user_id ON account_score_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_account_score_runs_company_id ON account_score_runs (company_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_company_id ON account_signals (company_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_primary_source_id ON account_signals (primary_source_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_recommended_practice_id ON account_signals (recommended_practice_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_run_id ON account_signals (run_id);
CREATE INDEX IF NOT EXISTS idx_account_signals_suggested_contact_id ON account_signals (suggested_contact_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_id ON calendar_events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_candidate_hiring_milestones_hiring_process_id_workspace_id ON candidate_hiring_milestones (hiring_process_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidate_hiring_milestones_workspace_id ON candidate_hiring_milestones (workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidate_hiring_processes_opportunity_candidate_id_candidate_id_workspace_id ON candidate_hiring_processes (opportunity_candidate_id, candidate_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidates_practice_id_workspace_id ON candidates (practice_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_closures_workspace_id ON client_closures (workspace_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_absences_workspace_id ON collaborator_absences (workspace_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_proposals_applied_by ON enrichment_proposals (applied_by);
CREATE INDEX IF NOT EXISTS idx_enrichment_proposals_decided_by ON enrichment_proposals (decided_by);
CREATE INDEX IF NOT EXISTS idx_enrichment_proposals_primary_source_id ON enrichment_proposals (primary_source_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_proposals_requested_by ON enrichment_proposals (requested_by);
CREATE INDEX IF NOT EXISTS idx_enrichment_proposals_run_id ON enrichment_proposals (run_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_document_versions_created_by ON intelligence_document_versions (created_by);
CREATE INDEX IF NOT EXISTS idx_intelligence_document_versions_source_result_id ON intelligence_document_versions (source_result_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_documents_approved_by ON intelligence_documents (approved_by);
CREATE INDEX IF NOT EXISTS idx_intelligence_documents_owner_id ON intelligence_documents (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_engagement_type_id ON projects (engagement_type_id);
CREATE INDEX IF NOT EXISTS idx_projects_offer_id ON projects (offer_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_related_document_id ON user_notifications (related_document_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_brief_dismissals_owner_id ON weekly_brief_dismissals (owner_id);

-- ── 2. RLS initplan : user_notifications ────────────────────────────────────
-- `auth.uid()` était ré-évalué par ligne. `(select auth.uid())` le calcule une
-- seule fois par requête (initplan). Sémantique inchangée. On conserve
-- `private.current_workspace_id()` tel quel (style uniforme du reste des RLS ;
-- son optimisation éventuelle est un chantier séparé).

ALTER POLICY user_notifications_select ON public.user_notifications
  USING ((workspace_id = private.current_workspace_id()) AND (user_id = (select auth.uid())));

ALTER POLICY user_notifications_insert ON public.user_notifications
  WITH CHECK ((workspace_id = private.current_workspace_id()) AND (user_id = (select auth.uid())));

ALTER POLICY user_notifications_update ON public.user_notifications
  USING ((workspace_id = private.current_workspace_id()) AND (user_id = (select auth.uid())));

ALTER POLICY user_notifications_delete ON public.user_notifications
  USING ((workspace_id = private.current_workspace_id()) AND (user_id = (select auth.uid())));

-- ── 3. search_path fixé (mutabilité) ────────────────────────────────────────
-- Volontairement `pg_catalog, public` (et non `''`) : le corps de ces fonctions
-- n'a pas été audité pour un schema-qualifying complet ; la forme stricte `''`
-- casserait toute référence non qualifiée. Cette forme fige le search_path
-- (plus "role mutable") sans risque runtime.

ALTER FUNCTION public.archive_financial_model(p_model_id uuid)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.enforce_opportunity_contacts_max_two()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.save_financial_model_snapshot(p_model_id uuid, p_expected_updated_at timestamp with time zone, p_model jsonb, p_expenses jsonb)
  SET search_path = pg_catalog, public;
