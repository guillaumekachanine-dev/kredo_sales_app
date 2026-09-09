// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — contrats de données du chapitre Besoins & staffing
//  (Lot 5). Data-only : types + builders purs + loader mince. Pas d'UI (Lot 6).
//
//  Chantier : docs/FEATURES/opportunities_workspace/ (§ 10).
//
//  Principe : **réutiliser les loaders existants**, ne charger le **détail** que
//  du besoin **sélectionné** (un seul chemin par entité, jamais un détail par
//  ligne de liste) — critère d'acceptation du Lot 5.
//
//  Sélection d'entité : `?opp=<id>` (PRODUCT-03 — recommandation « oui »). Le
//  contrat de href/navigation (`buildOpportunitiesSectionHref` etc.) reste au
//  Lot 6 (NAVIGATION-02) ; ici on se contente de **parser** la sélection.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  NeedsCoverageSnapshot,
  OpenNeedOption,
} from "@/app/(app)/missions/_data/get-needs-staffing-shared"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import type { StaffingListRow } from "@/app/(app)/staffing/_data/get-staffings-list"
import type {
  NeedsStaffingDirection,
  NeedsStaffingSortField,
} from "@/lib/needs-staffing/url-state"

/** Filtres du rail Liste — sous-ensemble de `NeedsStaffingUrlState` sans `scope`/`view`. */
export interface NeedsFilterState {
  stage: string | null
  priority: string | null
  practice: string | null
  sort: NeedsStaffingSortField
  direction: NeedsStaffingDirection
}

export interface NeedsSelectionState {
  /** `?opp=` brut — peut ne plus exister / ne pas être un besoin ouvert. */
  requestedNeedId: string | null
  filters: NeedsFilterState
}

/** Une ligne du rail Liste — projection mince de `MissionsListRow` + couverture. */
export interface NeedsListItem {
  id: string
  title: string
  clientName: string
  clientLogoPath: string | null
  companyId: string | null
  stage: string
  priority: string
  practice: string | null
  /** Montant déjà formaté par `getOpportunitiesList` (`formatEuro`). */
  amount: string
  acv: number | null
  estimatedGain: number | null
  conviction: number | null
  requiredHeadcount: number
  /** Snapshot de couverture (`getNeedsStaffingSharedData.coverageByOpportunityId`), ou `null`. */
  coverage: NeedsCoverageSnapshot | null
  /** `cappedCoveringCount / requiredHeadcount` ∈ [0,1], ou `null` si non calculable. */
  coverageRatio: number | null
}

export interface NeedsChapterData {
  items: NeedsListItem[]
  /** Besoins ouverts (`getNeedsStaffingSharedData.openNeeds`) — alimente `NewStaffingButton`. */
  openNeeds: OpenNeedOption[]
  selectedNeedId: string | null
  /** Détail du **seul** besoin sélectionné (un seul chemin de chargement). */
  selectedNeedDetail: OpportunityDetailData | null
  selectedNeedDetailError: string | null
  /** Positionnements **actifs** du besoin sélectionné (`isActivePositioningStatus`). */
  activeStaffing: StaffingListRow[]
  filters: NeedsFilterState
  /** Réserves méthodo / résolutions silencieuses à afficher discrètement. */
  dataNotes: string[]
}
