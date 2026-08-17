-- Lot 3 : branche de validation pour content_type='intelligence_document',
-- le 2e type métier réellement "ajoutable" (registre côté TS,
-- src/features/content-collections/domain/content-type-registry.ts).
-- Même mécanisme que les branches existantes : la CHECK a été retirée en 083,
-- ce trigger reste la seule source de vérité des content_type supportés.
CREATE OR REPLACE FUNCTION private.validate_content_collection_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_content_workspace uuid;
BEGIN
  IF NEW.content_type = 'veille_article' THEN
    SELECT workspace_id INTO v_content_workspace
    FROM public.veille_articles
    WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'intelligence_document' THEN
    SELECT workspace_id INTO v_content_workspace
    FROM public.intelligence_documents
    WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'knowledge_list' THEN
    SELECT workspace_id INTO v_content_workspace
    FROM public.content_collections
    WHERE id = NEW.content_id AND kind = 'list';
  ELSE
    RAISE EXCEPTION 'Unsupported content_type for content_collection_items: %', NEW.content_type;
  END IF;

  IF v_content_workspace IS NULL THEN
    RAISE EXCEPTION 'Invalid content reference (% %) for content_collection_items', NEW.content_type, NEW.content_id;
  END IF;

  IF NEW.workspace_id <> v_content_workspace THEN
    RAISE EXCEPTION 'Workspace mismatch between content_collection_items and referenced content';
  END IF;

  RETURN NEW;
END;
$$;
