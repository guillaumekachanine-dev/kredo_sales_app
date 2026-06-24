import { OpportunitiesDesktopView } from "@/components/missions/OpportunitiesDesktopView"
import { getOpportunitiesList } from "@/app/(app)/missions/_data/get-opportunities-list"
import { MissionsListView } from "@/components/missions/MissionsListView"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"
import { getOpportunitiesPlanning } from "@/app/(app)/missions/_data/get-opportunities-planning"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { formatEuroCompact } from "@/lib/formatters"
import { EntityWorkspacePage } from "@/components/common/EntityWorkspacePage"
import { EntityWorkspaceHeader } from "@/components/common/EntityWorkspaceHeader"
import { EntityWorkspaceContent } from "@/components/common/EntityWorkspaceContent"

export const dynamic = "force-dynamic"

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
    <EntityWorkspacePage>
      <EntityWorkspaceHeader
        title="Opportunités"
        kpis={
          <>
            <StatChip
              label="Pipe pondéré"
              value={weightedPipe > 0 ? formatEuroCompact(weightedPipe) : "—"}
            />
            <StatChip
              label="Opportunités ouvertes"
              value={String(openOpps.length)}
            />
            <StatChip
              label="Taux de couverture"
              value={`${coverageRate}%`}
            />
          </>
        }
        actions={<NewOpportunityButton />}
      />

      <EntityWorkspaceContent
        desktopView={
          <OpportunitiesDesktopView opportunities={opportunites} planningData={planningData} />
        }
        mobileView={
          <MissionsListView
            rows={opportunites}
            emptyMessage="Aucune opportunité pour l'instant. Créez votre première opportunité pour initialiser le pipeline."
          />
        }
      />
    </EntityWorkspacePage>
  )
}
