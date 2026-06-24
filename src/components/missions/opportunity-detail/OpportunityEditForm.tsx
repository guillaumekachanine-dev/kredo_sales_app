"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { Badge, type BadgeVariant } from "@/components/ui/Badge"
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
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { upsertAccountByName } from "@/app/(app)/missions/_actions/upsert-account"
import {
  createOpportunityStaffing,
  searchOpportunityStaffingProfiles,
  type StaffingSearchResult,
  type StaffingSourceType,
} from "@/app/(app)/missions/_actions/opportunity-staffing"
import { createOpportunityInteraction } from "@/app/(app)/missions/_actions/opportunity-interactions"
import {
  formatEuro,
  formatDate,
  formatDateTime,
} from "./opportunity-detail-utils"
import {
  TYPE_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_LABELS,
  getStageLabel,
  getPriorityLabel,
} from "./opportunity-detail-options"

interface OpportunityDetailData {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
  } | null
  skills: OpportunitySkill[]
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  events: OpportunityEvent[]
  standingProfiles: OpportunityStandingProfile[]
}

const SEQUENTIAL_STEPS = [
  { key: "qualification", label: "Qualification", num: 1 },
  { key: "recherche_profil", label: "Recherche profils", num: 2 },
  { key: "cv_envoyes", label: "CV envoyés", num: 3 },
  { key: "entretien_client", label: "Entretien client", num: 4 },
]

const STAGE_LOGOS: Record<string, string> = {
  qualification: "/icons_set/rdv_client.png",
  recherche_profil: "/icons_set/sourcing_candidats_2.png",
  cv_envoyes: "/icons_set/staffing.png",
  entretien_client: "/icons_set/presentation_client_rt.png",
  gagne: "/icons_set/oppy_win.png",
  perdu: "/icons_set/oppy_perdu.png",
  abandonne: "/icons_set/oppy_abandon.png",
}


const COMMERCIAL_ACTION_TYPES = [
  "appel de qualification",
  "envoi de CV",
  "relance",
  "présentation consultant",
  "négociation",
  "envoi devis",
] as const

type CommercialActionType = (typeof COMMERCIAL_ACTION_TYPES)[number]

const OPPORTUNITY_REMOTE_OPTIONS = [
  { value: "sur_site", label: "Sur site" },
  { value: "hybride", label: "Hybride" },
  { value: "full_remote", label: "Full remote" },
] as const

interface OpportunityEditFormProps {
  data: OpportunityDetailData
  onSuccess: () => void
}

