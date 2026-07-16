"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { CommercialQuoteMobileDrawer } from "@/components/finance/CommercialQuoteMobileDrawer"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  FinancialResourceFields,
  FinancialPeriodFields,
  FinancialPricingFields,
  FinancialExpenseFields,
  FinancialModelingResults,
  FinancialModelingWarnings,
  formatEuroWithCents
} from "../shared"
import { calculateFinancialModel } from "../../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../../domain/financial-model.schema"
import { validateFinancialReferenceEligibility } from "../../domain/financial-reference.validator"
import { FINANCIAL_MODEL_ENGINE_VERSION, FINANCIAL_MODEL_STATUS_LABELS } from "../../domain/financial-model.constants"
import {
  saveFinancialModelAction,
  getFinancialModelingBootstrapAction,
  getFinancialModelAction,
  getRecentFinancialModelsAction,
  archiveFinancialModelAction
  ,promoteFinancialModelAction
} from "../../actions"
import type { FinancialModelFormState, FinancialModelRow } from "../../persistence"
import type { FinancialModelingBootstrapData } from "../../data/get-financial-modeling-bootstrap"

interface FinancialModelingMobileFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialId?: string
}

function cloneFormState(state: FinancialModelFormState): FinancialModelFormState {
  return JSON.parse(JSON.stringify(state)) as FinancialModelFormState
}

function serializeComparableState(state: FinancialModelFormState): string {
  return JSON.stringify({
    ...state,
    updated_at: undefined,
    expected_updated_at: undefined,
  })
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
      endDate: `${new Date().getFullYear()}-12-31`,
      salesDailyRate: 0,
      forecastActivityRate: 0.85,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION
    }
  }
}

