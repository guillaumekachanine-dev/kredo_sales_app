"use client"

import Image from "next/image"
import { useEffect, useRef, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import type {
  Contact,
  Opportunity,
  OpportunityEvent,
  OpportunitySkill,
  OpportunityStandingProfile,
  SalesOutcome,
  SalesPriority,
  SalesStage,
} from "@/types/database-domain"
import { OpportunitySkillsPanel } from "./OpportunitySkillsPanel"
import { OpportunityContactsPanel } from "./OpportunityContactsPanel"
import { OpportunityStandingPanel } from "./OpportunityStandingPanel"
import { OpportunityTimelinePanel } from "./OpportunityTimelinePanel"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { upsertAccountByName } from "@/app/(app)/missions/_actions/upsert-account"
import {
  createOpportunityStaffing,
  searchOpportunityStaffingProfiles,
  getAllCollaboratorsForStaffing,
  type StaffingSearchResult,
  type StaffingSourceType,
} from "@/app/(app)/missions/_actions/opportunity-staffing"
import { createOpportunityInteraction } from "@/app/(app)/missions/_actions/opportunity-interactions"
import {
  formatEuro,
  formatDate,
  formatDateNumeric,
  formatDateTime,
} from "@/lib/formatters"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import {
  TYPE_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_LABELS,
  getStageLabel,
  getPriorityLabel,
  getTypeLabel,
} from "./opportunity-detail-options"
import { getPracticeByName, type PracticeSlug } from "@/lib/config/practices"
import {
  getOpportunityPipelineIndex,
  getOpportunityStageColor,
  getOpportunityStageIcon,
  getOpportunityStageLabel,
  OPPORTUNITY_ACTIVE_STAGES,
  OPPORTUNITY_TERMINAL_STAGES,
} from "@/lib/opportunities/stages"

interface OpportunityDetailData {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
    website: string | null
  } | null
  skills: OpportunitySkill[]
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  events: OpportunityEvent[]
  standingProfiles: OpportunityStandingProfile[]
}

const SEQUENTIAL_STEPS = OPPORTUNITY_ACTIVE_STAGES.map((stage, index) => ({
  key: stage.value,
  label: stage.label,
  num: index + 1,
}))

const OUTCOME_STEPS = OPPORTUNITY_TERMINAL_STAGES.map((stage) => ({
  key: stage.value,
  label: stage.label,
  color: getOpportunityStageColor(stage.value),
}))

function StageStepIcon({
  stage,
  label,
  active,
  compact = false,
}: {
  stage: SalesStage
  label: string
  active: boolean
  compact?: boolean
}) {
  const icon = getOpportunityStageIcon(stage)
  if (!icon) return null

  return (
    <Image
      src={icon}
      alt={label}
      width={compact ? 32 : 52}
      height={compact ? 32 : 52}
      className={cn(
        "object-contain transition-all duration-300",
        compact ? "h-8 w-8" : "h-[52px] w-[52px]",
      )}
      style={{
        filter: active ? "none" : "grayscale(100%)",
        opacity: active ? 1 : 0.4,
      }}
    />
  )
}

