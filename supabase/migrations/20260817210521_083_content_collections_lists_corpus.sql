-- ============================================================
-- Lot 1 — Socle Listes / Corpus. Fait évoluer content_collections /
-- content_collection_items (migration 081) pour distinguer deux natures de
-- collection :
--   - Liste (kind='list')  : regroupement homogène d'objets de même item_type.
--   - Corpus (kind='corpus'): ensemble thématique hétérogène, peut inclure des
--     Listes existantes via un membership content_type='knowledge_list'.
-- Pas de Corpus dans un Corpus en V1 (imposé ici par le trigger de validation,
-- en miroir de la couche métier TypeScript).
-- ============================================================

-- 1. content_collections : nature (kind) + type homogène des Listes (item_type)
ALTER TABLE public.content_collections
  ADD COLUMN kind text NOT NULL DEFAULT 'list',
  ADD COLUMN item_type text;

ALTER TABLE public.content_collections
  ADD CONSTRAINT content_collections_kind_check
    CHECK (kind = ANY (ARRAY['list'::text, 'corpus'::text]));

-- Backfill : toutes les collections existantes sont des Listes d'articles de
-- veille (seul content_type jamais inséré jusqu'ici, cf. migration 081).
UPDATE public.content_collections
SET item_type = 'veille_article'
WHERE kind = 'list' AND item_type IS NULL;

-- Cohérence : une Liste porte un item_type (homogène) ; un Corpus n'en a pas
-- (hétérogène par nature, le type de chaque item vit sur le membership).
ALTER TABLE public.content_collections
  ADD CONSTRAINT content_collections_kind_item_type_coherence
    CHECK (
      (kind = 'list' AND item_type IS NOT NULL)
      OR (kind = 'corpus' AND item_type IS NULL)
    );

COMMENT ON COLUMN public.content_collections.kind IS
  'Nature de la collection : ''list'' (regroupement homogène, item_type requis) ou ''corpus'' (ensemble thématique hétérogène, item_type NULL). Pas de Corpus dans un Corpus en V1.';
COMMENT ON COLUMN public.content_collections.item_type IS
  'Type d''objet homogène porté par une Liste (ex. ''veille_article''). NULL pour un Corpus, dont les items portent chacun leur propre content_type sur content_collection_items.';

CREATE INDEX idx_content_collections_workspace_kind
  ON public.content_collections (workspace_id, kind);

-- 2. content_collection_items : ordre manuel + élargissement du content_type
ALTER TABLE public.content_collection_items
  ADD COLUMN position integer;

COMMENT ON COLUMN public.content_collection_items.position IS
  'Ordre manuel optionnel au sein d''une collection. NULL = pas d''ordre explicite (tri par défaut sur created_at).';

-- Liste blanche restrictive (081) remplacée par la validation extensible du
-- trigger private.validate_content_collection_item ci-dessous — mécanisme
-- déjà documenté dans le commentaire d'origine de cette contrainte.
ALTER TABLE public.content_collection_items
  DROP CONSTRAINT content_collection_items_content_type_check;

-- 3. Étend la validation polymorphe : ajoute la branche 'knowledge_list',
-- qui référence une Liste (jamais un Corpus) incluse dans un Corpus. Même
-- garde-fou métier que la couche TypeScript (interdiction Corpus → Corpus),
-- ici en défense en profondeur au niveau base.
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

COMMENT ON TABLE public.content_collection_items IS
  'Membership générique liste/corpus ↔ contenu canonique OU Liste (content_type=''knowledge_list''). Référence uniquement (content_type, content_id) : ne duplique jamais le contenu. Le trigger private.validate_content_collection_item est la source de vérité des content_type supportés (liste blanche SQL retirée en 083).';