export function FinancialModelingMobileFlow({ open, onOpenChange, initialId }: FinancialModelingMobileFlowProps) {
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [baselineState, setBaselineState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bootstrap, setBootstrap] = useState<FinancialModelingBootstrapData | null>(null)
  const [recentSimulations, setRecentSimulations] = useState<FinancialModelRow[]>([])
  const [showConfirmValidation, setShowConfirmValidation] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showMobileHistory, setShowMobileHistory] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  const resetFlow = () => {
    const defaultState = createDefaultFormState()
    setStep(1)
    setFormState(defaultState)
    setBaselineState(cloneFormState(defaultState))
  }

  useEffect(() => {
    if (!open) return
    
    async function loadBootstrap() {
      setLoading(true)
      const res = await getFinancialModelingBootstrapAction()
      if (res.success && res.data) {
        setBootstrap(res.data)
        setRecentSimulations(res.data.recentSimulations || [])
      }
      if (initialId) {
        const modelRes = await getFinancialModelAction(initialId)
        if (modelRes.success && modelRes.data) {
          const loadedState = cloneFormState(modelRes.data)
          setFormState(loadedState)
          setBaselineState(cloneFormState(loadedState))
          setStep(1)
        }
      } else {
        resetFlow()
      }
      setLoading(false)
    }
    loadBootstrap()
  }, [open, initialId])

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
  const isReadOnly = formState.status === "reference" || formState.status === "superseded" || formState.status === "converted" || formState.status === "archived"
  const selectedOpp = useMemo(
    () => bootstrap?.opportunities.find((opportunity) => opportunity.id === formState.opportunityId) ?? null,
    [bootstrap, formState.opportunityId],
  )
  const referenceEligibility = useMemo(
    () => validateFinancialReferenceEligibility(formState, {
      opportunityCompanyId: selectedOpp?.company_id,
      warnings: clientResult?.warnings,
      producedDays: clientResult?.producedDays ?? 0,
    }),
    [clientResult, formState, selectedOpp],
  )
  const canPromoteReference = Boolean(
    formState.id &&
    formState.input.mode === "full" &&
    (formState.status === "draft" || formState.status === "validated") &&
    referenceEligibility.eligible,
  )

  const isDirty = useMemo(
    () => serializeComparableState(formState) !== serializeComparableState(baselineState),
    [baselineState, formState],
  )

  const handleOpenSimulation = async (id: string) => {
    setLoading(true)
    const res = await getFinancialModelAction(id)
    setLoading(false)
    
    if (res.success && res.data) {
      const loadedState = cloneFormState(res.data)
      setFormState(loadedState)
      setBaselineState(cloneFormState(loadedState))
      setShowMobileHistory(false)
      setStep(1)
    } else {
      alert(res.error || "Erreur de chargement de la simulation")
    }
  }

  const handleDuplicateSimulation = async (id: string) => {
    setLoading(true)
    const res = await getFinancialModelAction(id)
    setLoading(false)
    
    if (res.success && res.data) {
      const duplicated = cloneFormState({
        ...res.data,
        id: undefined,
        status: "draft",
        title: `${res.data.title} (Copie)`,
        updated_at: undefined,
        expected_updated_at: undefined
      })
      setFormState(duplicated)
      setBaselineState(cloneFormState(duplicated))
      setShowMobileHistory(false)
      setStep(1)
    } else {
      alert(res.error || "Erreur de duplication")
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous archiver cette simulation ?")) return

    setLoading(true)
    const res = await archiveFinancialModelAction(id)
    setLoading(false)

    if (res.success) {
      if (formState.id === id) {
        resetFlow()
      }
      const recentRes = await getRecentFinancialModelsAction()
      if (recentRes.success && recentRes.data) {
        setRecentSimulations(recentRes.data)
      }
    } else {
      alert(res.error || "Erreur lors de l'archivage.")
    }
  }

  const handlePromoteToReference = async () => {
    if (!formState.id || !canPromoteReference) return
    setSaving(true)
    const result = await promoteFinancialModelAction(formState.id)
    if (!result.success) {
      setSaving(false)
      alert(result.error || "Impossible de définir cette référence financière")
      return
    }
    const refreshed = await getFinancialModelAction(formState.id)
    setSaving(false)
    if (refreshed.success && refreshed.data) {
      const state = cloneFormState(refreshed.data)
      setFormState(state)
      setBaselineState(cloneFormState(state))
      setStep(3)
    }
  }

  const handleRequestClose = () => {
    if (loading || saving) return
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    resetFlow()
    onOpenChange(false)
  }

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
      resetFlow()
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
            <button
              type="button"
              onClick={() => setShowMobileHistory(true)}
              className="w-full flex items-center justify-between p-3.5 border border-border/60 bg-surface rounded-[var(--radius-medium)] text-xs text-primary font-semibold hover:bg-canvas/5 min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">🕒</span>
                <span>Voir l&apos;historique des simulations</span>
              </span>
              <span>→</span>
            </button>

            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">1. Ressource</h3>
            <FinancialResourceFields
              value={formState}
              onChange={setFormState}
              catalog={bootstrap.catalog}
              assumptions={bootstrap.assumptions}
              disabled={isReadOnly}
            />
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">2. Mission & TJM</h3>
            <FinancialPeriodFields value={formState} onChange={setFormState} disabled={isReadOnly} />
            <FinancialPricingFields
              value={formState}
              onChange={setFormState}
              pricing={bootstrap.pricing}
              companies={bootstrap.companies}
              opportunities={bootstrap.opportunities}
              activeStaffingCompanyIds={bootstrap.activeStaffingCompanyIds}
              disabled={isReadOnly}
            />
          </div>
        )
      case 3:
      default:
        return (
          <div className="space-y-5 pb-6">
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">3. Résultats & Détails</h3>
            <FinancialModelingResults result={clientResult} salesDailyRate={formState.input.salesDailyRate} />
            
            {clientResult && clientResult.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Alertes de rentabilité :</p>
                <FinancialModelingWarnings warnings={clientResult.warnings} />
              </div>
            )}

            {/* Optional details: Expenses */}
            <div className="border-t border-border/60 pt-4">
              <FinancialExpenseFields value={formState} onChange={setFormState} result={clientResult} disabled={isReadOnly} />
            </div>
          </div>
        )
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated": return "success";
      case "reference": return "success";
      case "superseded": return "neutral";
      case "converted": return "info";
      case "draft":
      default:
        return "warning";
    }
  }

  return (
    <>
      <AppDrawer
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleRequestClose()
          }
        }}
        side="bottom"
        title={
          <div className="flex items-center gap-2">
            <img
              src="/icons_set/calculatrice.png"
              alt="Calculatrice"
              className="w-5 h-5 object-contain"
            />
            <span>Simuler une mission</span>
            {formState.id && (
              <StatusPill
                label={FINANCIAL_MODEL_STATUS_LABELS[formState.status as keyof typeof FINANCIAL_MODEL_STATUS_LABELS] || formState.status}
                variant={getStatusVariant(formState.status)}
              />
            )}
          </div>
        }
        className="sm:hidden h-[90vh] max-h-[90vh]"
        headerClassName="bg-secondary text-brand-ink [&_button]:text-brand-ink/70 [&_button]:hover:text-brand-ink border-b border-secondary/20"
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
                onClick={handleRequestClose}
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
                {isReadOnly ? (
                  <div className="flex gap-2"><Button
                    variant="primary"
                    size="md"
                    className="h-11 px-5"
                    disabled={loading || saving}
                    onClick={() => handleDuplicateSimulation(formState.id!)}
                  >
                    Dupliquer pour réviser
                  </Button>{formState.status === "reference" && formState.id ? <Button variant="brass" size="md" className="h-11" onClick={() => setQuoteOpen(true)}>Créer un devis</Button> : null}</div>
                ) : (
                  <>
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
                    {canPromoteReference ? <Button variant="brass" size="md" className="h-11" disabled={saving} onClick={handlePromoteToReference}>Définir comme référence financière</Button> : null}
                  </>
                )}
              </div>
            )}
          </div>
        }
      >
        {renderStepContent()}
      </AppDrawer>
      {formState.id ? <CommercialQuoteMobileDrawer modelId={formState.id} open={quoteOpen} onOpenChange={setQuoteOpen} /> : null}

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

      <AppDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Quitter sans enregistrer ?"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDiscardConfirm(false)}>
              Continuer l&apos;édition
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowDiscardConfirm(false)
                resetFlow()
                onOpenChange(false)
              }}
            >
              Fermer sans enregistrer
            </Button>
          </>
        }
      >
        <p className="leading-relaxed text-xs">
          Des modifications non enregistrées seraient perdues. Confirmez la fermeture uniquement si vous souhaitez abandonner cette saisie.
        </p>
      </AppDialog>

      {/* Mobile History Drawer */}
      <AppDrawer
        open={showMobileHistory}
        onOpenChange={setShowMobileHistory}
        side="bottom"
        title={
          <div className="flex items-center gap-2">
            <span className="text-sm">🕒</span>
            <span>Historique des simulations</span>
          </div>
        }
        className="sm:hidden h-[85vh] max-h-[85vh]"
        headerClassName="bg-secondary text-brand-ink [&_button]:text-brand-ink/70 [&_button]:hover:text-brand-ink border-b border-secondary/20"
        contentClassName="flex-1 overflow-y-auto px-4 py-4"
        footer={
          <Button variant="secondary" size="md" className="w-full h-11" onClick={() => setShowMobileHistory(false)}>
            Fermer l&apos;historique
          </Button>
        }
      >
        {recentSimulations.length === 0 ? (
          <p className="text-xs text-muted italic text-center py-10">Aucune simulation enregistrée.</p>
        ) : (
          <div className="space-y-3.5">
            {recentSimulations.map((sim) => (
              <div
                key={sim.id}
                className="p-3.5 rounded-[var(--radius-medium)] border text-xs space-y-2.5 bg-surface border-border/60"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-bold text-heading truncate block flex-1">
                    {sim.title}
                  </span>
                  <StatusPill
                    label={FINANCIAL_MODEL_STATUS_LABELS[sim.status as keyof typeof FINANCIAL_MODEL_STATUS_LABELS] || sim.status}
                    variant={getStatusVariant(sim.status)}
                  />
                </div>

                <div className="text-muted grid grid-cols-2 gap-x-3 gap-y-1">
                  <div>Ressource : <span className="font-semibold text-body truncate block">{sim.resource_label}</span></div>
                  <div>Marge : <span className="font-semibold text-body">{formatEuroWithCents(Number(sim.gross_margin_amount))}</span></div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2">
                  <span className="text-[10px] text-muted">
                    {new Date(sim.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSimulation(sim.id)}
                      className="h-11 px-3 text-xs text-primary font-bold hover:underline min-w-[44px] flex items-center justify-center"
                    >
                      Ouvrir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateSimulation(sim.id)}
                      className="h-11 px-3 text-xs text-primary font-bold hover:underline min-w-[44px] flex items-center justify-center"
                    >
                      Dupliquer
                    </button>
                    {(sim.status === "draft" || sim.status === "validated") && (
                      <button
                        type="button"
                        onClick={() => handleArchive(sim.id)}
                        className="h-11 px-3 text-xs text-danger font-bold hover:underline min-w-[44px] flex items-center justify-center"
                      >
                        Archiver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppDrawer>
    </>
  )
}
