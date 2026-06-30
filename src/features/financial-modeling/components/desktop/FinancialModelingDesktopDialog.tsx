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
  formatEuroWithCents
} from "../shared"
import { calculateFinancialModel } from "../../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../../domain/financial-model.schema"
import { FINANCIAL_MODEL_ENGINE_VERSION } from "../../domain/financial-model.constants"
import {
  saveFinancialModelAction,
  archiveFinancialModelAction,
  getFinancialModelAction,
  getFinancialModelingBootstrapAction,
  getRecentFinancialModelsAction
} from "../../actions"
import type { FinancialModelFormState, FinancialModelRow } from "../../persistence"
import type { FinancialModelingBootstrapData } from "../../data/get-financial-modeling-bootstrap"

interface FinancialModelingDesktopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialId?: string
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
      forecastActivityRate: 0.85,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION
    }
  }
}

export function FinancialModelingDesktopDialog({ open, onOpenChange, initialId }: FinancialModelingDesktopDialogProps) {
  const [formState, setFormState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bootstrap, setBootstrap] = useState<FinancialModelingModelingContext | null>(null)
  const [recentSimulations, setRecentSimulations] = useState<FinancialModelRow[]>([])
  const [showConfirmValidation, setShowConfirmValidation] = useState(false)

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
          setFormState(modelRes.data)
        }
      } else {
        setFormState(createDefaultFormState())
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

  const canSave = clientResult !== null

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
      setFormState((prev) => ({
        ...prev,
        id: res.id,
        status: res.status as "draft" | "validated" | "archived",
        updated_at: res.updated_at,
        expected_updated_at: res.updated_at
      }))
      
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
        setFormState(createDefaultFormState())
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
      setFormState(res.data)
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
      const duplicated: FinancialModelFormState = {
        ...res.data,
        id: undefined,
        status: "draft",
        title: `${res.data.title} (Copie)`,
        updated_at: undefined,
        expected_updated_at: undefined
      }
      setFormState(duplicated)
    } else {
      alert(res.error || "Erreur de duplication")
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

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          formState.input.mode === "flash"
            ? "Modélisation Financière (Flash)"
            : "Modélisation Financière (Complet)"
        }
        className="w-full max-w-5xl h-[85vh] max-h-[85vh]"
        bodyClassName="p-0 overflow-hidden flex flex-col h-full"
      >
        {/* Persistent Floating Results Header Bar */}
        {clientResult && (
          <div className="bg-canvas border-b border-border/80 px-5 py-3 grid grid-cols-4 divide-x divide-border/60 text-center shrink-0">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">CA</p>
              <p className="text-sm font-bold text-heading mt-0.5">{formatEuroWithCents(clientResult.periodRevenue)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Coûts</p>
              <p className="text-sm font-bold text-heading mt-0.5">{formatEuroWithCents(clientResult.totalCosts)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Marge</p>
              <p className={`text-sm font-bold mt-0.5 ${clientResult.commercialMargin < 0 ? "text-danger" : "text-success"}`}>
                {formatEuroWithCents(clientResult.commercialMargin)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">MCO %</p>
              <p className="text-sm font-bold text-heading mt-0.5">{clientResult.mcoPercent !== null ? `${clientResult.mcoPercent.toFixed(2)}%` : "—"}</p>
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
              {/* Form columns (2/3 width in Complet, full width in Flash) */}
              <div className={formState.input.mode === "full" ? "col-span-2 space-y-6" : "col-span-3 space-y-6"}>
                
                {/* Section Contexte (only in Complet) */}
                {formState.input.mode === "full" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-heading uppercase tracking-wider">1. Contexte de la simulation</h3>
                    <Field label="Titre de la simulation" required>
                      <Input
                        value={formState.title}
                        onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                      />
                    </Field>
                  </div>
                )}

                {/* Section Ressource */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                    {formState.input.mode === "full" ? "2. Paramètres Ressource" : "Ressource"}
                  </h3>
                  <FinancialResourceFields
                    value={formState}
                    onChange={setFormState}
                    catalog={bootstrap.catalog}
                    assumptions={bootstrap.assumptions}
                  />
                </div>

                {/* Section Mission */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                    {formState.input.mode === "full" ? "3. Paramètres Mission" : "Mission"}
                  </h3>
                  <FinancialPeriodFields value={formState} onChange={setFormState} />
                </div>

                {/* Section Pricing */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                    {formState.input.mode === "full" ? "4. Tarification" : "Prix"}
                  </h3>
                  <FinancialPricingFields
                    value={formState}
                    onChange={setFormState}
                    pricing={bootstrap.pricing}
                    companies={bootstrap.companies}
                    opportunities={bootstrap.opportunities}
                  />
                </div>

                {/* Mode Complet Specifics */}
                {formState.input.mode === "full" && (
                  <>
                    {/* Section Expenses */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">5. Frais</h3>
                      <FinancialExpenseFields value={formState} onChange={setFormState} result={clientResult} />
                    </div>

                    {/* Section Results and warnings */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">6. Synthèse & Warnings</h3>
                      <FinancialModelingResults result={clientResult} />
                      {clientResult && clientResult.warnings.length > 0 && (
                        <FinancialModelingWarnings warnings={clientResult.warnings} />
                      )}
                    </div>
                  </>
                )}

                {/* Results Preview (only in Flash Mode) */}
                {formState.input.mode === "flash" && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-heading uppercase tracking-wider">Résultats immédiats</h3>
                    <FinancialModelingResults result={clientResult} />
                    {clientResult && clientResult.warnings.length > 0 && (
                      <FinancialModelingWarnings warnings={clientResult.warnings} />
                    )}
                    <button
                      type="button"
                      onClick={() => handleModeChange("full")}
                      className="w-full py-2 border border-dashed border-primary/45 rounded-[var(--radius-medium)] text-xs text-primary font-semibold hover:bg-primary/[0.03] transition-all"
                    >
                      Passer en mode complet
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar: Recent Simulations (only in Complet Mode) */}
              {formState.input.mode === "full" && (
                <div className="col-span-1 border-l border-border/60 pl-6 space-y-4">
                  <h3 className="text-xs font-bold text-heading uppercase tracking-wider">Simulations récentes</h3>
                  
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
                               label={sim.status === "validated" ? "Validé" : "Brouillon"}
                               variant={sim.status === "validated" ? "success" : "warning"}
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
                              <button
                                type="button"
                                onClick={() => handleArchive(sim.id)}
                                className="text-[10px] text-danger font-semibold hover:underline"
                              >
                                Archiver
                              </button>
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
          <div>
            {formState.input.mode === "full" && (
              <button
                type="button"
                onClick={() => handleModeChange("flash")}
                className="text-xs text-muted hover:text-heading font-medium transition-colors"
              >
                Retour en mode Flash
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            
            {/* Save Buttons */}
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
                  variant="primary"
                  size="sm"
                  disabled={!canSave || saving || loading}
                  onClick={() => handleSave("validated")}
                >
                  Valider la simulation
                </Button>
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
    </>
  )
}
