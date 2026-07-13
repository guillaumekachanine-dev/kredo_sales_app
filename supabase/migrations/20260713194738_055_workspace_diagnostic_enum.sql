-- ADR-0014 Lot 5 — persistence du diagnostic macro dans la bibliothèque.
-- ADD VALUE est idempotent afin de rester sûr lors des reprises de migration.

alter type public.intelligence_document_type
  add value if not exists 'workspace_diagnostic';

