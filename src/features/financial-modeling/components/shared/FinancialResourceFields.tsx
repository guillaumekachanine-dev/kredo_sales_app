import React, { useMemo } from "react"
import { Field } from "@/components/ui/Field"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import type { FinancialModelFormState } from "../../persistence/financial-model-persistence.types"
import type { FinancialResourceCatalogData } from "../../data/get-financial-resource-catalog"
import type { FinancialAssumptionsData } from "../../data/get-financial-assumptions"

interface FinancialResourceFieldsProps {
  value: FinancialModelFormState
  onChange: (value: FinancialModelFormState) => void
  catalog: FinancialResourceCatalogData
  assumptions: FinancialAssumptionsData
}

export function FinancialResourceFields({ value, onChange, catalog, assumptions }: FinancialResourceFieldsProps) {
  const { resourceType, costModel } = value.input

  const selectedResourceId = value.collaboratorId || value.candidateId || ""

  const resourceOptions = useMemo(() => {
    if (resourceType === "collaborator") {
      return catalog.collaborators
    }
    if (resourceType === "candidate") {
      return catalog.candidates
    }
    return []
  }, [resourceType, catalog])

  const selectedItem = useMemo(() => {
    if (resourceType === "collaborator") {
      return catalog.collaborators.find((c) => c.id === value.collaboratorId)
    }
    if (resourceType === "candidate") {
      return catalog.candidates.find((c) => c.id === value.candidateId)
    }
    return null
  }, [resourceType, value.collaboratorId, value.candidateId, catalog])

  const handleResourceTypeChange = (newType: "collaborator" | "candidate" | "external") => {
    const updated = { ...value }
    const inputObj = updated.input as unknown as Record<string, unknown>
    inputObj.resourceType = newType

    if (newType === "collaborator") {
      updated.collaboratorId = ""
      updated.candidateId = null
      updated.resourceLabel = ""
      inputObj.costModel = "salaried"
      
      delete inputObj.purchaseDailyRate
      delete inputObj.fixedExternalCost
      
      inputObj.annualGrossSalary = 0
      inputObj.annualVariablePay = 0
      inputObj.employerChargesRate = null
    } else if (newType === "candidate") {
      updated.collaboratorId = null
      updated.candidateId = ""
      updated.resourceLabel = ""
      inputObj.costModel = "salaried"
      
      delete inputObj.purchaseDailyRate
      delete inputObj.fixedExternalCost
      
      inputObj.annualGrossSalary = 0
      inputObj.annualVariablePay = 0
      inputObj.employerChargesRate = null
    } else {
      updated.collaboratorId = null
      updated.candidateId = null
      updated.resourceLabel = "Ressource externe"
      inputObj.costModel = "subcontractor_daily_rate"
      
      delete inputObj.annualGrossSalary
      delete inputObj.annualVariablePay
      delete inputObj.employerChargesRate
      
      inputObj.purchaseDailyRate = 0
    }
    onChange(updated)
  }

  const handleResourceSelectionChange = (id: string) => {
    const item = resourceOptions.find((o) => o.id === id)
    if (!item) return

    const updated = { ...value }
    
    if (resourceType === "collaborator") {
      updated.collaboratorId = item.id
      updated.candidateId = null
    } else {
      updated.collaboratorId = null
      updated.candidateId = item.id
    }
    
    updated.resourceLabel = item.label
    updated.jobProfileId = item.jobProfileId
    updated.profileNameSnapshot = item.jobProfileTitle
    updated.senioritySnapshot = item.seniority
    updated.locationSnapshot = item.location
    updated.employmentStatusSnapshot = item.employmentStatus

    const mapping = item.lot0InputMapping
    const chargesRateFromEmploymentStatus = item.employmentStatus
      ? assumptions.lot0InputMapping.chargeRatesByEmploymentStatus[item.employmentStatus]?.chargesRate
      : null

    const resolvedChargesRate = mapping.employerChargesRate ?? chargesRateFromEmploymentStatus ?? null
    const isChargesRateDefaulted = resolvedChargesRate === null

    updated.input = {
      ...value.input,
      historicalActivityRate: null,
      flags: {
        ...value.input.flags,
        annualGrossSalaryEstimated: item.isEstimate && mapping.annualGrossSalary !== null,
        annualVariablePayEstimated: item.isEstimate && mapping.annualVariablePay !== null,
        employerChargesRateEstimated: item.isEstimate && resolvedChargesRate !== null,
        employerChargesRateDefaulted: isChargesRateDefaulted,
        purchaseDailyRateEstimated: item.isEstimate && mapping.purchaseDailyRate !== null,
        resourceCostEstimated: item.isEstimate,
      }
    }

    const inputObj = updated.input as unknown as Record<string, unknown>

    if (mapping.resourceCostModel === "salaried") {
      inputObj.costModel = "salaried"
      inputObj.annualGrossSalary = mapping.annualGrossSalary ?? 0
      inputObj.annualVariablePay = mapping.annualVariablePay ?? 0
      inputObj.employerChargesRate = resolvedChargesRate

      delete inputObj.purchaseDailyRate
      delete inputObj.fixedExternalCost
    } else if (mapping.resourceCostModel === "subcontractor_daily_rate") {
      inputObj.costModel = "subcontractor_daily_rate"
      inputObj.purchaseDailyRate = mapping.purchaseDailyRate ?? 0

      delete inputObj.annualGrossSalary
      delete inputObj.annualVariablePay
      delete inputObj.employerChargesRate
      delete inputObj.fixedExternalCost
    }
    
    onChange(updated)
  }

  const handleCostModelChange = (model: typeof costModel) => {
    const updated = { ...value }
    const inputObj = updated.input as unknown as Record<string, unknown>
    inputObj.costModel = model

    if (model === "salaried") {
      delete inputObj.purchaseDailyRate
      delete inputObj.fixedExternalCost
      inputObj.annualGrossSalary = 0
      inputObj.annualVariablePay = 0
      inputObj.employerChargesRate = null
    } else if (model === "subcontractor_daily_rate") {
      delete inputObj.annualGrossSalary
      delete inputObj.annualVariablePay
      delete inputObj.employerChargesRate
      delete inputObj.fixedExternalCost
      inputObj.purchaseDailyRate = 0
    } else if (model === "fixed_external_cost") {
      delete inputObj.annualGrossSalary
      delete inputObj.annualVariablePay
      delete inputObj.employerChargesRate
      delete inputObj.purchaseDailyRate
      inputObj.fixedExternalCost = 0
    }
    onChange(updated)
  }

  const inputObjVal = value.input as unknown as Record<string, unknown>
  const annualGrossSalaryValue = (inputObjVal.annualGrossSalary ?? 0) as number
  const annualVariablePayValue = (inputObjVal.annualVariablePay ?? 0) as number
  const employerChargesRateValue = (inputObjVal.employerChargesRate ?? null) as number | null
  const purchaseDailyRateValue = (inputObjVal.purchaseDailyRate ?? 0) as number
  const fixedExternalCostValue = (inputObjVal.fixedExternalCost ?? 0) as number

  return (
    <div className="space-y-4">
      {/* Resource Type */}
      <div className="grid grid-cols-3 gap-2">
        {(["collaborator", "candidate", "external"] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={`py-1.5 px-3 rounded-[var(--radius-small)] text-xs font-semibold border transition-all ${
              resourceType === type
                ? "bg-primary border-primary text-primary-fg"
                : "bg-surface border-border text-body hover:bg-canvas/10"
            }`}
            onClick={() => handleResourceTypeChange(type)}
          >
            {type === "collaborator" ? "Collaborateur" : type === "candidate" ? "Candidat" : "Externe"}
          </button>
        ))}
      </div>

      {/* Select Resource (from DB catalog) */}
      {resourceType !== "external" && (
        <Field label={resourceType === "collaborator" ? "Sélectionner le collaborateur" : "Sélectionner le candidat"} required>
          <Select value={selectedResourceId} onChange={(e) => handleResourceSelectionChange(e.target.value)}>
            <option value="">-- Choisir dans le catalogue --</option>
            {resourceOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} {opt.jobProfileTitle ? `(${opt.jobProfileTitle})` : ""}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* External Cost Model Selector (only when external) */}
      {resourceType === "external" && (
        <Field label="Modèle de coût" required>
          <Select value={costModel} onChange={(e) => handleCostModelChange(e.target.value as "salaried" | "subcontractor_daily_rate" | "fixed_external_cost")}>
            <option value="subcontractor_daily_rate">Achat journalier (Sous-traitance)</option>
            <option value="fixed_external_cost">Coût externe forfaitaire fixe</option>
          </Select>
        </Field>
      )}

      {/* Selected Item Info Badges */}
      {selectedItem && (
        <div className="bg-canvas/30 border border-border/50 rounded-[var(--radius-medium)] p-2.5 text-[11px] space-y-1">
          <p className="font-semibold text-heading">Profil Snapshot :</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted">
            <div>Métier : <span className="font-medium text-body">{selectedItem.jobProfileTitle || "—"}</span></div>
            <div>Niveau : <span className="font-medium text-body">{selectedItem.seniority || "—"}</span></div>
            <div>Contrat : <span className="font-medium text-body">{selectedItem.employmentStatus || "—"}</span></div>
            <div>Localisation : <span className="font-medium text-body">{selectedItem.location || "—"}</span></div>
          </div>
          {selectedItem.isEstimate && (
            <div className="mt-1.5 flex items-center gap-1.5 text-warning font-medium">
              <span className="size-1.5 rounded-full bg-warning" />
              Ce profil utilise des estimations
            </div>
          )}
        </div>
      )}

      {/* Salaried Fields */}
      {costModel === "salaried" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field
            label={
              <div className="flex items-center justify-between w-full">
                <span>Brut annuel (€)</span>
                {value.input.flags?.annualGrossSalaryEstimated && (
                  <span className="text-[9px] font-semibold text-warning uppercase">Estimé</span>
                )}
              </div>
            }
            required
          >
            <Input
              type="number"
              value={annualGrossSalaryValue || ""}
              onChange={(e) => {
                const updated = { ...value }
                const inputObj = updated.input as unknown as Record<string, unknown>
                inputObj.annualGrossSalary = Number(e.target.value)
                onChange(updated)
              }}
            />
          </Field>

          <Field
            label={
              <div className="flex items-center justify-between w-full">
                <span>Variable annuel (€)</span>
                {value.input.flags?.annualVariablePayEstimated && (
                  <span className="text-[9px] font-semibold text-warning uppercase">Estimé</span>
                )}
              </div>
            }
          >
            <Input
              type="number"
              value={annualVariablePayValue || ""}
              onChange={(e) => {
                const updated = { ...value }
                const inputObj = updated.input as unknown as Record<string, unknown>
                inputObj.annualVariablePay = Number(e.target.value)
                onChange(updated)
              }}
            />
          </Field>

          <Field
            label={
              <div className="flex items-center justify-between w-full">
                <span>Taux de charges</span>
                {value.input.flags?.employerChargesRateDefaulted ? (
                  <span className="text-[9px] font-semibold text-muted uppercase">Défaut (45%)</span>
                ) : value.input.flags?.employerChargesRateEstimated ? (
                  <span className="text-[9px] font-semibold text-warning uppercase">Estimé</span>
                ) : null}
              </div>
            }
          >
            <Input
              type="number"
              step="0.01"
              placeholder="0.45"
              value={employerChargesRateValue != null ? employerChargesRateValue : ""}
              onChange={(e) => {
                const updated = { ...value }
                const val = e.target.value === "" ? null : Number(e.target.value)
                const inputObj = updated.input as unknown as Record<string, unknown>
                inputObj.employerChargesRate = val
                if (updated.input.flags) {
                  updated.input.flags.employerChargesRateDefaulted = val == null
                }
                onChange(updated)
              }}
            />
          </Field>
        </div>
      )}

      {/* Subcontractor Rate Field */}
      {costModel === "subcontractor_daily_rate" && (
        <Field
          label={
            <div className="flex items-center justify-between w-full">
              <span>Coût d&apos;achat journalier H.T. (€)</span>
              {value.input.flags?.purchaseDailyRateEstimated && (
                <span className="text-[9px] font-semibold text-warning uppercase">Estimé</span>
              )}
            </div>
          }
          required
        >
          <Input
            type="number"
            value={purchaseDailyRateValue || ""}
            onChange={(e) => {
              const updated = { ...value }
              const inputObj = updated.input as unknown as Record<string, unknown>
              inputObj.purchaseDailyRate = Number(e.target.value)
              onChange(updated)
            }}
          />
        </Field>
      )}

      {/* Fixed External Cost Field */}
      {costModel === "fixed_external_cost" && (
        <Field
          label={
            <div className="flex items-center justify-between w-full">
              <span>Coût externe forfaitaire global H.T. (€)</span>
              {value.input.flags?.fixedExternalCostEstimated && (
                <span className="text-[9px] font-semibold text-warning uppercase">Estimé</span>
              )}
            </div>
          }
          required
        >
          <Input
            type="number"
            value={fixedExternalCostValue || ""}
            onChange={(e) => {
              const updated = { ...value }
              const inputObj = updated.input as unknown as Record<string, unknown>
              inputObj.fixedExternalCost = Number(e.target.value)
              onChange(updated)
            }}
          />
        </Field>
      )}
    </div>
  )
}
