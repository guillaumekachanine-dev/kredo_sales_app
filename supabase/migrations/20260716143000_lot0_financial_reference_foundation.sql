-- Lot 0: Fondation Référence Financière et Devis
-- Permet de représenter les références financières et les devis clients.

-- Extension de l'enum type des documents d'intelligence (exécuté hors transaction)
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'financial_reference';
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'commercial_quote';

BEGIN;

-- 1. Étendre les statuts autorisés pour les financial_models
ALTER TABLE public.financial_models DROP CONSTRAINT IF EXISTS financial_models_status_check;
ALTER TABLE public.financial_models ADD CONSTRAINT financial_models_status_check
  CHECK (status IN ('draft', 'validated', 'reference', 'superseded', 'converted', 'archived'));

COMMENT ON COLUMN public.financial_models.status IS 'Statuts: draft (brouillon), validated (validé), reference (Référence financière), superseded (remplacé), converted (converti), archived (archivé)';

-- 2. Ajouter les champs de promotion et de remplacement réflexif
ALTER TABLE public.financial_models
  ADD COLUMN IF NOT EXISTS promoted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_id uuid,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- Relation réflexive workspace-safe (référence unique uq_financial_models_id_workspace)
ALTER TABLE public.financial_models
  ADD CONSTRAINT fk_financial_models_superseded_by
  FOREIGN KEY (superseded_by_id, workspace_id)
  REFERENCES public.financial_models(id, workspace_id)
  ON DELETE SET NULL;

-- Indexation pour les performances
CREATE INDEX IF NOT EXISTS idx_financial_models_promoted_by ON public.financial_models (promoted_by);
CREATE INDEX IF NOT EXISTS idx_financial_models_superseded_by_workspace ON public.financial_models (superseded_by_id, workspace_id);

-- 3. Index unique pour garantir une seule référence active par opportunité dans un workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_models_one_active_reference_per_opportunity
ON public.financial_models (workspace_id, opportunity_id)
WHERE (status = 'reference' AND opportunity_id IS NOT NULL);

-- 4. Ajouter le lien vers financial_models dans intelligence_documents
ALTER TABLE public.intelligence_documents
  ADD COLUMN IF NOT EXISTS source_financial_model_id uuid;

-- Relation workspace-safe entre intelligence_documents et financial_models
ALTER TABLE public.intelligence_documents
  ADD CONSTRAINT fk_intelligence_documents_source_financial_model
  FOREIGN KEY (source_financial_model_id, workspace_id)
  REFERENCES public.financial_models(id, workspace_id)
  ON DELETE SET NULL;

-- Indexation pour les performances
CREATE INDEX IF NOT EXISTS idx_intelligence_documents_source_financial_model_workspace
ON public.intelligence_documents (source_financial_model_id, workspace_id);

-- 5. Index unique partiel pour garantir un seul document actif par couple (source_financial_model_id, document_type) par workspace (hors archives)
CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_docs_active_source_model_type
ON public.intelligence_documents (workspace_id, source_financial_model_id, document_type)
WHERE (status != 'archived' AND source_financial_model_id IS NOT NULL);

COMMIT;
