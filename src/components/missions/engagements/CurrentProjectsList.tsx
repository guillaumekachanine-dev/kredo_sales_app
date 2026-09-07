import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import type { DBProjectResult } from "@/app/(app)/missions/_data/get-projects-list"

// ─────────────────────────────────────────────────────────────────────────────
//  Rail gauche « Liste des projets » du shell Engagements.
//  Langage visuel identique à CurrentMissionsList (regroupement par client,
//  liseré d'état actif, typographie compacte).
// ─────────────────────────────────────────────────────────────────────────────

interface CurrentProjectsListProps {
  projects: DBProjectResult[]
  selectedProjectId: string | null
}

function projectHref(projectId: string) {
  return `/missions?vue=projets&projet=${encodeURIComponent(projectId)}`
}

export interface ClientProjectGroup {
  clientName: string
  clientLogoPath: string | null
  clientWebsite: string | null
  projects: DBProjectResult[]
}

export function groupProjectsByClient(projects: DBProjectResult[]): ClientProjectGroup[] {
  const groups: ClientProjectGroup[] = []
  const map = new Map<string, ClientProjectGroup>()

  for (const project of projects) {
    const company = Array.isArray(project.companies) ? project.companies[0] : project.companies
    const isAnonymized = project.ref_visibility === "anonymized"
    const clientName = isAnonymized
      ? (project.ref_anonymized_label ?? "Client Anonymisé")
      : (company?.name || "Compte non renseigné")

    const metadata = company?.metadata as Record<string, unknown> | null | undefined
    const logoPath = isAnonymized ? null : (typeof metadata?.logo_path === "string" ? metadata.logo_path : null)
    const website = isAnonymized ? null : (company?.website ?? null)

    const key = clientName.trim()
    let group = map.get(key)
    if (!group) {
      group = {
        clientName,
        clientLogoPath: logoPath,
        clientWebsite: website,
        projects: [],
      }
      map.set(key, group)
      groups.push(group)
    }
    group.projects.push(project)
  }

  return groups
}

export function CurrentProjectsList({ projects, selectedProjectId }: CurrentProjectsListProps) {
  const clientGroups = groupProjectsByClient(projects)

  return (
    <section
      className="flex min-h-0 flex-col border-r border-border bg-surface"
      aria-labelledby="engagements-projects-title"
    >
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="engagements-projects-title" className="text-xs font-bold text-heading">
            Projets en cours
          </h2>
          <span className="shrink-0 text-[10px] font-medium text-muted">
            {projects.length} projet{projects.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {projects.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-muted">
            Aucun projet en cours.
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
                  {group.projects.length}
                </span>
              </div>

              <div>
                {group.projects.map((project) => {
                  const active = project.id === selectedProjectId
                  return (
                    <Link
                      key={project.id}
                      href={projectHref(project.id)}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative block w-full border-b border-border/40 px-4 py-2.5 text-left outline-none transition-colors last:border-b-0",
                        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                        active
                          ? "bg-primary/[0.07] font-bold before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-brass"
                          : "hover:bg-surface-hover/60",
                      )}
                    >
                      <span
                        className={cn(
                          "block truncate text-[11px] leading-4",
                          active ? "font-bold text-heading" : "font-medium text-heading",
                        )}
                      >
                        {project.title}
                      </span>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
                        {project.code && (
                          <span className="font-semibold text-muted">{project.code}</span>
                        )}
                        {project.code && <span>·</span>}
                        <span>{project.progress_pct}% avancement</span>
                      </div>
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
