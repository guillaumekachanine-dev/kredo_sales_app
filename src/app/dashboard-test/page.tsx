import Link from "next/link"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"

// Configs
import { salesDashboardConfig } from "@/lib/dashboard/configs/sales-dashboard.config"
import { financeDashboardConfig } from "@/lib/dashboard/configs/finance-dashboard.config"
import { proposalDashboardConfig } from "@/lib/dashboard/configs/proposal-dashboard.config"
import { prospectionDashboardConfig } from "@/lib/dashboard/configs/prospection-dashboard.config"
import { knowledgeDashboardConfig } from "@/lib/dashboard/configs/knowledge-dashboard.config"
import { automationsDashboardConfig } from "@/lib/dashboard/configs/automations-dashboard.config"

// Mocks
import {
  mockSalesDashboardData,
  mockFinanceDashboardData,
  mockProposalDashboardData,
  mockProspectionDashboardData,
  mockKnowledgeDashboardData,
  mockAutomationsDashboardData
} from "@/lib/dashboard/mock-dashboard-data"

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardTestPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const activeSection = (resolvedParams.section as string) || "sales"
  const forcedDevice = resolvedParams.device as "desktop" | "mobile" | undefined
  const detectedDevice = await getDashboardDevice()
  const activeDevice = forcedDevice || detectedDevice

  // Selection mapping
  const sections = [
    { key: "sales", config: salesDashboardConfig, data: mockSalesDashboardData, name: "Sales" },
    { key: "finance", config: financeDashboardConfig, data: mockFinanceDashboardData, name: "Finance" },
    { key: "proposal", config: proposalDashboardConfig, data: mockProposalDashboardData, name: "Proposal Intel" },
    { key: "prospection", config: prospectionDashboardConfig, data: mockProspectionDashboardData, name: "Prospection Intel" },
    { key: "knowledge", config: knowledgeDashboardConfig, data: mockKnowledgeDashboardData, name: "Knowledge Hub" },
    { key: "automations", config: automationsDashboardConfig, data: mockAutomationsDashboardData, name: "Automations" }
  ]

  const currentSection = sections.find((s) => s.key === activeSection) || sections[0]

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Test toolbar */}
      <div className="bg-heading text-primary-fg border-b border-primary/20 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-white text-sm">KREDO Dashboard Tester</span>
          <span className="text-[10px] bg-primary px-1.5 py-0.5 rounded font-mono text-white">Next.js 15 App Router</span>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded border border-white/10">
          {sections.map((s) => (
            <Link
              key={s.key}
              href={`/dashboard-test?section=${s.key}${forcedDevice ? `&device=${forcedDevice}` : ""}`}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeSection === s.key ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded border border-white/10 text-xs">
          <Link
            href={`/dashboard-test?section=${activeSection}`}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              !forcedDevice ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Auto ({detectedDevice === "mobile" ? "Mobile" : "Desktop"})
          </Link>
          <Link
            href={`/dashboard-test?section=${activeSection}&device=desktop`}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              forcedDevice === "desktop" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Desktop Force
          </Link>
          <Link
            href={`/dashboard-test?section=${activeSection}&device=mobile`}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              forcedDevice === "mobile" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Mobile Force
          </Link>
        </div>
      </div>

      {/* Main Dashboard Template Container */}
      <main className="flex-1 flex flex-col justify-center">
        {forcedDevice === "mobile" ? (
          <div className="max-w-[420px] w-full mx-auto my-8 border border-border shadow-lg rounded-2xl overflow-hidden bg-canvas">
            <div className="h-6 bg-border/40 flex items-center justify-between px-4 border-b border-border text-[10px] font-mono text-muted">
              <span>● iPhone Simulator</span>
              <span>100% responsive</span>
            </div>
            <SectionDashboardTemplate
              device="mobile"
              config={currentSection.config}
              data={currentSection.data}
            />
          </div>
        ) : forcedDevice === "desktop" ? (
          <SectionDashboardTemplate
            device="desktop"
            config={currentSection.config}
            data={currentSection.data}
          />
        ) : (
          <SectionDashboardTemplate
            device={activeDevice}
            config={currentSection.config}
            data={currentSection.data}
          />
        )}
      </main>
    </div>
  )
}
