"use client"

import type { IntelligenceAction } from "@/lib/intelligence/intelligence-registry"
import { openCommunicationComposer, type CommunicationComposerOrigin, type CommunicationComposerRequest } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { useIntelligenceContext, type IntelligenceEntityContext } from "@/hooks/use-intelligence-context"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { cockpitIconForAction } from "./cockpit-action-icons"
import { isDeterministicIntelligenceAction } from "./action-results/IntelligenceActionResultContent"
import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"
import { CockpitActionCard } from "./cockpit-mobile/CockpitIntelligenceCards"

interface IntelligenceActionCardProps {
  action: IntelligenceAction
  tone?: "dark" | "light" | "cockpit-mobile"
  onActionClick?: (actionId: string) => void
}

type CommunicationActionConfig = {
  scenario: NonNullable<CommunicationComposerRequest["preset"]>["scenario"]
  objective?: NonNullable<CommunicationComposerRequest["preset"]>["objective"]
  tone?: NonNullable<CommunicationComposerRequest["preset"]>["tone"]
  length?: NonNullable<CommunicationComposerRequest["preset"]>["length"]
  origin?: CommunicationComposerOrigin
  scope?: CommunicationComposerRequest["scope"]
}

const INTERNAL_SCOPE_ACTIONS = new Set([
  "analyze_skill_gaps",
  "suggest_training",
  "analyze_activity",
  "forecast_availability",
  "analyze_margins",
  "forecast_revenue",
  "detect_anomalies",
  "analyze_funnel",
  "weekly_brief",
  "action_priorities",
  "pipeline_insights",
  "prepare_day",
  "flag_unprepared_meetings",
  "common_priorities",
])

function originForEntity(entityType?: IntelligenceEntityContext["entityType"]): CommunicationComposerOrigin {
  switch (entityType) {
    case "contact":
      return "contact"
    case "opportunity":
      return "opportunity"
    case "mission":
      return "mission"
    case "project":
      return "project"
    case "calendar_event":
      return "calendar_event"
    case "candidate":
    case "collaborator":
      return "staffing_context"
    default:
      return "intelligence_common"
  }
}

function resolveCommunicationConfig(
  actionId: string,
  entityType?: IntelligenceEntityContext["entityType"],
): CommunicationActionConfig | null {
  switch (actionId) {
    case "generate_pitch":
      return {
        scenario: entityType === "contact" ? "signal_based_pitch" : "meeting_prep_discovery",
        objective: "get_meeting",
        tone: "direct",
      }
    case "search_news":
      return { scenario: "signal_based_pitch", objective: "get_meeting", tone: "direct" }
    case "scan_contacts":
      return { scenario: "first_contact_after_nomination", objective: "get_meeting", tone: "warm" }
    case "build_roadmap":
      return { scenario: "meeting_prep_discovery", objective: "confirm_next_steps", tone: "pedagogical" }
    case "create_campaign":
      return { scenario: "sector_rebound", objective: "get_reply", tone: "direct" }
    case "prioritize_followups":
      return { scenario: "follow_up_no_reply", objective: "get_reply", tone: "warm", length: "concise" }
    case "pipeline_insights":
    case "forecast_revenue":
      return { scenario: "direction_summary_pitch", objective: "align_internal", tone: "direct", scope: "internal" }
    case "action_priorities":
    case "common_priorities":
    case "prepare_day":
      return { scenario: "weekly_briefing_prep", objective: "align_internal", tone: "direct", scope: "internal" }
    case "flag_unprepared_meetings":
      return { scenario: "sensitive_meeting_briefing", objective: "align_internal", tone: "diplomatic", scope: "internal" }
    case "match_profiles":
      return {
        scenario: entityType === "candidate" ? "candidate_to_client_pitch" : "opportunity_to_candidate_pitch",
        objective: entityType === "candidate" ? "advocate_for_candidate" : "request_action",
        tone: "direct",
      }
    case "initiate_quote":
      return { scenario: "proposal_defense_pitch", objective: "accelerate_decision", tone: "assertive" }
    case "initiate_offer":
      return { scenario: "candidate_closing_pitch", objective: "close_candidate", tone: "warm" }
    case "analyze_needs":
    case "detect_risks":
      return { scenario: "risk_meeting_briefing", objective: "de_escalate_tension", tone: "diplomatic" }
    case "project_portfolio_review":
      return { scenario: "project_status_pitch", objective: "align_internal", tone: "direct" }
    case "analyze_skill_gaps":
      return { scenario: "internal_validation_before_send", objective: "align_internal", tone: "direct", scope: "internal" }
    case "suggest_training":
      return { scenario: "one_on_one_alignment", objective: "acknowledge_contribution", tone: "warm" }
    case "analyze_activity":
      return { scenario: "quarterly_business_review", objective: "align_internal", tone: "direct", scope: "internal" }
    case "forecast_availability":
      return { scenario: "intercontract_exit_pitch", objective: "secure_resources", tone: "assertive" }
    // "detect_anomalies" est status: "coming_soon" dans le registre : elle ne doit avoir
    // AUCUN chemin interactif, sinon `isComingSoon` (= status coming_soon && !isInteractive)
    // redevient false et la carte s'ouvre sur un composeur de rédaction qui n'a rien à voir
    // avec la capacité annoncée. Ne pas lui redonner de config ici.
    case "analyze_funnel":
      return { scenario: "recruiter_briefing_pre_interview", objective: "align_internal", tone: "direct", scope: "internal" }
    default:
      return null
  }
}