const STAGE_BADGE_VARIANTS: Record<SalesStage, BadgeVariant> = {
  qualification: "brand",
  recherche_profil: "info",
  cv_envoyes: "info",
  entretien_client: "warning",
  gagne: "success",
  perdu: "danger",
  abandonne: "warning",
  non_traitee: "neutral",
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

export function OpportunityEditForm({ data, onSuccess }: OpportunityEditFormProps) {
  const { opportunity, account } = data
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
  const staffingSearchRequestRef = useRef(0)
  const staffingSearchTimeoutRef = useRef<number | null>(null)
  const [commercialActionForm, setCommercialActionForm] = useState({
    type: COMMERCIAL_ACTION_TYPES[0] as CommercialActionType,
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
      type: COMMERCIAL_ACTION_TYPES[0] as CommercialActionType,
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

  const handleStaffingQueryChange = (value: string) => {
    setStaffingForm((prev) => ({
      ...prev,
      query: value,
      selected: null,
    }))

    if (staffingSearchTimeoutRef.current) {
      window.clearTimeout(staffingSearchTimeoutRef.current)
    }

    if (value.trim().length < 1) {
      setStaffingSearchResults([])
      setIsSearchingStaffing(false)
      return
    }

    const requestId = staffingSearchRequestRef.current + 1
    staffingSearchRequestRef.current = requestId
    setIsSearchingStaffing(true)

    staffingSearchTimeoutRef.current = window.setTimeout(async () => {
      const results = await searchOpportunityStaffingProfiles(value.trim(), staffingForm.sourceType)
      if (staffingSearchRequestRef.current !== requestId) return
      setStaffingSearchResults(results)
      setIsSearchingStaffing(false)
    }, 250)
  }

  const getStageIndex = (stage: string) => {
    if (stage === "gagne" || stage === "perdu" || stage === "abandonne" || stage === "non_traitee") return 4
    return SEQUENTIAL_STEPS.findIndex((s) => s.key === stage)
  }

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
    // ── DESKTOP ──
    if (isDesktopView) {
      return (
        <div className="w-full">
          {isPending && loadingStage && (
            <div className="flex justify-center mb-3">
              <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wider" style={{ color: "#2C7D5C" }}>
                Mise à jour en cours...
              </span>
            </div>
          )}

          {/* Nodes row */}
          <div className="flex items-start w-full">
            {SEQUENTIAL_STEPS.map((step, idx) => {
              const isCompleted = currentIdx > idx
              const isActive = currentIdx === idx
              const isLoading = loadingStage === step.key

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative min-w-0">

                  {/* Connector line to next (behind nodes) */}
                  {idx < SEQUENTIAL_STEPS.length - 1 && (
                    <div
                      className="absolute z-0"
                      style={{
                        top: 18,
                        left: "calc(50% + 22px)",
                        right: "-50%",
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: isCompleted ? "#2C7D5C" : "#E5E7EB",
                        transition: "background-color 0.4s ease",
                      }}
                    />
                  )}
                  {/* Connector from last sequential step → outcome area */}
                  {idx === SEQUENTIAL_STEPS.length - 1 && (
                    <div
                      className="absolute z-0"
                      style={{
                        top: 18,
                        left: "calc(50% + 22px)",
                        right: "-50%", // goes to the issue node
                        height: 8,
                        borderRadius: 4,
                        backgroundColor:
                          form.stage === "gagne" ? "#2C7D5C"
                          : form.stage === "perdu" ? "#DC2626"
                          : form.stage === "abandonne" ? "#F59E0B"
                          : form.stage === "non_traitee" ? "#9CA3AF"
                          : isCompleted ? "#2C7D5C" : "#E5E7EB",
                        transition: "background-color 0.4s ease",
                      }}
                    />
                  )}

                  {/* Date label above */}
                  <span
                    className="text-[11px] font-bold mb-1.5 leading-none"
                    style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}
                  >
                    {isActive ? "En cours" : isCompleted ? "✓" : "—"}
                  </span>

                  {/* Node circle */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStageSelect(step.key as SalesStage)}
                    className="relative z-10 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: "#FFFFFF",
                      border: isActive
                        ? "3px solid #2C7D5C"
                        : isCompleted
                        ? "2.5px solid #2C7D5C"
                        : "2px solid #E5E7EB",
                      boxShadow: isActive
                        ? "0 0 0 4px rgba(44,125,92,0.18)"
                        : isCompleted
                        ? "0 2px 8px rgba(44,125,92,0.22)"
                        : "none",
                      transform: isActive ? "scale(1.12)" : "scale(1)",
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2C7D5C" strokeWidth="4" />
                        <path className="opacity-75" fill="#2C7D5C" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <img
                        src={STAGE_LOGOS[step.key]}
                        alt={step.label}
                        className="w-full h-full object-contain p-1 rounded-full transition-all duration-300"
                        style={{
                          filter: (isCompleted || isActive) ? "none" : "grayscale(100%)",
                          opacity: (isCompleted || isActive) ? 1 : 0.4,
                        }}
                      />
                    )}
                  </button>

                  {/* Label + sub below */}
                  <div className="flex flex-col items-center mt-3 px-1 text-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStageSelect(step.key as SalesStage)}
                      className="text-[12px] font-bold leading-tight cursor-pointer disabled:cursor-not-allowed transition-colors"
                      style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                    >
                      {step.label}
                    </button>
                    <span className="text-[10px] leading-snug mt-0.5" style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}>
                      {["Qualification besoin", "Sourcing candidats", "Envoi profils", "Rendez-vous client"][idx]}
                    </span>
                  </div>

                </div>
              )
            })}

            {/* Issue column */}
            <div className="flex-1 flex flex-col items-center relative min-w-0">
              {/* Date/Status label above */}
              <span
                className="text-[11px] font-bold mb-1.5 leading-none"
                style={{
                  color:
                    form.stage === "gagne" ? "#2C7D5C"
                    : form.stage === "perdu" ? "#DC2626"
                    : form.stage === "abandonne" ? "#F59E0B"
                    : form.stage === "non_traitee" ? "#6B7280"
                    : "#9CA3AF"
                }}
              >
                {form.stage === "gagne" ? "Gagné"
                  : form.stage === "perdu" ? "Perdu"
                  : form.stage === "abandonne" ? "Abandonné"
                  : form.stage === "non_traitee" ? "Non traitée"
                  : "Issue"}
              </span>

              {/* Node circle & dropdown trigger */}
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                    className="relative z-10 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: "#FFFFFF",
                      border:
                        form.stage === "gagne" ? "3px solid #2C7D5C"
                        : form.stage === "perdu" ? "3px solid #DC2626"
                        : form.stage === "abandonne" ? "3px solid #F59E0B"
                        : form.stage === "non_traitee" ? "2px solid #9CA3AF"
                        : "2px solid #D1D5DB",
                      boxShadow:
                        form.stage === "gagne" ? "0 0 0 4px rgba(44,125,92,0.18), 0 2px 8px rgba(44,125,92,0.25)"
                        : form.stage === "perdu" ? "0 0 0 4px rgba(220,38,38,0.15), 0 2px 8px rgba(220,38,38,0.25)"
                        : form.stage === "abandonne" ? "0 0 0 4px rgba(245,158,11,0.15), 0 2px 8px rgba(245,158,11,0.25)"
                        : form.stage === "non_traitee" ? "0 0 0 4px rgba(156,163,175,0.15), 0 2px 8px rgba(156,163,175,0.25)"
                        : "none",
                    }}
                  >
                    {loadingStage && ["gagne", "perdu", "abandonne", "non_traitee"].includes(loadingStage) ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke={
                          loadingStage === "gagne" ? "#2C7D5C"
                          : loadingStage === "perdu" ? "#DC2626"
                          : loadingStage === "abandonne" ? "#F59E0B"
                          : "#9CA3AF"
                        } strokeWidth="4" />
                        <path className="opacity-75" fill={
                          loadingStage === "gagne" ? "#2C7D5C"
                          : loadingStage === "perdu" ? "#DC2626"
                          : loadingStage === "abandonne" ? "#F59E0B"
                          : "#9CA3AF"
                        } d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : form.stage && STAGE_LOGOS[form.stage] ? (
                      <img
                        src={STAGE_LOGOS[form.stage]}
                        alt={form.stage}
                        className="w-full h-full object-contain p-1 rounded-full"
                      />
                    ) : form.stage === "non_traitee" ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    ) : (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                    className="p-1 rounded bg-canvas border border-border text-muted hover:text-heading hover:bg-muted/10 transition-colors z-20 shrink-0 self-center"
                    title="Choisir l'issue"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* Floating dropdown menu */}
                {isIssueDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsIssueDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-44 bg-canvas border border-border rounded-lg shadow-xl py-1 z-40">
                      {[
                        { key: "gagne", label: "Gagné", color: "#2C7D5C" },
                        { key: "perdu", label: "Perdu", color: "#DC2626" },
                        { key: "abandonne", label: "Abandonné", color: "#F59E0B" },
                        { key: "non_traitee", label: "Non traitée", color: "#9CA3AF" },
                      ].map((opt) => (
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

              {/* Label + sub description below */}
              <div className="flex flex-col items-center mt-3 px-1 text-center">
                <span
                  className="text-[12px] font-bold"
                  style={{
                    color:
                      form.stage === "gagne" ? "#111827"
                      : form.stage === "perdu" ? "#111827"
                      : form.stage === "abandonne" ? "#111827"
                      : form.stage === "non_traitee" ? "#111827"
                      : "#6B7280"
                  }}
                >
                  {form.stage === "gagne" ? "Gagné"
                    : form.stage === "perdu" ? "Perdu"
                    : form.stage === "abandonne" ? "Abandonné"
                    : form.stage === "non_traitee" ? "Non traitée"
                    : "Issue"}
                </span>
                <span className="text-[10px] mt-0.5 text-muted">
                  Processus terminé
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
                        ? "3px solid #2C7D5C"
                        : isCompleted
                        ? "2.5px solid #2C7D5C"
                        : "2px solid #E5E7EB",
                      boxShadow: isActive ? "0 0 0 4px rgba(44,125,92,0.18)" : isCompleted ? "0 2px 8px rgba(44,125,92,0.2)" : "none",
                      transform: isActive ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2C7D5C" strokeWidth="4" />
                        <path className="opacity-75" fill="#2C7D5C" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <img
                        src={STAGE_LOGOS[step.key]}
                        alt={step.label}
                        className="w-full h-full object-contain p-1 rounded-full transition-all duration-300"
                        style={{
                          filter: (isCompleted || isActive) ? "none" : "grayscale(100%)",
                          opacity: (isCompleted || isActive) ? 1 : 0.4,
                        }}
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
                      backgroundColor: isCompleted
                        ? "#2C7D5C"
                        : isLast
                          ? form.stage === "gagne" ? "#2C7D5C"
                          : form.stage === "perdu" ? "#DC2626"
                          : form.stage === "abandonne" ? "#F59E0B"
                          : form.stage === "non_traitee" ? "#9CA3AF"
                          : "#E5E7EB"
                        : "#E5E7EB",
                      transition: "background-color 0.4s",
                    }}
                  />
                </div>

                {/* Right: date + label */}
                <div className="flex flex-col justify-start py-1 pb-6">
                  <span className="text-[11px] font-bold leading-none mb-1" style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}>
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
                  <span className="text-[11px] mt-0.5" style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}>
                    {["Qualification besoin", "Sourcing candidats", "Envoi profils", "Rendez-vous client"][idx]}
                  </span>
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
                  className="flex items-center justify-center rounded-full transition-all duration-300 shrink-0 z-10 cursor-pointer overflow-hidden"
                  style={{
                    width: 44,
                    height: 44,
                    backgroundColor: "#FFFFFF",
                    border:
                      form.stage === "gagne" ? "3px solid #2C7D5C"
                      : form.stage === "perdu" ? "3px solid #DC2626"
                      : form.stage === "abandonne" ? "3px solid #F59E0B"
                      : form.stage === "non_traitee" ? "2px solid #9CA3AF"
                      : "2px solid #D1D5DB",
                    boxShadow:
                      form.stage === "gagne" ? "0 0 0 4px rgba(44,125,92,0.18)"
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
                        loadingStage === "gagne" ? "#2C7D5C"
                        : loadingStage === "perdu" ? "#DC2626"
                        : loadingStage === "abandonne" ? "#F59E0B"
                        : "#9CA3AF"
                      } strokeWidth="4" />
                      <path className="opacity-75" fill={
                        loadingStage === "gagne" ? "#2C7D5C"
                        : loadingStage === "perdu" ? "#DC2626"
                        : loadingStage === "abandonne" ? "#F59E0B"
                        : "#9CA3AF"
                      } d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : form.stage && STAGE_LOGOS[form.stage] ? (
                    <img
                      src={STAGE_LOGOS[form.stage]}
                      alt={form.stage}
                      className="w-full h-full object-contain p-1 rounded-full"
                    />
                  ) : form.stage === "non_traitee" ? (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ) : (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
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
                    form.stage === "gagne" ? "#2C7D5C"
                    : form.stage === "perdu" ? "#DC2626"
                    : form.stage === "abandonne" ? "#F59E0B"
                    : form.stage === "non_traitee" ? "#6B7280"
                    : "#9CA3AF"
                }}
              >
                {form.stage === "gagne" ? "Gagné"
                  : form.stage === "perdu" ? "Perdu"
                  : form.stage === "abandonne" ? "Abandonné"
                  : form.stage === "non_traitee" ? "Non traitée"
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
                    {[
                      { key: "gagne", label: "Gagné", color: "#2C7D5C" },
                      { key: "perdu", label: "Perdu", color: "#DC2626" },
                      { key: "abandonne", label: "Abandonné", color: "#F59E0B" },
                      { key: "non_traitee", label: "Non traitée", color: "#9CA3AF" },
                    ].map((opt) => (
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
        <img src={iconSrc} alt="" className="w-7 h-7 object-contain shrink-0" />
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
            <img src="/icons_set/contexte_client.png" alt="" className="w-5 h-5 object-contain shrink-0" />
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
                <p className="text-xs text-body mt-1 font-medium bg-canvas/30 p-2.5 rounded border border-border/40">
                  {opportunity.need_summary || "—"}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Contexte client</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="text"
                  value={form.client_context}
                  onChange={(e) => setForm({ ...form, client_context: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs text-body mt-1 truncate" title={opportunity.client_context || ""}>
                  {opportunity.client_context || "—"}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Séniorité visée</label>
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
            <img src="/icons_set/date.png" alt="" className="w-5 h-5 object-contain shrink-0" />
            <h4 className="text-sm font-bold text-heading">Planning de l&apos;opportunité</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date de début</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{formatDate(opportunity.start_date)}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Clôture cible</label>
              {editingSection === "synthese-opportunite" ? (
                <input
                  type="date"
                  value={form.target_close_date}
                  onChange={(e) => setForm({ ...form, target_close_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{formatDate(opportunity.target_close_date)}</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border/40 bg-canvas/20 p-4 flex flex-col gap-4 h-full">
          <OpportunityContactsPanel
            opportunityId={opportunity.id}
            contacts={data.contacts}
            onRefresh={onSuccess}
            embedded
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <section className="rounded-lg border border-border/40 bg-canvas/20 p-4 flex flex-col gap-4 h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/icons_set/recrutement.png" alt="" className="w-5 h-5 object-contain shrink-0" />
              <h4 className="text-sm font-bold text-heading">Staffing</h4>
            </div>
            {editingSection === "staffing" ? (
              renderSectionEditControls("staffing")
            ) : (
              editingSection === null && (
                <button
                  type="button"
                  onClick={() => setEditingSection("staffing")}
                  className="p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
                  title="Modifier cette section"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Pilotage staffing</label>
              {editingSection === "staffing" ? (
                <label className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-heading">
                  <input
                    type="checkbox"
                    checked={form.requires_staffing}
                    onChange={(e) => setForm({ ...form, requires_staffing: e.target.checked })}
                    disabled={isPending}
                  />
                  Besoin à staffer
                </label>
              ) : (
                <p className="text-xs font-semibold text-heading mt-1">{opportunity.requires_staffing ? "Oui" : "Non"}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Profils requis</label>
              {editingSection === "staffing" ? (
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
          </div>
        </section>

        <div />
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
              onChange={(e) => setStaffingForm({
                sourceType: e.target.value as StaffingSourceType,
                query: "",
                selected: null,
              })}
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
              onChange={(e) => handleStaffingQueryChange(e.target.value)}
              placeholder="Commencez à taper un nom…"
              className={inputClass}
              disabled={isCreatingStaffing}
            />

            {staffingForm.query.trim().length > 0 && (
              <div className="mt-2 rounded-md border border-border bg-surface shadow-sm max-h-52 overflow-y-auto">
                {isSearchingStaffing ? (
                  <div className="px-3 py-2 text-[11px] text-muted italic">Recherche en cours…</div>
                ) : staffingSearchResults.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-muted italic">Aucun résultat.</div>
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
                        staffingForm.selected?.id === result.id && staffingForm.selected?.source_type === result.source_type && "bg-primary/8"
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
              onChange={(e) => setCommercialActionForm((prev) => ({ ...prev, type: e.target.value as CommercialActionType }))}
              className={inputClass}
              disabled={isCreatingAction}
            >
              {COMMERCIAL_ACTION_TYPES.map((actionType) => (
                <option key={actionType} value={actionType}>
                  {actionType}
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
          isEditing={editingSection === "staffing"}
          isPending={isPending}
          onStartEdit={() => setEditingSection("staffing")}
          onCancel={handleCancel}
          onSave={() => handleSave("staffing")}
          onPracticeChange={(value) => setForm({ ...form, practice: value })}
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
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header Desktop */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success border border-success/20 px-2 py-0.5 rounded bg-success/10">
              Opportunité
            </span>
            {account && <span className="text-xs text-muted">{account.name}</span>}
          </div>

          {editingSection === "identite" ? (
            <div className="mt-2 flex flex-col gap-3.5 w-2/3">
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
            <div className="flex items-center gap-3">
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

        {/* Boutons Desktop */}
        <div className="flex items-center gap-3 shrink-0">
          {errorMsg && (
            <span className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-md">
              {errorMsg}
            </span>
          )}

          {editingSection === "identite" && renderSectionEditControls("identite")}

          <div className="flex flex-col items-end border-l border-border pl-4">
            <span className="text-[10px] uppercase text-muted tracking-wider font-semibold">ACV Estimé</span>
            <span className="text-lg font-bold text-heading">
              {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STAGE_BADGE_VARIANTS[form.stage]} size="md">{getStageLabel(form.stage)}</Badge>
        <Badge variant={opportunity.priority === "haute" ? "warning" : "neutral"} size="md">{getPriorityLabel(opportunity.priority)}</Badge>
        {opportunity.opportunity_type ? <Badge variant="brand" size="md">{opportunity.opportunity_type.replaceAll("_", " ")}</Badge> : null}
        {opportunity.seniority ? <Badge variant="neutral" size="md">{opportunity.seniority}</Badge> : null}
        {opportunity.location ? <Badge variant="neutral" size="md">{opportunity.location}</Badge> : null}
        {opportunity.remote_policy ? <Badge variant="neutral" size="md">{opportunity.remote_policy.replaceAll("_", " ")}</Badge> : null}
        {opportunity.requires_staffing ? (
          <Badge variant="info" size="md">
            {`${opportunity.required_headcount || 1} profil${(opportunity.required_headcount || 1) > 1 ? "s" : ""}`}
          </Badge>
        ) : null}
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
            isEditing={editingSection === "staffing"}
            isPending={isPending}
            onStartEdit={() => setEditingSection("staffing")}
            onCancel={handleCancel}
            onSave={() => handleSave("staffing")}
            onPracticeChange={(value) => setForm({ ...form, practice: value })}
          />
          {renderFinancialEquationSection()}
        </div>
      </div>

    </div>
    {renderDialogs()}
    </>
  )
}