function stageRing(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`
}


const COMMERCIAL_ACTION_TYPES = [
  { value: "appel", label: "Appel de qualification" },
  { value: "envoi_cv", label: "Envoi de CV" },
  { value: "relance", label: "Relance" },
  { value: "reunion", label: "Présentation consultant" },
  { value: "negociation", label: "Négociation" },
  { value: "envoi_offre", label: "Envoi de devis / offre" },
  { value: "rdv_client", label: "RDV client" },
  { value: "note", label: "Note" },
  { value: "autre", label: "Autre" },
] as const

type CommercialActionType = (typeof COMMERCIAL_ACTION_TYPES)[number]["value"]

const OPPORTUNITY_REMOTE_OPTIONS = [
  { value: "sur_site", label: "Sur site" },
  { value: "hybride", label: "Hybride" },
  { value: "full_remote", label: "Full remote" },
] as const

const HEADER_ICON_PATHS = {
  engagementType: "/icons_set/type_engagement.png",
  startDate: "/icons_set/date.png",
  duration: "/icons_set/durée.png",
  estimatedAcv: "/icons_set/ACV_estime.png",
} as const

const PRACTICE_LOGO_BY_SLUG: Record<PracticeSlug, string> = {
  "data-ia": "/images/practices/practice_data_ai.png",
  "digital-cloud": "/images/practices/practice_cloud_computing.png",
  "agile-pm": "/images/practices/practice_project_management.png",
  cybersecurity: "/images/practices/practice_cybersecurite.png",
  "qa-testing": "/images/practices/practice_qa_testing.png",
}

interface OpportunityEditFormProps {
  data: OpportunityDetailData
  onSuccess: () => void
}

// Pencil icon helper
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function OpportunityHeaderMetric({
  icon,
  value,
}: {
  icon: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[10px] uppercase text-muted tracking-wider font-semibold whitespace-nowrap">
        {value}
      </span>
    </div>
  )
}

function formatOpportunityDuration(duration: number | null | undefined): string {
  if (!duration) return "—"
  return `${duration} jours`
}

function getPracticeHeaderContent(practice: string | null | undefined): {
  iconSrc: string | null
  value: string
} {
  if (!practice) {
    return { iconSrc: null, value: "—" }
  }

  const practiceConfig = getPracticeByName(practice)
  if (!practiceConfig) {
    return { iconSrc: null, value: practice }
  }

  return {
    iconSrc: PRACTICE_LOGO_BY_SLUG[practiceConfig.slug] ?? null,
    value: practiceConfig.shortName,
  }
}

function getEngagementTypeValue(opportunity: Opportunity): string {
  const typeLabel = getTypeLabel(opportunity.opportunity_type)
  if (typeLabel !== "—") return typeLabel
  if (opportunity.requires_staffing) return "Staffing"
  return "—"
}

export function OpportunityEditForm({ data, onSuccess }: OpportunityEditFormProps) {
  const { opportunity, account } = data
  const practiceHeaderContent = getPracticeHeaderContent(opportunity.practice)
  const engagementTypeValue = getEngagementTypeValue(opportunity)
  const estimatedAcv = opportunity.acv ?? opportunity.estimated_gain
  // editingSection: null = lecture, string = section en cours d'édition
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isCreatingStaffing, startCreatingStaffing] = useTransition()
  const [isCreatingAction, startCreatingAction] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState<string | null>(null)
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false)
  const [isStaffingDialogOpen, setIsStaffingDialogOpen] = useState(false)
  const [isCommercialActionDialogOpen, setIsCommercialActionDialogOpen] = useState(false)
  const [staffingErrorMsg, setStaffingErrorMsg] = useState<string | null>(null)
  const [commercialActionErrorMsg, setCommercialActionErrorMsg] = useState<string | null>(null)

  const initialAccountValue: AccountValue | null = account
    ? { id: account.id, name: account.name, isNew: false }
    : null

  const [selectedAccount, setSelectedAccount] = useState<AccountValue | null>(initialAccountValue)
  const [staffingForm, setStaffingForm] = useState<{
    sourceType: StaffingSourceType
    query: string
    selected: StaffingSearchResult | null
  }>({
    sourceType: "collaborator",
    query: "",
    selected: null,
  })
  const [staffingSearchResults, setStaffingSearchResults] = useState<StaffingSearchResult[]>([])
  const [isSearchingStaffing, setIsSearchingStaffing] = useState(false)
  const [allCollaborators, setAllCollaborators] = useState<StaffingSearchResult[]>([])
  const staffingSearchRequestRef = useRef(0)
  const staffingSearchTimeoutRef = useRef<number | null>(null)
  const [commercialActionForm, setCommercialActionForm] = useState({
    type: COMMERCIAL_ACTION_TYPES[0].value as CommercialActionType,
    details: "",
    occurred_at: new Date().toISOString().slice(0, 10),
    contact_id: data.contacts[0]?.contact.id || "",
  })

  // Form State
  const [form, setForm] = useState({
    title: opportunity.title,
    practice: opportunity.practice || "",
    opportunity_type: opportunity.opportunity_type || "",
    source: opportunity.source || "",
    stage: opportunity.stage as SalesStage,
    outcome: opportunity.outcome as SalesOutcome | null,
    priority: opportunity.priority as SalesPriority,
    conviction: opportunity.conviction,
    need_summary: opportunity.need_summary || "",
    client_context: opportunity.client_context || "",
    engagement_notes: opportunity.engagement_notes || "",
    target_daily_rate: opportunity.target_daily_rate ?? "",
    duration: opportunity.duration ?? "",
    estimated_gain: opportunity.estimated_gain ?? "",
    target_close_date: opportunity.target_close_date || "",
    start_date: opportunity.start_date || "",
    next_action_label: opportunity.next_action_label || "",
    next_action_at: opportunity.next_action_at ? opportunity.next_action_at.slice(0, 16) : "",
    seniority: opportunity.seniority || "",
    location: opportunity.location || "",
    remote_policy: opportunity.remote_policy || "",
    opened_at: opportunity.opened_at ? opportunity.opened_at.slice(0, 10) : "",
    required_headcount: opportunity.required_headcount ?? 1,
    requires_staffing: opportunity.requires_staffing ?? false,
    win_reason: opportunity.win_reason || "",
    loss_reason: opportunity.loss_reason || "",
    diffusion_date: opportunity.diffusion_date || "",
    decision_date: opportunity.decision_date || "",
    rythme: opportunity.rythme || "",
    budget: opportunity.budget ?? "",
    searched_profile: opportunity.searched_profile || "",
  })

  // Détection layout mobile/desktop dynamique pour éviter le display:none CSS
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkLayout = () => setIsMobile(window.innerWidth < 768)
    checkLayout()
    window.addEventListener("resize", checkLayout)
    return () => window.removeEventListener("resize", checkLayout)
  }, [])

  const resetForm = () => {
    setForm({
      title: opportunity.title,
      practice: opportunity.practice || "",
      opportunity_type: opportunity.opportunity_type || "",
      source: opportunity.source || "",
      stage: opportunity.stage as SalesStage,
      outcome: opportunity.outcome as SalesOutcome | null,
      priority: opportunity.priority as SalesPriority,
      conviction: opportunity.conviction,
      need_summary: opportunity.need_summary || "",
      client_context: opportunity.client_context || "",
      engagement_notes: opportunity.engagement_notes || "",
      target_daily_rate: opportunity.target_daily_rate ?? "",
      duration: opportunity.duration ?? "",
      estimated_gain: opportunity.estimated_gain ?? "",
      target_close_date: opportunity.target_close_date || "",
      start_date: opportunity.start_date || "",
      next_action_label: opportunity.next_action_label || "",
      next_action_at: opportunity.next_action_at ? opportunity.next_action_at.slice(0, 16) : "",
      seniority: opportunity.seniority || "",
      location: opportunity.location || "",
      remote_policy: opportunity.remote_policy || "",
      opened_at: opportunity.opened_at ? opportunity.opened_at.slice(0, 10) : "",
      required_headcount: opportunity.required_headcount ?? 1,
      requires_staffing: opportunity.requires_staffing ?? false,
      win_reason: opportunity.win_reason || "",
      loss_reason: opportunity.loss_reason || "",
      diffusion_date: opportunity.diffusion_date || "",
      decision_date: opportunity.decision_date || "",
      rythme: opportunity.rythme || "",
      budget: opportunity.budget ?? "",
      searched_profile: opportunity.searched_profile || "",
    })
  }

  const resetStaffingDialog = () => {
    setStaffingForm({
      sourceType: "collaborator",
      query: "",
      selected: null,
    })
    setStaffingSearchResults([])
    setStaffingErrorMsg(null)
    setIsSearchingStaffing(false)
  }

  const resetCommercialActionDialog = () => {
    setCommercialActionForm({
      type: COMMERCIAL_ACTION_TYPES[0].value as CommercialActionType,
      details: "",
      occurred_at: new Date().toISOString().slice(0, 10),
      contact_id: data.contacts[0]?.contact.id || "",
    })
    setCommercialActionErrorMsg(null)
  }

  const handleCancel = () => {
    setEditingSection(null)
    setErrorMsg(null)
    setSelectedAccount(initialAccountValue)
    resetForm()
  }

  useEffect(() => {
    return () => {
      if (staffingSearchTimeoutRef.current) {
        window.clearTimeout(staffingSearchTimeoutRef.current)
      }
    }
  }, [])

  const handleStaffingDialogOpenChange = (open: boolean) => {
    setIsStaffingDialogOpen(open)
    if (open) {
      if (allCollaborators.length === 0) {
        getAllCollaboratorsForStaffing().then((data) => {
          setAllCollaborators(data)
          // Show all collaborators immediately if still in collaborator mode
          if (staffingForm.sourceType === "collaborator") {
            setStaffingSearchResults(data)
          }
        })
      } else if (staffingForm.sourceType === "collaborator") {
        setStaffingSearchResults(allCollaborators)
      }
    }
    if (!open) {
      resetStaffingDialog()
    }
  }

  const handleCommercialActionDialogOpenChange = (open: boolean) => {
    setIsCommercialActionDialogOpen(open)
    if (!open) {
      resetCommercialActionDialog()
    }
  }

  const handleStaffingQueryChange = (value: string, sourceType: StaffingSourceType) => {
    setStaffingForm((prev) => ({
      ...prev,
      query: value,
      selected: null,
    }))

    if (staffingSearchTimeoutRef.current) {
      window.clearTimeout(staffingSearchTimeoutRef.current)
    }

    if (value.trim().length < 1) {
      // For collaborators: show all; for candidates: clear
      if (sourceType === "collaborator") {
        setStaffingSearchResults(allCollaborators)
      } else {
        setStaffingSearchResults([])
      }
      setIsSearchingStaffing(false)
      return
    }

    // For collaborators: filter client-side
    if (sourceType === "collaborator") {
      const q = value.trim().toLowerCase()
      setStaffingSearchResults(
        allCollaborators.filter(
          (c) => c.full_name.toLowerCase().includes(q) || (c.subtitle || "").toLowerCase().includes(q)
        )
      )
      setIsSearchingStaffing(false)
      return
    }

    // For candidates: server search
    const requestId = staffingSearchRequestRef.current + 1
    staffingSearchRequestRef.current = requestId
    setIsSearchingStaffing(true)

    staffingSearchTimeoutRef.current = window.setTimeout(async () => {
      const results = await searchOpportunityStaffingProfiles(value.trim(), sourceType)
      if (staffingSearchRequestRef.current !== requestId) return
      setStaffingSearchResults(results)
      setIsSearchingStaffing(false)
    }, 250)
  }

  const getStageIndex = (stage: string) => getOpportunityPipelineIndex(stage)

  const currentIdx = getStageIndex(form.stage)

  const handleStageSelect = async (newStage: SalesStage) => {
    // If a section is being edited, just update local state
    if (editingSection !== null) {
      setForm((prev) => ({ ...prev, stage: newStage }))
      return
    }

    setLoadingStage(newStage)
    setErrorMsg(null)
    startTransition(async () => {
      const result = await updateOpportunity({
        id: opportunity.id,
        stage: newStage,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        onSuccess()
        setForm((prev) => ({ ...prev, stage: newStage }))
      }
      setLoadingStage(null)
    })
  }

  const renderPipelineTimeline = (isDesktopView: boolean) => {
    const getSegmentBackground = (i: number) => {
      if (i < SEQUENTIAL_STEPS.length - 1) {
        const isSegmentCompleted = currentIdx > i
        if (isSegmentCompleted) {
          const stepColor = getOpportunityStageColor(SEQUENTIAL_STEPS[i].key)
          const nextStepColor = getOpportunityStageColor(SEQUENTIAL_STEPS[i + 1].key)
          return `linear-gradient(to right, ${stepColor}, ${nextStepColor})`
        }
        return "#E5E7EB"
      } else {
        const stepColor = getOpportunityStageColor(SEQUENTIAL_STEPS[SEQUENTIAL_STEPS.length - 1].key)
        if (form.stage === "gagne") {
          return `linear-gradient(to right, ${stepColor}, ${getOpportunityStageColor("gagne")})`
        }
        if (form.stage === "perdu") return getOpportunityStageColor("perdu")
        if (form.stage === "abandonne") return getOpportunityStageColor("abandonne")
        if (form.stage === "non_traitee") return getOpportunityStageColor("non_traitee")
        return "#E5E7EB"
      }
    }

    // ── DESKTOP ──
    if (isDesktopView) {
      return (
        <div className="w-full relative select-none py-2">
          {isPending && loadingStage && (
            <div className="flex justify-center mb-3">
              <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wider" style={{ color: "#2C7D5C" }}>
                Mise à jour en cours...
              </span>
            </div>
          )}

          {/* Timeline Nodes Row Container */}
          <div className="relative w-full h-[120px]">
            {/* Connector lines (behind nodes) */}
            {[0, 1, 2, 3, 4].map((i) => {
              const bg = getSegmentBackground(i)
              return (
                <div
                  key={i}
                  className="absolute h-2 rounded-full z-0"
                  style={{
                    top: 42, // (date label ~16px + half circle size 26px = 42px)
                    left: `calc(64px + ${i * 20}% - ${i * 25.6}px)`,
                    width: `calc(20% - 25.6px)`,
                    background: bg,
                  }}
                />
              )
            })}

            {/* Shine beam */}
            {currentIdx > 0 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 42,
                  height: 8,
                  left: 64,
                  width: `calc(${Math.min(currentIdx, 5) * 20}% - ${Math.min(currentIdx, 5) * 25.6}px)`,
                  pointerEvents: "none",
                  zIndex: 30,
                  overflow: "hidden",
                  borderRadius: 4,
                }}
              >
                <div className="pipeline-shine-beam" />
              </div>
            )}

            {/* Sequential Steps Nodes */}
            {SEQUENTIAL_STEPS.map((step, idx) => {
              const isCompleted = currentIdx > idx
              const isActive = currentIdx === idx
              const isLoading = loadingStage === step.key
              const stepColor = getOpportunityStageColor(step.key)

              return (
                <div
                  key={step.key}
                  className="absolute flex flex-col items-center z-10"
                  style={{
                    left: `calc(64px + ${idx * 20}% - ${idx * 25.6}px)`,
                    transform: "translateX(-50%)",
                    width: 120,
                  }}
                >
                  {/* Date label above */}
                  <span
                    className="text-[11px] font-bold mb-1.5 leading-none h-4 flex items-center justify-center"
                    style={{ color: (isCompleted || isActive) ? stepColor : "#9CA3AF" }}
                  >
                    {isActive ? "En cours" : isCompleted ? "✓" : "—"}
                  </span>

                  {/* Node circle */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStageSelect(step.key as SalesStage)}
                    className="flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300 overflow-hidden shrink-0"
                    style={{
                      width: 52,
                      height: 52,
                      backgroundColor: "#FFFFFF",
                      border: isActive
                        ? `3px solid ${stepColor}`
                        : isCompleted
                        ? `2.5px solid ${stepColor}`
                        : "2px solid #E5E7EB",
                      boxShadow: isActive
                        ? `0 0 0 4px ${stageRing(stepColor, 22)}`
                        : isCompleted
                        ? `0 2px 8px ${stageRing(stepColor, 28)}`
                        : "none",
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2C7D5C" strokeWidth="4" />
                        <path className="opacity-75" fill="#2C7D5C" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <StageStepIcon
                        stage={step.key as SalesStage}
                        label={step.label}
                        active={isCompleted || isActive}
                      />
                    )}
                  </button>

                  {/* Label below */}
                  <div className="mt-3 text-center w-full px-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStageSelect(step.key as SalesStage)}
                      className="text-[12px] font-bold leading-tight cursor-pointer disabled:cursor-not-allowed transition-colors whitespace-normal w-full"
                      style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                    >
                      {step.label}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Issue Node (Gagné/Perdu/etc., index 5) */}
            <div
              className="absolute flex flex-col items-center z-10"
              style={{
                left: "calc(100% - 64px)",
                transform: "translateX(-50%)",
                width: 120,
              }}
            >
              {/* Status indicator above */}
              <span
                className="text-[11px] font-bold mb-1.5 leading-none h-4 flex items-center justify-center"
                style={{
                  color:
                    form.stage === "gagne" ? getOpportunityStageColor("gagne")
                    : form.stage === "perdu" ? getOpportunityStageColor("perdu")
                    : form.stage === "abandonne" ? getOpportunityStageColor("abandonne")
                    : form.stage === "non_traitee" ? getOpportunityStageColor("non_traitee")
                    : "#9CA3AF"
                }}
              >
                {(form.stage === "gagne" || form.stage === "perdu" || form.stage === "abandonne") ? "✓"
                  : form.stage === "non_traitee" ? "—"
                  : "—"}
              </span>

              {/* Node circle & dropdown trigger */}
              <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                  className={cn(
                    "relative z-10 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300 overflow-hidden w-full h-full",
                    form.stage === "gagne" && "pipeline-gagne-node"
                  )}
                  style={{
                    backgroundColor: form.stage === "gagne" ? undefined : "#FFFFFF",
                    border:
                      form.stage === "gagne" ? undefined
                      : form.stage === "perdu" ? `3px solid ${getOpportunityStageColor("perdu")}`
                      : form.stage === "abandonne" ? `3px solid ${getOpportunityStageColor("abandonne")}`
                      : form.stage === "non_traitee" ? `2px solid ${getOpportunityStageColor("non_traitee")}`
                      : "2px solid #D1D5DB",
                    boxShadow:
                      form.stage === "gagne" ? undefined
                      : form.stage === "perdu" ? "0 0 0 4px rgba(220,38,38,0.15), 0 2px 8px rgba(220,38,38,0.25)"
                      : form.stage === "abandonne" ? "0 0 0 4px rgba(245,158,11,0.15), 0 2px 8px rgba(245,158,11,0.25)"
                      : form.stage === "non_traitee" ? "0 0 0 4px rgba(156,163,175,0.15), 0 2px 8px rgba(156,163,175,0.25)"
                      : "none",
                  }}
                >
                  {loadingStage && ["gagne", "perdu", "abandonne", "non_traitee"].includes(loadingStage) ? (
                    <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={
                        loadingStage === "gagne" ? getOpportunityStageColor("gagne")
                        : loadingStage === "perdu" ? getOpportunityStageColor("perdu")
                        : loadingStage === "abandonne" ? getOpportunityStageColor("abandonne")
                        : getOpportunityStageColor("non_traitee")
                      } strokeWidth="4" />
                      <path className="opacity-75" fill={
                        loadingStage === "gagne" ? getOpportunityStageColor("gagne")
                        : loadingStage === "perdu" ? getOpportunityStageColor("perdu")
                        : loadingStage === "abandonne" ? getOpportunityStageColor("abandonne")
                        : getOpportunityStageColor("non_traitee")
                      } d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : form.stage === "gagne" ? (
                    <img
                      src="/icons_set/oppy_win_2.png"
                      alt="Gagné"
                      className="w-8 h-8 object-contain"
                      style={{ position: "relative", zIndex: 1 }}
                    />
                  ) : null}
                </button>

                {/* Floating dropdown menu */}
                {isIssueDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsIssueDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-44 bg-canvas border border-border rounded-lg shadow-xl py-1 z-40">
                      {OUTCOME_STEPS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            handleStageSelect(opt.key as SalesStage)
                            setIsIssueDropdownOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted/10 flex items-center gap-2"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
                          <span className="text-heading">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Label below */}
              <div className="mt-3 text-center">
                <span
                  className="text-[12px] font-bold leading-tight"
                  style={{
                    color:
                      form.stage === "gagne" ? getOpportunityStageColor("gagne")
                      : form.stage === "perdu" ? getOpportunityStageColor("perdu")
                      : form.stage === "abandonne" ? getOpportunityStageColor("abandonne")
                      : form.stage === "non_traitee" ? getOpportunityStageColor("non_traitee")
                      : "#6B7280"
                  }}
                >
                  {form.stage === "gagne" ? getOpportunityStageLabel("gagne")
                    : form.stage === "perdu" ? getOpportunityStageLabel("perdu")
                    : form.stage === "abandonne" ? getOpportunityStageLabel("abandonne")
                    : form.stage === "non_traitee" ? getOpportunityStageLabel("non_traitee")
                    : "Issue"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ── MOBILE: vertical ──
    return (
      <div className="w-full">
        {isPending && loadingStage && (
          <div className="flex justify-center mb-3">
            <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wider" style={{ color: "#2C7D5C" }}>
              Mise à jour en cours...
            </span>
          </div>
        )}
        <div className="flex flex-col gap-0">
          {SEQUENTIAL_STEPS.map((step, idx) => {
            const isCompleted = currentIdx > idx
            const isActive = currentIdx === idx
            const isLast = idx === SEQUENTIAL_STEPS.length - 1
            const isLoading = loadingStage === step.key
            const stepColor = getOpportunityStageColor(step.key)
            const nextStepColor = getOpportunityStageColor(
              SEQUENTIAL_STEPS[Math.min(idx + 1, SEQUENTIAL_STEPS.length - 1)]?.key ?? step.key,
            )

            return (
              <div key={step.key} className="flex items-stretch gap-4">
                {/* Left: node + connector */}
                <div className="flex flex-col items-center shrink-0" style={{ width: 44 }}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStageSelect(step.key as SalesStage)}
                    className="flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300 shrink-0 z-10 overflow-hidden"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: "#FFFFFF",
                      border: isActive
                        ? `3px solid ${stepColor}`
                        : isCompleted
                        ? `2.5px solid ${stepColor}`
                        : "2px solid #E5E7EB",
                      boxShadow: isActive
                        ? `0 0 0 4px ${stageRing(stepColor, 22)}`
                        : isCompleted
                        ? `0 2px 8px ${stageRing(stepColor, 28)}`
                        : "none",
                      transform: isActive ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2C7D5C" strokeWidth="4" />
                        <path className="opacity-75" fill="#2C7D5C" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <StageStepIcon
                        stage={step.key as SalesStage}
                        label={step.label}
                        active={isCompleted || isActive}
                      />
                    )}
                  </button>
                  {/* Vertical connector pill */}
                  <div
                    style={{
                      width: 8,
                      flex: 1,
                      minHeight: 20,
                      marginTop: 4,
                      borderRadius: 4,
                      background: isCompleted
                        ? `linear-gradient(to bottom, ${stepColor}, ${nextStepColor})`
                        : isLast
                          ? form.stage === "gagne"
                            ? `linear-gradient(to bottom, ${stepColor}, ${getOpportunityStageColor("gagne")})`
                            : form.stage === "perdu" ? getOpportunityStageColor("perdu")
                            : form.stage === "abandonne" ? getOpportunityStageColor("abandonne")
                            : form.stage === "non_traitee" ? getOpportunityStageColor("non_traitee")
                            : "#E5E7EB"
                          : "#E5E7EB",
                    }}
                  />
                </div>

                {/* Right: date + label */}
                <div className="flex flex-col justify-start py-1 pb-6">
                  <span className="text-[11px] font-bold leading-none mb-1" style={{ color: (isCompleted || isActive) ? stepColor : "#9CA3AF" }}>
                    {isActive ? "En cours" : isCompleted ? "Terminé" : "À venir"}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStageSelect(step.key as SalesStage)}
                    className="text-[13px] font-bold text-left cursor-pointer disabled:cursor-not-allowed"
                    style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                  >
                    {step.label}
                  </button>
                </div>
              </div>
            )
          })
        }

          {/* Outcome row */}
          <div className="flex items-start gap-4 mt-1 relative">
            <div className="flex flex-col items-center shrink-0" style={{ width: 44 }}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300 shrink-0 z-10 cursor-pointer overflow-hidden",
                    form.stage === "gagne" && "pipeline-gagne-node"
                  )}
                  style={{
                    width: 44,
                    height: 44,
                    backgroundColor: form.stage === "gagne" ? undefined : "#FFFFFF",
                    border:
                      form.stage === "gagne" ? undefined
                      : form.stage === "perdu" ? `3px solid ${getOpportunityStageColor("perdu")}`
                      : form.stage === "abandonne" ? `3px solid ${getOpportunityStageColor("abandonne")}`
                      : form.stage === "non_traitee" ? `2px solid ${getOpportunityStageColor("non_traitee")}`
                      : "2px solid #D1D5DB",
                    boxShadow:
                      form.stage === "gagne" ? undefined
                      : form.stage === "perdu" ? "0 0 0 4px rgba(220,38,38,0.15)"
                      : form.stage === "abandonne" ? "0 0 0 4px rgba(245,158,11,0.15)"
                      : form.stage === "non_traitee" ? "0 0 0 4px rgba(156,163,175,0.15)"
                      : "none",
                    transform: (form.stage === "gagne" || form.stage === "perdu" || form.stage === "abandonne" || form.stage === "non_traitee") ? "scale(1.08)" : "scale(1)",
                  }}
                >
                    {loadingStage && ["gagne", "perdu", "abandonne", "non_traitee"].includes(loadingStage) ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke={
                        loadingStage === "gagne" ? getOpportunityStageColor("gagne")
                        : loadingStage === "perdu" ? getOpportunityStageColor("perdu")
                        : loadingStage === "abandonne" ? getOpportunityStageColor("abandonne")
                        : getOpportunityStageColor("non_traitee")
                      } strokeWidth="4" />
                      <path className="opacity-75" fill={
                        loadingStage === "gagne" ? getOpportunityStageColor("gagne")
                        : loadingStage === "perdu" ? getOpportunityStageColor("perdu")
                        : loadingStage === "abandonne" ? getOpportunityStageColor("abandonne")
                        : getOpportunityStageColor("non_traitee")
                      } d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : form.stage === "gagne" ? (
                    <img
                      src="/icons_set/oppy_win_2.png"
                      alt="Gagné"
                      className="w-6 h-6 object-contain"
                      style={{ position: "relative", zIndex: 1 }}
                    />
                  ) : null}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                  className="p-1 rounded bg-canvas border border-border text-muted hover:text-heading hover:bg-muted/10 transition-colors z-20 shrink-0 self-center"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-start py-1 pb-6 relative">
              <span
                className="text-[11px] font-bold leading-none mb-1"
                style={{
                  color:
                    form.stage === "gagne" ? getOpportunityStageColor("gagne")
                    : form.stage === "perdu" ? getOpportunityStageColor("perdu")
                    : form.stage === "abandonne" ? getOpportunityStageColor("abandonne")
                    : form.stage === "non_traitee" ? getOpportunityStageColor("non_traitee")
                    : "#9CA3AF"
                }}
              >
                {form.stage === "gagne" ? getOpportunityStageLabel("gagne")
                  : form.stage === "perdu" ? getOpportunityStageLabel("perdu")
                  : form.stage === "abandonne" ? getOpportunityStageLabel("abandonne")
                  : form.stage === "non_traitee" ? getOpportunityStageLabel("non_traitee")
                  : "Issue"}
              </span>
              <span className="text-[13px] font-bold text-heading">
                Issue du processus
              </span>
              <span className="text-[11px] mt-0.5 text-muted">
                Déterminer l&apos;issue finale
              </span>

              {/* Floating dropdown menu for mobile */}
              {isIssueDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsIssueDropdownOpen(false)} />
                  <div className="absolute left-0 top-12 w-44 bg-canvas border border-border rounded-lg shadow-xl py-1 z-40">
                    {OUTCOME_STEPS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          handleStageSelect(opt.key as SalesStage)
                          setIsIssueDropdownOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted/10 flex items-center gap-2"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
                        <span className="text-heading">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSave = (section: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      let payload: Parameters<typeof updateOpportunity>[0] = { id: opportunity.id }

      if (section === "identite") {
        let finalAccountId: string | null = null
        if (selectedAccount) {
          if (selectedAccount.isNew) {
            const upsertRes = await upsertAccountByName(selectedAccount.name)
            if (upsertRes.error) { setErrorMsg(upsertRes.error); return }
            finalAccountId = upsertRes.data?.id ?? null
          } else {
            finalAccountId = selectedAccount.id
          }
        }
        payload = { ...payload, title: form.title, account_id: finalAccountId }
      } else if (section === "synthese-opportunite") {
        payload = {
          ...payload,
          need_summary: form.need_summary || null,
          client_context: form.client_context || null,
          seniority: form.seniority || null,
          location: form.location || null,
          remote_policy: form.remote_policy || null,
          opened_at: form.opened_at || null,
          start_date: form.start_date || null,
          target_close_date: form.target_close_date || null,
          rythme: form.rythme || null,
          budget: form.budget === "" ? null : Number(form.budget),
          required_headcount: Number(form.required_headcount) || 1,
          diffusion_date: form.diffusion_date || null,
          decision_date: form.decision_date || null,
          searched_profile: form.searched_profile || null,
        }
      } else if (section === "besoin") {
        payload = { ...payload, need_summary: form.need_summary || null, client_context: form.client_context || null }
      } else if (section === "engagement") {
        payload = { ...payload, source: form.source || null, next_action_label: form.next_action_label || null, next_action_at: form.next_action_at || null, engagement_notes: form.engagement_notes || null, priority: form.priority, conviction: form.conviction }
      } else if (section === "economie") {
        payload = { ...payload, opportunity_type: form.opportunity_type || null, target_daily_rate: form.target_daily_rate === "" ? null : Number(form.target_daily_rate), duration: form.duration === "" ? null : Number(form.duration), estimated_gain: form.estimated_gain === "" ? null : Number(form.estimated_gain) }
      } else if (section === "staffing") {
        payload = {
          ...payload,
          practice: form.practice || null,
          required_headcount: Number(form.required_headcount) || 1,
          requires_staffing: form.requires_staffing,
        }
      }

      const result = await updateOpportunity(payload)

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setEditingSection(null)
        onSuccess()
      }
    })
  }

  const handleCreateStaffing = () => {
    setStaffingErrorMsg(null)

    if (!staffingForm.selected) {
      setStaffingErrorMsg("Sélectionnez un collaborateur ou un candidat dans la liste.")
      return
    }

    const selectedProfile = staffingForm.selected

    startCreatingStaffing(async () => {
      const result = await createOpportunityStaffing({
        opportunity_id: opportunity.id,
        source_type: selectedProfile.source_type,
        source_id: selectedProfile.id,
      })

      if (result.error) {
        setStaffingErrorMsg(result.error)
        return
      }

      handleStaffingDialogOpenChange(false)
      onSuccess()
    })
  }

  const handleCreateCommercialAction = () => {
    setCommercialActionErrorMsg(null)

    if (!commercialActionForm.occurred_at) {
      setCommercialActionErrorMsg("La date est requise.")
      return
    }

    startCreatingAction(async () => {
      const result = await createOpportunityInteraction({
        opportunity_id: opportunity.id,
        type: commercialActionForm.type,
        details: commercialActionForm.details || null,
        occurred_at: commercialActionForm.occurred_at,
        contact_id: commercialActionForm.contact_id || null,
      })

      if (result.error) {
        setCommercialActionErrorMsg(result.error)
        return
      }

      handleCommercialActionDialogOpenChange(false)
      onSuccess()
    })
  }

  // Boutons Annuler / Enregistrer inline dans chaque section
  const renderSectionEditControls = (section: string) => (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-canvas border border-border text-muted hover:text-heading transition-colors disabled:opacity-40"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={() => handleSave(section)}
        disabled={isPending}
        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-success text-success-fg hover:bg-success/90 transition-colors disabled:opacity-40"
      >
        {isPending ? "…" : "Enregistrer"}
      </button>
    </div>
  )

  // Render helpers
  const inputClass = "w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"
  const labelClass = "block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1"

  const renderPanelTitle = (title: string, accentClass = "bg-primary", iconSrc?: string) => (
    <div className="flex items-center gap-2.5 mb-1 select-none">
      {iconSrc && (
        <Image src={iconSrc} alt="" width={28} height={28} className="object-contain shrink-0" />
      )}
      <div className="flex flex-col">
        <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {title}
        </h3>
        <div className={cn("w-8 h-0.5 mt-1.5 rounded-full", accentClass)} />
      </div>
    </div>
  )

  const primaryActionButtonClass = "px-3 py-1.5 text-[11px] font-semibold rounded-md bg-primary text-primary-fg hover:bg-primary/90 transition-colors disabled:opacity-40"

  const renderSyntheseMissionSection = (className?: string) => (
    <div className={cn("bg-surface border-y-0 border-r-0 border-l-4 border-primary rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-5 relative bg-gradient-to-r from-primary/[0.03] to-transparent", className)}>
      <div className="flex items-start justify-between gap-4">
        {renderPanelTitle("Synthèse de l'opportunité")}
        {editingSection === "synthese-opportunite" ? renderSectionEditControls("synthese-opportunite") : editingSection === null && (
          <button
            type="button"
            onClick={() => setEditingSection("synthese-opportunite")}
            className="p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
            title="Modifier cette section"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <section className="rounded-lg border border-border/40 bg-canvas/20 p-4 flex flex-col gap-4 h-full">
          <div className="flex items-center gap-2">
            <Image src="/icons_set/contexte_client.png" alt="" width={20} height={20} className="object-contain shrink-0" />
            <h4 className="text-sm font-bold text-heading">Besoin client</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Résumé du besoin</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="text"
                  value={form.need_summary}
                  onChange={(e) => setForm({ ...form, need_summary: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs text-body mt-1 font-medium">
                  {opportunity.need_summary || "—"}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Profil recherché</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="text"
                  placeholder="Intitulé exact du profil recherché"
                  value={form.searched_profile}
                  onChange={(e) => setForm({ ...form, searched_profile: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{opportunity.searched_profile || "—"}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Séniorité attendue</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="text"
                  value={form.seniority}
                  onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{opportunity.seniority || "—"}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Nombre de ressources</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="number"
                  min={1}
                  value={form.required_headcount}
                  onChange={(e) => setForm({ ...form, required_headcount: Number(e.target.value) || 1 })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{opportunity.required_headcount || 1}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Lieu de la mission</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{opportunity.location || "—"}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Télétravail</label>
              {editingSection === "synthese-opportunite" ? (
                <Select
                  value={form.remote_policy}
                  onChange={(e) => setForm({ ...form, remote_policy: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  {OPPORTUNITY_REMOTE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-xs font-semibold text-heading mt-1 capitalize">{opportunity.remote_policy?.replaceAll("_", " ") || "—"}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Rythme</label>
              {editingSection === "synthese-opportunite" ? (
                <Select
                  value={form.rythme}
                  onChange={(e) => setForm({ ...form, rythme: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Sélectionner —</option>
                  <option value="temps_plein">Temps plein</option>
                  <option value="mi_temps">Mi-temps</option>
                  <option value="temps_partiel">Temps partiel (à préciser)</option>
                </Select>
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.rythme === "temps_plein" ? "Temps plein" :
                   opportunity.rythme === "mi_temps" ? "Mi-temps" :
                   opportunity.rythme === "temps_partiel" ? "Temps partiel (à préciser)" :
                   opportunity.rythme || "—"}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Budget (TJM client)</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="number"
                  min={0}
                  placeholder="TJ théorique (€)"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.budget ? `${opportunity.budget} €` : "—"}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Date d&apos;ouverture</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.opened_at}
                  onChange={(e) => setForm({ ...form, opened_at: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.opened_at ? formatDate(opportunity.opened_at) : "—"}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/40 bg-canvas/20 p-4 flex flex-col gap-4 h-full">
          <OpportunitySkillsPanel
            opportunityId={opportunity.id}
            skills={data.skills}
            onRefresh={onSuccess}
            embedded
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <section className="rounded-lg border border-border/40 bg-canvas/20 p-4 flex flex-col gap-4 h-full">
          <div className="flex items-center gap-2">
            <Image src="/icons_set/date.png" alt="" width={20} height={20} className="object-contain shrink-0" />
            <h4 className="text-sm font-bold text-heading">Planning de l&apos;opportunité</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Diffusion</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.diffusion_date}
                  onChange={(e) => setForm({ ...form, diffusion_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.diffusion_date ? formatDate(opportunity.diffusion_date) : "—"}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Décision</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.decision_date}
                  onChange={(e) => setForm({ ...form, decision_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.decision_date ? formatDate(opportunity.decision_date) : "—"}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Démarrage</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.start_date ? formatDate(opportunity.start_date) : "—"}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Fin</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.target_close_date}
                  onChange={(e) => setForm({ ...form, target_close_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">
                  {opportunity.target_close_date ? formatDate(opportunity.target_close_date) : "—"}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/40 bg-canvas/20 p-4 flex flex-col gap-4 h-full">
          <OpportunityContactsPanel
            opportunityId={opportunity.id}
            companyId={account?.id ?? null}
            contacts={data.contacts}
            onRefresh={onSuccess}
            embedded
          />
        </section>
      </div>
    </div>
  )

  const renderEngagementSection = () => (
    <div className="bg-surface border-y-0 border-r-0 border-l-4 border-cat-success rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-5 relative bg-gradient-to-br from-cat-success/[0.02] to-transparent">
      <div className="flex items-start justify-between gap-4">
        {renderPanelTitle("Activité commerciale", "bg-cat-success", "/icons_set/activite_commerciale.png")}
        <div className="flex items-center gap-2 shrink-0">
          {editingSection === null && (
            <button
              type="button"
              onClick={() => setIsCommercialActionDialogOpen(true)}
              className={primaryActionButtonClass}
            >
              Créer une action
            </button>
          )}
          {editingSection === "engagement" ? (
            renderSectionEditControls("engagement")
          ) : (
            editingSection === null && (
              <button
                type="button"
                onClick={() => setEditingSection("engagement")}
                className="p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
                title="Modifier cette section"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Source de l&apos;opportunité</label>
            {editingSection === "engagement" ? (
              <Select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inputClass}
                disabled={isPending}
              >
                <option value="">— Sélectionner —</option>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : (
              <p className="text-xs text-body mt-1 font-medium capitalize">
                {opportunity.source ? opportunity.source.replace("_", " ") : "—"}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Priorité</label>
            {editingSection === "engagement" ? (
              <Select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as SalesPriority })}
                className={inputClass}
                disabled={isPending}
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            ) : (
              <p className="text-xs text-body mt-1 font-medium">
                {getPriorityLabel(opportunity.priority)}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Confiance</label>
            {editingSection === "engagement" ? (
              <input
                type="number"
                min="0"
                max="100"
                value={form.conviction}
                onChange={(e) => setForm({ ...form, conviction: Number(e.target.value) })}
                className={inputClass}
                disabled={isPending}
              />
            ) : (
              <p className="text-xs text-body mt-1 font-medium">{opportunity.conviction}%</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Prochaine action</label>
            {editingSection === "engagement" ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={form.next_action_label}
                  onChange={(e) => setForm({ ...form, next_action_label: e.target.value })}
                  className={inputClass}
                  placeholder="Libellé de l'action"
                  disabled={isPending}
                />
                <input
                  type="datetime-local"
                  value={form.next_action_at}
                  onChange={(e) => setForm({ ...form, next_action_at: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            ) : (
              <p className="text-xs text-body mt-1 font-medium">
                {opportunity.next_action_label || "—"}
                {opportunity.next_action_at && (
                  <span className="text-muted block text-[10px] mt-0.5 font-normal">
                    Prévue le : {formatDateTime(opportunity.next_action_at)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes d&apos;engagement</label>
          {editingSection === "engagement" ? (
            <textarea
              value={form.engagement_notes}
              onChange={(e) => setForm({ ...form, engagement_notes: e.target.value })}
              className={inputClass + " h-20 resize-none"}
              disabled={isPending}
            />
          ) : (
            <p className="text-xs text-body mt-1 whitespace-pre-wrap">
              {opportunity.engagement_notes || "—"}
            </p>
          )}
        </div>
      </div>

      <OpportunityTimelinePanel
        opportunityId={opportunity.id}
        events={data.events}
        onRefresh={onSuccess}
      />
    </div>
  )

  const renderFinancialEquationSection = () => (
    <div className="bg-surface border-y-0 border-r-0 border-l-4 border-cat-warning rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-4 relative bg-gradient-to-br from-cat-warning/[0.01] to-transparent">
      <div className="flex items-start justify-between gap-4">
        {renderPanelTitle("Conditions financières", "bg-cat-warning", "/icons_set/conditions_financieres_3.png")}
        {editingSection === "economie" ? (
          renderSectionEditControls("economie")
        ) : (
          editingSection === null && (
            <button
              type="button"
              onClick={() => setEditingSection("economie")}
              className="p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
              title="Modifier cette section"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )
        )}
      </div>
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
          <span className="text-[10px] font-bold text-heading">Type d&apos;engagement</span>
          {editingSection === "economie" ? (
            <Select
              value={form.opportunity_type}
              onChange={(e) => setForm({ ...form, opportunity_type: e.target.value })}
              className={inputClass}
              disabled={isPending}
            >
              <option value="">— Sélectionner —</option>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ) : (
            <span className="text-xs font-semibold text-heading capitalize">{opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}</span>
          )}
        </div>

        <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
          <span className="text-[10px] text-muted font-medium">TJM Cible</span>
          {editingSection === "economie" ? (
            <input
              type="number"
              value={form.target_daily_rate}
              onChange={(e) => setForm({ ...form, target_daily_rate: e.target.value })}
              className={inputClass}
              disabled={isPending}
            />
          ) : (
            <span className="text-xs font-semibold text-heading">{formatEuro(opportunity.target_daily_rate)}</span>
          )}
        </div>

        <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
          <span className="text-[10px] text-muted font-medium">Durée (jours)</span>
          {editingSection === "economie" ? (
            <input
              type="number"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className={inputClass}
              disabled={isPending}
            />
          ) : (
            <span className="text-xs font-semibold text-heading">{opportunity.duration ? `${opportunity.duration} jours` : "—"}</span>
          )}
        </div>

        <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
          <span className="text-[10px] text-muted font-medium">Gain estimé</span>
          {editingSection === "economie" ? (
            <input
              type="number"
              value={form.estimated_gain}
              onChange={(e) => setForm({ ...form, estimated_gain: e.target.value })}
              className={inputClass}
              disabled={isPending}
            />
          ) : (
            <span className="text-xs font-semibold text-heading">{formatEuro(opportunity.estimated_gain)}</span>
          )}
        </div>

        <div className="flex justify-between py-1 border-b border-border/30">
          <span className="text-xs text-muted">ACV (calculé)</span>
          <span className="text-xs font-semibold text-heading">{formatEuro(opportunity.acv)}</span>
        </div>

        <div className="flex justify-between py-1">
          <span className="text-xs text-muted">Gain pondéré</span>
          <span className="text-xs font-semibold text-heading">{formatEuro(opportunity.weighted_gain)}</span>
        </div>
      </div>
    </div>
  )

  const renderDialogs = () => (
    <>
      <AppDialog
        open={isStaffingDialogOpen}
        onOpenChange={handleStaffingDialogOpenChange}
        title="Créer un staffing"
        description="Rattachez un collaborateur ou un candidat à cette opportunité."
        footer={
          <>
            <button
              type="button"
              onClick={() => handleStaffingDialogOpenChange(false)}
              disabled={isCreatingStaffing}
              className="px-3 py-1.5 text-xs text-muted hover:text-heading transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreateStaffing}
              disabled={isCreatingStaffing}
              className={primaryActionButtonClass}
            >
              {isCreatingStaffing ? "Création…" : "Créer le staffing"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1">
          {staffingErrorMsg && (
            <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
              {staffingErrorMsg}
            </div>
          )}

          <div>
            <label className={labelClass}>Collaborateur / candidat</label>
            <Select
              value={staffingForm.sourceType}
              onChange={(e) => {
                const newType = e.target.value as StaffingSourceType
                setStaffingForm({
                  sourceType: newType,
                  query: "",
                  selected: null,
                })
                if (newType === "collaborator") {
                  setStaffingSearchResults(allCollaborators)
                } else {
                  setStaffingSearchResults([])
                }
              }}
              className={inputClass}
              disabled={isCreatingStaffing}
            >
              <option value="collaborator">Collaborateur</option>
              <option value="candidate">Candidat</option>
            </Select>
          </div>

          <div className="relative">
            <label className={labelClass}>Nom et prénom</label>
            <input
              type="text"
              value={staffingForm.query}
              onChange={(e) => handleStaffingQueryChange(e.target.value, staffingForm.sourceType)}
              placeholder={staffingForm.sourceType === "collaborator" ? "Filtrer par nom…" : "Commencez à taper un nom…"}
              className={inputClass}
              disabled={isCreatingStaffing}
            />

            {(staffingForm.query.trim().length > 0 || staffingForm.sourceType === "collaborator") && (
              <div className="mt-2 rounded-md border border-border bg-surface shadow-sm max-h-52 overflow-y-auto">
                {isSearchingStaffing ? (
                  <div className="px-3 py-2 text-[11px] text-muted italic">Recherche en cours…</div>
                ) : staffingSearchResults.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-muted italic">
                    {staffingForm.sourceType === "collaborator" && allCollaborators.length === 0
                      ? "Chargement…"
                      : "Aucun résultat."}
                  </div>
                ) : (
                  staffingSearchResults.map((result) => (
                    <button
                      key={`${result.source_type}-${result.id}`}
                      type="button"
                      onClick={() => setStaffingForm((prev) => ({
                        ...prev,
                        query: result.full_name,
                        selected: result,
                      }))}
                      className={cn(
                        "w-full text-left px-3 py-2 border-b last:border-b-0 border-border/40 hover:bg-canvas/50 transition-colors",
                        staffingForm.selected?.id === result.id &&
                          staffingForm.selected?.source_type === result.source_type &&
                          "bg-primary/8"
                      )}
                    >
                      <div className="text-xs font-semibold text-heading">{result.full_name}</div>
                      <div className="text-[10px] text-muted">
                        {result.source_type === "collaborator" ? "Collaborateur" : "Candidat"}
                        {result.subtitle ? ` · ${result.subtitle}` : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {staffingForm.selected && (
              <p className="mt-2 text-[11px] text-muted">
                Sélectionné : <span className="font-semibold text-heading">{staffingForm.selected.full_name}</span>
              </p>
            )}
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={isCommercialActionDialogOpen}
        onOpenChange={handleCommercialActionDialogOpenChange}
        title="Créer une action"
        description="Ajoutez une action commerciale liée à cette opportunité."
        footer={
          <>
            <button
              type="button"
              onClick={() => handleCommercialActionDialogOpenChange(false)}
              disabled={isCreatingAction}
              className="px-3 py-1.5 text-xs text-muted hover:text-heading transition-colors disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreateCommercialAction}
              disabled={isCreatingAction}
              className={primaryActionButtonClass}
            >
              {isCreatingAction ? "Création…" : "Créer l'action"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1">
          {commercialActionErrorMsg && (
            <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
              {commercialActionErrorMsg}
            </div>
          )}

          <div>
            <label className={labelClass}>Type d&apos;action</label>
            <Select
              value={commercialActionForm.type}
              onChange={(e) =>
                setCommercialActionForm((prev) => ({ ...prev, type: e.target.value as CommercialActionType }))
              }
              className={inputClass}
              disabled={isCreatingAction}
            >
              {COMMERCIAL_ACTION_TYPES.map((actionType) => (
                <option key={actionType.value} value={actionType.value}>
                  {actionType.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className={labelClass}>Détails</label>
            <textarea
              value={commercialActionForm.details}
              onChange={(e) => setCommercialActionForm((prev) => ({ ...prev, details: e.target.value }))}
              className={inputClass + " h-24 resize-none"}
              disabled={isCreatingAction}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={commercialActionForm.occurred_at}
                onChange={(e) => setCommercialActionForm((prev) => ({ ...prev, occurred_at: e.target.value }))}
                className={inputClass}
                disabled={isCreatingAction}
              />
            </div>

            <div>
              <label className={labelClass}>Contact</label>
              <Select
                value={commercialActionForm.contact_id}
                onChange={(e) => setCommercialActionForm((prev) => ({ ...prev, contact_id: e.target.value }))}
                className={inputClass}
                disabled={isCreatingAction || data.contacts.length === 0}
              >
                <option value="">Aucun contact</option>
                {data.contacts.map(({ contact }) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}{contact.job_title ? ` (${contact.job_title})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </AppDialog>
    </>
  )

  if (isMobile) {
    // ----------------------------------------------------------------
    //  VUE MOBILE
    // ----------------------------------------------------------------
    return (
      <>
      <div className="w-full px-4 py-6 flex flex-col gap-5">
        {/* Header mobile */}
        <div className="flex flex-col gap-2 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-success border border-success/20 px-1.5 py-0.5 rounded bg-success/10">
                Opportunité
              </span>
              {account && <span className="text-xs font-semibold text-muted">{account.name}</span>}
            </div>

            {/* Boutons d'action mobile */}
            {editingSection === "identite" ? (
              renderSectionEditControls("identite")
            ) : (
              editingSection === null && (
                <button
                  onClick={() => setEditingSection("identite")}
                  className="p-1 text-muted hover:text-heading transition-colors rounded-full hover:bg-muted/10"
                  title="Modifier l'identité"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          {/* Erreur Mobile */}
          {errorMsg && (
            <div className="text-[11px] text-danger bg-danger/10 border border-danger/20 rounded p-2 mt-1">
              {errorMsg}
            </div>
          )}

          {editingSection === "identite" ? (
            <div className="mt-2 flex flex-col gap-3">
              <div>
                <label className={labelClass}>Intitulé de l&apos;opportunité</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className={labelClass}>Client</label>
                <AccountCombobox
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                />
                {selectedAccount?.isNew && (
                  <p className="mt-1 text-[10px] text-muted">
                    Le compte «&nbsp;{selectedAccount.name}&nbsp;» sera créé automatiquement.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-heading leading-snug">{opportunity.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                <span>{getStageLabel(opportunity.stage)}</span>
                <span>•</span>
                <span>{getPriorityLabel(opportunity.priority)}</span>
                {opportunity.seniority ? (
                  <>
                    <span>•</span>
                    <span>{opportunity.seniority}</span>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Timeline Progression Mobile */}
        {renderPipelineTimeline(false)}

        {renderSyntheseMissionSection()}
        {renderEngagementSection()}
        <OpportunityStandingPanel
          profiles={data.standingProfiles}
          headerActions={
            <button
              type="button"
              onClick={() => setIsStaffingDialogOpen(true)}
              className={primaryActionButtonClass}
            >
              Créer un staffing
            </button>
          }
          practice={form.practice}
          requiresStaffing={form.requires_staffing}
          isEditing={editingSection === "staffing"}
          isPending={isPending}
          onStartEdit={() => setEditingSection("staffing")}
          onCancel={handleCancel}
          onSave={() => handleSave("staffing")}
          onPracticeChange={(value) => setForm({ ...form, practice: value })}
          onRequiresStaffingChange={(value) => setForm({ ...form, requires_staffing: value })}
        />
        {renderFinancialEquationSection()}
      </div>
      {renderDialogs()}
      </>
    )
  }

  // ----------------------------------------------------------------
  //  VUE DESKTOP
  // ----------------------------------------------------------------
  return (
    <>
    <div className="w-full max-w-[1480px] mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header Desktop */}
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {account && (
            <CompanyLogo
              name={account.name}
              website={account.website}
              size="xl"
              className="shrink-0 mt-0.5"
            />
          )}

          <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
            <div className="flex min-w-0 flex-col">
              {account && (
                <span className="text-sm font-semibold text-body">
                  {account.name}
                </span>
              )}

              {editingSection === "identite" ? (
                <div className="mt-2 flex w-2/3 flex-col gap-3.5">
                  <div>
                    <label className={labelClass}>Intitulé de l&apos;opportunité</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-xs font-bold text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
                      placeholder="Titre de l'opportunité"
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Client</label>
                    <AccountCombobox
                      value={selectedAccount}
                      onChange={setSelectedAccount}
                    />
                    {selectedAccount?.isNew && (
                      <p className="mt-1 text-[10px] text-muted">
                        Le compte «&nbsp;{selectedAccount.name}&nbsp;» sera créé automatiquement.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
                    {opportunity.title}
                  </h1>
                  {editingSection === null && (
                    <button
                      type="button"
                      onClick={() => setEditingSection("identite")}
                      className="p-1 text-muted hover:text-heading transition-colors rounded-full hover:bg-muted/10"
                      title="Modifier l'identité"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <OpportunityHeaderMetric
                value={practiceHeaderContent.value}
                icon={
                  practiceHeaderContent.iconSrc ? (
                    <Image
                      src={practiceHeaderContent.iconSrc}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 object-contain"
                    />
                  ) : (
                    <span className="block h-3.5 w-3.5 rounded-full bg-border" />
                  )
                }
              />
              <OpportunityHeaderMetric
                value={engagementTypeValue}
                icon={
                  <Image
                    src={HEADER_ICON_PATHS.engagementType}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                }
              />
              <OpportunityHeaderMetric
                value={formatDateNumeric(opportunity.start_date)}
                icon={
                  <Image
                    src={HEADER_ICON_PATHS.startDate}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                }
              />
              <OpportunityHeaderMetric
                value={formatOpportunityDuration(opportunity.duration)}
                icon={
                  <Image
                    src={HEADER_ICON_PATHS.duration}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                }
              />
              <OpportunityHeaderMetric
                value={formatEuro(estimatedAcv)}
                icon={
                  <Image
                    src={HEADER_ICON_PATHS.estimatedAcv}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                }
              />
            </div>
          </div>
        </div>

        {/* Boutons Desktop */}
        <div className="flex items-center gap-3 shrink-0">
          {errorMsg && (
            <span className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-md">
              {errorMsg}
            </span>
          )}

          {editingSection === "identite" && renderSectionEditControls("identite")}
        </div>
      </div>

      {/* Timeline Progression */}
      {renderPipelineTimeline(true)}

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-8 flex flex-col gap-6">
          {renderSyntheseMissionSection("h-full")}
          {renderEngagementSection()}
        </div>

        <div className="col-span-4 flex flex-col gap-6">
          <OpportunityStandingPanel
            profiles={data.standingProfiles}
            headerActions={
              <button
                type="button"
                onClick={() => setIsStaffingDialogOpen(true)}
                className={primaryActionButtonClass}
              >
                Créer un staffing
              </button>
            }
            practice={form.practice}
            requiresStaffing={form.requires_staffing}
            isEditing={editingSection === "staffing"}
            isPending={isPending}
            onStartEdit={() => setEditingSection("staffing")}
            onCancel={handleCancel}
            onSave={() => handleSave("staffing")}
            onPracticeChange={(value) => setForm({ ...form, practice: value })}
            onRequiresStaffingChange={(value) => setForm({ ...form, requires_staffing: value })}
          />
          {renderFinancialEquationSection()}
        </div>
      </div>

    </div>
    {renderDialogs()}
    </>
  )
}
