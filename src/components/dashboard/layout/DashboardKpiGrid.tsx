import { DashboardMetric } from "@/lib/dashboard/dashboard-types"
import { MetricCard, DesktopMetricCard } from "../widgets/MetricCard"
import { cn } from "@/lib/utils"

interface DashboardKpiGridProps {
  metrics: DashboardMetric[]
  device: "desktop" | "mobile"
  className?: string
}

export function DashboardKpiGrid({ metrics, device, className }: DashboardKpiGridProps) {
  if (metrics.length === 0) return null

  const isMobile = device === "mobile"

  if (isMobile) {
    const [heroMetric, ...restMetrics] = metrics

    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {/* Hero KPI Card */}
        {heroMetric && (
          <MetricCard
            metric={heroMetric}
            className="py-6 shadow-[0_2px_8px_-4px_rgba(37,84,184,0.08)]"
          />
        )}

        {/* Mini KPI Grid */}
        {restMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {restMetrics.map((metric) => (
              <MetricCard
                key={metric.id}
                metric={metric}
                className="p-4 bg-surface"
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Desktop layout: Pad or trim the metrics to always render exactly 3 KPI cards
  const displayedMetrics = [...metrics]
  while (displayedMetrics.length < 3) {
    displayedMetrics.push({
      id: `pad-${displayedMetrics.length}`,
      label: "En attente",
      value: "-",
      status: "neutral"
    })
  }
  const finalMetrics = displayedMetrics.slice(0, 3)

  return (
    <div className={cn("w-full max-w-3xl grid grid-cols-3 divide-x divide-gray-200/80 dark:divide-border/60 bg-transparent py-2", className)}>
      {finalMetrics.map((metric, index) => (
        <div key={metric.id} className="px-4 first:pl-0 last:pr-0">
          <DesktopMetricCard metric={metric} index={index} />
        </div>
      ))}
    </div>
  )
}

