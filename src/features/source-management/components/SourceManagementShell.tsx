"use client"

import { ModuleLoadingDrawer } from "@/components/intelligence/modules/ModuleLoadingDrawer"
import { useModuleSnapshot } from "@/components/intelligence/modules/use-module-snapshot"
import { loadSourceManagementSnapshot } from "../actions/source-management-actions"
import { SourceManagementDialogDesktop } from "./SourceManagementDialogDesktop"
import { SourceManagementDrawerMobile } from "./SourceManagementDrawerMobile"

const TITLE = "Gérer les sources"

/**
 * Panneau « Gérer les sources », autoportant : il n'attend aucun snapshot en
 * prop, il le charge lui-même — **et seulement à l'ouverture**.
 *
 * Auparavant, `/veille` appelait `getSourceManagementSnapshot()` à chaque rendu
 * de page pour alimenter trois dialogues qui ne s'ouvrent que sur clic : cinq
 * requêtes et ~107 Ko (dont `source_catalog select=*` 44 Ko et
 * `source_corpus_items select=*` 44 Ko), réparties sur deux vagues du chemin
 * critique. Voir docs/performance-data-audit, constat F-3c.
 *
 * Le montage est conditionnel plutôt que piloté par un état interne : c'est ce
 * qui fait que `useModuleSnapshot` ne se déclenche qu'à l'ouverture, et qu'une
 * réouverture **relit** le socle. Cette relecture est délibérée — le panneau
 * permet d'ajouter et de modifier des sources, une donnée mémoïsée deviendrait
 * périmée dès la première mutation. Le coût est un aller-retour sur une action
 * utilisateur explicite, jamais sur le chemin critique d'une page.
 *
 * Motif repris de `SourceManagementModule` (panneau Cockpit), qui rend déjà ce
 * même socle autoportant.
 */
export function SourceManagementShell({
  variant,
  open,
  onOpenChange,
}: {
  variant: "desktop" | "mobile"
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!open) return null
  return <SourceManagementShellBody variant={variant} onOpenChange={onOpenChange} />
}

function SourceManagementShellBody({
  variant,
  onOpenChange,
}: {
  variant: "desktop" | "mobile"
  onOpenChange: (open: boolean) => void
}) {
  const { state, refresh, updateData } = useModuleSnapshot(loadSourceManagementSnapshot)

  // L'échec est un état rendu, jamais un silence : un panneau vide ferait croire
  // à une absence de sources là où il y a une erreur de lecture.
  if (state.status !== "ready") {
    return (
      <ModuleLoadingDrawer
        open
        onOpenChange={onOpenChange}
        title={TITLE}
        isError={state.status === "error"}
        message={state.status === "error" ? state.message : "Chargement du socle éditorial…"}
      />
    )
  }

  return variant === "desktop" ? (
    <SourceManagementDialogDesktop
      open
      onOpenChange={onOpenChange}
      snapshot={state.data}
      onSnapshotChange={updateData}
      onRefresh={refresh}
    />
  ) : (
    <SourceManagementDrawerMobile
      open
      onOpenChange={onOpenChange}
      snapshot={state.data}
      onSnapshotChange={updateData}
      onRefresh={refresh}
    />
  )
}
