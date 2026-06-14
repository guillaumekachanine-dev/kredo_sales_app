import { SectionTab } from "@/lib/tabs/tab-types"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { OpportunityDetailPanel } from "./opportunity-detail/OpportunityDetailPanel"
import { MissionDetailPanel } from "./mission-detail/MissionDetailPanel"

interface MissionsEntityPanelProps {
  tab: SectionTab
  isMobile?: boolean
}

const entityLabels: Record<SectionTab["entityType"], string> = {
  mission: "Mission",
  opportunite: "Opportunité",
  "planning-item": "Planning",
}

const entityAccents: Record<SectionTab["entityType"], "primary" | "success" | "warning"> = {
  mission: "primary",
  opportunite: "success",
  "planning-item": "warning",
}

function SkeletonRow({ width }: { width: string }) {
  return <div className={cn("h-3 bg-border/40 rounded animate-pulse", width)} />
}

export function MissionsEntityPanel({ tab, isMobile = false }: MissionsEntityPanelProps) {
  if (tab.entityType === "opportunite") {
    return <OpportunityDetailPanel tab={tab} />
  }
  if (tab.entityType === "mission") {
    return <MissionDetailPanel tab={tab} isMobile={isMobile} />
  }

  const label = entityLabels[tab.entityType]

  const accent = entityAccents[tab.entityType]

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header de la fiche */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-border px-2 py-0.5 rounded bg-surface">
              {label}
            </span>
            {tab.subtitle && (
              <span className="text-xs text-muted">{tab.subtitle}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
            {tab.title}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-20 bg-border/30 rounded animate-pulse" />
          <div className="h-8 w-24 bg-primary/10 rounded animate-pulse" />
        </div>
      </div>

      {/* Contenu skeleton — en attente de la vraie intégration */}
      <div className="grid grid-cols-12 gap-5">
        {/* Colonne principale */}
        <div className="col-span-8 flex flex-col gap-5">
          <SurfaceCard accent={accent} className="p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <SkeletonRow width="w-32" />
                <SkeletonRow width="w-16" />
              </div>
              <div className="flex flex-col gap-2.5">
                <SkeletonRow width="w-full" />
                <SkeletonRow width="w-5/6" />
                <SkeletonRow width="w-4/6" />
              </div>
              <div className="h-24 bg-border/20 rounded animate-pulse mt-2" />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="flex flex-col gap-4">
              <SkeletonRow width="w-28" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 bg-canvas rounded border border-border/60">
                    <SkeletonRow width="w-16" />
                    <div className="h-6 bg-border/30 rounded w-20 animate-pulse" />
                    <SkeletonRow width="w-12" />
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Colonne latérale */}
        <div className="col-span-4 flex flex-col gap-5">
          <SurfaceCard className="p-5">
            <div className="flex flex-col gap-3">
              <SkeletonRow width="w-24" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <SkeletonRow width="w-20" />
                  <SkeletonRow width="w-16" />
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="flex flex-col gap-3">
              <SkeletonRow width="w-28" />
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-canvas rounded border border-border/60">
                  <div className="w-7 h-7 rounded-full bg-border/40 animate-pulse shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <SkeletonRow width="w-24" />
                    <SkeletonRow width="w-16" />
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>

      {/* Note bas de page */}
      <p className="text-[11px] text-muted text-center border border-dashed border-border rounded-lg py-3 bg-canvas/40">
        Contenu de la fiche en cours d&apos;intégration — structure validée.
      </p>
    </div>
  )
}
