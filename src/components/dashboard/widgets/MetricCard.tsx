import Link from "next/link"
import { KpiCard } from "@/components/ui/KpiCard"
import { DashboardMetric } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  metric: DashboardMetric
  className?: string
}

interface DesktopMetricCardProps {
  metric: DashboardMetric
  index: number
  className?: string
}

// Legacy desktop visual kept temporarily to avoid broad dashboard regressions.
export function renderKpiIconWithShadow(label: string, index: number) {
  const normalized = label.toLowerCase()
  const bgColors = ["#b08df7", "#5bc2f7", "#7686f5", "#10b981"]
  const bg = bgColors[index % 4]
  const clipId = `clip-kpi-${index}`

  let iconType = "hierarchy"
  if (
    normalized.includes("affaires") ||
    normalized.includes("ca") ||
    normalized.includes("marge") ||
    normalized.includes("panier") ||
    normalized.includes("trésorerie") ||
    normalized.includes("tva")
  ) {
    iconType = "finance"
  } else if (
    normalized.includes("personne") ||
    normalized.includes("consultant") ||
    normalized.includes("recrutement") ||
    normalized.includes("membre") ||
    normalized.includes("candidat") ||
    normalized.includes("user") ||
    normalized.includes("utilisateur")
  ) {
    iconType = "user"
  } else if (
    normalized.includes("groupe") ||
    normalized.includes("equipe") ||
    normalized.includes("conversion") ||
    normalized.includes("opportunité") ||
    normalized.includes("proposition") ||
    normalized.includes("contact") ||
    normalized.includes("lead") ||
    normalized.includes("client")
  ) {
    iconType = "group"
  } else if (
    normalized.includes("document") ||
    normalized.includes("fichier") ||
    normalized.includes("sauvegarde") ||
    normalized.includes("dossier") ||
    normalized.includes("rex") ||
    normalized.includes("base")
  ) {
    iconType = "folder"
  } else if (
    normalized.includes("workflow") ||
    normalized.includes("automation") ||
    normalized.includes("exéc") ||
    normalized.includes("n8n")
  ) {
    iconType = "zap"
  } else {
    const defaults = ["hierarchy", "user", "group", "folder"]
    iconType = defaults[index % 4]
  }

  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <defs>
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="22" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="22" fill={bg} />
      <g clipPath={`url(#${clipId})`}>
        {iconType === "hierarchy" && (
          <path d="M20,14 L28,14 L-4,46 L-12,46 Z M11,26 L19,26 L-13,58 L-21,58 Z M29,26 L37,26 L5,58 L-3,58 Z" fill="#000000" opacity="0.14" />
        )}
        {iconType === "user" && (
          <path d="M19,18 L29,18 L-20,67 L-30,67 Z M14,31 L34,31 L-2,67 L-22,67 Z" fill="#000000" opacity="0.14" />
        )}
        {iconType === "group" && (
          <path d="M13.5,21 L34.5,21 L-12,67 L-33,67 Z M11,30 L37,30 L3,67 L-23,67 Z" fill="#000000" opacity="0.14" />
        )}
        {iconType === "folder" && (
          <path d="M13,15 L35,18 L3,67 L-19,67 Z" fill="#000000" opacity="0.14" />
        )}
        {iconType === "finance" && (
          <path d="M14,24 L19,24 L-11,54 L-16,54 Z M21.5,16 L26.5,16 L-13.5,56 L-18.5,56 Z M29,20 L34,20 L-6,60 L-11,60 Z" fill="#000000" opacity="0.14" />
        )}
        {iconType === "zap" && (
          <path d="M27,12 L31,23 L12,42 L8,42 Z M15,25 L21,25 L2,44 L-4,44 Z" fill="#000000" opacity="0.14" />
        )}
        {iconType === "hierarchy" && (
          <>
            <rect x="20" y="14" width="8" height="6" rx="1" fill="#ffffff" />
            <rect x="11" y="26" width="8" height="6" rx="1" fill="#ffffff" />
            <rect x="29" y="26" width="8" height="6" rx="1" fill="#ffffff" />
            <path d="M24,20 L24,23 M15,23 L33,23 M15,23 L15,26 M33,23 L33,26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {iconType === "user" && (
          <>
            <circle cx="24" cy="18" r="5" fill="#ffffff" />
            <path d="M14,31 C14,27 18.5,25 24,25 C29.5,25 34,27 34,31 C34,32 33,32 24,32 C15,32 14,32 14,31 Z" fill="#ffffff" />
          </>
        )}
        {iconType === "group" && (
          <>
            <circle cx="17" cy="21" r="3.5" fill="#ffffff" opacity="0.85" />
            <path d="M11,30 C11,27.5 14,26.5 17,26.5 C20,26.5 23,27.5 23,30 Z" fill="#ffffff" opacity="0.85" />
            <circle cx="31" cy="21" r="3.5" fill="#ffffff" opacity="0.85" />
            <path d="M25,30 C25,27.5 28,26.5 31,26.5 C34,26.5 37,27.5 37,30 Z" fill="#ffffff" opacity="0.85" />
            <circle cx="24" cy="18" r="4.5" fill="#ffffff" />
            <path d="M16,29 C16,25 20,23.5 24,23.5 C28,23.5 32,25 32,29 C32,31 31,31 24,31 C17,31 16,31 16,29 Z" fill="#ffffff" />
          </>
        )}
        {iconType === "folder" && (
          <path d="M14,14 L22,14 L25,17 L33,17 C34.5,17 35,18 35,19.5 L35,31 C35,32.5 34,33 32.5,33 L15.5,33 C14,33 13,32.5 13,31 L13,16.5 C13,15 14,14 15,14 Z" fill="#ffffff" />
        )}
        {iconType === "finance" && (
          <>
            <rect x="14" y="24" width="5" height="10" rx="0.5" fill="#ffffff" />
            <rect x="21.5" y="16" width="5" height="18" rx="0.5" fill="#ffffff" />
            <rect x="29" y="20" width="5" height="14" rx="0.5" fill="#ffffff" />
          </>
        )}
        {iconType === "zap" && (
          <path d="M27,12 L15,25 L21,25 L19,36 L31,23 L25,23 Z" fill="#ffffff" />
        )}
      </g>
    </svg>
  )
}

