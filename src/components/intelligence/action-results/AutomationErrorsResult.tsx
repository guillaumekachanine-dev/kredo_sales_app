import type { AutomationErrorsResult as AutomationErrorsResultData } from "@/lib/intelligence/actions/automation-intelligence"
import { AutomationMetric, AutomationSourceIssues, SEVERITY_LABELS } from "./automation-result-shared"

export function AutomationErrorsResult({ result }: { result: AutomationErrorsResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <AutomationMetric label="Échecs 30 j" value={result.summary.failedRuns30d} />
        <AutomationMetric label="Workflows touchés" value={result.summary.affectedWorkflows} />
        <AutomationMetric label="Bloqués" value={result.summary.stuckNow} />
      </div>

      {result.summary.reapedRuns30d > 0 && (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-[11px] leading-snug text-primary-fg/65">
          {result.summary.reapedRuns30d} run(s) repris automatiquement par le reaper sur 30 jours. Ce ne sont pas
          des erreurs de workflow mais des exécutions bloquées que la base a refermées — comptées à part.
        </p>
      )}

      {result.failingWorkflows.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucun échec ni run bloqué sur les 30 derniers jours.
        </p>
      ) : (
        <section className="space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">Workflows en échec</h4>
          {result.failingWorkflows.map((workflow) => (
            <div key={workflow.runType} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                  {SEVERITY_LABELS[workflow.severity]}
                </span>
                {workflow.stuckNow > 0 && (
                  <span className="text-[10px] text-primary-fg/45">{workflow.stuckNow} bloqué(s)</span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{workflow.label}</p>
              <p className="mt-1 text-xs leading-snug text-primary-fg/60">
                {workflow.failed30d} échec(s) sur {workflow.runs30d} run(s) · {workflow.failureRatePct} %
              </p>
            </div>
          ))}
        </section>
      )}

      {result.clusters.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">
            Pannes regroupées
          </h4>
          {result.clusters.map((cluster) => (
            <div key={cluster.signature} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <p className="text-sm font-semibold leading-snug text-primary-fg">
                {cluster.count} occurrence{cluster.count > 1 ? "s" : ""}
              </p>
              <p className="mt-1 break-words text-xs leading-snug text-primary-fg/60">{cluster.sampleMessage}</p>
              <p className="mt-2 text-[11px] leading-snug text-brand-brass">
                {cluster.workflowLabels.join(" · ")}
              </p>
            </div>
          ))}
        </section>
      )}

      <AutomationSourceIssues issues={result.sourceIssues} />
    </div>
  )
}