function buildCommunicationRequest(
  action: IntelligenceAction,
  entityContext: IntelligenceEntityContext | null,
): CommunicationComposerRequest | null {
  const config = resolveCommunicationConfig(action.id, entityContext?.entityType)
  if (!config) return null

  const entityType = entityContext?.entityType
  const isCollaborator = entityType === "collaborator"
  const scope = config.scope ?? (isCollaborator ? "collaborator" : entityContext ? undefined : INTERNAL_SCOPE_ACTIONS.has(action.id) ? "internal" : undefined)
  const primaryEntity = entityContext
    ? { type: entityContext.entityType, id: entityContext.entityId }
    : undefined

  const contextHint = [
    `[POINT_ENTREE_KREDO] ${action.label}`,
    action.description,
    entityContext
      ? `Contexte affiché : ${entityContext.label} (${entityContext.entityType}). Utilise les données résolues par Kredo et n'invente aucun fait absent du contexte.`
      : "Contexte transverse : aide l'utilisateur à structurer la demande avant génération si aucun compte ou objet métier n'est résolu.",
  ].filter(Boolean).join("\n")

  return {
    origin: config.origin ?? originForEntity(entityType),
    scope,
    collaboratorId: isCollaborator ? entityContext?.entityId : undefined,
    primaryEntity,
    preset: {
      scenario: config.scenario,
      objective: config.objective,
      tone: config.tone,
      length: config.length,
      mustInclude: contextHint,
    },
  }
}

export function IntelligenceActionCard({ action, tone = "dark", onActionClick }: IntelligenceActionCardProps) {
  const isDark = tone === "dark"
  const entityContext = useIntelligenceContext((state) => state.entityContext)
  const communicationRequest = buildCommunicationRequest(action, entityContext)
  const isWriteEmail = action.id === "common_write_email"
  const isCommonReport = action.id === "common_report"
  const isActivityReport = action.id === "activity_report"
  const isWeeklyBrief = action.id === "weekly_brief"
  const isSupportedReportAction = isCommonReport || isActivityReport || isWeeklyBrief
  const isDeterministicAction = isDeterministicIntelligenceAction(action.id)
  const isMissionComposerAction = action.id in MISSION_COMPOSER_ACTION_CONFIGS
  const isInteractive = isMissionComposerAction || isDeterministicAction || isWriteEmail || isSupportedReportAction || Boolean(communicationRequest)
  const isComingSoon = action.status === "coming_soon"
  const canInteract = isInteractive && !isComingSoon
  const iconSrc = cockpitIconForAction(action.id, action.icon)
  const displayLabel = isMissionComposerAction
    ? action.label.startsWith("Mission")
      ? action.label
      : `Mission ${action.label}`
    : action.label

  function handleClick() {
    if (isMissionComposerAction) {
      onActionClick?.(action.id)
      return
    }

    if (isDeterministicAction) {
      onActionClick?.(action.id)
      return
    }

    if (communicationRequest) {
      openCommunicationComposer(communicationRequest)
      return
    }

    if (isWriteEmail) {
      openCommunicationComposer({ origin: "intelligence_common" })
      return
    }

    if (isActivityReport) {
      openReportGeneration({ origin: "commercial_activity", reportType: "activity_commercial" })
      return
    }

    if (isWeeklyBrief) {
      openReportGeneration({ origin: "cockpit", reportType: "weekly_manager" })
      return
    }

    if (isCommonReport) {
      openReportGeneration({ origin: "intelligence_common" })
    }
  }

  if (tone === "cockpit-mobile") {
    return (
      <CockpitActionCard
        label={displayLabel}
        iconSrc={iconSrc}
        state={isComingSoon ? "coming_soon" : "default"}
        onClick={canInteract ? handleClick : undefined}
      />
    )
  }

  if (isDark) {
    return (
      <button
        type="button"
        disabled={isComingSoon}
        onClick={canInteract ? handleClick : undefined}
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
            {displayLabel}
          </p>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={isComingSoon}
      onClick={canInteract ? handleClick : undefined}
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
        {displayLabel}
      </span>
    </button>
  )
}
