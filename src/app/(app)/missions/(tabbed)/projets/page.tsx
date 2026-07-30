import { getProjectsList } from "@/app/(app)/missions/_data/get-projects-list"
import { HeaderKpiCard } from "@/components/missions/HeaderKpiCard"
import { ProjectsDesktopView } from "@/components/missions/ProjectsDesktopView"
import { ProjectsMobileView } from "@/components/missions/ProjectsMobileView"
import { formatEuro, formatPct } from "@/lib/formatters"

export default async function ProjetsPage() {
  const projects = await getProjectsList()

  // KPI 1: CA total (sum of contract_amount)
  const totalCa = projects.reduce((sum, p) => sum + (p.contract_amount ?? 0), 0)

  // KPI 2: Marge moyenne (average of actual_margin_pct, fallback to target_margin_pct if actual is null)
  const marginProjects = projects.filter(
    (p) => p.actual_margin_pct !== null || p.target_margin_pct !== null
  )
  const avgMargin =
    marginProjects.length > 0
      ? marginProjects.reduce(
          (sum, p) => sum + (p.actual_margin_pct ?? p.target_margin_pct ?? 0),
          0
        ) / marginProjects.length
      : 0

  // KPI 3: Projets actifs (status === "active")
  const activeProjectsCount = projects.filter((p) => p.status === "active").length

  // KPI 4: Taux avancement moyen (average of progress_pct)
  const avgProgress =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + (p.progress_pct ?? 0), 0) / projects.length
      : 0

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header and KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border w-full">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-heading shrink-0">
          Projets
        </h1>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center justify-around divide-x divide-border/60 w-full max-w-3xl">
            <HeaderKpiCard label="CA total" value={formatEuro(totalCa)} className="flex-1" />
            <HeaderKpiCard label="Marge moyenne" value={formatPct(avgMargin)} className="flex-1" />
            <HeaderKpiCard label="Projets actifs" value={activeProjectsCount} className="flex-1" />
            <HeaderKpiCard label="Avancement moyen" value={formatPct(avgProgress)} className="flex-1" />
          </div>
        </div>
      </div>

      {/* Responsive Views */}
      <div className="hidden md:block">
        <ProjectsDesktopView projects={projects} />
      </div>
      <div className="md:hidden">
        <ProjectsMobileView projects={projects} />
      </div>
    </div>
  )
}
