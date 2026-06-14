"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { updateOpportunity } from "@/app/(app)/missions/_actions/update-opportunity"
import { cn } from "@/lib/utils"
import { PRACTICE_OPTIONS } from "./opportunity-detail-options"

import type { Opportunity } from "@/types/database"

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
  { key: "detection", label: "Demande", num: 1 },
  { key: "qualification", label: "Qualification", num: 2 },
  { key: "cv_envoyes", label: "CV sent", num: 3 },
  { key: "entretien_client", label: "RT", num: 4 },
]

export function OpportunityQuickEditForm({ data }: OpportunityQuickEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
    if (stage === "gagne" || stage === "perdu") return 4
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
          {/* Stepper design line */}
          <div className="flex flex-col gap-3">
            <span className={labelClass}>Étape de l&apos;opportunité</span>
            
            {/* Timeline container */}
            <div className="relative flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 md:gap-4 bg-canvas/30 p-5 rounded-xl border border-border/60">
              
              {/* Sequential steps */}
              <div className="flex flex-col md:flex-row flex-1 items-start md:items-center gap-6 md:gap-4 relative w-full">
                {SEQUENTIAL_STEPS.map((step, idx) => {
                  const isCompleted = currentIdx > idx
                  const isActive = currentIdx === idx
                  const isPassedOrActive = currentIdx >= idx

                  return (
                    <div key={step.key} className="flex-1 flex flex-row md:flex-col items-center gap-3 md:gap-2 w-full relative z-10">
                      {/* Step Circle & Connector Line */}
                      <div className="flex items-center justify-center relative">
                        {/* Connector line */}
                        {idx < SEQUENTIAL_STEPS.length - 1 && (
                          <div 
                            className={cn(
                              "absolute transition-all duration-300 -z-10",
                              // Desktop line
                              "hidden md:block md:left-1/2 md:top-[16px] md:w-full md:h-[2px]",
                              // Mobile line
                              "block left-[15px] top-[16px] w-[2px] h-[calc(100%+24px)]",
                              isCompleted ? "bg-primary" : "bg-border/60"
                            )}
                          />
                        )}

                        {/* Connector to Outcomes from last sequential step (RT) */}
                        {idx === SEQUENTIAL_STEPS.length - 1 && (
                          <div 
                            className={cn(
                              "absolute transition-all duration-300 -z-10",
                              // Desktop line
                              "hidden md:block md:left-1/2 md:top-[16px] md:w-full md:h-[2px]",
                              // Mobile line
                              "block left-[15px] top-[16px] w-[2px] h-[calc(100%+24px)]",
                              form.stage === "gagne"
                                ? "bg-success"
                                : form.stage === "perdu"
                                ? "bg-danger"
                                : "bg-border/60"
                            )}
                          />
                        )}

                        {/* Circle Button */}
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, stage: step.key })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 cursor-pointer select-none z-10",
                            isActive
                              ? "border-primary bg-canvas text-primary ring-4 ring-primary/15 scale-110 shadow-md"
                              : isCompleted
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-border/80 bg-canvas/50 text-muted hover:border-muted hover:bg-canvas"
                          )}
                        >
                          {isCompleted ? (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step.num
                          )}
                        </button>
                      </div>

                      {/* Label */}
                      <div className="flex flex-col items-start md:items-center text-left md:text-center">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, stage: step.key })}
                          className={cn(
                            "text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-all",
                            isActive || isCompleted ? "text-primary" : "text-muted"
                          )}
                        >
                          {step.label}
                        </button>
                        {isActive && (
                          <span className="text-[8px] text-primary/70 font-semibold uppercase tracking-wider animate-pulse">
                            En cours
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Outcome Node (Step 5) */}
              <div className="flex-initial flex flex-row md:flex-col items-center gap-3 md:gap-2 w-full md:w-auto relative z-10 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 shrink-0">
                <div className="flex items-center justify-center relative">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm",
                      form.stage === "gagne"
                        ? "border-success bg-success text-white ring-4 ring-success/15 scale-110"
                        : form.stage === "perdu"
                        ? "border-danger bg-danger text-white ring-4 ring-danger/15 scale-110"
                        : "border-border/80 bg-canvas/50 text-muted"
                    )}
                  >
                    {form.stage === "gagne" ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : form.stage === "perdu" ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted/60" />
                    )}
                  </div>
                </div>

                {/* Buttons and label */}
                <div className="flex flex-col items-start md:items-center text-left md:text-center w-full md:w-auto">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-wider mb-1.5",
                    form.stage === "gagne"
                      ? "text-success"
                      : form.stage === "perdu"
                      ? "text-danger"
                      : "text-muted"
                  )}>
                    {form.stage === "gagne" ? "Gagné" : form.stage === "perdu" ? "Perdu" : "Issue commerciale"}
                  </span>
                  <div className="flex flex-row items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, stage: "gagne" })}
                      className={cn(
                        "py-1 px-2.5 text-[9px] font-extrabold rounded-md border uppercase tracking-wider transition-all duration-150 cursor-pointer select-none",
                        form.stage === "gagne"
                          ? "bg-success text-white border-success shadow-sm"
                          : "border-border/60 hover:bg-success/5 hover:text-success hover:border-success/40 text-muted bg-transparent"
                      )}
                    >
                      WIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, stage: "perdu" })}
                      className={cn(
                        "py-1 px-2.5 text-[9px] font-extrabold rounded-md border uppercase tracking-wider transition-all duration-150 cursor-pointer select-none",
                        form.stage === "perdu"
                          ? "bg-danger text-white border-danger shadow-sm"
                          : "border-border/60 hover:bg-danger/5 hover:text-danger hover:border-danger/40 text-muted bg-transparent"
                      )}
                    >
                      LOST
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Form Grid */}
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
