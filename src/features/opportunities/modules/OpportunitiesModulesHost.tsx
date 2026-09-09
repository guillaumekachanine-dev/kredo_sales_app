"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
import type { FinancialModelingLaunchPreset } from "@/features/financial-modeling"
import type { OpportunitiesModule } from "./opportunities-modules"

// Dialogs lourds : chargés seulement quand un module est réellement ouvert
// (`?module=` présent). Le host lui-même reste dans le bundle de la route.
const MatchingProfilModule = dynamic(
  () => import("./MatchingProfilModule").then((m) => m.MatchingProfilModule),
  { ssr: false },
)
const SimulationDevisModule = dynamic(
  () => import("./SimulationDevisModule").then((m) => m.SimulationDevisModule),
  { ssr: false },
)
const PostMortemModule = dynamic(
  () => import("./PostMortemModule").then((m) => m.PostMortemModule),
  { ssr: false },
)

export interface OpportunitiesModuleContext {
  opportunityId: string
  opportunityTitle: string
  companyId: string | null
  companyName: string | null
  salesDailyRate: number | null
}

interface OpportunitiesModulesHostProps {
  activeModule: OpportunitiesModule
  /** URL du chapitre courant sans `?module=`. */
  closeHref: string
  /** Contexte opportunité (besoin / opp sélectionné), `null` si aucune sélection. */
  context: OpportunitiesModuleContext | null
}

/**
 * Dispatcher des modules contextuels du workspace (Lot 10). Rendu par
 * l'orchestrateur `page.tsx` uniquement quand `parseOpportunitiesModule` a
 * résolu un module applicable au chapitre courant.
 */
export function OpportunitiesModulesHost({
  activeModule,
  closeHref,
  context,
}: OpportunitiesModulesHostProps) {
  const router = useRouter()

  if (activeModule === "matching") {
    if (!context) {
      return (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) router.push(closeHref, { scroll: false })
          }}
          title="Matching profil"
          description="Sélectionnez d’abord un besoin dans la liste pour lancer le matching."
        >
          <p className="text-body">
            Le matching s’applique à un besoin de staffing précis. Choisissez un besoin dans
            le rail de gauche, puis rouvrez le module.
          </p>
        </AppDialog>
      )
    }
    return (
      <MatchingProfilModule
        opportunityId={context.opportunityId}
        opportunityTitle={context.opportunityTitle}
        closeHref={closeHref}
      />
    )
  }

  if (activeModule === "simulation") {
    const preset: FinancialModelingLaunchPreset | undefined = context
      ? {
          mode: "full",
          companyId: context.companyId,
          companyName: context.companyName,
          opportunityId: context.opportunityId,
          opportunityTitle: context.opportunityTitle,
          salesDailyRate: context.salesDailyRate,
        }
      : undefined
    return <SimulationDevisModule preset={preset} closeHref={closeHref} />
  }

  return <PostMortemModule closeHref={closeHref} />
}
