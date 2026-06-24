import { KpiCard } from "@/components/ui/KpiCard"
import { MissionsListView } from "@/components/missions/MissionsListView"
import { OpportunitiesDesktopView } from "@/components/missions/OpportunitiesDesktopView"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { getOpportunitySkillsCloud } from "@/app/(app)/missions/_data/get-opportunity-skills-cloud"
import { createClient } from "@/lib/supabase/server"
import { OpportunitySkillsCloud } from "@/components/missions/OpportunitySkillsCloud"

export const dynamic = "force-dynamic"

function fmtEuro(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`
  if (v >= 1_000) return `${Math.round(v / 1_000)} k€`
  return `${Math.round(v)} €`
}

export default async function OpportunitesPage() {
  const opportunites = await getOpportunitiesList()

  const openOpps = opportunites.filter((o) => o.status === "active" || o.status === "pending")
  const openOppIds = openOpps.map((opportunity) => opportunity.entityId)

  const weightedPipe = openOpps.reduce((sum, o) => {
    const val = o.acv ?? o.estimatedGain ?? 0
    return sum + val * ((o.conviction ?? 0) / 100)
  }, 0)

  const hautePrioCount = openOpps.filter((o) => o.priority === "haute").length

  const [skillsCloud, staffingMetrics] = await Promise.all([
    getOpportunitySkillsCloud(openOppIds),
    (async () => {
      if (openOppIds.length === 0) return { totalCandidates: 0, coverageRate: 0 }

      const supabase = await createClient()
      const { data: candidates, error } = await supabase
        .from("opportunity_candidates")
        .select("opportunity_id")
        .in("opportunity_id", openOppIds)

      if (error) {
        console.error("Error fetching opportunity candidates metrics:", error)
        return { totalCandidates: 0, coverageRate: 0 }
      }

      const coveredOppIds = new Set(candidates?.map((c) => c.opportunity_id) ?? [])
      const rate = Math.round((coveredOppIds.size / openOppIds.length) * 100)
      return {
        totalCandidates: candidates?.length ?? 0,
        coverageRate: rate
      }
    })(),
  ])

  const { totalCandidates, coverageRate } = staffingMetrics

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <div className="h-12 flex items-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
          Opportunités
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.74fr)_minmax(21rem,1fr)]">
        <div className="grid h-full auto-rows-fr gap-4 md:grid-cols-3">
          <KpiCard
            label="Pipe pondéré"
            value={weightedPipe > 0 ? fmtEuro(weightedPipe) : "—"}
            context="Valeur × conviction sur opps actives"
            accent="brass"
          />
          <KpiCard
            label="Opportunités ouvertes"
            value={String(openOpps.length)}
            context={
              hautePrioCount > 0
                ? `dont ${hautePrioCount} haute priorité`
                : "aucune haute priorité"
            }
          />
          <KpiCard
            label="Profils poussés"
            value={String(totalCandidates)}
            context={
              <>
                taux de couverture :{" "}
                <span className={coverageRate < 70 ? "text-danger font-medium" : "text-success font-medium"}>
                  {coverageRate}%
                </span>
              </>
            }
          />
        </div>

        <OpportunitySkillsCloud
          items={skillsCloud.items}
        />
      </div>

      <div className="hidden md:block">
        <OpportunitiesDesktopView opportunities={opportunites} />
      </div>

      <div className="md:hidden">
        <MissionsListView
          rows={opportunites}
          emptyMessage="Aucune opportunité pour l'instant. Créez votre première opportunité pour initialiser le pipeline."
        />
      </div>
    </div>
  )
}
