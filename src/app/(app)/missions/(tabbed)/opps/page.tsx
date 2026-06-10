import { MissionsListView } from "@/components/missions/MissionsListView"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"

export const dynamic = "force-dynamic"

export default async function OpportunitesPage() {
  const opportunites = await getOpportunitiesList()
  const nbOuvertes = opportunites.filter((o) =>
    ["pending", "active"].includes(o.status)
  ).length

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            Opportunités
          </h1>
          <p className="text-sm text-muted mt-1">
            {nbOuvertes} opportunité{nbOuvertes > 1 ? "s" : ""} ouverte{nbOuvertes > 1 ? "s" : ""} · cliquez une ligne pour ouvrir la fiche
          </p>
        </div>
        <NewOpportunityButton />
      </div>

      <MissionsListView
        rows={opportunites}
        emptyMessage="Aucune opportunité pour l’instant. Créez votre première opportunité pour initialiser le pipeline."
      />
    </div>
  )
}

