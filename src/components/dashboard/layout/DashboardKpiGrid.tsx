import { DashboardMetric } from "@/lib/dashboard/dashboard-types"
import { MetricCard } from "../widgets/MetricCard"
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
            className="border-l-4 border-l-primary py-6 bg-surface shadow-[0_2px_8px_-4px_rgba(37,84,184,0.08)]"
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

  // Desktop view: distribute based on number of metrics
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4"
  }[Math.min(metrics.length, 4) as 1 | 2 | 3 | 4] || "grid-cols-4"

  return (
    <div className={cn("grid gap-4", gridColsClass, className)}>
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  )
}
