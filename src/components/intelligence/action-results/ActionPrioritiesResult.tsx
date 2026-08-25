import type { ActionPrioritiesResult as ActionPrioritiesResultData } from "@/lib/intelligence/actions/action-priorities"

function urgencyLabel(urgency: ActionPrioritiesResultData["items"][number]["urgency"]) {
  if (urgency === "critical") return "Critique"
  if (urgency === "high") return "Haute"
  return "Modérée"
}

export function ActionPrioritiesResult({ result }: { result: ActionPrioritiesResultData }) {
  return (
    <div className="px-5 pb-6 text-edito-body">
      <section className="border-b border-edito-border py-6" aria-label="Synthèse des priorités">
        <dl className="grid grid-cols-2">
          <Metric label="Comptes dormants" value={result.meta.accountsWithoutRecentAction} className="border-b border-edito-border pb-6 pr-4" />
          <Metric label="Opps stagnantes" value={result.meta.oppsStagnating} className="border-b border-l border-edito-border pb-6 pl-4" />
          <Metric label="Fins mission" value={result.meta.missionsEndingSoon} className="pt-6 pr-4" />
          <Metric label="CRA à valider" value={result.meta.craNotValidated} className="border-l border-edito-border pt-6 pl-4" />
        </dl>
      </section>

      {result.items.length === 0 ? (
        <section className="border-b border-edito-border py-6" aria-label="Aucune priorité">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-edito-heading">Aucune priorité critique</p>
          <p className="mt-2 text-xs leading-relaxed text-edito-muted">Aucune priorité critique détectée avec les données disponibles.</p>
        </section>
      ) : (
        <ol>
          {result.items.map((item) => (
            <PriorityRow key={`${item.entityType}:${item.entityId}:${item.rank}`} item={item} />
          ))}
        </ol>
      )}

      <SourceIssues issues={result.sourceIssues} />
    </div>
  )
}

function PriorityRow({ item }: { item: ActionPrioritiesResultData["items"][number] }) {
  const isLinked = item.link.trim().length > 0
  const content = (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 py-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-edito-brass text-sm font-black text-edito-navy">
        {item.rank}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-tight">
          <span className="font-black uppercase tracking-[0.15em] text-edito-navy">{urgencyLabel(item.urgency)}</span>
          <span aria-hidden="true" className="text-edito-muted">•</span>
          <span className="font-medium text-edito-muted">Score {item.score}</span>
        </p>
        <p className="mt-3 font-heading text-[clamp(0.95rem,4.2cqi,1.25rem)] font-black leading-[1.2] tracking-[-0.018em] text-edito-navy">
          {item.action}
        </p>
        <p className="mt-2 text-xs leading-snug text-edito-body">{item.entityLabel}</p>
        <p className="mt-1 text-[11px] leading-snug text-edito-muted">{item.impactReason}</p>
      </div>
      {isLinked && <ChevronRight />}
    </div>
  )

  return (
    <li className="border-b border-edito-border">
      {isLinked ? (
        <a href={item.link} className="group block transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
          {content}
        </a>
      ) : content}
    </li>
  )
}

function Metric({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={className}>
      <dt className="whitespace-nowrap text-[clamp(0.53rem,2.7cqi,0.7rem)] font-bold uppercase leading-tight tracking-[0.14em] text-edito-heading">{label}</dt>
      <dd className="mt-3 font-heading text-[clamp(2.5rem,11cqi,3.75rem)] font-black leading-none tracking-[-0.045em] text-edito-navy">{value}</dd>
    </div>
  )
}

function SourceIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <aside className="mt-5 border-l-2 border-edito-brass pl-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-edito-heading">Données partielles</p>
      <p className="mt-1 text-[11px] leading-relaxed text-edito-muted">{issues.join(" ")}</p>
    </aside>
  )
}

function ChevronRight() {
  return (
    <svg className="mt-1 size-5 shrink-0 text-edito-navy transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  )
}
