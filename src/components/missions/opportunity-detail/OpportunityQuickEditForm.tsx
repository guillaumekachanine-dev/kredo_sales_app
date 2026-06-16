"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { cn } from "@/lib/utils"
import { PRACTICE_OPTIONS } from "./opportunity-detail-options"

import type { Opportunity } from "@/types/database-domain"

interface OpportunityDetailData {
  opportunity: Opportunity
  account: {
    id: string
    name: string
    sector: string | null
  } | null
}

interface OpportunityQuickEditFormProps {
  data: OpportunityDetailData
}

const SEQUENTIAL_STEPS = [
  { key: "qualification", label: "Qualification", num: 1 },
  { key: "recherche_profil", label: "Recherche profils", num: 2 },
  { key: "cv_envoyes", label: "CV envoyés", num: 3 },
  { key: "entretien_client", label: "Entretien client", num: 4 },
]

export function OpportunityQuickEditForm({ data }: OpportunityQuickEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false)

  const { opportunity, account } = data

  const [form, setForm] = useState({
    title: opportunity.title,
    target_daily_rate: opportunity.target_daily_rate !== null ? String(opportunity.target_daily_rate) : "",
    conviction: opportunity.conviction,
    estimated_gain: opportunity.estimated_gain !== null ? String(opportunity.estimated_gain) : "",
    duration: opportunity.duration !== null ? String(opportunity.duration) : "",
    start_date: opportunity.start_date || "",
    practice: opportunity.practice || "",
    stage: opportunity.stage,
  })

  const getStageIndex = (stage: string) => {
    if (stage === "gagne" || stage === "perdu" || stage === "abandonne" || stage === "non_traitee") return 4
    return SEQUENTIAL_STEPS.findIndex((s) => s.key === stage)
  }

  const currentIdx = getStageIndex(form.stage)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    startTransition(async () => {
      const result = await updateOpportunity({
        id: opportunity.id,
        title: form.title,
        target_daily_rate: form.target_daily_rate === "" ? null : Number(form.target_daily_rate),
        conviction: form.conviction,
        estimated_gain: form.estimated_gain === "" ? null : Number(form.estimated_gain),
        duration: form.duration === "" ? null : Number(form.duration),
        start_date: form.start_date || null,
        practice: form.practice || null,
        stage: form.stage as any,
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        router.push("/missions/opps")
        router.refresh()
      }
    })
  }

  const inputClass = "w-full rounded-md border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50 font-medium"
  const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 pb-5 border-b border-border">
        <div className="flex items-center gap-2 select-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-success border border-success/20 px-2 py-0.5 rounded bg-success/5">
            Opportunité
          </span>
          {account && (
            <span className="text-xs text-muted font-medium">{account.name}</span>
          )}
        </div>
        <h1 className="text-xl font-bold font-heading text-heading tracking-tight leading-snug">
          Édition rapide : {opportunity.title}
        </h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <SurfaceCard className="p-5 flex flex-col gap-5">
          {/* ── Pipeline timeline ── */}
          <div className="flex flex-col gap-2">
            <span className={labelClass}>Étape de l&apos;opportunité</span>

            {/* Desktop: horizontal */}
            <div className="hidden md:flex items-start w-full">
              {SEQUENTIAL_STEPS.map((step, idx) => {
                const isCompleted = currentIdx > idx
                const isActive = currentIdx === idx

                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center relative min-w-0">
                    {/* Connector → next */}
                    {idx < SEQUENTIAL_STEPS.length - 1 && (
                      <div
                        className="absolute z-0"
                        style={{
                          top: 15,
                          left: "calc(50% + 18px)",
                          right: "-50%",
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isCompleted ? "#2C7D5C" : "#E5E7EB",
                          transition: "background-color 0.4s ease",
                        }}
                      />
                    )}
                    {/* Connector last → outcome */}
                    {idx === SEQUENTIAL_STEPS.length - 1 && (
                      <div
                        className="absolute z-0"
                        style={{
                          top: 15,
                          left: "calc(50% + 18px)",
                          right: "-50%", // goes to the issue node
                          height: 6,
                          borderRadius: 3,
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

                    {/* Status above */}
                    <span
                      className="text-[10px] font-bold mb-1 leading-none"
                      style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}
                    >
                      {isActive ? "En cours" : isCompleted ? "✓" : "—"}
                    </span>

                    {/* Node */}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, stage: step.key as any })}
                      className="relative z-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 focus:outline-none"
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: (isCompleted || isActive) ? "#2C7D5C" : "#F3F4F6",
                        border: isActive ? "2.5px solid #1a5c41" : "2px solid transparent",
                        boxShadow: isActive
                          ? "0 0 0 3px rgba(44,125,92,0.18)"
                          : isCompleted
                          ? "0 2px 6px rgba(44,125,92,0.22)"
                          : "none",
                        transform: isActive ? "scale(1.12)" : "scale(1)",
                      }}
                    >
                      {isActive ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 .27-2.73 0-3c-.28-.27-1.72-.26-3 0z"/>
                          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                        </svg>
                      ) : isCompleted ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Label below */}
                    <div className="flex flex-col items-center mt-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, stage: step.key as any })}
                        className="text-[10px] font-bold leading-tight cursor-pointer transition-colors focus:outline-none"
                        style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                      >
                        {step.label}
                      </button>
                      <span
                        className="text-[9px] leading-snug mt-0.5"
                        style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}
                      >
                        {["Qualification besoin", "Sourcing candidats", "Envoi profils", "Rendez-vous client"][idx]}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Issue column */}
              <div className="flex-1 flex flex-col items-center relative min-w-0">
                {/* Status above */}
                <span
                  className="text-[10px] font-bold mb-1 leading-none"
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
                    : "—"}
                </span>

                {/* Node & Dropdown trigger */}
                <div className="relative">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                      className="relative z-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 focus:outline-none"
                      style={{
                        width: 36,
                        height: 36,
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
                          form.stage === "gagne" ? "0 0 0 3px rgba(44,125,92,0.18), 0 2px 6px rgba(44,125,92,0.22)"
                          : form.stage === "perdu" ? "0 0 0 3px rgba(220,38,38,0.15), 0 2px 6px rgba(220,38,38,0.22)"
                          : form.stage === "abandonne" ? "0 0 0 3px rgba(245,158,11,0.15), 0 2px 6px rgba(245,158,11,0.22)"
                          : form.stage === "non_traitee" ? "0 0 0 3px rgba(156,163,175,0.15), 0 2px 6px rgba(156,163,175,0.22)"
                          : "none",
                      }}
                    >
                      {form.stage === "gagne" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : form.stage === "perdu" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : form.stage === "abandonne" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      ) : form.stage === "non_traitee" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                      className="p-0.5 rounded bg-canvas border border-border text-muted hover:text-heading hover:bg-muted/10 transition-colors z-20 shrink-0 self-center"
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
                              setForm({ ...form, stage: opt.key as any })
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

                <div className="flex flex-col items-center mt-2 text-center">
                  <span
                    className="text-[10px] font-bold"
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
                  <span className="text-[9px] mt-0.5 text-muted">Terminé</span>
                </div>
              </div>
            </div>

            {/* Mobile: vertical */}
            <div className="flex md:hidden flex-col gap-0">
              {SEQUENTIAL_STEPS.map((step, idx) => {
                const isCompleted = currentIdx > idx
                const isActive = currentIdx === idx
                const isLast = idx === SEQUENTIAL_STEPS.length - 1
                const subs = ["Identification", "Analyse besoin", "Envoi profils", "Rendez-vous"]

                return (
                  <div key={step.key} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, stage: step.key as any })}
                        className="flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 shrink-0 z-10 focus:outline-none"
                        style={{
                          width: 36,
                          height: 36,
                          backgroundColor: (isCompleted || isActive) ? "#2C7D5C" : "#F3F4F6",
                          boxShadow: isActive ? "0 0 0 3px rgba(44,125,92,0.18)" : isCompleted ? "0 2px 6px rgba(44,125,92,0.2)" : "none",
                          transform: isActive ? "scale(1.08)" : "scale(1)",
                        }}
                      >
                        {isActive ? (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 .27-2.73 0-3c-.28-.27-1.72-.26-3 0z"/>
                            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                          </svg>
                        ) : isCompleted ? (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div style={{
                        width: 6,
                        flex: 1,
                        minHeight: 16,
                        marginTop: 3,
                        borderRadius: 3,
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
                      }} />
                    </div>
                    <div className="flex flex-col justify-start py-1 pb-5">
                      <span className="text-[10px] font-bold leading-none mb-0.5" style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}>
                        {isActive ? "En cours" : isCompleted ? "Terminé" : "À venir"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, stage: step.key as any })}
                        className="text-[11px] font-bold text-left cursor-pointer focus:outline-none"
                        style={{ color: (isCompleted || isActive) ? "#111827" : "#6B7280" }}
                      >
                        {step.label}
                      </button>
                      <span className="text-[10px] mt-0.5" style={{ color: (isCompleted || isActive) ? "#2C7D5C" : "#9CA3AF" }}>
                        {["Qualification besoin", "Sourcing candidats", "Envoi profils", "Rendez-vous client"][idx]}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Outcome row */}
              <div className="flex items-start gap-3 mt-1 relative">
                <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                      className="flex items-center justify-center rounded-full transition-all duration-300 shrink-0 z-10 cursor-pointer focus:outline-none"
                      style={{
                        width: 36,
                        height: 36,
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
                          form.stage === "gagne" ? "0 0 0 3px rgba(44,125,92,0.18)"
                          : form.stage === "perdu" ? "0 0 0 3px rgba(220,38,38,0.15)"
                          : form.stage === "abandonne" ? "0 0 0 3px rgba(245,158,11,0.15)"
                          : form.stage === "non_traitee" ? "0 0 0 3px rgba(156,163,175,0.15)"
                          : "none",
                        transform: (form.stage === "gagne" || form.stage === "perdu" || form.stage === "abandonne" || form.stage === "non_traitee") ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      {form.stage === "gagne" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : form.stage === "perdu" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : form.stage === "abandonne" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      ) : form.stage === "non_traitee" ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      ) : (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                      className="p-0.5 rounded bg-canvas border border-border text-muted hover:text-heading hover:bg-muted/10 transition-colors z-20 shrink-0 self-center"
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-start py-1 pb-5 relative">
                  <span
                    className="text-[10px] font-bold leading-none mb-0.5"
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
                  <span className="text-[11px] font-bold text-heading">
                    Issue du processus
                  </span>

                  {/* Floating dropdown menu for mobile */}
                  {isIssueDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsIssueDropdownOpen(false)} />
                      <div className="absolute left-0 top-10 w-44 bg-canvas border border-border rounded-lg shadow-xl py-1 z-40">
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
                              setForm({ ...form, stage: opt.key as any })
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
          </div>          {/* Form Grid */}
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <label htmlFor="opp-title" className={labelClass}>Intitulé du besoin</label>
              <input
                id="opp-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                disabled={isPending}
              />
            </div>

            {/* Numeric Fields (TJM & Margin) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="opp-tjm" className={labelClass}>TJM Cible (€)</label>
                <input
                  id="opp-tjm"
                  type="number"
                  min="0"
                  value={form.target_daily_rate}
                  onChange={(e) => setForm({ ...form, target_daily_rate: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label htmlFor="opp-conviction" className={labelClass}>Confiance (%)</label>
                <input
                  id="opp-conviction"
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={form.conviction}
                  onChange={(e) => setForm({ ...form, conviction: Number(e.target.value) })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Financial Scope */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="opp-gain" className={labelClass}>Gain Estimé (€)</label>
                <input
                  id="opp-gain"
                  type="number"
                  min="0"
                  value={form.estimated_gain}
                  onChange={(e) => setForm({ ...form, estimated_gain: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
              <div>
                <label htmlFor="opp-duration" className={labelClass}>Durée (Jours)</label>
                <input
                  id="opp-duration"
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Practice & Start Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="opp-practice" className={labelClass}>Practice</label>
                <select
                  id="opp-practice"
                  value={form.practice}
                  onChange={(e) => setForm({ ...form, practice: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                >
                  <option value="">— Non renseignée —</option>
                  {PRACTICE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="opp-start-date" className={labelClass}>Date de début prévue</label>
                <input
                  id="opp-start-date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className={inputClass}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        </SurfaceCard>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={() => router.push("/missions/opps")}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-transparent hover:bg-canvas text-muted hover:text-heading transition-all disabled:opacity-50 select-none cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-fg hover:bg-primary/95 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 select-none cursor-pointer"
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  )
}
