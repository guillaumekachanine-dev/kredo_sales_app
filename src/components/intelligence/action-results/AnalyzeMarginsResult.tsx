import type { AnalyzeMarginsResult as AnalyzeMarginsResultData } from "@/lib/intelligence/actions/analyze-margins"
import { formatPct } from "@/lib/formatters"

export function AnalyzeMarginsResult({ result }: { result: AnalyzeMarginsResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Missions actives" value={result.summary.activeMissions} />
        <Metric label="Marge négative" value={result.summary.negativeMargins} tone={result.summary.negativeMargins > 0 ? "danger" : "default"} />
        <Metric label="Marge faible" value={result.summary.lowMargins} tone={result.summary.lowMargins > 0 ? "warning" : "default"} />
        <Metric label="Non calculée" value={result.summary.unknownMargins} />
      </div>

      <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold leading-snug text-primary-fg">Vue complète Finance</p>
            <p className="mt-1 text-xs leading-snug text-primary-fg/60">
              Les arbitrages détaillés restent dans le cockpit financier.
            </p>
          </div>
          <a
            href={result.financeHref}
            className="shrink-0 rounded-lg border border-brand-brass/40 bg-brand-brass/10 px-3 py-2 text-[11px] font-bold text-primary-fg transition-colors hover:bg-brand-brass/20"
          >
            Ouvrir
          </a>
        </div>
      </div>

      {result.worstMargins.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucun signal de marge exploitable sur les missions actives.
        </p>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">Top 3 à vérifier</p>
          {result.worstMargins.map((item) => (
            <a key={item.missionId} href="/missions/actives" className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 transition-colors hover:bg-primary-fg/[0.07]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-primary-fg">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-primary-fg/50">
                    {item.companyName}{item.practice ? ` · ${item.practice}` : ""}
                  </p>
                  {item.collaboratorName && (
                    <p className="mt-1 text-[11px] leading-snug text-primary-fg/45">{item.collaboratorName}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${marginToneClass(item.marginPct)}`}>
                  {formatPct(item.marginPct, 1)}
                </span>
              </div>
              {item.source === "activity_summary" && (
                <p className="mt-2 text-[10px] leading-snug text-primary-fg/45">
                  Marge issue de la vue analytique d&apos;activité.
                </p>
              )}
            </a>
          ))}
        </div>
      )}

      <SourceIssues issues={result.sourceIssues} />
    </div>
  )
}

function marginToneClass(value: number | null) {
  if (value === null) return "border-primary-fg/10 bg-primary-fg/[0.06] text-primary-fg/70"
  if (value < 0) return "border-danger/30 bg-danger/10 text-danger"
  if (value < 15) return "border-warning/30 bg-warning/10 text-primary-fg"
  return "border-success/30 bg-success/10 text-success"
}

function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warning" | "danger" }) {
  const valueClass = tone === "danger" ? "text-danger" : tone === "warning" ? "text-primary-fg" : "text-primary-fg"

  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-none ${valueClass}`}>{value}</p>
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
