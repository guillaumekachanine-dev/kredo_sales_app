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

interface ClientMissionGroup {
  clientName: string
  clientLogoPath: string | null
  clientWebsite: string | null
  missions: EngagementMissionListItem[]
}

export function groupMissionsByClient(missions: EngagementMissionListItem[]): ClientMissionGroup[] {
  const groups: ClientMissionGroup[] = []
  const map = new Map<string, ClientMissionGroup>()

  for (const mission of missions) {
    const key = (mission.clientName || "Compte non renseigné").trim()
    let group = map.get(key)
    if (!group) {
      group = {
        clientName: mission.clientName || "Compte non renseigné",
        clientLogoPath: mission.clientLogoPath,
        clientWebsite: mission.clientWebsite,
        missions: [],
      }
      map.set(key, group)
      groups.push(group)
    }
    group.missions.push(mission)
  }

  return groups
}

export function CurrentMissionsList({ missions, selectedMissionId }: CurrentMissionsListProps) {
  const clientGroups = groupMissionsByClient(missions)

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
          clientGroups.map((group) => (
            <div key={group.clientName} className="border-b border-border last:border-b-0">
              <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border/70 bg-canvas px-4 py-2.5">
                <CompanyLogo
                  name={group.clientName}
                  logoPath={group.clientLogoPath}
                  website={group.clientWebsite}
                  size="sm"
                  denseList
                />
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-heading">
                  {group.clientName}
                </span>
                <span className="shrink-0 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  {group.missions.length}
                </span>
              </div>

              <div>
                {group.missions.map((mission) => {
                  const active = mission.id === selectedMissionId
                  return (
                    <Link
                      key={mission.id}
                      href={missionHref(mission.id)}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative block w-full border-b border-border/40 last:border-b-0 px-4 py-2.5 text-left outline-none transition-colors",
                        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                        active
                          ? "bg-primary/[0.07] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-brass font-bold"
                          : "hover:bg-surface-hover/60",
                      )}
                    >
                      <span
                        className={cn(
                          "block truncate text-[11px] leading-4",
                          active ? "font-bold text-heading" : "font-medium text-heading",
                        )}
                      >
                        {mission.title}
                      </span>
                      {mission.roleTitle || mission.practice ? (
                        <span className="mt-0.5 block truncate text-[10px] leading-3 text-muted">
                          {mission.roleTitle || mission.practice}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
