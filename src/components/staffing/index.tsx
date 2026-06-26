import React from "react"
import { getStaffingsList } from "@/app/(app)/staffing/_data/get-staffings-list"
import { getStaffingsPlanning } from "@/app/(app)/staffing/_data/get-staffings-planning"
import { StaffingDesktopView } from "./StaffingDesktopView"
import { StaffingMobileView } from "./StaffingMobileView"
import { EntityWorkspacePage } from "@/components/common/EntityWorkspacePage"
import { EntityWorkspaceHeader } from "@/components/common/EntityWorkspaceHeader"
import { EntityWorkspaceContent } from "@/components/common/EntityWorkspaceContent"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

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

// Server Component: sniffs device and loads dataset in parallel (ADR-0006)
export async function SyntheseStaffingSection() {
  const [staffings, planningData] = await Promise.all([
    getStaffingsList(),
    getStaffingsPlanning(),
  ])

  // Calculate KPIs
  const activeStatuses = ["identifie", "propose_interne", "preselectionne", "envoye_client", "entretien_planifie", "entretien_realise"]
  const activeStaffings = staffings.filter((s) => activeStatuses.includes(s.status))
  
  const totalActiveCount = activeStaffings.length
  
  const internalCount = activeStaffings.filter((s) => s.isCollaborator).length
  const internalPct = totalActiveCount > 0 ? Math.round((internalCount / totalActiveCount) * 100) : 0

  const marginSums = activeStaffings.filter((s) => s.marginPct !== null)
  const averageMargin = marginSums.length > 0 
    ? Math.round(marginSums.reduce((sum, s) => sum + (s.marginPct || 0), 0) / marginSums.length)
    : 0

  return (
    <EntityWorkspacePage>
      <EntityWorkspaceHeader
        title="Staffings actifs"
        kpis={
          <>
            <StatChip
              label="Staffings en cours"
              value={String(totalActiveCount)}
            />
            <StatChip
              label="Taux profils internes"
              value={`${internalPct} %`}
            />
            <StatChip
              label="Marge cible moyenne"
              value={averageMargin > 0 ? `${averageMargin} %` : "—"}
            />
          </>
        }
        actions={
          <Button variant="primary" size="sm" className="font-bold">
            + Nouveau staffing
          </Button>
        }
      />

      <EntityWorkspaceContent
        desktopView={
          <StaffingDesktopView staffings={staffings} planningData={planningData} />
        }
        mobileView={
          <StaffingMobileView rows={staffings} />
        }
      />
    </EntityWorkspacePage>
  )
}

export { StaffingDrawer } from "./StaffingDrawer"
export { StaffingTabbedShell } from "./StaffingTabbedShell"
