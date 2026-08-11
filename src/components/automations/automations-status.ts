import type { StatusPillVariant } from "@/components/ui/StatusPill"

// ai_run_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
const RUN_STATUS_VARIANT: Record<string, StatusPillVariant> = {
  queued: "neutral",
  running: "inProgress",
  succeeded: "success",
  failed: "danger",
  cancelled: "draft",
}

const RUN_STATUS_LABEL: Record<string, string> = {
  queued: "En attente",
  running: "En cours",
  succeeded: "Succès",
  failed: "Échec",
  cancelled: "Annulé",
}

export function runStatusVariant(status: string): StatusPillVariant {
  return RUN_STATUS_VARIANT[status] ?? "neutral"
}

export function runStatusLabel(status: string): string {
  return RUN_STATUS_LABEL[status] ?? status
}

export type WorkflowSeverity = "healthy" | "attention" | "critical"

// Une seule règle de gravité, partagée par les cartes santé et le rail d'alertes —
// pas de logique dupliquée entre desktop et mobile.
export function workflowSeverity(workflow: {
  stuckRunningNow: number
  stuckQueuedNow: number
  successRatePct30d: number | null
}): WorkflowSeverity {
  if (workflow.stuckRunningNow > 0 || workflow.stuckQueuedNow > 0) return "critical"
  if (workflow.successRatePct30d !== null && workflow.successRatePct30d < 70) return "critical"
  if (workflow.successRatePct30d !== null && workflow.successRatePct30d < 90) return "attention"
  return "healthy"
}

export function severityStatusVariant(severity: WorkflowSeverity): StatusPillVariant {
  if (severity === "critical") return "danger"
  if (severity === "attention") return "warning"
  return "success"
}

export function severityLabel(severity: WorkflowSeverity): string {
  if (severity === "critical") return "Critique"
  if (severity === "attention") return "À surveiller"
  return "Sain"
}

export function formatDurationMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "—"
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes} min ${remainingSeconds}s`
}

export function formatCostEstimate(value: number | null): string {
  if (value === null) return "—"
  if (value < 0.01) return "< 0,01 $"
  return `${value.toFixed(2).replace(".", ",")} $`
}

export function formatExecutionDate(isoDate: string | null): string {
  if (!isoDate) return "—"
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${day}/${month} - ${hours}.${minutes}`
}

export function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return "—"
  const date = new Date(isoDate)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return "à l'instant"
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `il y a ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  return `il y a ${diffDays} j`
}

