import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DashboardMainPanel as MainPanelType } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface DashboardMainPanelProps {
  mainPanel: MainPanelType
  className?: string
}

export function DashboardMainPanel({ mainPanel, className }: DashboardMainPanelProps) {
  const { title, description, type } = mainPanel

  // 1. Pipeline Funnel (Pure HTML/Tailwind CSS)
  const renderPipeline = () => {
    const stages = [
      { name: "Demande", count: 12, value: "148k €", percent: 100, color: "bg-muted" },
      { name: "Qualification", count: 8, value: "95k €", percent: 78, color: "bg-accent/70" },
      { name: "Envoi CV", count: 5, value: "75k €", percent: 55, color: "bg-primary/70" },
      { name: "Entretien (RT)", count: 2, value: "50k €", percent: 35, color: "bg-primary" },
      { name: "Signature", count: 1, value: "25k €", percent: 15, color: "bg-success" }
    ]

    return (
      <div className="space-y-4">
        {stages.map((stage, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-heading">{stage.name}</span>
              <span className="text-muted">
                {stage.count} {stage.count > 1 ? "opps" : "opp"} · <span className="text-heading font-semibold">{stage.value}</span>
              </span>
            </div>
            <div className="h-4 bg-canvas rounded-full overflow-hidden border border-border/40">
              <div
                className={cn("h-full rounded-full transition-all duration-500", stage.color)}
                style={{ width: `${stage.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 2. P&L Breakdown
  const renderPnL = () => {
    const items = [
      { label: "Chiffre d'Affaires Brut", value: "+ 1 240 000 €", type: "income", percent: 100 },
      { label: "Coûts Directs (Sous-traitance)", value: "- 680 000 €", type: "expense", percent: 55 },
      { label: "Coûts Fixes (Outils, bureaux)", value: "- 210 000 €", type: "expense", percent: 17 },
      { label: "Marge brute", value: "+ 350 000 €", type: "margin", percent: 28 },
      { label: "Impôts & Charges", value: "- 72 000 €", type: "expense", percent: 6 },
      { label: "Résultat Net (EBITDA)", value: "+ 278 000 €", type: "net", percent: 22 }
    ]

    return (
      <div className="space-y-3">
        {items.map((item, idx) => {
          const isExpense = item.type === "expense"
          const isNetOrMargin = item.type === "net" || item.type === "margin"

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between p-2.5 rounded text-xs border border-transparent",
                isNetOrMargin ? "bg-primary/5 border-primary/10 font-bold" : "bg-canvas/50"
              )}
            >
              <span className="text-heading font-medium">{item.label}</span>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-semibold",
                  isExpense ? "text-danger" : isNetOrMargin ? "text-primary" : "text-success"
                )}>
                  {item.value}
                </span>
                <span className="text-[10px] text-muted w-8 text-right">
                  {item.percent}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 3. Forecast / Projections Visualizer
  const renderForecast = () => {
    const months = [
      { name: "Jan", actual: 85, target: 90 },
      { name: "Fév", actual: 92, target: 90 },
      { name: "Mar", actual: 110, target: 95 },
      { name: "Avr", actual: 95, target: 100 },
      { name: "Mai", actual: 105, target: 100 },
      { name: "Juin", actual: 0, target: 110, isFuture: true }
    ]

    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-4 text-[10px] font-semibold text-muted uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-primary rounded-sm" />
            <span>Réalisé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-canvas border border-dashed border-muted rounded-sm" />
            <span>Cible</span>
          </div>
        </div>

        {/* Dynamic bar charts */}
        <div className="h-44 flex items-end justify-between gap-4 pt-2 border-b border-border px-2">
          {months.map((m, idx) => {
            const actualHeight = m.actual > 0 ? `${(m.actual / 120) * 100}%` : "0%"
            const targetHeight = `${(m.target / 120) * 100}%`

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                {/* Target line bar */}
                <div
                  className="absolute w-full border-t-2 border-dashed border-muted/50 z-0"
                  style={{ bottom: targetHeight }}
                />

                {/* Actual bar */}
                {m.actual > 0 && (
                  <div
                    className="w-full bg-primary/80 hover:bg-primary rounded-t-sm z-10 transition-all duration-300 relative group"
                    style={{ height: actualHeight }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-heading text-primary-fg text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.actual}k
                    </div>
                  </div>
                )}

                {/* Future indicator */}
                {m.isFuture && (
                  <div
                    className="w-full bg-canvas border border-dashed border-muted/30 rounded-t-sm z-10"
                    style={{ height: targetHeight }}
                  />
                )}

                <span className="text-[10px] text-muted mt-2 pt-1 uppercase">
                  {m.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 4. Vector DB & RAG metrics
  const renderRAG = () => {
    const vectors = { total: 342, embedded: 342, chunked: 1842, storage: "124 MB" }
    const topKeywords = [
      { name: "Supabase RLS Rules", count: 86, rating: 4.8 },
      { name: "NextJS Server Actions", count: 74, rating: 4.9 },
      { name: "n8n Webhook Auth", count: 42, rating: 4.5 },
      { name: "Consultant CV Templates", count: 38, rating: 4.2 }
    ]

    return (
      <div className="space-y-4">
        {/* RAG statistics summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-canvas/50 p-2 rounded border border-border/40">
            <span className="text-[10px] text-muted block uppercase">Chunks Vecteurs</span>
            <span className="text-base font-bold text-heading">{vectors.chunked}</span>
          </div>
          <div className="bg-canvas/50 p-2 rounded border border-border/40">
            <span className="text-[10px] text-muted block uppercase">Fichiers Sourcés</span>
            <span className="text-base font-bold text-heading">{vectors.total}</span>
          </div>
          <div className="bg-canvas/50 p-2 rounded border border-border/40">
            <span className="text-[10px] text-muted block uppercase">Stockage Vectoriel</span>
            <span className="text-base font-bold text-heading">{vectors.storage}</span>
          </div>
        </div>

        {/* Top searches list */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Requêtes les plus consultées (RAG Hit)
          </h4>
          <div className="divide-y divide-border/40 border border-border/60 rounded overflow-hidden">
            {topKeywords.map((keyword, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 text-xs bg-surface hover:bg-canvas/30">
                <span className="font-medium text-heading truncate">{keyword.name}</span>
                <div className="flex items-center gap-3 text-muted text-[10px]">
                  <span>{keyword.count} reqs</span>
                  <span className="text-success font-semibold">★ {keyword.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 5. Automations Executions Tracker
  const renderAutomation = () => {
    // 24 cells representing past hourly load
    const hourlyLogs = [
      "ok", "ok", "ok", "ok", "ok", "warning", "ok", "ok",
      "ok", "ok", "ok", "error", "ok", "ok", "ok", "ok",
      "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"
    ]

    return (
      <div className="space-y-4">
        {/* Execution grid */}
        <div>
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-2">
            Activité des 24 dernières heures (par heure)
          </span>
          <div className="grid grid-cols-12 gap-1.5 bg-canvas/40 p-3 rounded border border-border/60">
            {hourlyLogs.map((status, idx) => (
              <div
                key={idx}
                className={cn("h-6 rounded-sm relative group cursor-pointer transition-colors duration-150", {
                  "bg-success/80 hover:bg-success": status === "ok",
                  "bg-warning/80 hover:bg-warning": status === "warning",
                  "bg-danger/80 hover:bg-danger": status === "error"
                })}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-heading text-primary-fg text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                  Heure -{24 - idx}h : {status === "ok" ? "Succès" : status === "warning" ? "Avertissement" : "Échec"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflows statuses list */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Statut des Tâches n8n
          </h4>
          <div className="space-y-2">
            {[
              { name: "Sync opportunités CRM", run: "Toutes les 5 min", status: "ok", lastRun: "Il y a 3 min" },
              { name: "Rapprochement bancaire", run: "Tous les matins", status: "ok", lastRun: "Ce matin, 08h00" },
              { name: "Indexation documents PDF", run: "Déclenchement fichier", status: "warning", lastRun: "Hier, 17h45" }
            ].map((flow, idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 bg-canvas/30 rounded border border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", flow.status === "ok" ? "bg-success" : "bg-warning")} />
                  <span className="font-semibold text-heading">{flow.name}</span>
                </div>
                <div className="text-right text-[10px] text-muted">
                  <span>{flow.run}</span>
                  <span className="block text-[9px]">{flow.lastRun}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 6. Proposal conversion statuses
  const renderProposal = () => {
    const templates = [
      { name: "Modèle Audit Technique", conversions: "28 envoyées", rate: "75% acceptation" },
      { name: "Modèle Régie Standard", conversions: "45 envoyées", rate: "68% acceptation" },
      { name: "Modèle Forfait IA / RAG", conversions: "12 envoyées", rate: "50% acceptation" }
    ]

    return (
      <div className="space-y-4">
        {/* Simple conversion bar */}
        <div className="bg-canvas/50 p-4 rounded border border-border/40">
          <span className="text-[10px] text-muted block uppercase mb-1">Taux Global d&apos;Acceptation</span>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-heading">68%</span>
            <span className="text-xs text-success font-semibold">+4% vs Q1</span>
          </div>
          <div className="h-2 bg-canvas border border-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "68%" }} />
          </div>
        </div>

        {/* Templates usage */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Efficacité des Modèles
          </h4>
          <div className="space-y-2">
            {templates.map((template, idx) => (
              <div key={idx} className="p-2.5 bg-surface rounded border border-border/60 hover:border-primary/20 flex justify-between items-center text-xs">
                <div>
                  <span className="font-medium text-heading block">{template.name}</span>
                  <span className="text-[10px] text-muted">{template.conversions}</span>
                </div>
                <span className="text-primary font-bold text-[11px] bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  {template.rate}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Generic fallback panel
  const renderGeneric = () => {
    return (
      <div className="h-44 flex items-center justify-center border border-dashed border-border rounded-lg bg-canvas/30 text-xs text-muted">
        Composant d&apos;analyse métier en attente d&apos;intégration
      </div>
    )
  }

  const renderContent = () => {
    switch (type) {
      case "pipeline":
        return renderPipeline()
      case "pnl":
        return renderPnL()
      case "forecast":
        return renderForecast()
      case "rag":
        return renderRAG()
      case "automation":
        return renderAutomation()
      case "proposal":
        return renderProposal()
      default:
        return renderGeneric()
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-col mb-3 select-none">
        <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {title}
        </h3>
        <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
      </div>

      <div className="bg-surface border-0 rounded-xl p-5 shadow-sm flex-1">
        {renderContent()}
      </div>
    </div>
  )
}
