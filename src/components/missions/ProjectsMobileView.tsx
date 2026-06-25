"use client"

import { DBProjectResult } from "@/app/(app)/missions/_data/get-projects-list"
import { MobileActionCard } from "@/components/ui/mobile/MobileActionCard"
import { StatusPill, type StatusPillVariant } from "@/components/ui/StatusPill"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { formatEuro, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface ProjectsMobileViewProps {
  projects: DBProjectResult[]
}

const PROJECT_STATUS: Record<string, StatusPillVariant> = {
  draft: "draft",
  active: "inProgress",
  delivered: "success",
  closed: "neutral",
  cancelled: "danger",
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Actif",
  delivered: "Livré",
  closed: "Clôturé",
  cancelled: "Annulé",
}

export function ProjectsMobileView({ projects }: ProjectsMobileViewProps) {
  const { openTab } = useMissionsTabStore()

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted">
        Aucun projet forfait.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {projects.map((row) => {
        const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
        const isAnonymized = row.ref_visibility === "anonymized"
        const clientName = isAnonymized ? (row.ref_anonymized_label ?? "Client Anonymisé") : (company?.name ?? "—")

        const statusVariant = PROJECT_STATUS[row.status] ?? "neutral"
        const statusLabel = PROJECT_STATUS_LABELS[row.status] ?? row.status

        const actual = row.actual_margin_pct
        const target = row.target_margin_pct
        let colorClass = "text-muted"
        if (actual !== null && target !== null) {
          colorClass = actual >= target ? "text-success font-semibold" : "text-danger font-semibold"
        } else if (actual !== null) {
          colorClass = "text-heading"
        }

        const metadata = (
          <div className="flex flex-col gap-2.5 w-full mt-1.5">
            <div className="flex justify-between items-center text-xs text-body">
              <div>
                CA : <span className="font-bold text-heading">{formatEuro(row.contract_amount)}</span>
              </div>
              <div>
                Marge réelle : <span className={colorClass}>{formatPct(actual)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted">Avancement :</span>
              <div className="h-1.5 flex-1 bg-border/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width] duration-300"
                  style={{ width: `${row.progress_pct}%` }}
                />
              </div>
              <span className="text-[10px] text-heading font-medium w-8 text-right">
                {row.progress_pct}%
              </span>
            </div>
          </div>
        )

        const handleView = () => {
          openTab({
            entityType: "project",
            entityId: row.id,
            title: row.title,
            subtitle: row.code ?? "",
          })
        }

        return (
          <MobileActionCard
            key={row.id}
            title={row.title}
            description={clientName}
            status={<StatusPill label={statusLabel} variant={statusVariant} dot={true} />}
            metadata={metadata}
            primaryAction={
              <button
                type="button"
                onClick={handleView}
                className="w-full text-center py-2 bg-primary text-primary-fg text-xs font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Voir
              </button>
            }
          />
        )
      })}
    </div>
  )
}
