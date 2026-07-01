-- INTEL-020 V1 — Rédaction assistée : enrichissement ai_intelligence_runs/results
-- Principe : pas de nouvelle table, on enrichit l'existant (voir CLAUDE.md § Nouvelle migration DB)

-- 1. company_id nullable — débloque les usages hors compte (candidats, interne, portail neutre)
ALTER TABLE public.ai_intelligence_runs
  ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.ai_intelligence_results
  ALTER COLUMN company_id DROP NOT NULL;

-- 2. Entité primaire pour retrouver les runs hors compte
ALTER TABLE public.ai_intelligence_runs
  ADD COLUMN IF NOT EXISTS primary_entity_type text,
  ADD COLUMN IF NOT EXISTS primary_entity_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_intelligence_runs_entity
  ON public.ai_intelligence_runs (primary_entity_type, primary_entity_id)
  WHERE primary_entity_type IS NOT NULL;

COMMENT ON COLUMN public.ai_intelligence_runs.primary_entity_type IS
  'Type d''entité primaire pour les runs hors compte (candidate, collaborator, opportunity...) — les runs company-centric continuent d''utiliser company_id';

COMMENT ON COLUMN public.ai_intelligence_runs.input_snapshot IS
  'Payload d''entrée du run. Pour run_type=intel-020-communication : objet CommunicationBrief structuré QUOI/QUI/COMMENT/CONTEXTE — voir src/lib/n8n/types.ts';

-- 3. Métadonnées de production sur les résultats (traçabilité + QA) — INTEL-020 § 5.3
ALTER TABLE public.ai_intelligence_results
  ADD COLUMN IF NOT EXISTS context_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qa_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ai_intelligence_results.context_snapshot IS
  'Snapshot immuable du contexte résolu par n8n au moment de la génération — traçabilité';

COMMENT ON COLUMN public.ai_intelligence_results.source_refs IS
  'Références aux entités Supabase utilisées dans la génération [{entity_type, entity_id, label, used_for}]';

COMMENT ON COLUMN public.ai_intelligence_results.qa_flags IS
  'Flags de contrôle qualité automatique post-génération [{check, passed, detail}]';
