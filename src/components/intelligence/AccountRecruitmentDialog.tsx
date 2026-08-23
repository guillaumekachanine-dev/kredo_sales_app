"use client"

import React, { useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { StatusPill } from "@/components/ui/StatusPill"
import { MatchingResultsMobile } from "@/components/staffing/matching/MatchingResultsMobile"
import { runOpportunityMatching } from "@/lib/staffing-matching/actions"
import type { MatchingNeed, MatchingResult } from "@/lib/staffing-matching/types"
import {
  getAccountRecruitmentAnalysis,
  fetchCompanyOpportunities,
  runCustomMatchingAction,
} from "@/lib/account-recruitment/account-recruitment-actions"
import type {
  AccountRecruitmentAnalysis,
  CompanyOpportunityItem,
  TechnicalConfidence,
} from "@/lib/account-recruitment/account-recruitment-types"

type RecruitmentView =
  | "picker"
  | "analysis"
  | "matching_choice"
  | "matching_existant"
  | "matching_custom"
  | "matching_results"

interface AccountRecruitmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  onReturnToCockpit: () => void
}

function confidenceVariant(confidence: TechnicalConfidence): "success" | "warning" | "neutral" {
  switch (confidence) {
    case "Forte":
      return "success"
    case "Moyenne":
      return "warning"
    case "Faible":
    default:
      return "neutral"
  }
}

