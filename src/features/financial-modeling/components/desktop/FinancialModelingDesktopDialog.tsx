"use client"

import React, { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { CommercialQuoteDesktopDialog } from "@/components/finance/CommercialQuoteDesktopDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  FinancialResourceFields,
  FinancialPeriodFields,
  FinancialPricingFields,
  FinancialExpenseFields,
  FinancialModelHistoryItem,
  FinancialModelingResults,
  formatEuroInteger
} from "../shared"
import { FinancialModelingFlashFields } from "./FinancialModelingFlashFields"
import { calculateFinancialModel } from "../../domain/calculate-financial-model"
import { validateFinancialModelInput } from "../../domain/financial-model.schema"
import { validateFinancialReferenceEligibility } from "../../domain/financial-reference.validator"
import { FINANCIAL_MODEL_ENGINE_VERSION, FINANCIAL_MODEL_STATUS_LABELS } from "../../domain/financial-model.constants"
import {
  applyFinancialModelingLaunchPreset,
  buildFinancialModelTitle,
  type FinancialModelingLaunchPreset,
} from "../../domain/financial-modeling-launch-preset"
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
  initialPreset?: FinancialModelingLaunchPreset
  initialView?: "edit" | "summary"
  forceFullMode?: boolean
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
      endDate: `${new Date().getFullYear()}-12-31`,
      salesDailyRate: 0,
      forecastActivityRate: 0.90,
      expenses: [],
      currency: "EUR",
      calculationVersion: FINANCIAL_MODEL_ENGINE_VERSION
    }
  }
}

