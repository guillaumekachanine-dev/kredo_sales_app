import { OpportunitiesDesktopView } from "@/components/missions/OpportunitiesDesktopView"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { MissionsListView } from "@/components/missions/MissionsListView"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { getOpportunitiesPlanning } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

function fmtEuro(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`
  if (v >= 1_000) return `${Math.round(v / 1_000)} k€`
  return `${Math.round(v)} €`
}

function StatChip({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-w-[8.75rem] shrink-0 flex-col justify-center rounded-[var(--radius-large)] border border-border bg-surface px-3 py-2"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="mt-1 whitespace-nowrap font-heading text-[18px] font-bold leading-none tracking-tight text-heading tabular-nums">
        {value}
      </span>
    </div>
  )
}

export default async function OpportunitesPage() {
  const [opportunites, planningData] = await Promise.all([
    getOpportunitiesList(),
    getOpportunitiesPlanning(),
  ])

  const openOpps = opportunites.filter((o) => o.status === "active" || o.status === "pending")
  const openOppIds = openOpps.map((opportunity) => opportunity.entityId)

  const weightedPipe = openOpps.reduce((sum, o) => {
    const val = o.acv ?? o.estimatedGain ?? 0
    return sum + val * ((o.conviction ?? 0) / 100)
  }, 0)

  const supabase = await createClient()
  const { data: candidates, error } = await supabase
    .from("opportunity_candidates")
    .select("opportunity_id")
    .in("opportunity_id", openOppIds.length > 0 ? openOppIds : ["__none__"])

  const coveredOppIds = new Set(candidates?.map((c) => c.opportunity_id) ?? [])
  const coverageRate =
    openOppIds.length > 0
      ? Math.round((coveredOppIds.size / openOppIds.length) * 100)
      : 0

  if (error) {
    console.error("Error fetching opportunity candidates metrics:", error)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
      <header className="grid gap-x-5 gap-y-3 border-b border-border/70 pb-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Opportunités
          </h1>
        </div>

        <div className="order-3 flex justify-center md:col-span-2 lg:order-2 lg:col-span-1 lg:justify-self-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatChip
              label="Pipe pondéré"
              value={weightedPipe > 0 ? fmtEuro(weightedPipe) : "—"}
            />
            <StatChip
              label="Opportunités ouvertes"
              value={String(openOpps.length)}
            />
            <StatChip
              label="Taux de couverture"
              value={`${coverageRate}%`}
            />
          </div>
        </div>

        <div className="hidden md:flex md:justify-self-end lg:order-3">
          <NewOpportunityButton />
        </div>
      </header>

      {/* Vues desktop */}
      <div className="hidden md:block">
        <OpportunitiesDesktopView opportunities={opportunites} planningData={planningData} />
      </div>

      {/* Vue mobile */}
      <div className="md:hidden">
        <MissionsListView
          rows={opportunites}
          emptyMessage="Aucune opportunité pour l'instant. Créez votre première opportunité pour initialiser le pipeline."
        />
      </div>
    </div>
  )
}
