"use client"

import { useEffect, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import type { Opportunity, OpportunitySkill, Contact, OpportunityEvent, SalesStage, SalesOutcome, SalesPriority } from "@/types/database"
import { OpportunitySkillsPanel } from "./OpportunitySkillsPanel"
import { OpportunityContactsPanel } from "./OpportunityContactsPanel"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { upsertAccountByName } from "@/app/(app)/missions/_actions/upsert-account"
import {
  formatEuro,
  formatDate,
  formatDateTime,
} from "./opportunity-detail-utils"
import {
  PRACTICE_OPTIONS,
  TYPE_OPTIONS,
  SOURCE_OPTIONS,
  REMOTE_OPTIONS,
  SENIORITY_OPTIONS,
  STAGE_LABELS,
  PRIORITY_LABELS,
  OUTCOME_LABELS,
  getStageLabel,
  getPriorityLabel,
  getOutcomeLabel,
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
}

const SEQUENTIAL_STEPS = [
  { key: "qualification", label: "Qualification", num: 1 },
  { key: "recherche_profil", label: "Recherche profils", num: 2 },
  { key: "cv_envoyes", label: "CV envoyés", num: 3 },
  { key: "entretien_client", label: "Entretien client", num: 4 },
]

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

export function OpportunityEditForm({ data, onSuccess }: OpportunityEditFormProps) {
  const { opportunity, account } = data
  // editingSection: null = lecture, string = section en cours d'édition
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState<string | null>(null)
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false)

  const initialAccountValue: AccountValue | null = account
    ? { id: account.id, name: account.name, isNew: false }
    : null

  const [selectedAccount, setSelectedAccount] = useState<AccountValue | null>(initialAccountValue)

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
    seniority: opportunity.seniority || "",
    need_summary: opportunity.need_summary || "",
    need_detail: opportunity.need_detail || "",
    client_context: opportunity.client_context || "",
    engagement_notes: opportunity.engagement_notes || "",
    target_daily_rate: opportunity.target_daily_rate ?? "",
    duration: opportunity.duration ?? "",
    estimated_gain: opportunity.estimated_gain ?? "",
    target_close_date: opportunity.target_close_date || "",
    start_date: opportunity.start_date || "",
    next_action_label: opportunity.next_action_label || "",
    next_action_at: opportunity.next_action_at ? opportunity.next_action_at.slice(0, 16) : "",
    location: opportunity.location || "",
    remote_policy: opportunity.remote_policy || "",
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
      seniority: opportunity.seniority || "",
      need_summary: opportunity.need_summary || "",
      need_detail: opportunity.need_detail || "",
      client_context: opportunity.client_context || "",
      engagement_notes: opportunity.engagement_notes || "",
      target_daily_rate: opportunity.target_daily_rate ?? "",
      duration: opportunity.duration ?? "",
      estimated_gain: opportunity.estimated_gain ?? "",
      target_close_date: opportunity.target_close_date || "",
      start_date: opportunity.start_date || "",
      next_action_label: opportunity.next_action_label || "",
      next_action_at: opportunity.next_action_at ? opportunity.next_action_at.slice(0, 16) : "",
      location: opportunity.location || "",
      remote_policy: opportunity.remote_policy || "",
      win_reason: opportunity.win_reason || "",
      loss_reason: opportunity.loss_reason || "",
    })
  }

  const handleCancel = () => {
    setEditingSection(null)
    setErrorMsg(null)
    setSelectedAccount(initialAccountValue)
    resetForm()
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
                    className="relative z-10 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: (isCompleted || isActive) ? "#2C7D5C" : "#F3F4F6",
                      border: isActive ? "3px solid #1a5c41" : "2px solid transparent",
                      boxShadow: isActive ? "0 0 0 4px rgba(44,125,92,0.18)" : isCompleted ? "0 2px 8px rgba(44,125,92,0.22)" : "none",
                      transform: isActive ? "scale(1.12)" : "scale(1)",
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : isActive ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 .27-2.73 0-3c-.28-.27-1.72-.26-3 0z"/>
                        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                      </svg>
                    ) : isCompleted ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
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
                    className="relative z-10 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor:
                        form.stage === "gagne" ? "#2C7D5C"
                        : form.stage === "perdu" ? "#DC2626"
                        : form.stage === "abandonne" ? "#F59E0B"
                        : form.stage === "non_traitee" ? "#9CA3AF"
                        : "#F3F4F6",
                      border: (form.stage === "gagne" || form.stage === "perdu" || form.stage === "abandonne" || form.stage === "non_traitee")
                        ? "none"
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
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : form.stage === "gagne" ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : form.stage === "perdu" ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : form.stage === "abandonne" ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    ) : form.stage === "non_traitee" ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
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
                    className="flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-all duration-300 shrink-0 z-10"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: (isCompleted || isActive) ? "#2C7D5C" : "#F3F4F6",
                      boxShadow: isActive ? "0 0 0 4px rgba(44,125,92,0.18)" : isCompleted ? "0 2px 8px rgba(44,125,92,0.2)" : "none",
                      transform: isActive ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {isLoading ? (
                      <svg className="animate-spin" width={20} height={20} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : isActive ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 .27-2.73 0-3c-.28-.27-1.72-.26-3 0z"/>
                        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                      </svg>
                    ) : isCompleted ? (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
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
                  className="flex items-center justify-center rounded-full transition-all duration-300 shrink-0 z-10 cursor-pointer"
                  style={{
                    width: 44,
                    height: 44,
                    backgroundColor:
                      form.stage === "gagne" ? "#2C7D5C"
                      : form.stage === "perdu" ? "#DC2626"
                      : form.stage === "abandonne" ? "#F59E0B"
                      : form.stage === "non_traitee" ? "#9CA3AF"
                      : "#F3F4F6",
                    border: (form.stage === "gagne" || form.stage === "perdu" || form.stage === "abandonne" || form.stage === "non_traitee")
                      ? "none"
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : form.stage === "gagne" ? (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : form.stage === "perdu" ? (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : form.stage === "abandonne" ? (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  ) : form.stage === "non_traitee" ? (
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
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
      } else if (section === "besoin") {
        payload = { ...payload, need_summary: form.need_summary || null, need_detail: form.need_detail || null, client_context: form.client_context || null }
      } else if (section === "engagement") {
        payload = { ...payload, source: form.source || null, next_action_label: form.next_action_label || null, next_action_at: form.next_action_at || null, engagement_notes: form.engagement_notes || null }
      } else if (section === "resultat") {
        payload = { ...payload, outcome: form.outcome, win_reason: form.win_reason || null, loss_reason: form.loss_reason || null }
      } else if (section === "qualification") {
        payload = { ...payload, practice: form.practice || null, opportunity_type: form.opportunity_type || null, seniority: form.seniority || null, stage: form.stage, priority: form.priority, conviction: form.conviction }
      } else if (section === "economie") {
        payload = { ...payload, target_daily_rate: form.target_daily_rate === "" ? null : Number(form.target_daily_rate), duration: form.duration === "" ? null : Number(form.duration), estimated_gain: form.estimated_gain === "" ? null : Number(form.estimated_gain) }
      } else if (section === "planning") {
        payload = { ...payload, start_date: form.start_date || null, target_close_date: form.target_close_date || null }
      } else if (section === "contexte") {
        payload = { ...payload, location: form.location || null, remote_policy: form.remote_policy || null }
      } else if (section === "synthese-mobile") {
        payload = { ...payload, need_summary: form.need_summary || null, conviction: form.conviction }
      } else if (section === "qualification-mobile") {
        payload = { ...payload, practice: form.practice || null, opportunity_type: form.opportunity_type || null, seniority: form.seniority || null, source: form.source || null, stage: form.stage, priority: form.priority }
      } else if (section === "economie-mobile") {
        payload = { ...payload, target_daily_rate: form.target_daily_rate === "" ? null : Number(form.target_daily_rate), duration: form.duration === "" ? null : Number(form.duration), estimated_gain: form.estimated_gain === "" ? null : Number(form.estimated_gain) }
      } else if (section === "prochaine-action-mobile") {
        payload = { ...payload, next_action_label: form.next_action_label || null, next_action_at: form.next_action_at || null }
      } else if (section === "contexte-mobile") {
        payload = { ...payload, location: form.location || null, remote_policy: form.remote_policy || null }
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

  // Boutons Annuler / Enregistrer inline dans chaque section
  const SectionEditControls = ({ section }: { section: string }) => (
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

  const SectionHeader = ({
    title,
    sectionKey,
    isDesktop = false,
  }: {
    title: string
    sectionKey: string
    isDesktop?: boolean
  }) => {
    const isCurrentEditing = editingSection === sectionKey
    return (
      <div className="flex items-center justify-between pb-1.5 border-b border-border/40 w-full mb-3">
        <h2 className={cn(
          "font-bold text-heading font-heading",
          isDesktop ? "text-sm" : "text-xs uppercase tracking-wider"
        )}>
          {title}
        </h2>
        {isCurrentEditing ? (
          <SectionEditControls section={sectionKey} />
        ) : (
          editingSection === null && (
            <button
              type="button"
              onClick={() => setEditingSection(sectionKey)}
              className="p-1 text-muted hover:text-heading transition-colors rounded-full hover:bg-muted/10"
              title={`Modifier ${title}`}
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>
    )
  }

  // Render helpers
  const inputClass = "w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"
  const labelClass = "block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1"

  if (isMobile) {
    // ----------------------------------------------------------------
    //  VUE MOBILE
    // ----------------------------------------------------------------
    return (
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
              <SectionEditControls section="identite" />
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
              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                <span>{getStageLabel(opportunity.stage)}</span>
                <span>•</span>
                <span>{getPriorityLabel(opportunity.priority)}</span>
              </div>
            </>
          )}
        </div>

        {/* Timeline Progression Mobile */}
        {renderPipelineTimeline(false)}

        {/* 1. Synthèse */}
        <SurfaceCard className="p-4 flex flex-col">
          <SectionHeader title="Synthèse" sectionKey="synthese-mobile" isDesktop={false} />
          <div className="flex flex-col mt-1">
            {editingSection === "synthese-mobile" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Résumé du besoin</label>
                  <input
                    type="text"
                    value={form.need_summary}
                    onChange={(e) => setForm({ ...form, need_summary: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className={labelClass}>Confiance (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.conviction}
                    onChange={(e) => setForm({ ...form, conviction: Number(e.target.value) })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">ACV</span>
                    <p className="text-sm font-bold text-heading tabular-nums mt-0.5">
                      {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">Confiance</span>
                    <p className="text-sm font-bold text-heading mt-0.5">{opportunity.conviction}%</p>
                  </div>
                </div>
                {opportunity.need_summary && (
                  <div className="mt-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted font-semibold">Résumé du besoin</span>
                    <p className="text-xs text-body mt-1 font-medium bg-canvas/30 p-2 rounded border border-border/40">
                      {opportunity.need_summary}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </SurfaceCard>

        {/* 2. Qualification */}
        <SurfaceCard className="p-4 flex flex-col">
          <SectionHeader title="Qualification" sectionKey="qualification-mobile" isDesktop={false} />
          <div className="flex flex-col mt-1">
            {editingSection === "qualification-mobile" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Practice</label>
                  <select
                    value={form.practice}
                    onChange={(e) => setForm({ ...form, practice: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {PRACTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Type d&apos;opportunité</label>
                  <select
                    value={form.opportunity_type}
                    onChange={(e) => setForm({ ...form, opportunity_type: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Séniorité</label>
                  <select
                    value={form.seniority}
                    onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Étape</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value as SalesStage })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priorité</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as SalesPriority })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Practice</span>
                  <span className="font-semibold text-heading">{opportunity.practice || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Type d&apos;opportunité</span>
                  <span className="font-semibold text-heading capitalize">
                    {opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Séniorité</span>
                  <span className="font-semibold text-heading capitalize">{opportunity.seniority || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Source</span>
                  <span className="font-semibold text-heading capitalize">
                    {opportunity.source ? opportunity.source.replace("_", " ") : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        <OpportunitySkillsPanel
          opportunityId={opportunity.id}
          skills={data.skills}
          onRefresh={onSuccess}
        />

        {/* 3. Économie */}
        <SurfaceCard className="p-4 flex flex-col">
          <SectionHeader title="Économie" sectionKey="economie-mobile" isDesktop={false} />
          <div className="flex flex-col mt-1">
            {editingSection === "economie-mobile" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>TJM Cible (€)</label>
                  <input
                    type="number"
                    value={form.target_daily_rate}
                    onChange={(e) => setForm({ ...form, target_daily_rate: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className={labelClass}>Durée (jours)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gain estimé (€)</label>
                  <input
                    type="number"
                    value={form.estimated_gain}
                    onChange={(e) => setForm({ ...form, estimated_gain: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs bg-canvas/30 p-2.5 rounded border border-border/40">
                  <div>
                    <span className="text-muted block text-[9px] uppercase">ACV (Généré)</span>
                    <span className="font-bold text-heading">{formatEuro(opportunity.acv)}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[9px] uppercase">Gain Pondéré</span>
                    <span className="font-bold text-heading">{formatEuro(opportunity.weighted_gain)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">TJM Cible</span>
                  <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.target_daily_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Durée</span>
                  <span className="font-semibold text-heading">{opportunity.duration ? `${opportunity.duration} jours` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Gain estimé</span>
                  <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.estimated_gain)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Gain pondéré</span>
                  <span className="font-semibold text-heading tabular-nums">{formatEuro(opportunity.weighted_gain)}</span>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        {/* 4. Prochaine Action */}
        <SurfaceCard className="p-4 flex flex-col">
          <SectionHeader title="Prochaine Action" sectionKey="prochaine-action-mobile" isDesktop={false} />
          <div className="flex flex-col mt-1">
            {editingSection === "prochaine-action-mobile" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Libellé de l&apos;action</label>
                  <input
                    type="text"
                    value={form.next_action_label}
                    onChange={(e) => setForm({ ...form, next_action_label: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date de l&apos;action</label>
                  <input
                    type="datetime-local"
                    value={form.next_action_at}
                    onChange={(e) => setForm({ ...form, next_action_at: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs">
                {opportunity.next_action_label || opportunity.next_action_at ? (
                  <>
                    <p className="font-semibold text-heading">{opportunity.next_action_label || "—"}</p>
                    {opportunity.next_action_at && (
                      <p className="text-[10px] text-muted mt-1">
                        Prévue le : {formatDateTime(opportunity.next_action_at)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted italic">Aucune action prévue</p>
                )}
              </div>
            )}
          </div>
        </SurfaceCard>

        {/* 5. Contexte mission */}
        <SurfaceCard className="p-4 flex flex-col">
          <SectionHeader title="Contexte mission" sectionKey="contexte-mobile" isDesktop={false} />
          <div className="flex flex-col mt-1">
            {editingSection === "contexte-mobile" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Localisation</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className={labelClass}>Télétravail</label>
                  <select
                    value={form.remote_policy}
                    onChange={(e) => setForm({ ...form, remote_policy: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {REMOTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Localisation</span>
                  <span className="font-semibold text-heading">{opportunity.location || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Télétravail</span>
                  <span className="font-semibold text-heading capitalize">{opportunity.remote_policy || "—"}</span>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        <OpportunityContactsPanel
          opportunityId={opportunity.id}
          contacts={data.contacts}
          onRefresh={onSuccess}
        />
      </div>
    )
  }

  // ----------------------------------------------------------------
  //  VUE DESKTOP
  // ----------------------------------------------------------------
  return (
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

          {editingSection === "identite" && (
            <SectionEditControls section="identite" />
          )}

          <div className="flex flex-col items-end border-l border-border pl-4">
            <span className="text-[10px] uppercase text-muted tracking-wider font-semibold">ACV Estimé</span>
            <span className="text-lg font-bold text-heading tabular-nums">
              {formatEuro(opportunity.acv ?? opportunity.estimated_gain)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Progression */}
      {renderPipelineTimeline(true)}

      {/* Colonnes Desktop */}
      <div className="grid grid-cols-12 gap-6">
        {/* Colonne Principale (8) */}
        <div className="col-span-8 flex flex-col gap-6">
          {/* Besoin client */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Besoin client" sectionKey="besoin" isDesktop={true} />
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className={labelClass}>Résumé du besoin</label>
                {editingSection === "besoin" ? (
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
              <div>
                <label className={labelClass}>Détail du besoin</label>
                {editingSection === "besoin" ? (
                  <textarea
                    value={form.need_detail}
                    onChange={(e) => setForm({ ...form, need_detail: e.target.value })}
                    className={inputClass + " h-24 resize-none"}
                    disabled={isPending}
                  />
                ) : (
                  <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                    {opportunity.need_detail || "—"}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Contexte client</label>
                {editingSection === "besoin" ? (
                  <textarea
                    value={form.client_context}
                    onChange={(e) => setForm({ ...form, client_context: e.target.value })}
                    className={inputClass + " h-20 resize-none"}
                    disabled={isPending}
                  />
                ) : (
                  <p className="text-xs text-body mt-1 whitespace-pre-wrap">
                    {opportunity.client_context || "—"}
                  </p>
                )}
              </div>
            </div>
          </SurfaceCard>

          {/* Engagement commercial */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Engagement commercial" sectionKey="engagement" isDesktop={true} />
            <div className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Source de l&apos;opportunité</label>
                  {editingSection === "engagement" ? (
                    <select
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    >
                      <option value="">— Sélectionner —</option>
                      {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-body mt-1 font-medium capitalize">
                      {opportunity.source ? opportunity.source.replace("_", " ") : "—"}
                    </p>
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
          </SurfaceCard>

          {/* Résultat */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Résultat" sectionKey="resultat" isDesktop={true} />
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <label className={labelClass}>Outcome (Statut)</label>
                {editingSection === "resultat" ? (
                  <select
                    value={form.outcome || ""}
                    onChange={(e) => setForm({ ...form, outcome: (e.target.value as SalesOutcome) || null })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">En cours</option>
                    {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-body mt-1 font-medium capitalize">
                    {opportunity.outcome ? getOutcomeLabel(opportunity.outcome) : "En cours"}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Raison (Gain / Perte / Abandon)</label>
                {editingSection === "resultat" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Raison de gain"
                      value={form.win_reason}
                      onChange={(e) => setForm({ ...form, win_reason: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                    <input
                      type="text"
                      placeholder="Raison de perte / abandon"
                      value={form.loss_reason}
                      onChange={(e) => setForm({ ...form, loss_reason: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-body mt-1 italic">
                    {opportunity.outcome === "gagnee"
                      ? (opportunity.win_reason || "Non renseignée")
                      : (opportunity.loss_reason || "Non renseignée")}
                  </p>
                )}
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Colonne Latérale (4) */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Qualification */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Qualification" sectionKey="qualification" isDesktop={true} />
            <div className="flex flex-col gap-3 mt-2">
              {/* Practice */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Practice</span>
                {editingSection === "qualification" ? (
                  <select
                    value={form.practice}
                    onChange={(e) => setForm({ ...form, practice: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {PRACTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading">{opportunity.practice || "—"}</span>
                )}
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Type d&apos;opportunité</span>
                {editingSection === "qualification" ? (
                  <select
                    value={form.opportunity_type}
                    onChange={(e) => setForm({ ...form, opportunity_type: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading capitalize">
                    {opportunity.opportunity_type ? opportunity.opportunity_type.replace("_", " ") : "—"}
                  </span>
                )}
              </div>

              {/* Séniorité */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Séniorité requise</span>
                {editingSection === "qualification" ? (
                  <select
                    value={form.seniority}
                    onChange={(e) => setForm({ ...form, seniority: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading capitalize">{opportunity.seniority || "—"}</span>
                )}
              </div>

              {/* Étape */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Étape</span>
                {editingSection === "qualification" ? (
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value as SalesStage })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading">{getStageLabel(opportunity.stage)}</span>
                )}
              </div>

              {/* Priorité */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Priorité</span>
                {editingSection === "qualification" ? (
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as SalesPriority })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading">{getPriorityLabel(opportunity.priority)}</span>
                )}
              </div>

              {/* Conviction */}
              <div className="flex flex-col gap-1 pb-1">
                <span className="text-[10px] text-muted font-medium">Confiance (%)</span>
                {editingSection === "qualification" ? (
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
                  <span className="text-xs font-semibold text-heading">{opportunity.conviction}%</span>
                )}
              </div>
            </div>
          </SurfaceCard>

          <OpportunitySkillsPanel
            opportunityId={opportunity.id}
            skills={data.skills}
            onRefresh={onSuccess}
          />

          {/* Économie */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Économie" sectionKey="economie" isDesktop={true} />
            <div className="flex flex-col gap-3 mt-2">
              {/* TJM */}
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
                  <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.target_daily_rate)}</span>
                )}
              </div>

              {/* Durée */}
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

              {/* Gain estimé */}
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
                  <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.estimated_gain)}</span>
                )}
              </div>

              {/* ACV (lecture seule) */}
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-xs text-muted">ACV (calculé)</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.acv)}</span>
              </div>

              {/* Gain pondéré (lecture seule) */}
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Gain pondéré</span>
                <span className="text-xs font-semibold text-heading tabular-nums">{formatEuro(opportunity.weighted_gain)}</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Planning */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Planning" sectionKey="planning" isDesktop={true} />
            <div className="flex flex-col gap-3 mt-2">
              {/* Date Début */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Date de début</span>
                {editingSection === "planning" ? (
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{formatDate(opportunity.start_date)}</span>
                )}
              </div>

              {/* Date Clôture */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Clôture cible</span>
                {editingSection === "planning" ? (
                  <input
                    type="date"
                    value={form.target_close_date}
                    onChange={(e) => setForm({ ...form, target_close_date: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{formatDate(opportunity.target_close_date)}</span>
                )}
              </div>

              {/* Dernière MàJ */}
              <div className="flex justify-between py-1">
                <span className="text-xs text-muted">Dernière MaJ</span>
                <span className="text-xs font-semibold text-heading">{formatDate(opportunity.updated_at)}</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Contexte mission */}
          <SurfaceCard className="p-5 flex flex-col">
            <SectionHeader title="Contexte mission" sectionKey="contexte" isDesktop={true} />
            <div className="flex flex-col gap-3 mt-2">
              {/* Localisation */}
              <div className="flex flex-col gap-1 border-b border-border/30 pb-2">
                <span className="text-[10px] text-muted font-medium">Localisation</span>
                {editingSection === "contexte" ? (
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  />
                ) : (
                  <span className="text-xs font-semibold text-heading">{opportunity.location || "—"}</span>
                )}
              </div>

              {/* Télétravail */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted font-medium">Politique de télétravail</span>
                {editingSection === "contexte" ? (
                  <select
                    value={form.remote_policy}
                    onChange={(e) => setForm({ ...form, remote_policy: e.target.value })}
                    className={inputClass}
                    disabled={isPending}
                  >
                    <option value="">— Sélectionner —</option>
                    {REMOTE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-heading capitalize">{opportunity.remote_policy || "—"}</span>
                )}
              </div>
            </div>
          </SurfaceCard>

          <OpportunityContactsPanel
            opportunityId={opportunity.id}
            contacts={data.contacts}
            onRefresh={onSuccess}
          />
        </div>
      </div>
    </div>
  )
}
