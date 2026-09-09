import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getOpportunityStageColor, getOpportunityStageLabel } from "@/lib/opportunities/stages"
import { cn } from "@/lib/utils"
import type { PlanningOpportunityItem } from "./data/opportunities-planning.types"
import { buildPlanningHref } from "./navigation/planning-url"

function formatCompactDate(dateIso: string | null): string {
  if (!dateIso) return "Sans échéance"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateIso))
}

interface PlanningListPanelProps {
  items: PlanningOpportunityItem[]
  selectedOpportunityId: string | null
  searchParamsString: string
}

export function PlanningListPanel({
  items,
  selectedOpportunityId,
  searchParamsString,
}: PlanningListPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="planning-list-title">
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="planning-list-title" className="text-xs font-bold text-heading">
            Opportunités ouvertes
          </h2>
          <span className="text-[10px] tabular-nums text-muted">{items.length}</span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted">
          Triées par prochaine échéance
        </p>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-5 py-12 text-center text-xs leading-5 text-muted">
            Aucune opportunité ouverte à planifier.
          </li>
        ) : (
          items.map((item) => {
            const isSelected = item.id === selectedOpportunityId
            return (
              <li
                key={item.id}
                className={cn(
                  "border-b border-border border-l-2 transition-colors",
                  isSelected
                    ? "border-l-primary bg-primary/[0.06]"
                    : "border-l-transparent hover:bg-canvas/70",
                )}
              >
                <Link
                  href={buildPlanningHref(searchParamsString, item.id)}
                  replace
                  scroll={false}
                  aria-current={isSelected ? "page" : undefined}
                  className="block px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
                >
                  <div className="flex items-start gap-2.5">
                    <CompanyLogo
                      name={item.clientName}
                      logoPath={item.clientLogoPath}
                      website={item.clientWebsite}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-body">
                        {item.clientName}
                      </p>
                      <p className={cn(
                        "mt-0.5 line-clamp-2 text-xs font-bold leading-4",
                        isSelected ? "text-primary-deep" : "text-heading",
                      )}>
                        {item.title}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px]">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-body">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getOpportunityStageColor(item.stage) }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{getOpportunityStageLabel(item.stage)}</span>
                    </span>
                    <time
                      dateTime={item.deadline?.dueAt}
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        item.deadline ? "text-heading" : "text-muted",
                      )}
                    >
                      {formatCompactDate(item.deadline?.dueAt ?? null)}
                    </time>
                  </div>
                </Link>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
