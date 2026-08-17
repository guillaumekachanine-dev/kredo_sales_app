-- Migration: 082_content_collections_fk_covering_indexes
-- Couvre les FK signalées par le Performance Advisor Supabase après la migration
-- 081_content_collections (Lot 5 — vérifications techniques). Même motif que
-- 078_source_management_created_by_index.

CREATE INDEX IF NOT EXISTS idx_content_collections_created_by
  ON public.content_collections(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_collection_items_workspace_id
  ON public.content_collection_items(workspace_id);

CREATE INDEX IF NOT EXISTS idx_content_collection_items_added_by
  ON public.content_collection_items(added_by)
  WHERE added_by IS NOT NULL;
