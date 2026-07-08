-- ADR-0012 Lot 5 — commercial_strategy s'auto-sauvegarde en bibliothèque
-- documentaire (intelligence_documents) comme les autres analyses/rapports
-- déjà éligibles (client_summary, commercial_pitch...), D-5 : c'est un
-- artefact de génération pure en content_json, pas une entité opérationnelle
-- normalisée (contrairement à account_issues_map -> account_issues, Lot 4).
ALTER TYPE public.intelligence_document_type ADD VALUE IF NOT EXISTS 'commercial_strategy';
