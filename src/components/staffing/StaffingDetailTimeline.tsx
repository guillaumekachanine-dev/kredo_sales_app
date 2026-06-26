"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { mapDbStatusToStaffingStage, STAFFING_STAGES, StaffingStageKey } from "@/lib/staffing/stages"

interface StaffingDetailTimelineProps {
  currentStatus: string
}

const GRADIENT_COLORS: Record<StaffingStageKey, string> = {
  identifie: "#FF3B00",        // Rouge-Orange vif
  prequal: "#FF8A00",          // Orange vif
  cv_envoye: "#FFC107",        // Jaune-Orange vif
  entretien_client: "#8CC63F", // Lime vif
  issue: "#39B54A",            // Vert vif
}

const STAGE_ICONS: Record<StaffingStageKey, string> = {
  identifie: "/icons_set/recrutement%20&%20staffing/candidate_identification.png",
  prequal: "/icons_set/recrutement%20&%20staffing/candidate_prequalification.png",
  cv_envoye: "/icons_set/recrutement%20&%20staffing/candidate_CV_sent.png",
  entretien_client: "/icons_set/recrutement%20&%20staffing/candidate_entretien_client.png",
  issue: "/icons_set/recrutement%20&%20staffing/candidate_retenu.png",
}

export function StaffingDetailTimeline({ currentStatus }: StaffingDetailTimelineProps) {
  const activeStageKey = mapDbStatusToStaffingStage(currentStatus)
  
  // Find index of the active stage
  const activeIndex = STAFFING_STAGES.findIndex(s => s.key === activeStageKey)

  // Resolve detailed label for the "Issue" stage
  const getIssueLabel = () => {
    switch (currentStatus) {
      case "gagne":
      case "retenu":
        return "Retenu / Gagné"
      case "refuse_client":
        return "Refus client"
      case "refuse_candidat":
        return "Refus candidat"
      case "abandonne":
        return "Abandonné"
      default:
        return "Issue"
    }
  }

  const getSegmentBackground = (i: number) => {
    if (i < activeIndex) {
      let startColor = GRADIENT_COLORS[STAFFING_STAGES[i].key]
      let endColor = GRADIENT_COLORS[STAFFING_STAGES[i + 1].key]
      if (STAFFING_STAGES[i].key === "issue") {
        const isLost = ["refuse_client", "refuse_candidat", "abandonne"].includes(currentStatus)
        if (isLost) startColor = "#EF4444"
      }
      if (STAFFING_STAGES[i + 1].key === "issue" && ["refuse_client", "refuse_candidat", "abandonne"].includes(currentStatus)) {
        endColor = "#EF4444"
      }
      return `linear-gradient(to right, ${startColor}, ${endColor})`
    }
    return "#E5E7EB"
  }

  // ── DESKTOP VIEW ──
  const renderDesktopView = () => {
    return (
      <div className="w-full relative py-2 hidden lg:block">
        <div className="relative w-full h-[120px]">
          {/* Connector lines (behind nodes) */}
          {[0, 1, 2, 3].map((i) => {
            const bg = getSegmentBackground(i)
            return (
              <div
                key={i}
                className="absolute h-2 rounded-full z-0 transition-all duration-300"
                style={{
                  top: 42, // (status label ~16px + half circle size 26px = 42px)
                  left: `calc(64px + ${i * 25}% - ${i * 32}px)`,
                  width: `calc(25% - 32px)`,
                  background: bg,
                }}
              />
            )
          })}

          {/* Sequential Steps Nodes */}
          {STAFFING_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeIndex
            const isActive = idx === activeIndex
            const isFuture = idx > activeIndex
            
            const isIssue = stage.key === "issue"
            const label = isIssue ? getIssueLabel() : stage.label
            
            let color = GRADIENT_COLORS[stage.key]
            if (isIssue) {
              const isLost = ["refuse_client", "refuse_candidat", "abandonne"].includes(currentStatus)
              if (isLost) {
                color = "#EF4444"
              }
            }

            return (
              <div
                key={stage.key}
                className="absolute flex flex-col items-center z-10"
                style={{
                  left: `calc(64px + ${idx * 25}% - ${idx * 32}px)`,
                  transform: "translateX(-50%)",
                  width: 120,
                }}
              >
                {/* Status indicator above */}
                <span
                  className="text-[11px] font-bold mb-1.5 leading-none h-4 flex items-center justify-center"
                  style={{ color: (isCompleted || isActive) ? color : "#9CA3AF" }}
                >
                  {isActive ? "En cours" : isCompleted ? "✓" : "—"}
                </span>

                {/* Node circle */}
                <div
                  className="flex items-center justify-center rounded-full transition-all duration-300 overflow-hidden shrink-0 bg-surface"
                  style={{
                    width: 52,
                    height: 52,
                    border: isActive
                      ? `3px solid ${color}`
                      : isCompleted
                      ? `2.5px solid ${color}`
                      : "2px solid #E5E7EB",
                    boxShadow: isActive
                      ? `0 0 0 4px ${color}22`
                      : isCompleted
                      ? `0 2px 8px ${color}28`
                      : "none",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <img
                    src={STAGE_ICONS[stage.key]}
                    alt={label}
                    className={cn("w-10 h-10 object-contain transition-all duration-300", isFuture ? "opacity-25 grayscale" : "opacity-100")}
                  />
                </div>

                {/* Label below */}
                <div className="mt-3 text-center w-full px-1">
                  <span
                    className="text-[12px] font-bold leading-tight transition-colors whitespace-normal w-full block"
                    style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── MOBILE VIEW ──
  const renderMobileView = () => {
    return (
      <div className="w-full flex flex-col gap-0 lg:hidden py-2">
        {STAFFING_STAGES.map((stage, idx) => {
          const isCompleted = idx < activeIndex
          const isActive = idx === activeIndex
          const isFuture = idx > activeIndex
          const isLast = idx === STAFFING_STAGES.length - 1
          
          const isIssue = stage.key === "issue"
          const label = isIssue ? getIssueLabel() : stage.label
          
          let color = GRADIENT_COLORS[stage.key]
          let nextColor = GRADIENT_COLORS[STAFFING_STAGES[Math.min(idx + 1, STAFFING_STAGES.length - 1)].key]
          
          if (isIssue) {
            const isLost = ["refuse_client", "refuse_candidat", "abandonne"].includes(currentStatus)
            if (isLost) {
              color = "#EF4444"
            }
          }
          const isNextLost = ["refuse_client", "refuse_candidat", "abandonne"].includes(currentStatus)
          if (STAFFING_STAGES[Math.min(idx + 1, STAFFING_STAGES.length - 1)].key === "issue" && isNextLost) {
            nextColor = "#EF4444"
          }

          return (
            <div key={stage.key} className="flex items-stretch gap-4">
              {/* Left: node + connector */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 44 }}>
                <div
                  className="flex items-center justify-center rounded-full transition-all duration-300 shrink-0 z-10 overflow-hidden bg-surface"
                  style={{
                    width: 44,
                    height: 44,
                    border: isActive
                      ? `3px solid ${color}`
                      : isCompleted
                      ? `2.5px solid ${color}`
                      : "2px solid #E5E7EB",
                    boxShadow: isActive
                      ? `0 0 0 4px ${color}22`
                      : isCompleted
                      ? `0 2px 8px ${color}28`
                      : "none",
                    transform: isActive ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  <img
                    src={STAGE_ICONS[stage.key]}
                    alt={label}
                    className={cn("w-8 h-8 object-contain transition-all duration-300", isFuture ? "opacity-25 grayscale" : "opacity-100")}
                  />
                </div>

                {/* Vertical connector segment */}
                {!isLast && (
                  <div
                    style={{
                      width: 6,
                      flex: 1,
                      minHeight: 24,
                      marginTop: 4,
                      marginBottom: 4,
                      borderRadius: 3,
                      background: isCompleted
                        ? `linear-gradient(to bottom, ${color}, ${nextColor})`
                        : "#E5E7EB",
                    }}
                  />
                )}
              </div>

              {/* Right: state + label */}
              <div className="flex flex-col justify-start py-1 pb-6">
                <span 
                  className="text-[11px] font-bold leading-none mb-1.5" 
                  style={{ color: (isCompleted || isActive) ? color : "#9CA3AF" }}
                >
                  {isActive ? "En cours" : isCompleted ? "Terminé" : "À venir"}
                </span>
                <span
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full py-4">
      {renderDesktopView()}
      {renderMobileView()}
    </div>
  )
}
