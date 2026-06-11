// Primitives présentationnelles partagées du domaine Prospection (Suivi, Synthèse…).
// Composants purs, sans état, sans dépendance données — réutilisables partout.
import Link from "next/link"
import { cn } from "@/lib/utils"

export type ProspectionStatus = "danger" | "warning" | "success" | "neutral"

export const STATUS_TEXT: Record<ProspectionStatus, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  neutral: "text-muted",
}

export const STATUS_DOT: Record<ProspectionStatus, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-muted",
}

export const STATUS_BAR: Record<ProspectionStatus, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-primary",
}

export function StatusDot({ status }: { status: ProspectionStatus }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden />
}

/** Jauge de progression pure HTML+Tailwind (zéro librairie, conforme stack). */
export function ProgressBar({ value, status = "neutral" }: { value: number; status?: ProspectionStatus }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", STATUS_BAR[status])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Lien compte → hub Client Intelligence, ou simple libellé si pas d'id. */
export function CompanyLink({ company, companyId, className }: { company: string; companyId?: string; className?: string }) {
  if (!companyId) return <span className={className}>{company}</span>
  return (
    <Link href={`/prospection/accounts/${companyId}`} className={cn("hover:text-primary hover:underline", className)}>
      {company}
    </Link>
  )
}