export function AccountRecruitmentDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onReturnToCockpit,
}: AccountRecruitmentDialogProps) {
  const [view, setView] = useState<RecruitmentView>("picker")
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AccountRecruitmentAnalysis | null>(null)
  const [opportunities, setOpportunities] = useState<CompanyOpportunityItem[]>([])
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null)
  const [isCustomNeed, setIsCustomNeed] = useState(false)
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | null>(null)
  const [presentStateMap, setPresentStateMap] = useState<Map<string, { presenting: boolean; presented: boolean; error: string | null }>>(new Map())

  // Champs du formulaire besoin personnalisé
  const [customTitle, setCustomTitle] = useState("")
  const [customPractice, setCustomPractice] = useState("cloud_devops")
  const [customSeniority, setCustomSeniority] = useState("senior")
  const [customLocation, setCustomLocation] = useState("")
  const [customRemotePolicy, setCustomRemotePolicy] = useState("full_remote")
  const [customSummary, setCustomSummary] = useState("")
  const [customTjm, setCustomTjm] = useState<number>(650)
  const [customSkillsText, setCustomSkillsText] = useState("")

  const handleOpenChangeInternal = (nextOpen: boolean) => {
    if (!nextOpen) {
      setView("picker")
      setAnalysis(null)
      setMatchingResult(null)
      setSelectedProfileKey(null)
    }
    onOpenChange(nextOpen)
  }

  const handleOpenAnalysis = async () => {
    setView("analysis")
    if (!analysis) {
      setLoading(true)
      try {
        const res = await getAccountRecruitmentAnalysis(companyId)
        setAnalysis(res)
      } catch (err) {
        console.error("Erreur de chargement de l'analyse:", err)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleOpenExistantMatching = async () => {
    setView("matching_existant")
    setLoading(true)
    try {
      const opps = await fetchCompanyOpportunities(companyId)
      setOpportunities(opps)
    } catch (err) {
      console.error("Erreur de chargement des opportunités:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOpportunityForMatching = async (oppId: string) => {
    setLoading(true)
    try {
      const outcome = await runOpportunityMatching(oppId)
      if (outcome.ok) {
        setMatchingResult(outcome.result)
        setIsCustomNeed(false)
        setSelectedProfileKey(null)
        setView("matching_results")
      } else {
        alert(outcome.error)
      }
    } catch {
      alert("Impossible de lancer le matching pour ce besoin.")
    } finally {
      setLoading(false)
    }
  }

  const handleRunCustomMatching = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) {
      alert("Veuillez saisir un titre pour le besoin.")
      return
    }

    const skillsArray = customSkillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((skillName, index) => ({
        skillId: `custom-skill-${index}`,
        skillName,
        importance: "indispensable" as const,
        minLevel: 3,
        minYears: 2,
        weight: 100 - index * 10,
      }))

    const customNeed: MatchingNeed = {
      id: `custom-need-${Date.now()}`,
      title: customTitle,
      practice: customPractice,
      seniority: customSeniority,
      location: customLocation || "Non spécifié",
      remotePolicy: customRemotePolicy,
      startDate: new Date().toISOString().split("T")[0],
      durationDays: 90,
      targetDailyRate: customTjm,
      needSummary: customSummary || "Besoin personnalisé anticipé",
      skills: skillsArray,
    }

    setLoading(true)
    try {
      const outcome = await runCustomMatchingAction(customNeed)
      if (outcome.ok) {
        setMatchingResult(outcome.result)
        setIsCustomNeed(true)
        setSelectedProfileKey(null)
        setView("matching_results")
      } else {
        alert(outcome.error)
      }
    } catch {
      alert("Impossible d'exécuter le matching sur ce besoin personnalisé.")
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-xs text-muted">
          Chargement en cours…
        </div>
      )
    }

    switch (view) {
      case "picker":
        return (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleOpenAnalysis}
              className="group flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-primary/25 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98]"
            >
              <div className="min-w-0 flex-1 pr-2">
                <span className="block text-sm font-bold text-heading">Besoins & environnement technique</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  Comprendre les besoins et le paysage technique du compte.
                </span>
              </div>
              <svg className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setView("matching_choice")}
              className="group flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-brand-brass/35 bg-brand-brass/5 p-4 text-left transition-all hover:bg-brand-brass/10 hover:border-brand-brass/50 active:scale-[0.98]"
            >
              <div className="min-w-0 flex-1 pr-2">
                <span className="block text-sm font-bold text-heading">Matching profils</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  Identifier les profils adaptés à un besoin réel ou anticipé.
                </span>
              </div>
              <svg className="size-4 shrink-0 text-brand-brass transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        )

      case "analysis":
        return (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setView("picker")}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              ← Retour aux options
            </button>

            {analysis && (
              <>
                {/* Bloc 1 : Besoins identifiés */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="h-0.5 w-4 bg-brand-brass" aria-hidden="true" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-heading">
                      1. Besoins identifiés ({analysis.identifiedNeeds.length})
                    </h3>
                  </div>

                  {analysis.identifiedNeeds.length === 0 ? (
                    <p className="text-xs italic text-muted">Aucune opportunité ouverte enregistrée sur ce compte.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {analysis.identifiedNeeds.map((need) => (
                        <div key={need.id} className="rounded-[var(--radius-medium)] border border-border/70 bg-surface p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-heading">{need.title}</span>
                            {need.stage && (
                              <span className="rounded bg-canvas px-2 py-0.5 text-[10px] font-semibold text-muted">
                                {need.stage}
                              </span>
                            )}
                          </div>
                          {need.needSummary && (
                            <p className="text-[11px] text-body line-clamp-2">{need.needSummary}</p>
                          )}
                          {need.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {need.skills.map((sk) => (
                                <span key={sk.skillId} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {sk.skillName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Bloc 2 : Environnement technique estimé */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="h-0.5 w-4 bg-brand-brass" aria-hidden="true" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-heading">
                      2. Environnement technique estimé
                    </h3>
                  </div>

                  {analysis.estimatedTechEnvironment.length === 0 ? (
                    <p className="text-xs italic text-muted">Aucune donnée technique qualifiée sur ce compte.</p>
                  ) : (
                    <div className="space-y-2">
                      {analysis.estimatedTechEnvironment.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-medium)] border border-border/50 bg-canvas/40 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-heading">{item.name}</span>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                item.sourceKind === "Observé"
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                              }`}>
                                {item.sourceKind}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted truncate">{item.provenance}</p>
                          </div>
                          <StatusPill label={`Confiance : ${item.confidence}`} variant={confidenceVariant(item.confidence)} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Bloc 3 : Adéquation KREDO */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="h-0.5 w-4 bg-brand-brass" aria-hidden="true" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-heading">
                      3. Adéquation KREDO & Offres
                    </h3>
                  </div>

                  {analysis.kredoAdequacy.length === 0 ? (
                    <p className="text-xs italic text-muted">Aucune adéquation offre KREDO identifiée pour l&apos;instant.</p>
                  ) : (
                    <div className="space-y-2">
                      {analysis.kredoAdequacy.map((item) => (
                        <div key={item.id} className="rounded-[var(--radius-medium)] border border-border/60 bg-surface p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-heading">{item.title}</span>
                            <StatusPill label={`Confiance : ${item.confidence}`} variant={confidenceVariant(item.confidence)} />
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-body line-clamp-2">{item.description}</p>
                          )}
                          <p className="text-[10px] text-muted">{item.provenance}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )

      case "matching_choice":
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView("picker")}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              ← Retour aux options
            </button>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleOpenExistantMatching}
                className="group flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-primary/25 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <span className="block text-sm font-bold text-heading">Besoin existant</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Lancer le matching sur une opportunité ouverte.
                  </span>
                </div>
                <svg className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setView("matching_custom")}
                className="group flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-brand-brass/35 bg-brand-brass/5 p-4 text-left transition-all hover:bg-brand-brass/10 active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <span className="block text-sm font-bold text-heading">Besoin personnalisé (Anticipé)</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Définir un besoin temporaire pour tester l&apos;adéquation du pool sans créer d&apos;opportunité.
                  </span>
                </div>
                <svg className="size-4 shrink-0 text-brand-brass transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )

      case "matching_existant":
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView("matching_choice")}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              ← Retour aux modes de matching
            </button>

            <h3 className="text-xs font-bold uppercase tracking-wider text-heading">
              Sélectionner un besoin existant
            </h3>

            {opportunities.length === 0 ? (
              <p className="text-xs italic text-muted">Aucune opportunité disponible dans le workspace.</p>
            ) : (
              <div className="space-y-2">
                {opportunities.map((opp) => (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => handleSelectOpportunityForMatching(opp.id)}
                    className="flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-border/70 bg-surface p-3 text-left transition-all hover:bg-canvas/50 active:scale-[0.98]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-heading">{opp.title}</span>
                        {opp.isCurrentAccount && (
                          <span className="rounded-full bg-brand-brass/20 text-brand-brass border border-brand-brass/30 px-2 py-0.5 text-[9px] font-bold">
                            Compte courant
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted truncate">
                        {opp.companyName} {opp.practice ? `· ${opp.practice}` : ""}
                      </p>
                    </div>
                    <svg className="size-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case "matching_custom":
        return (
          <form onSubmit={handleRunCustomMatching} className="space-y-4">
            <button
              type="button"
              onClick={() => setView("matching_choice")}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              ← Retour aux modes de matching
            </button>

            <h3 className="text-xs font-bold uppercase tracking-wider text-heading">
              Besoin personnalisé (Matching anticipé)
            </h3>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Titre du besoin *</span>
                <input
                  type="text"
                  required
                  placeholder="ex. Lead Developer React / Node"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:border-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted">Practice</span>
                  <select
                    value={customPractice}
                    onChange={(e) => setCustomPractice(e.target.value)}
                    className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-2.5 py-2 text-xs text-heading outline-none"
                  >
                    <option value="cloud_devops">Cloud & DevOps</option>
                    <option value="software_engineering">Software Engineering</option>
                    <option value="data_ai">Data & AI</option>
                    <option value="cybersecurity">Cybersécurité</option>
                    <option value="agile_product">Agile & Product</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted">Séniorité</span>
                  <select
                    value={customSeniority}
                    onChange={(e) => setCustomSeniority(e.target.value)}
                    className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-2.5 py-2 text-xs text-heading outline-none"
                  >
                    <option value="junior">Junior (&lt; 2 ans)</option>
                    <option value="confirme">Confirmé (2 - 5 ans)</option>
                    <option value="senior">Senior (5 - 10 ans)</option>
                    <option value="expert">Expert (&gt; 10 ans)</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted">Localisation</span>
                  <input
                    type="text"
                    placeholder="Paris / Lyon..."
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:border-primary"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted">Télétravail</span>
                  <select
                    value={customRemotePolicy}
                    onChange={(e) => setCustomRemotePolicy(e.target.value)}
                    className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-2.5 py-2 text-xs text-heading outline-none"
                  >
                    <option value="full_remote">Full Remote</option>
                    <option value="hybride">Hybride</option>
                    <option value="site_client">Sur site client</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">TJM Cible (€)</span>
                <input
                  type="number"
                  min={0}
                  value={customTjm}
                  onChange={(e) => setCustomTjm(Number(e.target.value) || 0)}
                  className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:border-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Compétences clés (séparées par des virgules)</span>
                <input
                  type="text"
                  placeholder="AWS, Kubernetes, React, Python..."
                  value={customSkillsText}
                  onChange={(e) => setCustomSkillsText(e.target.value)}
                  className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:border-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Résumé du besoin</span>
                <textarea
                  rows={3}
                  placeholder="Précisez le contexte et les exigences particulières..."
                  value={customSummary}
                  onChange={(e) => setCustomSummary(e.target.value)}
                  className="w-full rounded-[var(--radius-medium)] border border-border bg-canvas px-3 py-2 text-xs text-heading outline-none focus:border-primary"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-medium)] bg-primary font-bold text-white transition-colors hover:bg-primary-deep active:scale-[0.98]"
            >
              Calculer les profils
            </button>
          </form>
        )

      case "matching_results":
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView(isCustomNeed ? "matching_custom" : "matching_existant")}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              ← Retour à la sélection
            </button>

            {matchingResult && (
              <div className="space-y-3">
                <div className="rounded-[var(--radius-medium)] border border-border bg-canvas/40 p-3">
                  <span className="text-xs font-bold text-heading">{matchingResult.needTitle}</span>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {matchingResult.poolSize} profils évalués · {isCustomNeed ? "Besoin temporaire (Non persisté)" : "Besoin réel"}
                  </p>
                </div>

                <MatchingResultsMobile
                  result={matchingResult}
                  selectedSourceKey={selectedProfileKey}
                  onSelect={setSelectedProfileKey}
                  presentStateByKey={presentStateMap}
                  onPresent={(key) => {
                    if (isCustomNeed) {
                      alert("L'action de présentation est réservée aux opportunités réelles enregistrées.")
                      return
                    }
                    setPresentStateMap((prev) => {
                      const next = new Map(prev)
                      next.set(key, { presenting: false, presented: true, error: null })
                      return next
                    })
                  }}
                />
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChangeInternal}
      title={`Recruter · ${companyName}`}
      className="w-[min(calc(100vw-1rem),36rem)]"
    >
      <CockpitReturnButton onClick={onReturnToCockpit} className="mb-2" />
      {renderContent()}
    </AppDialog>
  )
}
