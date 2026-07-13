import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { WorkspaceDiagnosticCorrelation } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

interface DiagnosticCorrelationCardProps {
  correlation: WorkspaceDiagnosticCorrelation
  mobile?: boolean
}

const SEVERITY_LABELS = {
  critical: "Critique",
  warning: "Vigilance",
  opportunity: "Opportunité",
} as const

const SEVERITY_VARIANTS = {
  critical: "danger",
  warning: "warning",
  opportunity: "success",
} as const

export function DiagnosticCorrelationCard({
  correlation,
  mobile = false,
}: DiagnosticCorrelationCardProps) {
  const header = (
    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-heading">{correlation.title}</p>
        <p className="mt-1 text-xs text-muted">{correlation.axes.join(" · ")}</p>
      </div>
      <Badge variant={SEVERITY_VARIANTS[correlation.severity]} size="sm">
        {SEVERITY_LABELS[correlation.severity]}
      </Badge>
    </div>
  )

  const content = (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-body">{correlation.narrative}</p>
      <div className="border-t border-border/70 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Faits vérifiables
        </p>
        <ul className="mt-2 space-y-2">
          {correlation.evidenceRefs.map((evidence) => (
            <li key={`${evidence.metric}:${evidence.value}`} className="text-xs leading-5 text-body">
              <span className="font-mono text-[10px] text-muted">{evidence.metric}</span>
              <span aria-hidden="true"> — </span>
              {evidence.value}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )

  if (mobile) {
    return (
      <SurfaceCard
        as="article"
        padding="default"
        className="w-[84vw] max-w-sm shrink-0 snap-start"
      >
        {header}
        <div className="mt-4">{content}</div>
      </SurfaceCard>
    )
  }

  return (
    <details className="group border-b border-border/70 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-[var(--radius-medium)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
        {header}
        <span
          aria-hidden="true"
          className="mt-1 text-lg leading-none text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pt-4 pr-8">{content}</div>
    </details>
  )
}
