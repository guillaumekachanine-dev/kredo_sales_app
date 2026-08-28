import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import type { EngagementMissionListItem } from "@/app/(app)/missions/_data/get-current-engagement-missions"

// Rail « Liste » du shell Engagements — missions AT en cours.
// Langage visuel repris de la bibliothèque de documents de /reports
// (ReportsDesktopView : ligne border-b, actif bg-primary/[0.07] + filet brass).

interface CurrentMissionsListProps {
  missions: EngagementMissionListItem[]
  selectedMissionId: string | null
}

function missionHref(missionId: string) {
  return `/missions?vue=missions-at&mission=${encodeURIComponent(missionId)}`
}

export function CurrentMissionsList({ missions, selectedMissionId }: CurrentMissionsListProps) {
  return (
    <section
      className="flex min-h-0 flex-col border-r border-border bg-surface"
      aria-labelledby="engagements-missions-title"
    >
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="engagements-missions-title" className="text-xs font-bold text-heading">
            Missions AT en cours
          </h2>
          <span className="shrink-0 text-[10px] font-medium text-muted">
            {missions.length} mission{missions.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {missions.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-muted">
            Aucune mission d’assistance technique en cours.
          </p>
        ) : (
          missions.map((mission) => {
            const active = mission.id === selectedMissionId
            return (
              <Link
                key={mission.id}
                href={missionHref(mission.id)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative block w-full border-b border-border px-4 py-3 text-left outline-none transition-colors",
                  "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                  active
                    ? "bg-primary/[0.07] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-brass"
                    : "hover:bg-surface-hover/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <CompanyLogo
                    name={mission.clientName}
                    logoPath={mission.clientLogoPath}
                    website={mission.clientWebsite}
                    size="md"
                    denseList
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold leading-4 text-heading">
                      {mission.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] leading-4 text-muted">
                      {mission.clientName}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
