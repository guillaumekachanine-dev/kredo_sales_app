import { InsightCard } from "@/components/ui/InsightCard"
import { DashboardInsight } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface AiSummaryCardProps {
  insight: DashboardInsight
  className?: string
}

// Legacy wrapper: keeps the dashboard insight payload while reusing the shared insight primitive.
export function AiSummaryCard({ insight, className }: AiSummaryCardProps) {
  const recommendationContent =
    insight.recommendations && insight.recommendations.length > 0 ? (
      <ul className="space-y-2">
        {insight.recommendations.map((recommendation, index) => (
          <li key={`${recommendation}-${index}`} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>{recommendation}</span>
          </li>
        ))}
      </ul>
    ) : undefined

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <InsightCard
        eyebrow="Analyse"
        sourceLabel="Synthèse KREDO"
        title={insight.title}
        summary={insight.summary}
        recommendation={recommendationContent}
        className="flex-1"
      />
    </div>
  )
}
