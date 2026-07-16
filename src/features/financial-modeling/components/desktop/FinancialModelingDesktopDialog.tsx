"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  FinancialResourceFields,
  FinancialPeriodFields,
  FinancialPricingFields,
  FinancialExpenseFields,
  FinancialModelingResults,
  FinancialModelingWarnings,
  formatEuroWithCents,
  formatEuroInteger
} from "../shared"
import { FinancialModelingFlashFields } from "./FinancialModelingFlashFields"
import { calculateFinancialModel } from "../../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../../domain/financial-model.schema"
import { validateFinancialReferenceEligibility } from "../../domain/financial-reference.validator"
import { FINANCIAL_MODEL_ENGINE_VERSION, FINANCIAL_MODEL_STATUS_LABELS } from "../../domain/financial-model.constants"
import type { FinancialModelStatus } from "../../domain/financial-model.types"
import {
  saveFinancialModelAction,
  archiveFinancialModelAction,
  getFinancialModelAction,
  getFinancialModelingBootstrapAction,
  getRecentFinancialModelsAction,
  promoteFinancialModelAction
} from "../../actions"
import type { FinancialModelFormState, FinancialModelRow } from "../../persistence"
import type { FinancialModelingBootstrapData } from "../../data/get-financial-modeling-bootstrap"

interface FinancialModelingDesktopDialogProps {
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
    title: "Nouvelle simulation",
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
      forecastActivityRate: 0.90,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION
    }
  }
}

