import type { AutomationCostsResult as AutomationCostsResultData } from "@/lib/intelligence/actions/automation-intelligence"
import { AutomationMetric, AutomationSourceIssues, formatEur } from "./automation-result-shared"

export function AutomationCostsResult({ result }: { result: AutomationCostsResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <AutomationMetric label="Coût connu 30 j" value={formatEur(result.summary.knownCost30d)} />
        <AutomationMetric
          label="Poste principal"
          value={result.summary.costliestSharePct !== null ? `${result.summary.costliestSharePct} %` : "—"}
        />
        <AutomationMetric label="Coûts incomplets" value={result.summary.workflowsWithGaps} />
      </div>

      {result.summary.costliestLabel && (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-[11px] leading-snug text-primary-fg/65">
          Poste le plus lourd : <span className="font-semibold text-primary-fg">{result.summary.costliestLabel}</span>.
        </p>
      )}

      {result.workflows.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucune exécution facturable sur les 30 derniers jours.
        </p>
      ) : (
        <div className="space-y-2.5">
          {result.workflows.map((workflow) => (
            <div key={workflow.runType} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <p className="text-sm font-semibold leading-snug text-primary-fg">{workflow.label}</p>
              <p className="mt-1 text-xs leading-snug text-primary-fg/60">
                {workflow.totalCost30d !== null ? formatEur(workflow.totalCost30d) : "Coût inconnu"}
                {" · "}
                {workflow.runs30d} run(s)
                {workflow.avgCost30d !== null ? ` · ${formatEur(workflow.avgCost30d)} / run` : ""}
              </p>
              {workflow.avgCostDriftPct !== null && Math.abs(workflow.avgCostDriftPct) >= 5 && (
                <p className="mt-2 text-[11px] font-semibold leading-snug text-brand-brass">
                  {workflow.avgCostDriftPct > 0 ? "+" : ""}{workflow.avgCostDriftPct} % par run face à la moyenne historique
                </p>
              )}
              {workflow.costCoverage !== "complete" && (
                <p className="mt-2 text-[11px] leading-snug text-primary-fg/45">
                  {workflow.costCoverage === "pricing_missing"
                    ? "Tarif du modèle manquant — le coût réel est supérieur."
                    : "Tokens non remontés — le coût réel est supérieur."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {result.gaps.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
          Le coût total est un plancher, pas un montant complet : {result.gaps.map((gap) => `${gap.label} (${gap.reason.toLowerCase()})`).join(" · ")}.
        </div>
      )}

      <AutomationSourceIssues issues={result.sourceIssues} />
    </div>
  )
}