export function DesktopMetricCard({ metric, index, className }: DesktopMetricCardProps) {
  const { label, value, href } = metric
  const icon = renderKpiIconWithShadow(label, index)

  const content = (
    <div className="flex h-full w-full items-center gap-3.5 px-4 py-3">
      <div className="flex shrink-0 items-center justify-center">{icon}</div>
      <div className="flex min-w-0 flex-col">
        <span className="whitespace-normal break-words text-[13px] font-normal leading-tight text-[#9ca3af]">
          {label}
        </span>
        <span className="mt-0.5 truncate text-[15px] font-bold leading-tight text-[#1f2937] dark:text-slate-100">
          {value}
        </span>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block h-full w-full rounded-xl transition-colors duration-150 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]",
          className,
        )}
      >
        {content}
      </Link>
    )
  }

  return <div className={cn("h-full w-full", className)}>{content}</div>
}

function mapTrendDirectionToTone(direction?: "up" | "down" | "stable") {
  if (direction === "up") {
    return "positive" as const
  }

  if (direction === "down") {
    return "negative" as const
  }

  return "neutral" as const
}

// Legacy wrapper: keep dashboard metric data shape while delegating the visual foundation to KpiCard.
export function MetricCard({ metric, className }: MetricCardProps) {
  return (
    <KpiCard
      label={metric.label}
      value={metric.value}
      context={metric.description}
      delta={metric.trend?.label}
      deltaTone={mapTrendDirectionToTone(metric.trend?.direction)}
      href={metric.href}
      className={className}
    />
  )
}
