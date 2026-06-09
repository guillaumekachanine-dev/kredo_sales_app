import { DashboardInsight } from "@/lib/dashboard/dashboard-types"
import { AiSummaryCard } from "../widgets/AiSummaryCard"
import { cn } from "@/lib/utils"

interface DashboardAiPanelProps {
  insight?: DashboardInsight
  className?: string
}

export function DashboardAiPanel({ insight, className }: DashboardAiPanelProps) {
  if (!insight) return null

  return (
    <div className={cn("h-full", className)}>
      <AiSummaryCard insight={insight} />
    </div>
  )
}
