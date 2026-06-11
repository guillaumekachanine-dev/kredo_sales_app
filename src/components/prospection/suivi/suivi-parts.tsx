// Helpers partagés Desktop/Mobile du module Suivi. Composants purs, sans état.
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { SuiviStatus, SuiviCampaign, SuiviRoadmapItem } from "@/lib/prospection/suivi-data"

export const STATUS_TEXT: Record<SuiviStatus, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  neutral: "text-muted",
}

export const STATUS_DOT: Record<SuiviStatus, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  neutral: "bg-muted",
}

const CHANNEL_LABEL: Record<SuiviDeadlineChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Appel",
  meeting: "RDV",
  task: "Tâche",
}

export type SuiviDeadlineChannel = "email" | "linkedin" | "call" | "meeting" | "task"

export function ChannelTag({ channel }: { channel: SuiviDeadlineChannel }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

export function StatusDot({ status }: { status: SuiviStatus }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden />
}

const HORIZON_LABEL: Record<SuiviRoadmapItem["horizon"], string> = {
  court_terme: "Court terme",
  moyen_terme: "Moyen terme",
  long_terme: "Long terme",
}

export function HorizonBadge({ horizon }: { horizon: SuiviRoadmapItem["horizon"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/[0.07] px-2 py-0.5 text-[10px] font-medium text-primary">
      {HORIZON_LABEL[horizon]}
    </span>
  )
}

const CAMPAIGN_STATUS: Record<SuiviCampaign["status"], { label: string; status: SuiviStatus }> = {
  active: { label: "Active", status: "success" },
  paused: { label: "En pause", status: "warning" },
  draft: { label: "Brouillon", status: "neutral" },
  done: { label: "Terminée", status: "neutral" },
}

export function CampaignStatusPill({ status }: { status: SuiviCampaign["status"] }) {
  const { label, status: tone } = CAMPAIGN_STATUS[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", STATUS_TEXT[tone])}>
      <StatusDot status={tone} />
      {label}
    </span>
  )
}

/** Jauge de progression pure HTML+Tailwind (zéro librairie, conforme stack). */
export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn("h-full rounded-full", tone === "success" ? "bg-success" : "bg-primary")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
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
