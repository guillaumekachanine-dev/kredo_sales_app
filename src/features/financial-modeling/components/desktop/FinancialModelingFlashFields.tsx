"use client"

import React, { useState, useMemo } from "react"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import type { FinancialModelFormState } from "../../persistence/financial-model-persistence.types"
import type { FinancialModelingBootstrapData } from "../../data/get-financial-modeling-bootstrap"
import type { FinancialModelResult } from "../../domain/financial-model.types"
import { FinancialModelingResults } from "../shared"

interface FinancialModelingFlashFieldsProps {
  value: FinancialModelFormState
  onChange: (value: FinancialModelFormState) => void
  bootstrap: FinancialModelingBootstrapData
  clientResult: FinancialModelResult | null
  disabled?: boolean
}

export function FinancialModelingFlashFields({
  value,
  onChange,
  bootstrap,
  clientResult,
  disabled
}: FinancialModelingFlashFieldsProps) {
  const { resourceType, costModel, startDate, endDate, forecastActivityRate, annualWorkingDays } = value.input
  const [isRefOpen, setIsRefOpen] = useState(false)

  // Determine current year for dynamic label
  const startYear = useMemo(() => {
    if (!startDate) return new Date().getFullYear()
    const parsed = new Date(startDate)
    return isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear()
  }, [startDate])

  // Ligne 1 handle changes
  const handleTypologyChange = (type: "internal" | "external") => {
    const updated = { ...value }
    const inputObj = updated.input as any

    if (type === "internal") {
      inputObj.resourceType = "collaborator"
      inputObj.costModel = "salaried"
      updated.collaboratorId = ""
      updated.candidateId = null
      updated.resourceLabel = "Ressource interne"
      inputObj.annualGrossSalary = inputObj.annualGrossSalary ?? 0
      inputObj.employerChargesRate = inputObj.employerChargesRate ?? 0.45
      
      delete inputObj.purchaseDailyRate
      delete inputObj.fixedExternalCost
    } else {
      inputObj.resourceType = "external"
      inputObj.costModel = "subcontractor_daily_rate"
      updated.collaboratorId = null
      updated.candidateId = null
      updated.resourceLabel = "Ressource externe"
      inputObj.purchaseDailyRate = inputObj.purchaseDailyRate ?? 0
      
      delete inputObj.annualGrossSalary
      delete inputObj.annualVariablePay
      delete inputObj.employerChargesRate
      delete inputObj.fixedExternalCost
    }
    onChange(updated)
  }

  const handleSeniorityChange = (seniority: string) => {
    const updated = { ...value }
    updated.senioritySnapshot = seniority
    onChange(updated)
  }

  // Cost field change helpers
  const handleCostFieldChange = (key: string, val: any) => {
    const updated = { ...value }
    updated.input = { ...value.input, [key]: val } as any
    onChange(updated)
  }

  // Dynamic Expenses management
  const expenses = value.input.expenses ?? []

  const handleAddExpense = () => {
    const updated = { ...value }
    const nextExpenses = [...expenses]
    nextExpenses.push({
      label: "",
      calculationMode: "fixed",
      unitAmount: 0,
      quantity: 1
    })
    updated.input = { ...updated.input, expenses: nextExpenses }
    onChange(updated)
  }

  const handleRemoveExpense = (index: number) => {
    const updated = { ...value }
    const nextExpenses = [...expenses]
    nextExpenses.splice(index, 1)
    updated.input = { ...updated.input, expenses: nextExpenses }
    onChange(updated)
  }

  const handleExpenseChange = (index: number, key: string, val: any) => {
    const updated = { ...value }
    const nextExpenses = expenses.map((exp, idx) => {
      if (idx !== index) return exp
      return { ...exp, [key]: val }
    })
    updated.input = { ...updated.input, expenses: nextExpenses }
    onChange(updated)
  }

  // Collapsible Referentials data calculations
  const precedentTarif = useMemo(() => {
    const pricing = bootstrap.pricing
    const matchingAnchors = pricing.anchors.filter(
      (a) =>
        (value.companyId && a.companyId === value.companyId) ||
        (value.senioritySnapshot && a.seniorityLevel?.toLowerCase() === value.senioritySnapshot.toLowerCase())
    )
    if (matchingAnchors.length > 0) {
      return matchingAnchors[0].saleDailyRate
    }
    const matchingBenchmarks = pricing.benchmarks.filter(
      (b) => value.senioritySnapshot && b.seniorityLevel?.toLowerCase() === value.senioritySnapshot.toLowerCase()
    )
    if (matchingBenchmarks.length > 0) {
      return matchingBenchmarks[0].saleDailyRate
    }
    return null
  }, [value.companyId, value.senioritySnapshot, bootstrap])

  const targetOppRate = useMemo(() => {
    if (!value.opportunityId) return null
    const opp = bootstrap.opportunities.find((o) => o.id === value.opportunityId)
    return opp?.target_daily_rate ?? null
  }, [value.opportunityId, bootstrap.opportunities])

  const filteredOpportunities = useMemo(() => {
    if (!value.companyId) return bootstrap.opportunities
    return bootstrap.opportunities.filter((o) => o.company_id === value.companyId)
  }, [value.companyId, bootstrap.opportunities])

  // Check if date de fin is enabled
  const isEndDateActive = endDate !== null

  const handleToggleEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Default to end of year or a default date
      const d = startDate ? new Date(startDate) : new Date()
      d.setMonth(11)
      d.setDate(31)
      handleCostFieldChange("endDate", d.toISOString().split("T")[0])
    } else {
      handleCostFieldChange("endDate", null)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* SECTION COÛTS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-heading uppercase tracking-wider">Coûts</h3>
        
        {/* Ligne 1: Typologie et Séniorité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={<span className="truncate whitespace-nowrap block">Typologie de ressource</span>}
            required
          >
            <Select
              value={resourceType === "external" ? "external" : "internal"}
              onChange={(e) => handleTypologyChange(e.target.value as "internal" | "external")}
            >
              <option value="internal">Interne</option>
              <option value="external">Externe</option>
            </Select>
          </Field>

          <Field
            label={<span className="truncate whitespace-nowrap block">Niveau de séniorité</span>}
            required
          >
            <Select
              value={value.senioritySnapshot || ""}
              onChange={(e) => handleSeniorityChange(e.target.value)}
            >
              <option value="">-- Choisir le niveau --</option>
              <option value="Junior">Junior</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Senior">Senior</option>
            </Select>
          </Field>
        </div>

        {/* Ligne 2: Données financières */}
        {resourceType !== "external" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field
              label={<span className="truncate whitespace-nowrap block">Salaire brut annuel (€)</span>}
              required
            >
              <Input
                type="number"
                value={(value.input as any).annualGrossSalary || ""}
                onChange={(e) => handleCostFieldChange("annualGrossSalary", Number(e.target.value))}
              />
            </Field>

            <Field
              label={<span className="truncate whitespace-nowrap block">Taux de charges</span>}
              required
            >
              <Input
                type="number"
                step="0.01"
                placeholder="0.45"
                value={(value.input as any).employerChargesRate != null ? (value.input as any).employerChargesRate : ""}
                onChange={(e) => handleCostFieldChange("employerChargesRate", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>

            <Field
              label={<span className="truncate whitespace-nowrap block">CJM</span>}
            >
              <Input
                type="text"
                readOnly
                disabled
                value={clientResult?.productiveDailyCost ? `${Math.round(clientResult.productiveDailyCost)} €` : "—"}
                className="bg-canvas/50 font-semibold cursor-not-allowed text-right text-muted"
              />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={<span className="truncate whitespace-nowrap block">Coût d&apos;achat journalier H.T. (€)</span>}
              required
            >
              <Input
                type="number"
                value={(value.input as any).purchaseDailyRate || ""}
                onChange={(e) => handleCostFieldChange("purchaseDailyRate", Number(e.target.value))}
              />
            </Field>
            <div />
          </div>
        )}

        {/* Ajout dynamique de coûts */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
            <span className="text-[11px] font-semibold text-muted">Coûts additionnels (frais, primes, variables...)</span>
            <button
              type="button"
              onClick={handleAddExpense}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>+ Ajouter un coût</span>
            </button>
          </div>

          {expenses.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_130px_110px_40px] gap-3 text-[10px] font-bold uppercase tracking-wider text-muted px-1">
                <div>Description</div>
                <div>Mode de calcul</div>
                <div className="text-right">Montant (€)</div>
                <div></div>
              </div>
              {expenses.map((expense, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_130px_110px_40px] gap-3 items-center">
                  <Input
                    placeholder="Ex: Prime de bilan, Laptop..."
                    value={expense.label}
                    onChange={(e) => handleExpenseChange(idx, "label", e.target.value)}
                  />
                  <Select
                    value={expense.calculationMode}
                    onChange={(e) => handleExpenseChange(idx, "calculationMode", e.target.value as any)}
                  >
                    <option value="fixed">Fixe</option>
                    <option value="monthly">Mensuel</option>
                    <option value="annual">Annuel</option>
                    <option value="per_business_day">Par jr ouvré</option>
                    <option value="per_production_day">Par jr produit</option>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0"
                    value={expense.unitAmount || ""}
                    onChange={(e) => handleExpenseChange(idx, "unitAmount", Number(e.target.value))}
                    className="text-right"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExpense(idx)}
                    className="text-muted hover:text-danger flex items-center justify-center h-10 w-10 transition-colors"
                    title="Supprimer"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION REVENUS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-heading uppercase tracking-wider">Revenus</h3>
        
        {/* Ligne 1: TJM */}
        <Field
          label={<span className="truncate whitespace-nowrap block">TJM de vente proposé H.T. (€)</span>}
          required
        >
          <Input
            type="number"
            value={value.input.salesDailyRate || ""}
            onChange={(e) => handleCostFieldChange("salesDailyRate", Number(e.target.value))}
            className="border-orange-500 ring-orange-500 focus:border-orange-600 focus:ring-orange-600 border-[1.5px]"
          />
        </Field>

        {/* Ligne 2: Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <Field
            label={<span className="truncate whitespace-nowrap block">Date de début</span>}
            required
          >
            <Input
              type="date"
              value={startDate || ""}
              onChange={(e) => handleCostFieldChange("startDate", e.target.value)}
            />
          </Field>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="endDateInput"
                className={`text-xs font-medium text-heading transition-opacity ${!isEndDateActive ? "opacity-50" : ""}`}
              >
                <span className="truncate whitespace-nowrap block">Date de fin</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="enableEndDate"
                  checked={isEndDateActive}
                  onChange={handleToggleEndDate}
                  className="rounded border-border text-primary focus:ring-primary size-3 cursor-pointer"
                />
                <label htmlFor="enableEndDate" className="text-[10px] text-muted cursor-pointer select-none">
                  Activer
                </label>
              </div>
            </div>
            <Input
              id="endDateInput"
              type="date"
              value={endDate || ""}
              disabled={!isEndDateActive}
              onChange={(e) => handleCostFieldChange("endDate", e.target.value || null)}
              className={`transition-opacity ${!isEndDateActive ? "opacity-40 cursor-not-allowed" : ""}`}
            />
          </div>
        </div>

        {/* Ligne 3: Champs pré-remplis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label={<span className="truncate whitespace-nowrap block">TACI théorique (%)</span>}
            required
          >
            <Input
              type="number"
              min="1"
              max="100"
              value={forecastActivityRate ? Math.round(forecastActivityRate * 100) : ""}
              onChange={(e) => handleCostFieldChange("forecastActivityRate", Number(e.target.value) / 100)}
            />
          </Field>

          <Field
            label={<span className="truncate whitespace-nowrap block">Production {startYear}</span>}
          >
            <Input
              type="text"
              readOnly
              disabled
              value={clientResult ? `${clientResult.periodBusinessDays} j` : "—"}
              className="bg-canvas/50 cursor-not-allowed"
            />
          </Field>

          <Field
            label={<span className="truncate whitespace-nowrap block">Production annuelle de référence</span>}
            required
          >
            <Input
              type="number"
              value={annualWorkingDays || ""}
              onChange={(e) => handleCostFieldChange("annualWorkingDays", Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      {/* SECTION RÉFÉRENTIELS (Collapsible Accordion) */}
      <div className="border border-border/60 rounded-[var(--radius-medium)] overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsRefOpen(!isRefOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-canvas/30 hover:bg-canvas/50 transition-colors text-xs font-bold text-heading uppercase tracking-wider"
        >
          <span>Référentiels (Optionnel)</span>
          <svg
            className={`size-4 transition-transform duration-200 ${isRefOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {isRefOpen && (
          <div className="p-4 border-t border-border/45 space-y-4 bg-surface/50">
            {/* Ligne 1: Client & Opportunité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={<span className="truncate whitespace-nowrap block">Client</span>} optional>
                <Select
                  value={value.companyId || ""}
                  onChange={(e) => {
                    const compId = e.target.value || null
                    onChange({ ...value, companyId: compId, opportunityId: null })
                  }}
                >
                  <option value="">-- Aucun --</option>
                  {bootstrap.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={<span className="truncate whitespace-nowrap block">Opportunité</span>} optional>
                <Select
                  value={value.opportunityId || ""}
                  onChange={(e) => {
                    const oppId = e.target.value || null
                    const opp = bootstrap.opportunities.find((o) => o.id === oppId)
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

            {/* Ligne 2: Données historiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={<span className="truncate whitespace-nowrap block">Précédents tarifaires</span>}>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={precedentTarif ? `${precedentTarif} €` : "—"}
                  className="bg-canvas/50 cursor-not-allowed"
                />
              </Field>

              <Field label={<span className="truncate whitespace-nowrap block">TJ cible de l’opportunité</span>}>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={targetOppRate ? `${targetOppRate} €` : "—"}
                  className="bg-canvas/50 cursor-not-allowed"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* SECTION RÉSULTATS (Tableau des détails financiers seul) */}
      <div className="space-y-4">
        <FinancialModelingResults
          result={clientResult}
          salesDailyRate={value.input.salesDailyRate}
          hideKpis={true}
        />
      </div>

    </div>
  )
}
