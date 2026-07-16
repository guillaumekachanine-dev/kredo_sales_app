"use server"

import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog, type OfferPracticeCatalogRow } from "./get-offer-practices-catalog"
import { getSkillsCatalog, type SkillCatalogRow } from "./get-skills-catalog"

// Wrappers Server Action pour les composants CLIENT (AssistanceCaseDrawer,
// NewCandidateDrawer) qui fetchaient jusqu'ici ces référentiels directement
// depuis le navigateur (@/lib/supabase/client) — sans cache, à chaque ouverture
// de drawer. Les catalogues eux-mêmes (server-only) ne sont pas appelables
// depuis un composant client ; ces actions sont la seule porte d'entrée.
export async function getOfferPracticesForPicker(): Promise<OfferPracticeCatalogRow[]> {
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) return []
  return getOfferPracticesCatalog(workspaceId)
}

export async function getSkillsForPicker(): Promise<SkillCatalogRow[]> {
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) return []
  return getSkillsCatalog(workspaceId)
}
