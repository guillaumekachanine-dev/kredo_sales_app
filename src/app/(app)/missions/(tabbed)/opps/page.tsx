import { MissionsListView } from "@/components/missions/MissionsListView"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"

export const dynamic = "force-dynamic"

function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined || amount === 0) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function OpportunitesPage() {
  const opportunites = await getOpportunitiesList()
  const openOpps = opportunites.filter((o) =>
    ["pending", "active"].includes(o.status)
  )

  const weightedPipe = openOpps.reduce((sum, o) => {
    const conviction = o.conviction ?? 0
    const val = o.acv ?? o.estimatedGain ?? 0
    return sum + (val * (conviction / 100))
  }, 0)

  const priorityClient = "Voyage Privé"

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border w-full">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-heading shrink-0">
          Opportunités
        </h1>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center justify-around divide-x divide-border/60 w-full max-w-2xl">
            <HeaderKpiCard label="Pipe pondéré" value={formatEuro(weightedPipe)} className="flex-1" />
            <HeaderKpiCard label="Cible prioritaire" value={priorityClient} className="flex-1" />
            <HeaderKpiCard label="À déterminer" value="—" className="flex-1" />
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-end">
          <NewOpportunityButton />
        </div>
      </div>

      <MissionsListView
        rows={opportunites}
        emptyMessage="Aucune opportunité pour l’instant. Créez votre première opportunité pour initialiser le pipeline."
      />
    </div>
  )
}

