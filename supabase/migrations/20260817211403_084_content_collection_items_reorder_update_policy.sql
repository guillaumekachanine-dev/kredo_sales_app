-- Lot 2 : réordonnancement manuel des items d'une collection (position).
-- Migration 081 n'ouvrait aucune policy UPDATE ("un membership s'ajoute ou se
-- retire, il ne s'édite pas") — obsolète depuis l'ajout de `position` (083).
-- Ajoute une policy UPDATE strictement scopée au propriétaire de la collection
-- parente (même prédicat que insert/delete), et restreint côté GRANT la seule
-- colonne réellement modifiable (défense en profondeur : même si la policy
-- RLS autorise la ligne, seule `position` reste écrivable par le rôle authenticated).
CREATE POLICY content_collection_items_update ON public.content_collection_items
  FOR UPDATE TO authenticated
  USING (
    workspace_id = (select private.current_workspace_id())
    AND EXISTS (
      SELECT 1 FROM public.content_collections c
      WHERE c.id = content_collection_items.collection_id
        AND c.workspace_id = (select private.current_workspace_id())
        AND c.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    workspace_id = (select private.current_workspace_id())
    AND EXISTS (
      SELECT 1 FROM public.content_collections c
      WHERE c.id = content_collection_items.collection_id
        AND c.workspace_id = (select private.current_workspace_id())
        AND c.created_by = (select auth.uid())
    )
  );

GRANT UPDATE (position) ON public.content_collection_items TO authenticated;
