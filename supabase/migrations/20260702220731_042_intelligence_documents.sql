-- ============================================================
-- 042_intelligence_documents
-- Couche documentaire au-dessus de ai_intelligence_runs/results
-- (qui restent immuables). Voir docs/reports-redaction-handoff-v1.md
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.intelligence_document_type AS ENUM (
  'communication', 'client_summary', 'commercial_pitch', 'campaign', 'internal_note'
);

CREATE TYPE public.intelligence_document_status AS ENUM (
  'draft', 'ready', 'used', 'archived'
);

CREATE TYPE public.intelligence_document_version_origin AS ENUM (
  'generated', 'regenerated', 'manual_edit', 'duplicated', 'imported'
);

CREATE TYPE public.intelligence_entity_type AS ENUM (
  'company', 'contact', 'opportunity', 'mission', 'project',
  'collaborator', 'candidate', 'sector', 'calendar_event'
);

-- ============================================================
-- 2. TABLE intelligence_documents
-- ============================================================

CREATE TABLE public.intelligence_documents (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id              uuid            NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Provenance (lecture seule, jamais modifiée après coup)
  source_result_id      uuid            REFERENCES public.ai_intelligence_results(id) ON DELETE SET NULL,

  -- Identité
  title                 text            NOT NULL,
  document_type         public.intelligence_document_type NOT NULL,
  status                public.intelligence_document_status NOT NULL DEFAULT 'draft',

  -- Contenu courant (dénormalisé depuis la dernière version pour lecture rapide)
  current_content_text  text,
  current_content_json  jsonb           NOT NULL DEFAULT '{}',

  -- Rattachement principal (dénormalisé depuis intelligence_document_links pour les
  -- filtres/tri rapides côté liste ; la relation normalisée complète vit dans
  -- intelligence_document_links)
  primary_entity_type   public.intelligence_entity_type,
  primary_entity_id     uuid,

  tags                  text[]          NOT NULL DEFAULT '{}',
  is_favorite           boolean         NOT NULL DEFAULT false,
  version_number        integer         NOT NULL DEFAULT 1,

  last_used_at          timestamptz,
  archived_at           timestamptz,

  search_vector         tsvector        GENERATED ALWAYS AS (
                          to_tsvector('french', coalesce(title, '') || ' ' || coalesce(current_content_text, ''))
                        ) STORED,

  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT intelligence_documents_version_positive CHECK (version_number >= 1)
);

-- ============================================================
-- 3. TABLE intelligence_document_versions
-- ============================================================

CREATE TABLE public.intelligence_document_versions (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id           uuid            NOT NULL REFERENCES public.intelligence_documents(id) ON DELETE CASCADE,

  version_number        integer         NOT NULL,
  origin                public.intelligence_document_version_origin NOT NULL,
  source_result_id      uuid            REFERENCES public.ai_intelligence_results(id) ON DELETE SET NULL,

  content_text          text,
  content_json          jsonb           NOT NULL DEFAULT '{}',
  brief_json            jsonb,
  source_refs           jsonb           NOT NULL DEFAULT '[]',
  qa_flags              jsonb           NOT NULL DEFAULT '[]',
  change_note           text,

  created_by            uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT intelligence_document_versions_uniq UNIQUE (document_id, version_number)
);

-- ============================================================
-- 4. TABLE intelligence_document_links
-- ============================================================

CREATE TABLE public.intelligence_document_links (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid            NOT NULL DEFAULT private.current_workspace_id()
                                        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id           uuid            NOT NULL REFERENCES public.intelligence_documents(id) ON DELETE CASCADE,

  entity_type           public.intelligence_entity_type NOT NULL,
  entity_id             uuid            NOT NULL,

  created_at            timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT intelligence_document_links_uniq UNIQUE (document_id, entity_type, entity_id)
);

-- ============================================================
-- 5. TRIGGERS updated_at + audit
-- ============================================================

CREATE TRIGGER trg_intelligence_documents_updated_at
  BEFORE UPDATE ON public.intelligence_documents
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER trg_intelligence_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.intelligence_documents
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

