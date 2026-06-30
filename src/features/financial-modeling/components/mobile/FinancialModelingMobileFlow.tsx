"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  FinancialResourceFields,
  FinancialPeriodFields,
  FinancialPricingFields,
  FinancialExpenseFields,
  FinancialModelingResults,
  FinancialModelingWarnings
} from "../shared"
import { calculateFinancialModel } from "../../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../../domain/financial-model.schema"
import { FINANCIAL_MODEL_ENGINE_VERSION } from "../../domain/financial-model.constants"
import { saveFinancialModelAction, getFinancialModelingBootstrapAction } from "../../actions"
import type { FinancialModelFormState } from "../../persistence"
import type { FinancialModelingBootstrapData } from "../../data/get-financial-modeling-bootstrap"

interface FinancialModelingMobileFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function createDefaultFormState(): FinancialModelFormState {
  return {
    title: "Simulation Mobile",
    status: "draft",
    resourceLabel: "",
    input: {
      mode: "flash",
      resourceType: "collaborator",
      costModel: "salaried",
      annualGrossSalary: 0,
      annualVariablePay: 0,
      employerChargesRate: 0.45,
      annualWorkingDays: 218,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      salesDailyRate: 0,
      forecastActivityRate: 0.85,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION
    }
  }
}

export function FinancialModelingMobileFlow({ open, onOpenChange }: FinancialModelingMobileFlowProps) {
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bootstrap, setBootstrap] = useState<FinancialModelingBootstrapData | null>(null)
  const [showConfirmValidation, setShowConfirmValidation] = useState(false)

  // React 19 recommended pattern to reset state when props change
  const [isOpenPrev, setIsOpenPrev] = useState(open)
  if (open !== isOpenPrev) {
    setIsOpenPrev(open)
    if (open) {
      setStep(1)
      setFormState(createDefaultFormState())
    }
  }

  useEffect(() => {
    if (!open) return
    
    async function loadBootstrap() {
      setLoading(true)
      const res = await getFinancialModelingBootstrapAction()
      if (res.success && res.data) {
        setBootstrap(res.data)
      }
      setLoading(false)
    }
    loadBootstrap()
  }, [open])

  const clientResult = useMemo(() => {
    try {
      const issues = validateFinancialModelInput(formState.input)
      if (issues.length > 0) return null
      return calculateFinancialModel(formState.input)
    } catch {
      return null
    }
  }, [formState.input])

  const canCalculate = useMemo(() => {
    const input = formState.input
    return Boolean(
      input.startDate &&
      input.salesDailyRate >= 0 &&
      input.forecastActivityRate > 0 &&
      (input.resourceType === "external" || formState.collaboratorId || formState.candidateId)
    )
  }, [formState])

  const handleSave = async (statusOverride?: "draft" | "validated") => {
    const targetStatus = statusOverride || formState.status
    if (targetStatus === "validated" && !showConfirmValidation) {
      const hasDanger = clientResult?.warnings.some(
        (w) => w.code === "negative_margin" || w.code === "sales_rate_below_productive_cost"
      )
      if (hasDanger) {
        setShowConfirmValidation(true)
        return
      }
    }

    setShowConfirmValidation(false)
    setSaving(true)
    const payload = { ...formState, status: targetStatus }
    const res = await saveFinancialModelAction(payload)
    setSaving(false)

    if (res.success) {
      onOpenChange(false)
    } else {
      alert(res.error || "Erreur de sauvegarde")
    }
  }

  const renderStepContent = () => {
    if (loading || !bootstrap) {
      return (
        <div className="flex items-center justify-center py-10 text-xs text-muted">
          Chargement du contexte financier...
        </div>
      )
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">1. Ressource</h3>
            <FinancialResourceFields
              value={formState}
              onChange={setFormState}
              catalog={bootstrap.catalog}
              assumptions={bootstrap.assumptions}
            />
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">2. Mission & TJM</h3>
            <FinancialPeriodFields value={formState} onChange={setFormState} />
            <FinancialPricingFields
              value={formState}
              onChange={setFormState}
              pricing={bootstrap.pricing}
              companies={bootstrap.companies}
              opportunities={bootstrap.opportunities}
            />
          </div>
        )
      case 3:
      default:
        return (
          <div className="space-y-5 pb-6">
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">3. Résultats & Détails</h3>
            <FinancialModelingResults result={clientResult} />
            
            {clientResult && clientResult.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Alertes de rentabilité :</p>
                <FinancialModelingWarnings warnings={clientResult.warnings} />
              </div>
            )}

            {/* Optional details: Expenses */}
            <div className="border-t border-border/60 pt-4">
              <FinancialExpenseFields value={formState} onChange={setFormState} result={clientResult} />
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        side="bottom"
        title={
          <div className="flex items-center gap-2">
            <span>Simuler une mission</span>
            {step === 3 && (
              <StatusPill
                label={formState.status === "validated" ? "Validé" : "Brouillon"}
                variant={formState.status === "validated" ? "success" : "warning"}
              />
            )}
          </div>
        }
        hideMobileBackBtn
        className="sm:hidden h-[90vh] max-h-[90vh]"
        contentClassName="flex-1 overflow-y-auto px-4 py-3"
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="h-11 px-4 text-sm font-semibold text-muted hover:text-heading transition-colors"
              >
                Retour
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-11 px-4 text-sm font-semibold text-muted hover:text-heading transition-colors"
              >
                Annuler
              </button>
            )}

            {step === 1 && (
              <Button
                variant="primary"
                size="md"
                className="h-11 px-5"
                disabled={loading || !bootstrap}
                onClick={() => setStep(2)}
              >
                Suivant
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="primary"
                size="md"
                className="h-11 px-5"
                disabled={!canCalculate}
                onClick={() => setStep(3)}
              >
                Calculer
              </Button>
            )}

            {step === 3 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="h-11"
                  disabled={clientResult === null || saving}
                  onClick={() => handleSave("draft")}
                >
                  Brouillon
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="h-11"
                  disabled={clientResult === null || saving}
                  onClick={() => handleSave("validated")}
                >
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        }
      >
        {renderStepContent()}
      </AppDrawer>

      {/* Confirmation modal for validation */}
      <AppDialog
        open={showConfirmValidation}
        onOpenChange={setShowConfirmValidation}
        title="Confirmer la validation ?"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowConfirmValidation(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={() => handleSave("validated")}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <p className="leading-relaxed text-xs">
          Cette simulation comporte des alertes de rentabilité (marge négative ou TJM inférieur au CJM productif).
          Voulez-vous quand même l&apos;enregistrer dans l&apos;état validé ?
        </p>
      </AppDialog>
    </>
  )
}
