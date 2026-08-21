import { cn } from "@/lib/utils"
import type { SegmentResourceCoverage } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { buildCoverageItems, coverageDetail, formatCoverageDate } from "./coverage-model"

export function AnalyticalCoverageMapDesktop({
  coverage,
  onNavigate,
  onOpenPlaybook,
}: {
  coverage: SegmentResourceCoverage
  onNavigate: (chapter: BiChapter) => void
  onOpenPlaybook: () => void
}) {
  return (
    <section className="rounded-xl border border-edito-border bg-edito-surface p-5" aria-labelledby="bi-coverage-desktop-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="bi-coverage-desktop-title" className="font-heading text-base font-bold text-edito-navy">Couverture analytique</h2>
          <p className="mt-1 text-xs text-edito-muted">Ressources disponibles pour ce segment.</p>
        </div>
      </div>
      <ol className="mt-5 grid grid-cols-6 border-y border-edito-border">
        {buildCoverageItems(coverage).map((item, index) => {
          const interactive = item.availability.available && (item.chapter || item.key === "playbook")
          const content = (
            <>
              <span className={cn("mb-3 inline-flex size-7 items-center justify-center rounded-full border text-xs font-bold", item.availability.available ? "border-edito-brass bg-edito-brass/10 text-edito-navy" : "border-edito-border bg-edito-chip text-edito-muted")}>{index + 1}</span>
              <span className="block text-xs font-bold text-edito-navy">{item.label}</span>
              <span className={cn("mt-1 block text-[10px] font-semibold", item.availability.available ? "text-success" : "text-edito-muted")}>{item.availability.available ? "Disponible" : "Absent"}</span>
              {coverageDetail(item.availability) ? <span className="mt-1 block text-[10px] text-edito-muted">{coverageDetail(item.availability)}</span> : null}
              {formatCoverageDate(item.availability.updatedAt) ? <span className="mt-1 block text-[10px] text-edito-muted">{formatCoverageDate(item.availability.updatedAt)}</span> : null}
            </>
          )
          return (
            <li key={item.key} className={cn("relative min-w-0 border-r border-edito-border last:border-r-0", index > 0 && "before:absolute before:-left-1 before:top-[1.7rem] before:size-2 before:rotate-45 before:border-b before:border-l before:border-edito-border before:bg-edito-surface")}>
              {interactive ? (
                <button type="button" onClick={() => item.chapter ? onNavigate(item.chapter) : onOpenPlaybook()} className="min-h-36 w-full px-3 py-4 text-left transition-colors hover:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-navy/40">
                  {content}
                </button>
              ) : <div className="min-h-36 px-3 py-4">{content}</div>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
