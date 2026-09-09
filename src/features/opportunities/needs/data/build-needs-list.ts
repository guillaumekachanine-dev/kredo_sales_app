// ─────────────────────────────────────────────────────────────────────────────
//  Chapitre Besoins & staffing — builders PURS du rail Liste + de la sélection
//  (Lot 5). Aucune dépendance Supabase.
//
//  Réutilise `filterNeedsRows` (`src/lib/needs-staffing/model.ts`) pour les
//  filtres + le tri ACV, et `isTerminalOpportunityStage` (`stages.ts`) — même
//  prédicat d'« ouvert » que `getNeedsStaffingSharedData`, pour que la liste et
//  le KPI « besoins ouverts » restent cohérents.
// ─────────────────────────────────────────────────────────────────────────────

import type { MissionsListRow } from "@/components/missions/MissionsListView"
import type { NeedsCoverageSnapshot } from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import { filterNeedsRows } from "@/lib/needs-staffing/model"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import type { NeedsFilterState, NeedsListItem } from "./opportunities-needs.types"

/**
 * Besoins **ouverts** (étape non terminale) + filtres + tri, puis projection
 * mince avec le snapshot de couverture. Un seul passage, pas de requête.
 */
export function buildNeedsList(
  rows: readonly MissionsListRow[],
  filters: NeedsFilterState,
  coverageByOpportunityId: Record<string, NeedsCoverageSnapshot>,
): NeedsListItem[] {
  const openRows = rows.filter((row) => !isTerminalOpportunityStage(row.stage))

  return filterNeedsRows([...openRows], filters).map((row) => {
    const coverage = coverageByOpportunityId[row.entityId] ?? null
    const coverageRatio =
      coverage && coverage.requiredHeadcount > 0
        ? coverage.cappedCoveringCount / coverage.requiredHeadcount
        : null

    return {
      id: row.entityId,
      title: row.title,
      clientName: row.client ?? "Client non renseigné",
      clientLogoPath: row.clientLogoPath ?? null,
      companyId: row.companyId ?? null,
      stage: row.stage ?? "",
      priority: row.priority ?? "",
      practice: row.practice ?? null,
      amount: row.amount ?? "—",
      acv: row.acv ?? null,
      estimatedGain: row.estimatedGain ?? null,
      conviction: row.conviction ?? null,
      requiredHeadcount: row.requiredHeadcount ?? 0,
      coverage,
      coverageRatio,
    }
  })
}

/**
 * Sélection active du chapitre : l'`?opp=` demandé s'il est présent dans la
 * liste (filtrée), sinon le premier besoin, sinon `null`.
 */
export function resolveSelectedNeedId(
  items: readonly Pick<NeedsListItem, "id">[],
  requestedNeedId: string | null,
): string | null {
  if (requestedNeedId && items.some((item) => item.id === requestedNeedId)) {
    return requestedNeedId
  }
  return items[0]?.id ?? null
}