export function FinancialModelingDesktopDialog({ open, onOpenChange, initialId }: FinancialModelingDesktopDialogProps) {
  const [formState, setFormState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [baselineState, setBaselineState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bootstrap, setBootstrap] = useState<FinancialModelingModelingContext | null>(null)
  const [recentSimulations, setRecentSimulations] = useState<FinancialModelRow[]>([])
  const [showConfirmValidation, setShowConfirmValidation] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  type FinancialModelingModelingContext = FinancialModelingBootstrapData

  // 1. Load Bootstrap Data on mount/open
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
        }
      } else {
        const defaultState = createDefaultFormState()
        setFormState(defaultState)
        setBaselineState(cloneFormState(defaultState))
      }
      setLoading(false)
    }

    loadBootstrap()
  }, [open, initialId])

  // 2. Client-side Instant Calculation
  const clientResult = useMemo(() => {
    try {
      const issues = validateFinancialModelInput(formState.input)
      if (issues.length > 0) return null
      return calculateFinancialModel(formState.input)
    } catch {
      return null
    }
  }, [formState.input])

  const isReadOnly = formState.status === "reference" || formState.status === "superseded" || formState.status === "converted" || formState.status === "archived"
  const canSave = clientResult !== null && !isReadOnly

  const isDirty = useMemo(
    () => serializeComparableState(formState) !== serializeComparableState(baselineState),
    [baselineState, formState],
  )
  const selectedResource = useMemo(() => {
    if (!bootstrap) return null
    if (formState.input.resourceType === "collaborator") {
      return bootstrap.catalog.collaborators.find((item) => item.id === formState.collaboratorId) ?? null
    }
    if (formState.input.resourceType === "candidate") {
      return bootstrap.catalog.candidates.find((item) => item.id === formState.candidateId) ?? null
    }
    return null
  }, [bootstrap, formState.collaboratorId, formState.candidateId, formState.input.resourceType])
  const currentChargesRate =
    formState.input.costModel === "salaried" ? formState.input.employerChargesRate ?? null : null

  const selectedOpp = useMemo(() => {
    if (!bootstrap || !formState.opportunityId) return null
    return bootstrap.opportunities.find((o) => o.id === formState.opportunityId)
  }, [bootstrap, formState.opportunityId])

  const eligibility = useMemo(() => {
    return validateFinancialReferenceEligibility(formState, {
      opportunityCompanyId: selectedOpp?.company_id,
      warnings: clientResult?.warnings,
      producedDays: clientResult?.producedDays ?? 0,
    })
  }, [formState, selectedOpp, clientResult])

  const handleRequestClose = () => {
    if (loading || saving) return
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    onOpenChange(false)
  }

  // 3. Save draft or validation actions
  const handleSave = async (statusOverride?: "draft" | "validated") => {
    const targetStatus = statusOverride || formState.status
    
    // Check validation confirmation if needed
    if (targetStatus === "validated" && !showConfirmValidation) {
      const hasDangerWarnings = clientResult?.warnings.some(
        (w) => w.code === "negative_margin" || w.code === "sales_rate_below_productive_cost"
      )
      if (hasDangerWarnings) {
        setShowConfirmValidation(true)
        return
      }
    }

    setShowConfirmValidation(false)
    setSaving(true)

    const payload: FinancialModelFormState = {
      ...formState,
      status: targetStatus
    }

    const res = await saveFinancialModelAction(payload)
    setSaving(false)

    if (res.success) {
      const nextState = cloneFormState({
        ...payload,
        id: res.id,
        status: res.status as FinancialModelStatus,
        updated_at: res.updated_at,
        expected_updated_at: res.updated_at
      })
      setFormState(nextState)
      setBaselineState(cloneFormState(nextState))
      
      // Refresh recent list
      const recentRes = await getRecentFinancialModelsAction()
      if (recentRes.success && recentRes.data) {
        setRecentSimulations(recentRes.data)
      }
    } else {
      alert(res.error || "Erreur de sauvegarde")
    }
  }

  // 4. Archive Action
  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous archiver cette simulation ?")) return

    setLoading(true)
    const res = await archiveFinancialModelAction(id)
    setLoading(false)

    if (res.success) {
      // If we archived the currently opened simulation, reset it
      if (formState.id === id) {
        const defaultState = createDefaultFormState()
        setFormState(defaultState)
        setBaselineState(cloneFormState(defaultState))
      }
      
      // Refresh list
      const recentRes = await getRecentFinancialModelsAction()
      if (recentRes.success && recentRes.data) {
        setRecentSimulations(recentRes.data)
      }
    } else {
      alert(res.error || "Erreur lors de l'archivage")
    }
  }

  // 5. Open / Load simulation from history
  const handleOpenSimulation = async (id: string) => {
    setLoading(true)
    const res = await getFinancialModelAction(id)
    setLoading(false)
    
    if (res.success && res.data) {
      const loadedState = cloneFormState(res.data)
      setFormState(loadedState)
      setBaselineState(cloneFormState(loadedState))
    } else {
      alert(res.error || "Erreur de chargement de la simulation")
    }
  }

  // 6. Duplicate simulation
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
    } else {
      alert(res.error || "Erreur de duplication")
    }
  }

  // 7. Promote to Reference
  const handlePromoteToReference = async () => {
    if (!formState.id) {
      alert("Veuillez d'abord sauvegarder la simulation.")
      return
    }
    if (
      !confirm(
        "Voulez-vous promouvoir cette simulation en référence financière ? Elle deviendra immuable et l'ancienne référence de l'opportunité sera remplacée."
      )
    ) {
      return
    }
    setSaving(true)
    const res = await promoteFinancialModelAction(formState.id)
    setSaving(false)
    if (res.success) {
      // Reload current model to update status
      handleOpenSimulation(formState.id)
      // Refresh list
      const recentRes = await getRecentFinancialModelsAction()
      if (recentRes.success && recentRes.data) {
        setRecentSimulations(recentRes.data)
      }
    } else {
      alert(res.error || "Erreur de promotion.")
    }
  }

  const handleModeChange = (mode: "flash" | "full") => {
    setFormState((prev) => ({
      ...prev,
      input: {
        ...prev.input,
        mode
      }
    }))
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
      <AppDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleRequestClose()
          }
        }}
        title={
          <div className="flex items-center gap-2">
            <img
              src="/icons_set/calculatrice.png"
              alt="Calculatrice"
              className="w-5 h-5 object-contain"
            />
            <span>
              {formState.input.mode === "flash"
                ? "Modélisation Financière (Flash)"
                : "Modélisation Financière (Complet)"}
            </span>
            {formState.id && (
              <StatusPill
                label={FINANCIAL_MODEL_STATUS_LABELS[formState.status as keyof typeof FINANCIAL_MODEL_STATUS_LABELS] || formState.status}
                variant={getStatusVariant(formState.status)}
              />
            )}
          </div>
        }
        className="w-full max-w-5xl h-[85vh] max-h-[85vh]"
        headerClassName="-mx-4 -mt-4 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-5 rounded-t-[var(--radius-medium)] bg-[#FFC107] text-slate-900 [&_button]:text-slate-700 [&_button]:hover:text-slate-950 border-b border-amber-500/20"
        bodyClassName="p-0 overflow-hidden flex flex-col h-full"
      >
        {/* Persistent Floating Results Header Bar */}
        {clientResult && (
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 grid grid-cols-4 divide-x divide-slate-800 text-center shrink-0">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">CA</p>
              <p className="text-sm font-bold text-white mt-0.5">{formatEuroInteger(clientResult.periodRevenue)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Coûts</p>
              <p className="text-sm font-bold text-white mt-0.5">{formatEuroInteger(clientResult.totalCosts)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Marge</p>
              <p className={`text-sm font-bold mt-0.5 ${clientResult.commercialMargin < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {formatEuroInteger(clientResult.commercialMargin)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">MCO %</p>
              <p className="text-sm font-bold text-white mt-0.5">{clientResult.mcoPercent !== null ? `${clientResult.mcoPercent.toFixed(2)}%` : "—"}</p>
            </div>
          </div>
        )}

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {loading || !bootstrap ? (
            <div className="flex items-center justify-center h-60 text-sm text-muted">
              Chargement du contexte financier...
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* Form columns (2/3 width in Complet with history panel open, full width otherwise) */}
              <div className={formState.input.mode === "full" && showHistory ? "col-span-2 space-y-6" : "col-span-3 space-y-6"}>
                {formState.input.mode === "flash" ? (
                  <div className="space-y-6">
                    <FinancialModelingFlashFields
                      value={formState}
                      onChange={setFormState}
                      bootstrap={bootstrap}
                      clientResult={clientResult}
                      disabled={isReadOnly}
                    />
                    
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleModeChange("full")}
                        className="w-full py-2.5 border border-dashed border-primary/45 rounded-[var(--radius-medium)] text-xs text-primary font-semibold hover:bg-primary/[0.03] transition-all"
                      >
                        Passer en mode complet
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Section Contexte (only in Complet) */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">1. Contexte de la simulation</h3>
                      <Field label="Titre de la simulation" required>
                        <Input
                          value={formState.title}
                          disabled={isReadOnly}
                          onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                        />
                      </Field>
                    </div>

                    {/* Section Ressource */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">2. Paramètres Ressource</h3>
                      <FinancialResourceFields
                        value={formState}
                        onChange={setFormState}
                        catalog={bootstrap.catalog}
                        assumptions={bootstrap.assumptions}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Section Mission */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">3. Paramètres Mission</h3>
                      <FinancialPeriodFields value={formState} onChange={setFormState} disabled={isReadOnly} />
                    </div>

                    {/* Section Pricing */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">4. Tarification</h3>
                      <FinancialPricingFields
                        value={formState}
                        onChange={setFormState}
                        pricing={bootstrap.pricing}
                        companies={bootstrap.companies}
                        opportunities={bootstrap.opportunities}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Section Expenses */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">5. Frais</h3>
                      <FinancialExpenseFields value={formState} onChange={setFormState} result={clientResult} disabled={isReadOnly} />
                    </div>

                    {/* Section Eligibility Warning card */}
                    {formState.input.mode === "full" && !isReadOnly && !eligibility.eligible && (
                      <div className="rounded-[var(--radius-medium)] border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Critères requis pour promotion en Référence Financière :
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          {eligibility.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Section Results */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">6. Résultats</h3>
                      <FinancialModelingResults result={clientResult} salesDailyRate={formState.input.salesDailyRate} />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">7. Warnings</h3>
                      {clientResult && clientResult.warnings.length > 0 && (
                        <FinancialModelingWarnings warnings={clientResult.warnings} />
                      )}
                      {(!clientResult || clientResult.warnings.length === 0) && (
                        <p className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/20 px-3 py-2 text-[11px] text-muted">
                          Aucun warning métier actif sur cette simulation.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">8. Provenance</h3>
                      <div className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/20 p-3 text-[11px] text-body space-y-2">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Ressource</p>
                            <p>{selectedResource?.label || formState.resourceLabel || "Aucune ressource sélectionnée"}</p>
                            <p className="text-muted">
                              Profil: {selectedResource?.provenance.jobProfile ?? "Snapshot manuel"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Charges</p>
                            <p>
                              {currentChargesRate != null
                                ? `${(currentChargesRate * 100).toFixed(1)} %`
                                : "Hypothèse par défaut"}
                            </p>
                            <p className="text-muted">
                              Source: {selectedResource?.provenance.employerChargesRate ?? "financial_charge_rates / défaut"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Activité historique</p>
                            <p>
                              {formState.input.historicalActivityRate != null
                                ? `${(formState.input.historicalActivityRate * 100).toFixed(1)} %`
                                : "Non disponible"}
                            </p>
                            <p className="text-muted">
                              Source: {selectedResource?.provenance.historicalActivityRate ?? "Aucune source"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Tarification</p>
                            <p>{formState.input.salesDailyRate > 0 ? formatEuroWithCents(formState.input.salesDailyRate) : "Non renseignée"}</p>
                            <p className="text-muted">
                              Source: {formState.pricingAgreementId ? "Accord client" : formState.precedentMissionId ? "Mission passée" : formState.precedentOpportunityId || formState.opportunityId ? "Opportunité" : "Saisie manuelle / benchmark"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar: Recent Simulations (only in Complet Mode) */}
              {formState.input.mode === "full" && showHistory && (
                <div className="col-span-1 border-l border-border/60 pl-6 space-y-4">
                  <h3 className="text-xs font-bold text-heading uppercase tracking-wider">9. Simulations récentes</h3>
                  
                  {recentSimulations.length === 0 ? (
                    <p className="text-[11px] text-muted italic">Aucune simulation enregistrée.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                      {recentSimulations.map((sim) => (
                        <div
                          key={sim.id}
                          className={`p-2.5 rounded-[var(--radius-medium)] border text-[11px] space-y-1.5 transition-all ${
                            formState.id === sim.id
                              ? "border-primary bg-primary/[0.02]"
                              : "border-border/60 bg-surface hover:bg-canvas/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-heading truncate block flex-1">
                              {sim.title}
                            </span>
                             <StatusPill
                               label={FINANCIAL_MODEL_STATUS_LABELS[sim.status as keyof typeof FINANCIAL_MODEL_STATUS_LABELS] || sim.status}
                               variant={getStatusVariant(sim.status)}
                             />
                          </div>

                          <div className="text-muted grid grid-cols-2 gap-x-2">
                            <div>Ressource : <span className="font-medium text-body truncate block">{sim.resource_label}</span></div>
                            <div>Marge : <span className="font-medium text-body">{formatEuroWithCents(Number(sim.gross_margin_amount))}</span></div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/40 pt-1.5 mt-1.5">
                            <span className="text-[9px] text-muted">
                              {new Date(sim.updated_at).toLocaleDateString("fr-FR")}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenSimulation(sim.id)}
                                className="text-[10px] text-primary font-semibold hover:underline"
                              >
                                Ouvrir
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateSimulation(sim.id)}
                                className="text-[10px] text-primary font-semibold hover:underline"
                              >
                                Dupliquer
                              </button>
                              {(sim.status === "draft" || sim.status === "validated") && (
                                <button
                                  type="button"
                                  onClick={() => handleArchive(sim.id)}
                                  className="text-[10px] text-danger font-semibold hover:underline"
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-border/80 p-4 flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-4">
            {formState.input.mode === "full" && (
              <button
                type="button"
                onClick={() => handleModeChange("flash")}
                className="text-xs text-muted hover:text-heading font-medium transition-colors"
              >
                Retour en mode Flash
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`text-xs font-semibold transition-colors ${showHistory ? "text-primary" : "text-muted hover:text-heading"}`}
            >
              {showHistory ? "Masquer l'historique" : "Afficher l'historique"}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRequestClose}>
              Fermer
            </Button>
            
            {isReadOnly ? (
              <Button
                variant="primary"
                size="sm"
                disabled={loading || saving}
                onClick={() => handleDuplicateSimulation(formState.id!)}
              >
                Dupliquer pour réviser
              </Button>
            ) : (
              <>
                {formState.input.mode === "full" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canSave || saving || loading}
                      onClick={() => handleSave("draft")}
                    >
                      {saving ? "Enregistrement..." : "Enregistrer le brouillon"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canSave || saving || loading}
                      onClick={() => handleSave("validated")}
                    >
                      Enregistrer la simulation
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!formState.id || !eligibility.eligible || saving || loading}
                      onClick={handlePromoteToReference}
                      title={!eligibility.eligible ? "La simulation ne respecte pas tous les critères requis pour devenir la référence." : undefined}
                    >
                      Définir comme référence financière
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </AppDialog>

      {/* Confirmation modal for margin/tjm warning validation */}
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
              Confirmer et valider
            </Button>
          </>
        }
      >
        <p className="leading-relaxed text-xs">
          Cette simulation comporte des alertes de rentabilité critiques (marge commerciale négative ou TJM de vente inférieur au CJM productif).
          Voulez-vous quand même la valider ?
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
    </>
  )
}
