import { DashboardAction, SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"
import { DashboardHeader } from "./layout/DashboardHeader"
import { DashboardKpiGrid } from "./layout/DashboardKpiGrid"
import { DashboardMainPanel } from "./layout/DashboardMainPanel"
import { DashboardPriorityPanel } from "./layout/DashboardPriorityPanel"
import { DashboardTablePanel } from "./layout/DashboardTablePanel"
import { DashboardAiPanel } from "./layout/DashboardAiPanel"
import { DashboardActivityFeed } from "./layout/DashboardActivityFeed"
import { DashboardQuickActions } from "./layout/DashboardQuickActions"
import Link from "next/link"

interface SectionDesktopDashboardProps {
  config: SectionDashboardConfig
  data: SectionDashboardData
}

// Helper to retrieve exactly 4 short, context-appropriate actions for the current dashboard section
function getQuickActionsForSection(sectionKey: string, existingActions?: DashboardAction[]) {
  const fallbackMap: Record<string, string[]> = {
    missions: ["Importer", "Exporter", "Nouveau", "Rapport"],
    finance: ["Facturer", "Note Frais", "TVA", "Exporter"],
    proposals: ["Créer", "Modèles", "Relancer", "Valider"],
    prospection: ["Scan Leads", "LinkedIn", "Campagne", "Stats"],
    knowledge: ["Indexer", "RAG Sync", "Nouveau", "Rechercher"],
    automations: ["Sync n8n", "Webhook", "Logs", "Activer"],
    staffing: ["Staffer", "Intercontrat", "Dispo", "Affecter"],
    consultants: ["Ajouter", "Skills", "CV Edit", "Evaluer"],
    recruitment: ["Importer CV", "Entretien", "Offre", "Sourcing"],
    settings: ["MFA Sync", "RLS Rule", "Backup", "Logs"],
  }

  const defaultActions = ["Action 1", "Action 2", "Action 3", "Action 4"];
  const labels = fallbackMap[sectionKey] || defaultActions;

  return Array.from({ length: 4 }, (_, i) => {
    if (existingActions && existingActions[i]) {
      const label = existingActions[i].label;
      const shortLabel = label.length > 12 ? label.split(" ")[0] : label;
      return {
        id: existingActions[i].id,
        label: shortLabel,
        href: existingActions[i].href
      };
    }
    return {
      id: `fallback-qa-${i}`,
      label: labels[i],
      href: "#"
    };
  });
}

export function SectionDesktopDashboard({ config, data }: SectionDesktopDashboardProps) {
  const { title, description, primaryAction, secondaryActions, mainPanel } = config
  const { metrics, alerts, priorities, mainInsight, table, activityFeed, quickActions, syncStatus } = data

  // Combine primaryAction, secondaryActions and page quickActions in order
  const rawActions = [
    ...(primaryAction ? [primaryAction] : []),
    ...(secondaryActions || []),
    ...(quickActions || [])
  ]

  // Pad to exactly 4 quick actions using context fallbacks
  const fallbackActions = getQuickActionsForSection(config.sectionKey)
  const finalHeaderActions = [...rawActions]
  while (finalHeaderActions.length < 4) {
    finalHeaderActions.push(fallbackActions[finalHeaderActions.length] || { id: `fb-${finalHeaderActions.length}`, label: "Action", href: "#" })
  }
  const desktopHeaderActions = finalHeaderActions.slice(0, 4)

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6 bg-canvas">
      {/* Row 1: Header */}
      <DashboardHeader
        title={title}
        description={description}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        syncStatus={syncStatus}
        device="desktop"
        quickActions={desktopHeaderActions}
      />

      {/* Row 2: KPI Strip (Full Width) */}
      <div className="flex flex-col">
        <div className="flex flex-col mb-3 select-none">
          <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Indicateurs Clés
          </h3>
          <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
        </div>
        <DashboardKpiGrid metrics={metrics} device="desktop" />
      </div>

      {/* Row 3: Main Analysis + Priorities */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          <DashboardMainPanel mainPanel={mainPanel} />
        </div>
        <div className="col-span-4">
          <DashboardPriorityPanel priorities={priorities} alerts={alerts} />
        </div>
      </div>

      {/* Row 4: Data Table + AI Insight */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          {table ? (
            <DashboardTablePanel table={table} />
          ) : (
            <div className="h-full bg-surface border-0 rounded-xl p-5 shadow-sm flex items-center justify-center text-xs text-muted">
              Aucun tableau de données disponible
            </div>
          )}
        </div>
        <div className="col-span-4">
          <DashboardAiPanel insight={mainInsight} />
        </div>
      </div>

      {/* Row 5: Activity Feed */}
      {activityFeed && activityFeed.length > 0 && (
        <div className="grid grid-cols-12 gap-5 items-stretch">
          <div className="col-span-8">
            <DashboardActivityFeed activities={activityFeed} />
          </div>
          <div className="col-span-4" />
        </div>
      )}
    </div>
  )
}