export function FinancialModelingDesktopDialog({
  open,
  onOpenChange,
  initialId,
  initialPreset,
  initialView = "edit",
  forceFullMode = false,
}: FinancialModelingDesktopDialogProps) {
  const [formState, setFormState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [baselineState, setBaselineState] = useState<FinancialModelFormState>(createDefaultFormState())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bootstrap, setBootstrap] = useState<FinancialModelingModelingContext | null>(null)
  const [recentSimulations, setRecentSimulations] = useState<FinancialModelRow[]>([])
  const [showConfirmValidation, setShowConfirmValidation] = useState(false)
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"edit" | "summary">(initialView)
  const [showPostSaveActions, setShowPostSaveActions] = useState(false)
  const [isTitleEditable, setIsTitleEditable] = useState(false)
  const [isTitleEditing, setIsTitleEditing] = useState(false)

  type FinancialModelingModelingContext = FinancialModelingBootstrapData

  // 1. Load Bootstrap Data on mount/open
  useEffect(() => {
    if (!open) return

    async function loadBootstrap() {
      setViewMode(initialView)
      setShowPostSaveActions(false)
      setShowPromoteConfirm(false)
      setShowHistory(false)
      setIsTitleEditable(false)
      setIsTitleEditing(false)
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
        const defaultState = res.success && res.data
          ? applyFinancialModelingLaunchPreset(createDefaultFormState(), initialPreset, res.data.catalog)
          : createDefaultFormState()
        setFormState(defaultState)
        setBaselineState(cloneFormState(defaultState))
      }
      setLoading(false)
    }

    loadBootstrap()
  }, [open, initialId, initialPreset, initialView])

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

  const isModelLocked = formState.status === "reference" || formState.status === "superseded" || formState.status === "converted" || formState.status === "archived"
  const isSummary = forceFullMode && viewMode === "summary"
  const fieldsDisabled = isModelLocked || isSummary
  const canSave = clientResult !== null && !isModelLocked

  const isDirty = useMemo(
    () => serializeComparableState(formState) !== serializeComparableState(baselineState),
    [baselineState, formState],
  )
  const selectedOpp = useMemo(() => {
    if (!bootstrap || !formState.opportunityId) return null
    return bootstrap.opportunities.find((o) => o.id === formState.opportunityId)
  }, [bootstrap, formState.opportunityId])
  const selectedCompany = useMemo(() => {
    if (!bootstrap || !formState.companyId) return null
    return bootstrap.companies.find((company) => company.id === formState.companyId)
  }, [bootstrap, formState.companyId])
  const generatedTitle = useMemo(() => buildFinancialModelTitle({
    companyName: selectedCompany?.name,
    consultantName: formState.resourceLabel,
    opportunityTitle: selectedOpp?.title,
  }), [formState.resourceLabel, selectedCompany?.name, selectedOpp?.title])

  useEffect(() => {
    if (formState.id || isTitleEditable || !generatedTitle) return

    setFormState((current) => (
      current.title === generatedTitle ? current : { ...current, title: generatedTitle }
    ))
    setBaselineState((current) => (
      current.title === generatedTitle ? current : { ...current, title: generatedTitle }
    ))
  }, [formState.id, generatedTitle, isTitleEditable])

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
      if (forceFullMode) {
        setViewMode("summary")
        setShowPostSaveActions(true)
      }
      
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
        setIsTitleEditable(false)
      }
      
      // Refresh recent list
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
      setIsTitleEditable(false)
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
      setIsTitleEditable(true)
    } else {
      alert(res.error || "Erreur de duplication")
    }
  }

  const handleShareSimulation = async (simulation: FinancialModelRow) => {
    const text = `Simulation financière : ${simulation.title}`
    try {
      if (navigator.share) {
        await navigator.share({ title: simulation.title, text })
        return
      }
      await navigator.clipboard.writeText(text)
      alert("Le résumé de la simulation a été copié.")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      alert("Impossible de partager cette simulation.")
    }
  }

  // 7. Promote to Reference
  const handlePromoteToReference = () => {
    if (!formState.id) {
      alert("Veuillez d'abord sauvegarder la simulation.")
      return
    }
    setShowPromoteConfirm(true)
  }

  const confirmPromoteToReference = async () => {
    if (!formState.id) return

    setShowPromoteConfirm(false)
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

  const handleEdit = () => {
    setFormState((current) => ({
      ...current,
      input: { ...current.input, mode: "full" },
    }))
    setShowPostSaveActions(false)
    setViewMode("edit")
  }

  const handleCancelEdit = () => {
    if (forceFullMode && formState.id) {
      setFormState(cloneFormState(baselineState))
      setShowPostSaveActions(false)
      setViewMode("summary")
      return
    }
    handleRequestClose()
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

  const historyPanel = (
    <section className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Simulations récentes</h3>
        <span className="text-[10px] text-muted">{recentSimulations.length}</span>
      </div>

      {recentSimulations.length === 0 ? (
        <p className="text-[11px] italic text-muted">Aucune simulation enregistrée.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {recentSimulations.map((sim) => (
            <FinancialModelHistoryItem
              key={sim.id}
              simulation={sim}
              active={formState.id === sim.id}
              companyName={bootstrap?.companies.find((company) => company.id === sim.company_id)?.name}
              opportunityTitle={bootstrap?.opportunities.find((opportunity) => opportunity.id === sim.opportunity_id)?.title}
              onOpen={handleOpenSimulation}
              onDuplicate={handleDuplicateSimulation}
              onShare={handleShareSimulation}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}
    </section>
  )

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
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/icons_set/calculatrice.png"
                alt="Calculatrice"
                width={20}
                height={20}
                className="size-5 object-contain"
              />
              <span className="truncate">
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

            <div className="flex shrink-0 items-center gap-1">
              {!isSummary && !forceFullMode && formState.input.mode === "full" && (
                <button
                  type="button"
                  onClick={() => handleModeChange("flash")}
                  className="inline-flex size-7 items-center justify-center rounded-[var(--radius-small)] bg-white/10 text-white/85 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Retour en mode Flash"
                  title="Retour en mode Flash"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9m0 0 5-5M4 9h10a6 6 0 0 1 0 12h-1" />
                  </svg>
                </button>
              )}
              {!isSummary && formState.input.mode === "full" && (
                <button
                  type="button"
                  onClick={() => setShowHistory((current) => !current)}
                  className={`inline-flex size-7 items-center justify-center rounded-[var(--radius-small)] transition-colors ${showHistory ? "bg-white/25 text-white" : "bg-white/10 text-white/85 hover:bg-white/20 hover:text-white"}`}
                  aria-label={showHistory ? "Masquer l’historique" : "Afficher l’historique"}
                  title={showHistory ? "Masquer l’historique" : "Afficher l’historique"}
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        }
        className={`h-[85vh] max-h-[85vh] max-w-none !w-[min(calc(100vw-2rem),64rem)] will-change-transform transition-transform ease-out motion-reduce:transition-none ${
          !isSummary && formState.input.mode === "full" && showHistory
            ? "-translate-x-[min(16rem,21vw)] duration-500"
            : "translate-x-0 duration-300"
        }`}
        titleClassName="flex-1"
        headerClassName="-mx-4 -mt-4 rounded-t-[var(--radius-medium)] border-b border-[#1E4596] bg-[#2554B8] px-4 py-4 text-white [&_button]:text-white/80 [&_button]:hover:text-white sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-5"
        bodyClassName="p-0 overflow-hidden flex flex-col h-full"
        aside={historyPanel}
        asideOpen={!isSummary && formState.input.mode === "full" && showHistory}
      >
        {/* Persistent Floating Results Header Bar */}
        {clientResult && (
          <div className="grid shrink-0 grid-cols-4 divide-x divide-amber-600/20 border-b border-amber-500/30 bg-amber-400/75 px-5 py-3 text-center">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-950/60">CA</p>
              <p className="mt-0.5 text-sm font-bold text-amber-950">{formatEuroInteger(clientResult.periodRevenue)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-950/60">Coûts</p>
              <p className="mt-0.5 text-sm font-bold text-amber-950">{formatEuroInteger(clientResult.totalCosts)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-950/60">Marge</p>
              <p className={`mt-0.5 text-sm font-bold ${clientResult.commercialMargin < 0 ? "text-rose-700" : "text-emerald-800"}`}>
                {formatEuroInteger(clientResult.commercialMargin)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-950/60">MCO %</p>
              <p className="mt-0.5 text-sm font-bold text-amber-950">{clientResult.mcoPercent !== null ? `${clientResult.mcoPercent.toFixed(2)}%` : "—"}</p>
            </div>
          </div>
        )}

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0 [&_input]:text-[11px] [&_button]:text-[11px]">
          {loading || !bootstrap ? (
            <div className="flex items-center justify-center h-60 text-sm text-muted">
              Chargement du contexte financier...
            </div>
          ) : isSummary ? (
            <FinancialModelingResults result={clientResult} salesDailyRate={formState.input.salesDailyRate} hideKpis />
          ) : (
            <div className="space-y-6">
                {formState.input.mode === "flash" ? (
                  <div className="space-y-6">
                    <FinancialModelingFlashFields
                      value={formState}
                      onChange={setFormState}
                      bootstrap={bootstrap}
                      clientResult={clientResult}
                      disabled={fieldsDisabled}
                    />
                    
                  </div>
                ) : (
                  <>
                    {/* Section Contexte (only in Complet) */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">1. Contexte de la simulation</h3>
                      <Field label="Titre de la simulation" required>
                        <div className="flex w-full items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <Input
                              value={formState.title}
                              readOnly={!isTitleEditing}
                              disabled={fieldsDisabled}
                              className={`min-w-0 flex-1 ${
                                isTitleEditing
                                  ? "border-amber-500/70 bg-amber-500/10 ring-2 ring-amber-400/25"
                                  : !fieldsDisabled
                                    ? "cursor-default bg-canvas/60 text-muted"
                                    : ""
                              }`}
                              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                            />
                          </div>
                          {!fieldsDisabled ? (
                            <button
                              type="button"
                              aria-label={isTitleEditing ? "Valider le titre de la simulation" : "Modifier librement le titre de la simulation"}
                              aria-pressed={isTitleEditing}
                              title={isTitleEditing ? "Valider le titre" : "Modifier librement le titre"}
                              onClick={() => {
                                if (isTitleEditing) {
                                  setIsTitleEditing(false)
                                  return
                                }

                                setIsTitleEditable(true)
                                setIsTitleEditing(true)
                              }}
                              className={`ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-small)] border transition-colors ${
                                isTitleEditing
                                  ? "border-primary bg-primary text-white hover:bg-primary/90"
                                  : "border-border bg-surface text-muted hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                              }`}
                            >
                              {isTitleEditing ? (
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                                </svg>
                              ) : (
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              )}
                            </button>
                          ) : null}
                        </div>
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
                        result={clientResult}
                        disabled={fieldsDisabled}
                      />
                    </div>

                    {/* Section Mission */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-heading uppercase tracking-wider">3. Paramètres Mission</h3>
                      <FinancialPeriodFields value={formState} onChange={setFormState} disabled={fieldsDisabled} />
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
                        activeStaffingCompanyIds={bootstrap.activeStaffingCompanyIds}
                        disabled={fieldsDisabled}
                      />
                    </div>

                    {/* Section Expenses */}
                    <div className="space-y-3">
                      <FinancialExpenseFields value={formState} onChange={setFormState} result={clientResult} disabled={fieldsDisabled} />
                    </div>

                    {/* Section Eligibility Warning card */}
                    {formState.input.mode === "full" && !fieldsDisabled && !eligibility.eligible && (
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
                      <FinancialModelingResults result={clientResult} salesDailyRate={formState.input.salesDailyRate} hideKpis />
                    </div>
                  </>
                )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-border/80 bg-surface p-4">
          {isSummary ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRequestClose}
                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                Fermer
              </Button>
              {showPostSaveActions ? (
                <Button
                  variant="brass"
                  size="sm"
                  className="border-amber-400 bg-amber-400 text-amber-950 hover:bg-amber-500"
                  disabled={!formState.id || !eligibility.eligible || saving || loading}
                  onClick={handlePromoteToReference}
                  title={!eligibility.eligible ? "La simulation ne respecte pas tous les critères requis pour devenir la référence." : undefined}
                >
                  Établir
                </Button>
              ) : (
                <Button variant="primary" size="sm" disabled={isModelLocked || loading || saving} onClick={handleEdit}>
                  Modifier
                </Button>
              )}
            </div>
          ) : forceFullMode ? (
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelEdit}
              className="justify-self-start border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#2554B8] hover:bg-[#1E4596]"
              disabled={!canSave || saving || loading}
              onClick={() => handleSave("validated")}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
          ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRequestClose}
              className="justify-self-start border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              Fermer
            </Button>

            {!isModelLocked && formState.input.mode === "flash" ? (
              <Button
                variant="secondary"
                size="sm"
                className="justify-self-center"
                disabled={loading || !bootstrap}
                onClick={() => handleModeChange("full")}
              >
                Passer en mode complet
              </Button>
            ) : !isModelLocked && formState.input.mode === "full" ? (
              <Button
                variant="primary"
                size="sm"
                className="justify-self-center bg-[#2554B8] hover:bg-[#1E4596]"
                disabled={!canSave || saving || loading}
                onClick={() => handleSave("validated")}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            ) : <span />}

            {isModelLocked ? (
              <div className="flex justify-self-end gap-2"><Button
                variant="primary"
                size="sm"
                className="justify-self-end"
                disabled={loading || saving}
                onClick={() => handleDuplicateSimulation(formState.id!)}
              >
                Dupliquer pour réviser
              </Button>{formState.status === "reference" && formState.id ? <Button variant="brass" size="sm" onClick={() => setQuoteOpen(true)}>Créer un devis</Button> : null}</div>
            ) : formState.input.mode === "full" ? (
              <Button
                variant="brass"
                size="sm"
                className="justify-self-end border-amber-400 bg-amber-400 text-amber-950 hover:bg-amber-500"
                disabled={!formState.id || !eligibility.eligible || saving || loading}
                onClick={handlePromoteToReference}
                title={!eligibility.eligible ? "La simulation ne respecte pas tous les critères requis pour devenir la référence." : undefined}
              >
                Définir comme référence
              </Button>
            ) : <span />}
          </div>
          )}
        </div>
      </AppDialog>
      {formState.id ? <CommercialQuoteDesktopDialog modelId={formState.id} open={quoteOpen} onOpenChange={setQuoteOpen} /> : null}

      <AppDialog
        open={showPromoteConfirm}
        onOpenChange={(nextOpen) => {
          if (!saving) setShowPromoteConfirm(nextOpen)
        }}
        title="Définir comme référence financière ?"
        className="max-w-[30rem]"
        headerClassName="-mx-4 -mt-4 rounded-t-[var(--radius-medium)] border-b border-[#1E4596] bg-[#2554B8] px-4 py-4 text-white [&_button]:text-white/80 [&_button]:hover:text-white sm:-mx-6 sm:-mt-6 sm:px-6"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setShowPromoteConfirm(false)}
            >
              Annuler
            </Button>
            <Button
              variant="brass"
              size="sm"
              loading={saving}
              className="border-amber-400 bg-amber-400 text-amber-950 hover:bg-amber-500"
              onClick={confirmPromoteToReference}
            >
              Confirmer le remplacement
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs leading-relaxed text-body">
          <div className="flex gap-3 rounded-[var(--radius-medium)] border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-700" aria-hidden="true">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <p className="font-bold text-heading">Cette action modifie la référence active de l’opportunité.</p>
              <p>La simulation actuelle deviendra la nouvelle référence financière et sera ensuite immuable.</p>
            </div>
          </div>
          <p className="text-muted">
            L’ancienne référence sera conservée dans l’historique avec le statut « Remplacé ». Aucun calcul ni document existant ne sera supprimé.
          </p>
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
