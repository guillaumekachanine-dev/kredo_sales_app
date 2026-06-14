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

const STEPS = [
  { key: "detection", label: "Demande", colorClass: "bg-primary text-white border-primary" },
  { key: "qualification", label: "Qualification", colorClass: "bg-warning text-white border-warning" },
  { key: "cv_envoyes", label: "CV sent", colorClass: "bg-cat-idea text-white border-cat-idea" },
  { key: "entretien_client", label: "RT", colorClass: "bg-cat-info text-cat-info-fg border-cat-info" },
  { key: "gagne", label: "WIN", colorClass: "bg-success text-white border-success" },
  { key: "perdu", label: "LOST", colorClass: "bg-danger text-white border-danger" }
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
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Étape de l&apos;opportunité</span>
            <div className="grid grid-cols-3 sm:flex sm:flex-row items-center gap-2 bg-canvas/30 p-2 rounded-xl border border-border/60">
              {STEPS.map((step) => {
                const isActive = form.stage === step.key
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setForm({ ...form, stage: step.key })}
                    className={cn(
                      "flex-1 py-2 px-3 text-center text-[10px] font-extrabold rounded-lg border uppercase tracking-wider transition-all duration-150 cursor-pointer select-none",
                      isActive
                        ? `${step.colorClass} shadow-sm scale-102`
                        : "border-border/60 hover:bg-canvas/50 text-muted bg-transparent"
                    )}
                  >
                    {step.label}
                  </button>
                )
              })}
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
