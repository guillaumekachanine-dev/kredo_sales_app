-- ============================================================
-- Content collections ("Listes") — corpus éditorial réutilisable, possédé par
-- l'utilisateur qui le crée. Référence des contenus canoniques (jamais de copie).
-- V1 : un seul content_type supporté ('veille_article'), le seul réellement
-- consommé par l'onglet Actualité de /veille (src/app/(app)/veille/_data/veille-data.ts).
-- ============================================================

CREATE TABLE public.content_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid DEFAULT auth.uid()
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_collections_name_not_blank CHECK (btrim(name) <> '')
);

COMMENT ON TABLE public.content_collections IS
  'Liste éditoriale créée et possédée par un utilisateur : collection de contenus canoniques (jamais de copie), réutilisable comme corpus de contexte dans les fonctionnalités IA (ex. INTEL-020). Sans notion de type métier (client/secteur/practice) : nom + description suffisent en V1.';

CREATE INDEX idx_content_collections_workspace_created_by
  ON public.content_collections (workspace_id, created_by);

CREATE TABLE public.content_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT private.current_workspace_id()
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL
    REFERENCES public.content_collections(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  added_by uuid DEFAULT auth.uid()
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_collection_items_unique_member
    UNIQUE (collection_id, content_type, content_id),
  -- Liste blanche volontairement restreinte au premier type réellement consommé par
  -- l'UI (veille_articles, cf. Lot 0). Étendre ce CHECK — pas un enum — à chaque
  -- nouveau content_type supporté, en miroir de la branche ajoutée au trigger de
  -- validation ci-dessous.
  CONSTRAINT content_collection_items_content_type_check
    CHECK (content_type = ANY (ARRAY['veille_article'::text]))
);

COMMENT ON TABLE public.content_collection_items IS
  'Membership générique liste ↔ contenu canonique. Référence uniquement (content_type, content_id) : ne duplique jamais le titre/résumé/texte/URL du contenu. Le même contenu peut appartenir à plusieurs listes.';

CREATE INDEX idx_content_collection_items_collection_id
  ON public.content_collection_items (collection_id);

CREATE INDEX idx_content_collection_items_content
  ON public.content_collection_items (content_type, content_id);

-- Intégrité référentielle polymorphe : le contenu pointé doit exister et
-- appartenir au même workspace que le membership. Pattern miroir de
-- private.validate_account_watch_setting() (compte ↔ workspace).
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

DROP TRIGGER IF EXISTS trg_validate_content_collection_item ON public.content_collection_items;
CREATE TRIGGER trg_validate_content_collection_item
  BEFORE INSERT OR UPDATE ON public.content_collection_items
  FOR EACH ROW EXECUTE FUNCTION private.validate_content_collection_item();

DROP TRIGGER IF EXISTS trg_content_collections_updated_at ON public.content_collections;
CREATE TRIGGER trg_content_collections_updated_at
  BEFORE UPDATE ON public.content_collections
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_content_collections ON public.content_collections;
CREATE TRIGGER trg_audit_content_collections
  AFTER INSERT OR UPDATE OR DELETE ON public.content_collections
  FOR EACH ROW EXECUTE FUNCTION private.log_audit();

ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_collections_select ON public.content_collections
  FOR SELECT TO authenticated
  USING (workspace_id = (select private.current_workspace_id()));

CREATE POLICY content_collections_insert ON public.content_collections
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = (select private.current_workspace_id())
    AND created_by = (select auth.uid())
  );

CREATE POLICY content_collections_update ON public.content_collections
  FOR UPDATE TO authenticated
  USING (
    workspace_id = (select private.current_workspace_id())
    AND created_by = (select auth.uid())
  )
  WITH CHECK (
    workspace_id = (select private.current_workspace_id())
    AND created_by = (select auth.uid())
  );

CREATE POLICY content_collections_delete ON public.content_collections
  FOR DELETE TO authenticated
  USING (
    workspace_id = (select private.current_workspace_id())
    AND created_by = (select auth.uid())
  );

-- content_collection_items : lecture workspace-wide (suit la visibilité de la
-- liste parente) ; ajout/retrait réservés au propriétaire de la liste (pas à
-- celui qui a ajouté un item en particulier — la liste n'a qu'un seul
-- propriétaire, cf. 1.5). Pas d'UPDATE : un membership s'ajoute ou se retire,
-- il ne s'édite pas.
CREATE POLICY content_collection_items_select ON public.content_collection_items
  FOR SELECT TO authenticated
  USING (workspace_id = (select private.current_workspace_id()));

CREATE POLICY content_collection_items_insert ON public.content_collection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = (select private.current_workspace_id())
    AND EXISTS (
      SELECT 1 FROM public.content_collections c
      WHERE c.id = content_collection_items.collection_id
        AND c.workspace_id = (select private.current_workspace_id())
        AND c.created_by = (select auth.uid())
    )
  );

CREATE POLICY content_collection_items_delete ON public.content_collection_items
  FOR DELETE TO authenticated
  USING (
    workspace_id = (select private.current_workspace_id())
    AND EXISTS (
      SELECT 1 FROM public.content_collections c
      WHERE c.id = content_collection_items.collection_id
        AND c.workspace_id = (select private.current_workspace_id())
        AND c.created_by = (select auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_collections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.content_collection_items TO authenticated;
GRANT ALL ON public.content_collections TO service_role;
GRANT ALL ON public.content_collection_items TO service_role;
