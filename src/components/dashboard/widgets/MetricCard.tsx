import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { DashboardMetric } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface MetricCardProps {
  metric: DashboardMetric
  className?: string
}

interface DesktopMetricCardProps {
  metric: DashboardMetric
  index: number
  className?: string
}

// Function to render custom SVG icons with 45-degree flat long shadows projecting down-left
export function renderKpiIconWithShadow(label: string, index: number) {
  const normalized = label.toLowerCase();
  
  // Exact background colors matched from the user image
  const bgColors = [
    "#b08df7", // Purple (Card 1)
    "#5bc2f7", // Light Blue (Card 2)
    "#7686f5", // Indigo/Blue (Card 3)
    "#10b981"  // Emerald Green (Card 4)
  ];
  
  const bg = bgColors[index % 4];
  const clipId = `clip-kpi-${index}`;

  // Smart matching of the icon type, falling back to the image defaults by index
  let iconType = "hierarchy";
  if (
    normalized.includes("affaires") || 
    normalized.includes("ca") || 
    normalized.includes("marge") || 
    normalized.includes("panier") || 
    normalized.includes("trésorerie") || 
    normalized.includes("tva")
  ) {
    iconType = "finance";
  } else if (
    normalized.includes("personne") || 
    normalized.includes("consultant") || 
    normalized.includes("recrutement") || 
    normalized.includes("membre") || 
    normalized.includes("candidat") || 
    normalized.includes("user") || 
    normalized.includes("utilisateur")
  ) {
    iconType = "user";
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
    iconType = "group";
  } else if (
    normalized.includes("document") || 
    normalized.includes("fichier") || 
    normalized.includes("sauvegarde") || 
    normalized.includes("dossier") || 
    normalized.includes("rex") || 
    normalized.includes("base")
  ) {
    iconType = "folder";
  } else if (
    normalized.includes("workflow") || 
    normalized.includes("automation") || 
    normalized.includes("exéc") || 
    normalized.includes("n8n")
  ) {
    iconType = "zap";
  } else {
    // Default sequence matching the user image
    const defaults = ["hierarchy", "user", "group", "folder"];
    iconType = defaults[index % 4];
  }

  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <defs>
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="22" />
        </clipPath>
      </defs>
      
      {/* Solid background circle */}
      <circle cx="24" cy="24" r="22" fill={bg} />
      
      {/* Clipped area to keep the long shadow inside the circle */}
      <g clipPath={`url(#${clipId})`}>
        {/* Flat long shadow paths (projecting at 225° / down-left) */}
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

        {/* Crisp white vector icons */}
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
  );
}

// Faithful borderless KPI Card reproduction (left circle with flat long shadow, label and bold value)
export function DesktopMetricCard({ metric, index, className }: DesktopMetricCardProps) {
  const { label, value, href } = metric;
  const icon = renderKpiIconWithShadow(label, index);

  const content = (
    <div className="flex items-center gap-3.5 px-4 py-3 w-full h-full">
      {/* Vertically centered icon circle */}
      <div className="shrink-0 flex items-center justify-center">
        {icon}
      </div>
      {/* Stacked label and value */}
      <div className="flex flex-col min-w-0">
        <span className="text-[#9ca3af] text-[13px] font-normal leading-tight break-words whitespace-normal">
          {label}
        </span>
        <span className="text-[#1f2937] dark:text-slate-100 text-[15px] font-bold leading-tight mt-0.5 truncate">
          {value}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block hover:bg-black/[0.015] dark:hover:bg-white/[0.015] rounded-xl transition-colors duration-150 w-full h-full",
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      {content}
    </div>
  );
}

// Classic MetricCard (primarily used for mobile device layouts)
export function MetricCard({ metric, className }: MetricCardProps) {
  const { label, value, description, trend, status, href } = metric

  // Determine status-specific colors
  const statusColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-body",
    pending: "text-accent"
  }

  const statusToAccent: Record<string, "none" | "primary" | "success" | "warning" | "danger"> = {
    success: "success",
    warning: "warning",
    danger: "danger",
    neutral: "none",
    pending: "primary"
  }
  const accent = status ? (statusToAccent[status] || "none") : "none"

  const trendIcon = trend && {
    up: (
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
      </svg>
    ),
    down: (
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
      </svg>
    ),
    stable: (
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
      </svg>
    )
  }[trend.direction]

  const trendColor = trend && {
    up: "text-success bg-success/5 border-success/10",
    down: "text-danger bg-danger/5 border-danger/10",
    stable: "text-muted bg-canvas border-border"
  }[trend.direction]

  const cardContent = (
    <>
      <div className="flex justify-between items-start gap-4">
        <span className="text-xs font-medium text-muted uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        {status && status !== "neutral" && (
          <span className={cn("inline-flex w-2 h-2 rounded-full", {
            "bg-success": status === "success",
            "bg-warning": status === "warning",
            "bg-danger": status === "danger",
            "bg-accent": status === "pending"
          })} />
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold tracking-tight text-heading tabular-nums", status && statusColors[status])}>
          {value}
        </span>
      </div>

      {(description || trend) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-xs">
          <span className="text-muted truncate">{description}</span>
          {trend && (
            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium", trendColor)}>
              {trendIcon}
              {trend.label}
            </span>
          )}
        </div>
      )}
    </>
  )

  return (
    <SurfaceCard
      accent={accent}
      href={href}
      className={cn(
        "p-5 flex flex-col justify-between transition-all duration-200",
        href ? "hover:border-primary/30 hover:shadow-[0_2px_8px_-3px_rgba(37,84,184,0.08)] hover:-translate-y-0.5" : "",
        className
      )}
    >
      {cardContent}
    </SurfaceCard>
  )
}


