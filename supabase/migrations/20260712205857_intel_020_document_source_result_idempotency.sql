-- INTEL-020 Lot 15 — un callback n8n peut être rejoué après une réponse perdue.
-- Un résultat IA ne doit donc matérialiser qu'un seul document automatique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_intelligence_documents_source_result_unique
  ON public.intelligence_documents (source_result_id)
  WHERE source_result_id IS NOT NULL;
