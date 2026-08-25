import type { ActionPrioritiesResult as ActionPrioritiesResultData } from "@/lib/intelligence/actions/action-priorities"

function urgencyLabel(urgency: ActionPrioritiesResultData["items"][number]["urgency"]) {
  if (urgency === "critical") return "Critique"
  if (urgency === "high") return "Haute"
  return "Modérée"
}

function formatPeriodMonth(periodStart?: string | null): string | null {
  if (!periodStart) return null
  const parts = periodStart.split("-")
  if (parts.length < 2) return null
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return null
  const date = new Date(Date.UTC(year, month - 1, 1))
  const monthName = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  return monthName
}

export function ActionPrioritiesResult({ result }: { result: ActionPrioritiesResultData }) {
  return (
    <div className="px-5 pb-6 text-edito-body">
      {/* 1. Section KPI (Compacte sur 1 ligne, 3 KPIs) */}
      <section className="border-b border-edito-border py-4" aria-label="Synthèse des priorités">
        <dl className="grid grid-cols-3 divide-x divide-edito-border/60">
          <Metric label="Opps stagnantes" value={result.meta.oppsStagnating} className="pr-2" />
          <Metric label="Fins mission" value={result.meta.missionsEndingSoon} className="px-3" />
          <Metric label="CRA à valider" value={result.meta.craNotValidated} className="pl-3" />
        </dl>
      </section>

      {/* 2. Liste des priorités */}
      {result.items.length === 0 ? (
        <section className="border-b border-edito-border py-5" aria-label="Aucune priorité">
          <p className="text-[11px] font-bold uppercase tracking-wider text-edito-heading">Aucune priorité critique</p>
          <p className="mt-1 text-xs leading-relaxed text-edito-muted">Aucune priorité critique détectée avec les données disponibles.</p>
        </section>
      ) : (
        <ol className="divide-y divide-edito-border/60">
          {result.items.map((item) => (
            <PriorityRow key={`${item.entityType}:${item.entityId}:${item.rank}`} item={item} />
          ))}
        </ol>
      )}

      {/* Données partielles le cas échéant */}
      <SourceIssues issues={result.sourceIssues} />
    </div>
  )
}

function PriorityRow({ item }: { item: ActionPrioritiesResultData["items"][number] }) {
  const isLinked = item.link.trim().length > 0
  const periodText = formatPeriodMonth(item.periodStart)
  const line3Text = periodText ? `${item.entityLabel} - ${periodText}` : item.entityLabel

  const content = (
    <div className="py-2.5">
      {/* Ligne 1 : Urgence */}
      <p className="text-[11px] font-bold leading-tight text-edito-brass">
        {urgencyLabel(item.urgency)}
      </p>

      {/* Ligne 2 : Titre + ChevronRight aligné verticalement */}
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <h4 className="font-heading text-sm font-black leading-snug text-edito-navy">
          {item.action}
        </h4>
        {isLinked && <ChevronRight />}
      </div>

      {/* Ligne 3 : Entité / Période */}
      <p className="mt-1 text-xs font-normal leading-tight text-edito-muted">
        {line3Text}
      </p>
    </div>
  )

  return (
    <li>
      {isLinked ? (
        <a
          href={item.link}
          className="group block transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </li>
  )
}

function Metric({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold leading-tight text-edito-muted">{label}</dt>
      <dd className="mt-1 font-heading text-lg font-black leading-tight text-brand-primary">{value}</dd>
    </div>
  )
}

function SourceIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <aside className="mt-4 border-l-2 border-edito-brass pl-3 py-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-heading">Données partielles</p>
      <p className="mt-1 text-[11px] leading-relaxed text-edito-muted">{issues.join(" ")}</p>
    </aside>
  )
}

function ChevronRight() {
  return (
    <svg
      className="size-4 shrink-0 text-edito-navy transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  )
}
