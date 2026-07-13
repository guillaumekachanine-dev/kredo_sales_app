import type { DetectRisksResult as DetectRisksResultData } from "@/lib/intelligence/actions/detect-risks"

function severityLabel(severity: DetectRisksResultData["risks"][number]["severity"]) {
  if (severity === "critical") return "Critique"
  if (severity === "warning") return "Alerte"
  return "Info"
}

export function DetectRisksResult({ result }: { result: DetectRisksResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Critiques" value={result.summary.criticalCount} />
        <Metric label="Alertes" value={result.summary.warningCount} />
        <Metric label="Missions saines" value={`${result.summary.healthyMissionsPct}%`} />
      </div>

      {result.risks.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucun risque opérationnel détecté avec les règles Lot 1.
        </p>
      ) : (
        <div className="space-y-2.5">
          {result.risks.map((risk) => (
            <a key={risk.id} href={risk.link} className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 transition-colors hover:bg-primary-fg/[0.07]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                  {severityLabel(risk.severity)}
                </span>
                <span className="text-[10px] text-primary-fg/45">{risk.category}</span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{risk.title}</p>
              <p className="mt-1 text-xs leading-snug text-primary-fg/60">{risk.detail}</p>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-brand-brass">{risk.suggestedAction}</p>
            </a>
          ))}
        </div>
      )}

      {result.sourceIssues.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
          Données partielles : {result.sourceIssues.join(" ")}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}
