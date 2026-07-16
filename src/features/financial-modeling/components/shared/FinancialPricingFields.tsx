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
  activeStaffingCompanyIds: string[]
  disabled?: boolean
}

export function FinancialPricingFields({ value, onChange, pricing, companies, opportunities, activeStaffingCompanyIds, disabled }: FinancialPricingFieldsProps) {
  const { salesDailyRate } = value.input

  // Filter opportunities if a client company is selected
  const filteredOpportunities = useMemo(() => {
    if (!value.companyId) return opportunities
    return opportunities.filter((o) => o.company_id === value.companyId)
  }, [value.companyId, opportunities])

  const [activeStaffingCompanies, otherCompanies] = useMemo(() => {
    const activeCompanyIds = new Set(activeStaffingCompanyIds)
    return [
      companies.filter((company) => activeCompanyIds.has(company.id)),
      companies.filter((company) => !activeCompanyIds.has(company.id)),
    ]
  }, [activeStaffingCompanyIds, companies])

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
    if (disabled) return
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Client (Facultatif)" optional>
          <Select
            value={value.companyId || ""}
            disabled={disabled}
            onChange={(e) => {
              const compId = e.target.value || null
              onChange({ ...value, companyId: compId, opportunityId: null })
            }}
          >
            <option value="">-- Aucun --</option>
            {activeStaffingCompanies.length > 0 && (
              <optgroup label="Besoins & staffing ouverts">
                {activeStaffingCompanies.map((company) => (
                  <option key={company.id} value={company.id} className="text-primary font-medium">
                    {company.name}
                  </option>
                ))}
              </optgroup>
            )}
            {otherCompanies.length > 0 && (
              <optgroup label="Autres clients">
                {otherCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </Field>

        <Field label="Opportunité (Facultatif)" optional>
          <Select
            value={value.opportunityId || ""}
            disabled={disabled}
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

      {suggestedAnchors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-heading">Ancrages tarifaires</p>
          <div className="flex flex-wrap gap-2">
            {suggestedAnchors.map((anchor) => {
              const rate = anchor.saleDailyRate
              if (!rate) return null

              const typeLabel =
                anchor.sourceType === "agreement" ? "Accord client" :
                anchor.sourceType === "mission" ? "Mission passée" :
                anchor.sourceType === "opportunity" ? "Cible opp." : "Benchmark grille"

              const badgeColor =
                anchor.sourceType === "agreement" ? "bg-success/10 text-success border-success/20" :
                anchor.sourceType === "mission" ? "bg-primary/10 text-primary border-primary/20" :
                "bg-canvas/50 text-muted border-border/80"

              return (
                <button
                  key={`${anchor.sourceType}-${anchor.sourceId}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleAnchorClick(rate, anchor)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-small)] border border-border/80 bg-surface px-2 py-1.5 text-left transition-colors hover:bg-canvas/10 disabled:opacity-60 disabled:hover:bg-surface"
                >
                  <span className={`rounded border px-1 text-[9px] font-semibold uppercase ${badgeColor}`}>
                    {typeLabel}
                  </span>
                  <span className="max-w-32 truncate text-[10px] text-muted">
                    {anchor.sourceLabel || anchor.profileName}
                  </span>
                  <span className="text-[11px] font-bold text-heading">{rate} €</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Field label="TJM de vente" labelClassName="w-full text-center" required>
        <Input
          type="number"
          value={salesDailyRate || ""}
          disabled={disabled}
          className="h-12 border-amber-400 bg-amber-50/60 !text-sm font-semibold text-center text-amber-950 focus-visible:ring-amber-400"
          onChange={(e) => {
            const updated = { ...value }
            updated.input = { ...value.input, salesDailyRate: Number(e.target.value) }
            onChange(updated)
          }}
        />
      </Field>
    </div>
  )
}
