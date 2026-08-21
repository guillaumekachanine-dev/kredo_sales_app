import { cn } from "@/lib/utils"
import type { SegmentResourceCoverage } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { buildCoverageItems, coverageDetail } from "./coverage-model"

export function AnalyticalCoverageMapMobile({
  coverage,
  onNavigate,
  onOpenPlaybook,
}: {
  coverage: SegmentResourceCoverage
  onNavigate: (chapter: BiChapter) => void
  onOpenPlaybook: () => void
}) {
  return (
    <section className="border-y border-border bg-surface/35 px-4 py-4" aria-labelledby="bi-coverage-mobile-title">
      <h2 id="bi-coverage-mobile-title" className="font-heading text-base font-bold text-heading">Couverture analytique</h2>
      <ul className="mt-3 divide-y divide-border">
        {buildCoverageItems(coverage).map((item) => {
          const interactive = item.availability.available && (item.chapter || item.key === "playbook")
          const row = (
            <>
              <span className={cn("size-2 shrink-0 rounded-full", item.availability.available ? "bg-success" : "bg-muted")} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-body">{item.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted">{item.availability.available ? "Disponible" : "Absent"}{coverageDetail(item.availability) ? ` · ${coverageDetail(item.availability)}` : ""}</span>
              </span>
              {interactive ? <span className="text-primary" aria-hidden="true">→</span> : null}
            </>
          )
          return <li key={item.key}>{interactive ? <button type="button" onClick={() => item.chapter ? onNavigate(item.chapter) : onOpenPlaybook()} className="flex min-h-12 w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{row}</button> : <div className="flex min-h-12 items-center gap-3 py-2">{row}</div>}</li>
        })}
      </ul>
    </section>
  )
}
