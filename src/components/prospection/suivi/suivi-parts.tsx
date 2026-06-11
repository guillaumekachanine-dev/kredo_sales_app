// Helpers spécifiques au module Suivi. Les primitives génériques (StatusDot,
// ProgressBar, CompanyLink, maps de statut) vivent dans ../prospection-parts et
// sont re-exportées ici pour que les vues Suivi gardent un point d'import unique.
import { cn } from "@/lib/utils"
import { STATUS_TEXT, StatusDot } from "../prospection-parts"
import type { SuiviStatus, SuiviCampaign, SuiviRoadmapItem } from "@/lib/prospection/suivi-data"

export { STATUS_TEXT, STATUS_DOT, StatusDot, ProgressBar, CompanyLink } from "../prospection-parts"

export type SuiviDeadlineChannel = "email" | "linkedin" | "call" | "meeting" | "task"

const CHANNEL_LABEL: Record<SuiviDeadlineChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Appel",
  meeting: "RDV",
  task: "Tâche",
}

export function ChannelTag({ channel }: { channel: SuiviDeadlineChannel }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      {CHANNEL_LABEL[channel]}
    </span>
  )
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
