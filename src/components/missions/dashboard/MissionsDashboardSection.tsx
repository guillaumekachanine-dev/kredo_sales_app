import { getEngagementsOverview } from "@/app/(app)/missions/_data/get-engagements-overview"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { EngagementsOverviewDesktop } from "./EngagementsOverviewDesktop"
import { EngagementsOverviewMobile } from "./EngagementsOverviewMobile"

async function loadDashboard() {
  return Promise.all([
    getDashboardDevice(),
    getEngagementsOverview(),
  ])
}

export async function MissionsDashboardSection() {
  let result: Awaited<ReturnType<typeof loadDashboard>> | null = null
  try {
    result = await loadDashboard()
  } catch (error) {
    console.error("[MissionsDashboardSection]", error)
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center p-6">
        <div className="max-w-md rounded-[var(--radius-medium)] border border-danger/25 bg-surface p-5 text-center">
          <h1 className="font-heading text-base font-bold text-heading">Synthèse indisponible</h1>
          <p className="mt-2 text-sm text-body">Les engagements actifs n’ont pas pu être lus. Réessayez dans quelques instants.</p>
        </div>
      </div>
    )
  }

  const [device, overview] = result
  return device === "mobile"
    ? <EngagementsOverviewMobile overview={overview} />
    : <EngagementsOverviewDesktop overview={overview} />
}
