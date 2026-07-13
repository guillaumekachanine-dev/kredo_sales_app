import type { WorkspaceDiagnosticPriority } from "@/lib/intelligence/diagnostic/workspace-diagnostic-types"

interface DiagnosticPriorityCalloutProps {
  priority: WorkspaceDiagnosticPriority
}

export function DiagnosticPriorityCallout({ priority }: DiagnosticPriorityCalloutProps) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
        {priority.rank}
      </span>
      <div>
        <p className="text-sm font-semibold leading-5 text-heading">{priority.action}</p>
        <p className="mt-1 text-xs leading-5 text-body">{priority.rationale}</p>
      </div>
    </li>
  )
}
