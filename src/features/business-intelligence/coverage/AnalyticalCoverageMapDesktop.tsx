import { cn } from "@/lib/utils"
import type { SegmentResourceCoverage } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { buildCoverageItems, formatCoverageDate } from "./coverage-model"

export function AnalyticalCoverageMapDesktop({
  coverage,
  onNavigate,
  onOpenPlaybook,
}: {
  coverage: SegmentResourceCoverage
  onNavigate: (chapter: BiChapter) => void
  onOpenPlaybook: () => void
}) {
  const items = buildCoverageItems(coverage)
  return (
    <nav aria-label="Couverture analytique" className="relative px-1">
      <span className="pointer-events-none absolute left-[calc(100%/12)] right-[calc(100%/12)] top-3 h-px bg-edito-border" aria-hidden="true" />
      <ol className="relative grid grid-cols-6">
        {items.map((item, index) => {
          const interactive = item.availability.available && (item.chapter || item.key === "playbook")
          const date = formatCoverageDate(item.availability.updatedAt)
          const label = date ? `${item.label} · ${date}` : item.label
          const content = (
            <>
              <span className={cn("relative z-10 inline-flex size-6 items-center justify-center rounded-full border text-[10px] font-bold", item.availability.available ? "border-edito-brass bg-edito-brass text-white" : "border-edito-border bg-edito-canvas text-edito-muted")}>
                {index + 1}
              </span>
              <span className="mt-1.5 block max-w-full truncate text-[10px] text-edito-muted" title={label}>{label}</span>
              <span className={cn("mt-0.5 block text-center text-[10px] font-semibold", item.availability.available ? "text-success" : "text-edito-muted")}>
                {item.availability.available ? "Disponible" : "Absent"}
              </span>
            </>
          )
          return (
            <li key={item.key} className="flex min-w-0 flex-col items-center px-1 text-center">
              {interactive ? (
                <button type="button" onClick={() => (item.chapter ? onNavigate(item.chapter) : onOpenPlaybook())} className="flex w-full flex-col items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/40">
                  {content}
                </button>
              ) : (
                <div className="flex w-full flex-col items-center">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
