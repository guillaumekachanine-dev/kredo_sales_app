import { DashboardInsight } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface AiSummaryCardProps {
  insight: DashboardInsight
  className?: string
}

export function AiSummaryCard({ insight, className }: AiSummaryCardProps) {
  const { title, summary, recommendations } = insight

  return (
    <div className={cn("bg-surface border border-primary/20 rounded-lg p-5 shadow-[0_2px_12px_-4px_rgba(37,84,184,0.04)]", className)}>
      <div className="flex items-center gap-2 mb-3">
        {/* Sparkles SVG */}
        <svg className="w-5 h-5 text-primary shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.188.904z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.071 4.929l-.707 2.122-2.122.707 2.122.707.707 2.122.707-2.122 2.122-.707-2.122-.707-.707-2.122z" />
        </svg>
        <h3 className="text-sm font-semibold text-heading tracking-tight">
          {title}
        </h3>
        <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
          Copilot IA
        </span>
      </div>

      <p className="text-xs text-body leading-relaxed">
        {summary}
      </p>

      {recommendations && recommendations.length > 0 && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
            Recommandations clés
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-heading">
                {/* Micro bullet check */}
                <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                </svg>
                <span className="leading-snug">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
