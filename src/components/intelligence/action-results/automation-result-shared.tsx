import type { AutomationSeverity } from "@/lib/intelligence/actions/automation-intelligence-rules"

export const SEVERITY_LABELS: Record<AutomationSeverity, string> = {
  critical: "Critique",
  warning: "Alerte",
  info: "Info",
}

export function formatEur(amount: number): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function AutomationMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-base font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}

export function AutomationSourceIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
      Données partielles : {issues.join(" ")}
    </div>
  )
}
