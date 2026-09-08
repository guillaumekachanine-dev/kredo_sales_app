"use client"

import { ManageCollectionsMobile } from "@/features/content-collections/components/ManageCollectionsMobile"

/**
 * Module « Gestion de la connaissance » : consultation, édition et organisation
 * de la connaissance produite avec Kredo — listes, corpus et documents.
 *
 * `ManageCollectionsMobile` est déjà autoportante (elle charge ses collections
 * et ses documents elle-même) : aucun chargeur à écrire, seulement le montage.
 */
export function KnowledgeManagementModule({ onClose }: { onClose: () => void }) {
  return <ManageCollectionsMobile open onOpenChange={(next) => { if (!next) onClose() }} />
}
