import { OpportunitiesTriPanel } from "@/features/opportunities/desktop/OpportunitiesTriPanel"
import type { NeedsChapterData } from "./data/opportunities-needs.types"
import { NeedsListPanel } from "./NeedsListPanel"
import { NeedsDetailPanel } from "./NeedsDetailPanel"
import { StaffingInProgressRail } from "./StaffingInProgressRail"

// ─────────────────────────────────────────────────────────────────────────────
//  Chapitre Besoins & staffing — Desktop (Lot 6).
//
//  Monte la primitive `OpportunitiesTriPanel` (Lot 2) :
//    Liste (besoins ouverts + filtres + sélection `?opp=`)
//    │ Détail du besoin (inline, `OpportunityDetailView` réutilisé — OPP-24)
//    │ « Staffing en cours » (positionnements actifs, drawer unique)
//
//  Server Component : les données viennent de `getNeedsChapterData` (Lot 5).
//  Chaque panneau porte sa propre frontière client. Mobile inchangé (le
//  `page.tsx` ne monte jamais ce composant sur Mobile).
// ─────────────────────────────────────────────────────────────────────────────

interface NeedsDesktopProps {
  data: NeedsChapterData
  searchParamsString: string
}

export function NeedsDesktop({ data, searchParamsString }: NeedsDesktopProps) {
  const selectedNeed = data.items.find((item) => item.id === data.selectedNeedId) ?? null

  return (
    <OpportunitiesTriPanel
      ariaLabel="Besoins & staffing"
      list={
        <NeedsListPanel
          items={data.items}
          selectedNeedId={data.selectedNeedId}
          filters={data.filters}
          searchParamsString={searchParamsString}
        />
      }
      main={
        <NeedsDetailPanel
          detail={data.selectedNeedDetail}
          detailError={data.selectedNeedDetailError}
          hasSelection={data.selectedNeedId !== null}
        />
      }
      details={
        data.selectedNeedId ? (
          <StaffingInProgressRail
            staffing={data.activeStaffing}
            openNeeds={data.openNeeds}
            selectedNeedTitle={selectedNeed?.title ?? null}
          />
        ) : undefined
      }
    />
  )
}
