"use client"

import { DiagnosticSection } from "@/components/intelligence/diagnostic/DiagnosticSection"
import { CockpitAccountsToAnimate } from "@/components/cockpit/desktop/CockpitAccountsToAnimate"
import { CockpitHeaderActions } from "@/components/cockpit/desktop/CockpitHeaderActions"
import { CockpitHorizons } from "@/components/cockpit/desktop/CockpitHorizons"
import { CockpitKpiStrip } from "@/components/cockpit/desktop/CockpitKpiStrip"
import { CockpitTrajectory } from "@/components/cockpit/desktop/CockpitTrajectory"
import "./cockpit-desktop.css"

import type { CockpitDesktopSnapshot } from "@/lib/cockpit/cockpit-desktop-types"
import type { WorkspaceDiagnosticSnapshot } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

function diagnosticFreshnessLabel(diagnostic: WorkspaceDiagnosticSnapshot | null) {
  if (!diagnostic) return "Diagnostic IA en attente"

  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(diagnostic.diagnostic.generatedAt).getTime()) / 86_400_000),
  )

  return elapsedDays === 0 ? "Diagnostic IA généré aujourd’hui" : "Dernier diagnostic IA disponible"
}

function currentWeekLabel() {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setDate(now.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  })
  return `Centre de profit · Semaine du ${formatter.format(start)} au ${formatter.format(end)}`
}

export function CockpitDesktopDashboard({
  data,
  diagnostic,
}: {
  data: CockpitDesktopSnapshot
  diagnostic: WorkspaceDiagnosticSnapshot | null
}) {
  return (
    <section className="kredo-cockpit-desktop">
      <div className="kredo-cockpit-desktop__frame">
        <header className="kredo-cockpit-desktop__header">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[30px] font-semibold leading-none tracking-[-0.02em] text-heading">Cockpit</h1>
              <span className="kredo-cockpit-desktop__diagnostic-status">
                {diagnosticFreshnessLabel(diagnostic)}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted" suppressHydrationWarning>{currentWeekLabel()}</p>
          </div>
          <CockpitHeaderActions />
        </header>

        <CockpitKpiStrip kpis={data.kpis} />

        <div className="kredo-cockpit-desktop__primary-grid">
          <div className="kredo-cockpit-desktop__diagnostic">
            <DiagnosticSection initialSnapshot={diagnostic} />
          </div>
          <CockpitAccountsToAnimate accounts={data.accountsToAnimate} />
        </div>

        <div className="kredo-cockpit-desktop__secondary-grid">
          <CockpitTrajectory trajectory={data.trajectory} />
          <CockpitHorizons horizons={data.horizons} />
        </div>
      </div>
    </section>
  )
}
