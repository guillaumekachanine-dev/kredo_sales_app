-- Hardening financial reference and quote foreign keys for multi-tenant safety

BEGIN;

-- 1. Correct SET NULL actions for composite FKs on financial_models and intelligence_documents
ALTER TABLE public.financial_models
  DROP CONSTRAINT IF EXISTS fk_financial_models_superseded_by;

ALTER TABLE public.financial_models
  ADD CONSTRAINT fk_financial_models_superseded_by
  FOREIGN KEY (superseded_by_id, workspace_id)
  REFERENCES public.financial_models (id, workspace_id)
  ON DELETE SET NULL (superseded_by_id);

ALTER TABLE public.intelligence_documents
  DROP CONSTRAINT IF EXISTS fk_intelligence_documents_source_financial_model;

ALTER TABLE public.intelligence_documents
  ADD CONSTRAINT fk_intelligence_documents_source_financial_model
  FOREIGN KEY (source_financial_model_id, workspace_id)
  REFERENCES public.financial_models (id, workspace_id)
  ON DELETE SET NULL (source_financial_model_id);

-- 2. Make promoted_by workspace-safe
-- Drop the index if it exists as a standalone index to avoid name collision with the constraint
DROP INDEX IF EXISTS public.uq_profiles_id_workspace;

-- Add unique constraint to profiles(id, workspace_id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS uq_profiles_id_workspace;
ALTER TABLE public.profiles ADD CONSTRAINT uq_profiles_id_workspace UNIQUE (id, workspace_id);

-- Drop the old single-column FK on financial_models
ALTER TABLE public.financial_models
  DROP CONSTRAINT IF EXISTS financial_models_promoted_by_fkey;

-- Add the new workspace-safe composite FK with ON DELETE SET NULL on promoted_by only
ALTER TABLE public.financial_models
  DROP CONSTRAINT IF EXISTS fk_financial_models_promoted_by;

ALTER TABLE public.financial_models
  ADD CONSTRAINT fk_financial_models_promoted_by
  FOREIGN KEY (promoted_by, workspace_id)
  REFERENCES public.profiles (id, workspace_id)
  ON DELETE SET NULL (promoted_by);

-- Performance index for the new composite FK
CREATE INDEX IF NOT EXISTS idx_financial_models_promoted_by_workspace
  ON public.financial_models (promoted_by, workspace_id);

COMMIT;
