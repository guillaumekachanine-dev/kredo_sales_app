import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import { formatEuro } from "@/lib/formatters"
import { getOpportunityStageLabel } from "@/lib/opportunities/stages"
import type { PlanningOpportunityItem } from "./data/opportunities-planning.types"

const SOURCE_LABEL = {
  next_action: "Prochaine action",
  calendar_event: "Événement agenda",
  target_close: "Closing visé",
} as const

function formatLongDate(dateIso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateIso))
}

function DeadlineGlyph({ source }: { source: keyof typeof SOURCE_LABEL }) {
  if (source === "next_action") {
    return <span className="size-3 rounded-full bg-primary" aria-hidden="true" />
  }
  if (source === "calendar_event") {
    return <span className="size-3 border-2 border-info bg-surface" aria-hidden="true" />
  }
  return <span className="size-3 rotate-45 bg-brand-brass" aria-hidden="true" />
}

interface PlanningDetailsPanelProps {
  item: PlanningOpportunityItem | null
  detail: OpportunityDetailData | null
  detailError: string | null
}

export function PlanningDetailsPanel({ item, detail, detailError }: PlanningDetailsPanelProps) {
  if (!item) return null

  const opportunity = detail?.opportunity
  const accountName = detail?.account?.name ?? item.clientName

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="planning-detail-title">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Détails opportunité
        </p>
        <div className="mt-3 flex items-start gap-3">
          <CompanyLogo
            name={accountName}
            logoPath={item.clientLogoPath}
            website={detail?.account?.website ?? item.clientWebsite}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-body">{accountName}</p>
            <h2 id="planning-detail-title" className="mt-0.5 text-sm font-bold leading-5 text-heading">
              {item.title}
            </h2>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-border pb-5">
          <div>
            <p className="text-[10px] text-muted">Étape</p>
            <p className="mt-1 text-xs font-semibold text-heading">
              {getOpportunityStageLabel(item.stage)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Priorité</p>
            <p className="mt-1 text-xs font-semibold capitalize text-heading">{item.priority}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">ACV</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums text-heading">
              {opportunity ? formatEuro(opportunity.acv) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Conviction</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums text-primary">
              {opportunity ? `${opportunity.conviction} %` : "—"}
            </p>
          </div>
        </div>

        <div className="border-b border-border py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Prochaine échéance
          </p>
          {item.deadline ? (
            <div className="mt-3 border-l-2 border-primary/30 pl-3">
              <div className="flex items-center gap-2">
                <DeadlineGlyph source={item.deadline.source} />
                <p className="text-xs font-bold text-heading">
                  {SOURCE_LABEL[item.deadline.source]}
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-primary-deep">{item.deadline.label}</p>
              <time className="mt-1 block text-xs tabular-nums text-body" dateTime={item.deadline.dueAt}>
                {formatLongDate(item.deadline.dueAt)}
              </time>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted">
              Aucune action, réunion ou date de closing future n’est renseignée.
            </p>
          )}
        </div>

        {detailError ? (
          <p className="py-5 text-xs leading-5 text-danger">{detailError}</p>
        ) : null}

        <Link
          href={`/missions/opps/${item.id}`}
          className="mt-5 inline-flex h-9 items-center justify-center rounded-[var(--radius-medium)] border border-border px-3 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          Ouvrir la fiche complète
        </Link>
      </div>
    </section>
  )
}
