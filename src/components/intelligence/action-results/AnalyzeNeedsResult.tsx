import type { AnalyzeNeedsResult as AnalyzeNeedsResultData } from "@/lib/intelligence/actions/analyze-needs"

function recommendationLabel(recommendation: AnalyzeNeedsResultData["gaps"][number]["recommendation"]) {
  if (recommendation === "recruit") return "Recruter"
  if (recommendation === "train") return "Former"
  if (recommendation === "subcontract") return "Sous-traiter"
  return "Couvert"
}

function ratioLabel(value: number) {
  if (value >= 99) return "∞"
  return `${value.toFixed(1)}x`
}

export function AnalyzeNeedsResult({ result }: { result: AnalyzeNeedsResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Critiques" value={result.summary.criticalGaps} />
        <Metric label="Modérés" value={result.summary.moderateGaps} />
        <Metric label="Couverts" value={result.summary.coveredSkills} />
      </div>

      {result.gaps.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucun besoin compétence détecté dans le pipe ouvert.
        </p>
      ) : (
        <div className="space-y-2.5">
          {result.gaps.map((gap) => (
            <article key={gap.skillId} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                      {recommendationLabel(gap.recommendation)}
                    </span>
                    <span className="text-[10px] text-primary-fg/45">{gap.category}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{gap.skillName}</p>
                </div>
                <p className="shrink-0 text-lg font-bold leading-none text-primary-fg">{ratioLabel(gap.gapRatio)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-primary-fg/55">
                <p>Demande {gap.demandScore.toFixed(2)}</p>
                <p>Offre {gap.supplyScore.toFixed(2)}</p>
              </div>
              <p className="mt-2 text-xs leading-snug text-primary-fg/65">{gap.detail}</p>
            </article>
          ))}
        </div>
      )}

      <SourceIssues issues={result.sourceIssues} />
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

function SourceIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
      Données partielles : {issues.join(" ")}
    </div>
  )
}
