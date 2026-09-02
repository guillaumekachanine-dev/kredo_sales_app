import type { AutomationFixesResult as AutomationFixesResultData } from "@/lib/intelligence/actions/automation-intelligence"
import { AutomationMetric, AutomationSourceIssues, SEVERITY_LABELS, formatEur } from "./automation-result-shared"

export function AutomationFixesResult({ result }: { result: AutomationFixesResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <AutomationMetric label="À corriger" value={result.items.length} />
        <AutomationMetric label="Critiques" value={result.summary.criticalCount} />
        <AutomationMetric label="Workflows sains" value={result.summary.healthyWorkflows} />
      </div>

      {result.summary.totalEstimatedWasteEur !== null && result.summary.totalEstimatedWasteEur > 0 && (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-[11px] leading-snug text-primary-fg/65">
          Coût <span className="font-semibold text-primary-fg">estimé</span> des runs en échec sur 30 jours :{" "}
          {formatEur(result.summary.totalEstimatedWasteEur)}. Dérivé du coût moyen par run, pas d&apos;un montant constaté.
        </p>
      )}

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucune correction à prioriser : aucun workflow en échec ni bloqué.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {result.items.map((item, index) => (
            <li key={item.runType} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                  {index + 1} · {SEVERITY_LABELS[item.severity]}
                </span>
                <span className="text-[10px] text-primary-fg/45">score {item.score}</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{item.label}</p>

              <ul className="mt-2 space-y-1">
                {item.drivers.map((driver) => (
                  <li key={driver.label} className="flex items-baseline justify-between gap-3 text-xs leading-snug text-primary-fg/60">
                    <span>{driver.label}</span>
                    <span className="shrink-0 text-[10px] text-primary-fg/40">+{driver.weight}</span>
                  </li>
                ))}
              </ul>

              {item.estimatedWastedCostEur !== null && item.estimatedWastedCostEur > 0 && (
                <p className="mt-2 text-[11px] font-semibold leading-snug text-brand-brass">
                  {formatEur(item.estimatedWastedCostEur)} estimés perdus sur 30 j
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <AutomationSourceIssues issues={result.sourceIssues} />
    </div>
  )
}
