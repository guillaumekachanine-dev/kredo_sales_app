import React, { useMemo } from "react"
import { Field } from "@/components/ui/Field"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import type { FinancialModelFormState } from "../../persistence/financial-model-persistence.types"
import type { FinancialPricingAnchorsData } from "../../data/get-financial-pricing-anchors"

interface FinancialPricingFieldsProps {
  value: FinancialModelFormState
  onChange: (value: FinancialModelFormState) => void
  pricing: FinancialPricingAnchorsData
  companies: { id: string; name: string }[]
  opportunities: { id: string; title: string; company_id: string | null; target_daily_rate: number | null }[]
}

export function FinancialPricingFields({ value, onChange, pricing, companies, opportunities }: FinancialPricingFieldsProps) {
  const { salesDailyRate } = value.input

  // Filter opportunities if a client company is selected
  const filteredOpportunities = useMemo(() => {
    if (!value.companyId) return opportunities
    return opportunities.filter((o) => o.company_id === value.companyId)
  }, [value.companyId, opportunities])

  // Find relevant anchors (agreements, past missions, benchmarks) matching selected company or job profile
  const suggestedAnchors = useMemo(() => {
    const list: Array<
      typeof pricing.anchors[number] | typeof pricing.benchmarks[number]
    > = []
    
    // Add matching benchmarks
    if (value.jobProfileId) {
      pricing.benchmarks
        .filter((b) => b.jobProfileId === value.jobProfileId)
        .forEach((b) => list.push(b))

      pricing.anchors
        .filter((a) => a.jobProfileId === value.jobProfileId || (value.companyId && a.companyId === value.companyId))
        .forEach((a) => list.push(a))
    } else if (value.companyId) {
      pricing.anchors
        .filter((a) => a.companyId === value.companyId)
        .forEach((a) => list.push(a))
    } else {
      // Fallback: take first 3 benchmarks
      pricing.benchmarks.slice(0, 3).forEach((b) => list.push(b))
    }

    // Deduplicate by sourceId or label + rate
    const seen = new Set<string>()
    return list.filter((item) => {
      const key = `${item.sourceType}-${item.sourceId || ('profileName' in item ? item.profileName : '')}-${item.saleDailyRate}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 4) // Show top 4 suggestions
  }, [value.jobProfileId, value.companyId, pricing])

  const handleAnchorClick = (
    rate: number,
    anchor: typeof pricing.anchors[number] | typeof pricing.benchmarks[number]
  ) => {
    const updated = { ...value }
    updated.input = { ...value.input, salesDailyRate: rate }
    
    if (anchor.sourceType === "agreement") {
      updated.pricingAgreementId = anchor.sourceId
    } else if (anchor.sourceType === "mission") {
      updated.precedentMissionId = anchor.sourceId
    } else if (anchor.sourceType === "opportunity") {
      updated.precedentOpportunityId = anchor.sourceId
    }
    
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Client and Opportunity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Client (Facultatif)" optional>
          <Select
            value={value.companyId || ""}
            onChange={(e) => {
              const compId = e.target.value || null
              onChange({ ...value, companyId: compId, opportunityId: null })
            }}
          >
            <option value="">-- Aucun --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Opportunité (Facultatif)" optional>
          <Select
            value={value.opportunityId || ""}
            onChange={(e) => {
              const oppId = e.target.value || null
              const opp = opportunities.find((o) => o.id === oppId)
              const updated = { ...value, opportunityId: oppId }
              
              // Pre-fill TJM if opportunity has target daily rate
              if (opp?.target_daily_rate) {
                updated.input = { ...updated.input, salesDailyRate: opp.target_daily_rate }
              }
              onChange(updated)
            }}
          >
            <option value="">-- Aucune --</option>
            {filteredOpportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} {o.target_daily_rate ? `(${o.target_daily_rate} €)` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* TJM input */}
      <Field label="TJM de vente proposé H.T. (€)" required>
        <Input
          type="number"
          value={salesDailyRate || ""}
          onChange={(e) => {
            const updated = { ...value }
            updated.input = { ...value.input, salesDailyRate: Number(e.target.value) }
            onChange(updated)
          }}
        />
      </Field>

      {/* Suggested Anchors */}
      {suggestedAnchors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Ancrages tarifaires disponibles :</p>
          <div className="grid grid-cols-2 gap-2">
            {suggestedAnchors.map((anchor, idx) => {
              const rate = anchor.saleDailyRate
              if (!rate) return null

              const typeLabel =
                anchor.sourceType === "agreement" ? "Accord client" :
                anchor.sourceType === "mission" ? "Mission passée" :
                anchor.sourceType === "opportunity" ? "Cible Opp" : "Benchmark Grille"

              const badgeColor =
                anchor.sourceType === "agreement" ? "bg-success/10 text-success border-success/20" :
                anchor.sourceType === "mission" ? "bg-primary/10 text-primary border-primary/20" :
                "bg-canvas/50 text-muted border-border/80"

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnchorClick(rate, anchor)}
                  className="flex flex-col items-start p-2 rounded-[var(--radius-small)] border border-border/80 bg-surface hover:bg-canvas/10 text-left transition-all"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[9px] px-1 rounded border font-semibold uppercase ${badgeColor}`}>
                      {typeLabel}
                    </span>
                    <span className="text-[11px] font-bold text-heading">{rate} €</span>
                  </div>
                  <span className="text-[10px] text-muted mt-1 truncate w-full">
                    {anchor.sourceLabel || anchor.profileName}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