-- Pas de log_audit sur _versions (append-only, jamais update/delete) ni sur
-- _links (table de jointure pure) — cohérent avec le motif existant
-- (missions/mission_activity_reports n'ont pas non plus de log_audit).

-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX idx_intelligence_documents_workspace_updated
  ON public.intelligence_documents(workspace_id, updated_at DESC);
CREATE INDEX idx_intelligence_documents_type
  ON public.intelligence_documents(workspace_id, document_type);
CREATE INDEX idx_intelligence_documents_status
  ON public.intelligence_documents(workspace_id, status);
CREATE INDEX idx_intelligence_documents_owner
  ON public.intelligence_documents(workspace_id, owner_id);
CREATE INDEX idx_intelligence_documents_entity
  ON public.intelligence_documents(primary_entity_type, primary_entity_id)
  WHERE primary_entity_type IS NOT NULL;
CREATE INDEX idx_intelligence_documents_tags_gin
  ON public.intelligence_documents USING gin(tags);
CREATE INDEX idx_intelligence_documents_search_gin
  ON public.intelligence_documents USING gin(search_vector);

CREATE INDEX idx_intelligence_document_versions_document
  ON public.intelligence_document_versions(document_id, version_number DESC);
CREATE INDEX idx_intelligence_document_versions_workspace
  ON public.intelligence_document_versions(workspace_id);

CREATE INDEX idx_intelligence_document_links_document
  ON public.intelligence_document_links(document_id);
CREATE INDEX idx_intelligence_document_links_entity
  ON public.intelligence_document_links(entity_type, entity_id);
CREATE INDEX idx_intelligence_document_links_workspace
  ON public.intelligence_document_links(workspace_id);

-- ============================================================
-- 7. RLS — motif uniforme workspace (4 policies par table)
-- ============================================================

ALTER TABLE public.intelligence_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_document_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_document_links     ENABLE ROW LEVEL SECURITY;

-- intelligence_documents
CREATE POLICY "intelligence_documents_select" ON public.intelligence_documents
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_documents_insert" ON public.intelligence_documents
  FOR INSERT WITH CHECK (true);
CREATE POLICY "intelligence_documents_update" ON public.intelligence_documents
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_documents_delete" ON public.intelligence_documents
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- intelligence_document_versions
CREATE POLICY "intelligence_document_versions_select" ON public.intelligence_document_versions
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_versions_insert" ON public.intelligence_document_versions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "intelligence_document_versions_update" ON public.intelligence_document_versions
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_versions_delete" ON public.intelligence_document_versions
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- intelligence_document_links
CREATE POLICY "intelligence_document_links_select" ON public.intelligence_document_links
  FOR SELECT USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_links_insert" ON public.intelligence_document_links
  FOR INSERT WITH CHECK (true);
CREATE POLICY "intelligence_document_links_update" ON public.intelligence_document_links
  FOR UPDATE USING (workspace_id = private.current_workspace_id());
CREATE POLICY "intelligence_document_links_delete" ON public.intelligence_document_links
  FOR DELETE USING (workspace_id = private.current_workspace_id());

-- ============================================================
-- 8. GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_documents         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_document_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_document_links    TO authenticated;

GRANT ALL ON public.intelligence_documents         TO service_role;
GRANT ALL ON public.intelligence_document_versions TO service_role;
GRANT ALL ON public.intelligence_document_links    TO service_role;

-- ============================================================
-- 9. COMMENTS
-- ============================================================

COMMENT ON TABLE public.intelligence_documents IS
  'Couche documentaire exploitable par l''utilisateur — distincte de ai_intelligence_results (immuable, technique). Un document peut naître d''une génération IA (source_result_id) ou être créé manuellement (source_result_id NULL).';
COMMENT ON TABLE public.intelligence_document_versions IS
  'Historique append-only des versions d''un document. Jamais d''UPDATE/DELETE en usage normal.';
COMMENT ON TABLE public.intelligence_document_links IS
  'Relation N:M polymorphe entre un document et les entités métier Kredo (compte, contact, opportunité...). primary_entity_type/id sur intelligence_documents est une dénormalisation de lecture rapide de la relation principale.';
COMMENT ON COLUMN public.intelligence_documents.current_content_text IS
  'Version texte brut du contenu courant — alimente search_vector. Doit être tenu synchrone avec current_content_json à chaque écriture.';
