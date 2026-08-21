import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { buildBusinessIntelligenceDesktopModel } from "@/features/business-intelligence/presenters/build-business-intelligence-desktop-model"
import { buildBusinessIntelligenceMobileModel } from "@/features/business-intelligence/presenters/build-business-intelligence-mobile-model"
import { BusinessIntelligenceDesktop } from "@/features/business-intelligence/desktop/BusinessIntelligenceDesktop"
import { BusinessIntelligenceMobile } from "@/features/business-intelligence/mobile/BusinessIntelligenceMobile"
import { getBusinessIntelligenceCatalog } from "@/features/business-intelligence/data/get-business-intelligence-catalog"
import { getBusinessIntelligenceSegmentWorkspace } from "@/features/business-intelligence/data/get-business-intelligence-segment-workspace"
import { buildBusinessIntelligenceWorkspaceAdapter } from "@/features/business-intelligence/data/build-business-intelligence-workspace-adapter"
import { resolveBusinessIntelligenceRoute } from "@/features/business-intelligence/data/resolve-business-intelligence-route"
import { BusinessIntelligenceCatalogState } from "@/features/business-intelligence/catalog/BusinessIntelligenceCatalogState"
import { redirect } from "next/navigation"
import type { BiTabKey } from "@/features/business-intelligence/desktop/BusinessIntelligenceLocalNavigation"

type BusinessIntelligencePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const BI_TABS = new Set<BiTabKey>(["priorities", "windows", "sectors", "value_chain", "competitive_env"])

function resolveTab(value: string | null): BiTabKey {
  return value && BI_TABS.has(value as BiTabKey) ? value as BiTabKey : "priorities"
}

export default async function BusinessIntelligencePage({ searchParams }: BusinessIntelligencePageProps) {
  const route = await resolveBusinessIntelligenceRoute(await searchParams)
  if (route.kind === "legacyRedirect") redirect(route.href)

  if (route.kind === "catalog" || route.kind === "invalid") {
    const catalog = await getBusinessIntelligenceCatalog()
    return <BusinessIntelligenceCatalogState catalog={catalog} issue={route.kind === "invalid" ? route.reason : null} />
  }

  const [device, workspace] = await Promise.all([
    getDashboardDevice(),
    getBusinessIntelligenceSegmentWorkspace(route.segmentId),
  ])
  if (workspace.state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-body">
        <section className="max-w-md rounded-xl border border-border bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold text-heading">Workspace indisponible</h1>
          <p className="mt-2 text-sm text-muted">{workspace.error}</p>
        </section>
      </main>
    )
  }

  const { snapshot, sectorMapCatalog, competitiveMapWorkspace } = buildBusinessIntelligenceWorkspaceAdapter(workspace)
  const tab = resolveTab(route.tab)

  if (device === "mobile") {
    const viewModel = buildBusinessIntelligenceMobileModel(snapshot)
    return (
      <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
        <BusinessIntelligenceMobile
          viewModel={viewModel}
          snapshot={snapshot}
          sectorMapCatalog={sectorMapCatalog}
          competitiveMapWorkspace={competitiveMapWorkspace}
          initialSection={tab}
        />
      </div>
    )
  }

  const viewModel = buildBusinessIntelligenceDesktopModel(snapshot)

  return (
    <div data-theme="intelligence-reports" className="min-h-screen bg-canvas text-body">
      <BusinessIntelligenceDesktop
        viewModel={viewModel}
        snapshot={snapshot}
        sectorMapCatalog={sectorMapCatalog}
        competitiveMapWorkspace={competitiveMapWorkspace}
        initialTab={tab}
      />
    </div>
  )

}
