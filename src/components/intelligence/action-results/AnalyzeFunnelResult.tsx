import type { AnalyzeFunnelResult as AnalyzeFunnelResultData } from "@/lib/intelligence/actions/analyze-funnel"

export function AnalyzeFunnelResult({ result }: { result: AnalyzeFunnelResultData }) {
  const maxHiringCount = Math.max(...result.hiringFunnel.map((step) => step.count), 1)
  const maxStaffingCount = Math.max(...result.staffingFunnel.map((status) => status.count), 1)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Process" value={result.summary.activeHiringProcesses} />
        <Metric label="Staffing" value={result.summary.staffedCandidates} />
        <Metric label="Candidats" value={result.summary.candidatesTotal} />
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
        {result.caveat}
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">Recrutement interne</p>
        {result.hiringFunnel.length === 0 ? (
          <EmptyState>Aucun processus de recrutement actif détecté.</EmptyState>
        ) : (
          result.hiringFunnel.map((step) => (
            <FunnelRow
              key={step.step}
              label={step.stepLabel}
              count={step.count}
              detail={`${step.pctOfTotal}% du snapshot`}
              width={step.count > 0 ? Math.max(6, (step.count / maxHiringCount) * 100) : 0}
            />
          ))
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">Positionnement sur besoin</p>
        {result.staffingFunnel.length === 0 ? (
          <EmptyState>Aucun positionnement candidat détecté.</EmptyState>
        ) : (
          result.staffingFunnel.map((status) => (
            <FunnelRow
              key={status.status}
              label={status.statusLabel}
              count={status.count}
              width={status.count > 0 ? Math.max(6, (status.count / maxStaffingCount) * 100) : 0}
            />
          ))
        )}
      </div>

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

function FunnelRow({ label, count, detail, width }: { label: string; count: number; detail?: string; width: number }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug text-primary-fg">{label}</p>
          {detail && <p className="mt-0.5 text-[11px] text-primary-fg/45">{detail}</p>}
        </div>
        <span className="shrink-0 rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold text-primary-fg/70">
          {count}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-fg/10">
        <div className="h-full rounded-full bg-brand-brass" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
      {children}
    </p>
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
