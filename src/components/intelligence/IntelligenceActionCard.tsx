import type { IntelligenceAction } from "@/lib/intelligence/intelligence-registry"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { cockpitIconForAction } from "./cockpit-action-icons"

interface IntelligenceActionCardProps {
  action: IntelligenceAction
  tone?: "dark" | "light"
}

export function IntelligenceActionCard({ action, tone = "dark" }: IntelligenceActionCardProps) {
  const isDark = tone === "dark"
  const isWriteEmail = action.id === "common_write_email"
  const isCommonReport = action.id === "common_report"
  const isActivityReport = action.id === "activity_report"
  const isWeeklyBrief = action.id === "weekly_brief"
  const isSupportedReportAction = isCommonReport || isActivityReport || isWeeklyBrief
  const isInteractive = isWriteEmail || isSupportedReportAction
  const isComingSoon = action.status === "coming_soon" && !isInteractive
  const iconSrc = cockpitIconForAction(action.id, action.icon)

  function handleClick() {
    if (isWriteEmail) {
      openCommunicationComposer({ origin: "intelligence_common" })
      return
    }

    if (isActivityReport) {
      openReportGeneration({ origin: "commercial_activity", reportType: "activity_commercial" })
      return
    }

    if (isWeeklyBrief) {
      openReportGeneration({ origin: "agenda", reportType: "weekly_manager" })
      return
    }

    if (isCommonReport) {
      openReportGeneration({ origin: "intelligence_common" })
    }
  }

  if (isDark) {
    return (
      <button
        type="button"
        disabled={isComingSoon}
        onClick={isInteractive ? handleClick : undefined}
        className={cn(
          "kredo-action-card-dark group relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-xl p-3 text-left cursor-pointer",
          isComingSoon && "cursor-default opacity-60",
        )}
      >
        <span className="pointer-events-none absolute -right-5 -top-5 size-20 rounded-full bg-white/10 blur-xl" />

        <Image
          src={iconSrc}
          alt=""
          width={68}
          height={68}
          className="relative z-10 size-12 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)] transition-transform duration-200 group-hover:scale-105"
        />

        <div className="relative z-10 mt-2 min-w-0">
          <p className="text-xs font-semibold leading-tight text-white">
            {action.label}
          </p>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={isComingSoon}
      onClick={isInteractive ? handleClick : undefined}
      className={cn(
        "group relative flex min-h-[76px] flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.14] px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all w-full select-none",
        isComingSoon
          ? "cursor-default opacity-45"
          : "cursor-pointer hover:bg-white/[0.20] active:scale-[0.97]",
      )}
    >
      <span className="pointer-events-none absolute -right-6 -top-7 size-20 rounded-full bg-white/10 blur-2xl" />

      <Image
        src={iconSrc}
        alt=""
        width={64}
        height={64}
        className="relative z-10 size-10 object-contain drop-shadow-[0_10px_16px_rgba(18,24,61,0.25)] transition-transform duration-200 group-hover:scale-105"
      />

      <span className="relative z-10 min-w-0 text-[11px] font-bold leading-tight text-white">
        {action.label}
      </span>
    </button>
  )
}
