import "server-only"

import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getNeedsStaffingSharedData } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { getOpportunityDetail } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { getStaffingsList } from "@/app/(app)/staffing/_data/get-staffings-list"
import { isActivePositioningStatus } from "@/lib/needs-staffing/coverage"
import { groupActiveStaffingsByOpportunityId } from "@/lib/needs-staffing/model"
import { buildNeedsList, resolveSelectedNeedId } from "./build-needs-list"
import type { NeedsChapterData, NeedsSelectionState } from "./opportunities-needs.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader unique du chapitre Besoins & staffing (Lot 5).
//
//  Compose des loaders **existants** — aucun forké, aucune requête dupliquée :
//   - `getOpportunitiesList({ onlyStaffingNeeds: true })` → rail Liste ;
//   - `getNeedsStaffingSharedData()`                     → snapshots de couverture ;
//   - `getStaffingsList()` (une fois, groupé en mémoire) → rail « Staffing en cours » ;
//   - `getOpportunityDetail(selectedNeedId)`             → **uniquement** le besoin
//     sélectionné (jamais un détail par ligne de liste).
// ─────────────────────────────────────────────────────────────────────────────

export async function getNeedsChapterData(
  selection: NeedsSelectionState,
): Promise<NeedsChapterData> {
  const [rows, shared, staffingRows] = await Promise.all([
    getOpportunitiesList({ onlyStaffingNeeds: true }),
    getNeedsStaffingSharedData(),
    getStaffingsList(),
  ])

  const items = buildNeedsList(rows, selection.filters, shared.coverageByOpportunityId)
  const selectedNeedId = resolveSelectedNeedId(items, selection.requestedNeedId)

  let selectedNeedDetail: NeedsChapterData["selectedNeedDetail"] = null
  let selectedNeedDetailError: string | null = null
  if (selectedNeedId) {
    const result = await getOpportunityDetail(selectedNeedId)
    if (result.data) {
      selectedNeedDetail = result.data
    } else {
      selectedNeedDetailError = result.error
    }
  }

  const activeStaffingByOpportunity = groupActiveStaffingsByOpportunityId(
    staffingRows,
    isActivePositioningStatus,
  )
  const activeStaffing = selectedNeedId
    ? activeStaffingByOpportunity.get(selectedNeedId) ?? []
    : []

  const dataNotes: string[] = []
  if (selection.requestedNeedId && selection.requestedNeedId !== selectedNeedId) {
    dataNotes.push(
      "Le besoin ciblé par l'URL n'existe plus ou n'est pas un besoin ouvert : sélection repliée sur le premier de la liste.",
    )
  }
  if (items.length === 0 && rows.length > 0) {
    dataNotes.push("Aucun besoin ouvert ne correspond aux filtres actifs.")
  }
  if (selectedNeedDetailError) {
    dataNotes.push(`Détail du besoin indisponible : ${selectedNeedDetailError}`)
  }

  return {
    items,
    selectedNeedId,
    selectedNeedDetail,
    selectedNeedDetailError,
    activeStaffing,
    filters: selection.filters,
    dataNotes,
  }
}
