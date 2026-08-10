"use client"

import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { FinancialReferenceMobileCard } from "@/components/finance/FinancialReferenceMobileCard"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"
import { cn } from "@/lib/utils"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { CommercialStrategyContent } from "@/lib/intelligence/account-intelligence-contracts"
import {
  lifecycleLabel,
  ProvenanceBadge,
  SectionBlock,
  FreshnessLine,
} from "./intelligence-parts"
import {
  ContactsKeyCard,
  CommercialRelationCard,
  AccountSignalsCard,
  AccountKnowledgeGeneratedContent,
  AccountKnowledgeOpenQuestions,
  AccountKnowledgeOpenQuestionsV2,
} from "./AccountKnowledgeBlocks"
import {
  buildSourceIndex,
  hasMarketPositioningContent,
  hasOrganisationContent,
  hasValueChainContent,
  IdentityV2Content,
  MarketPositioningV2Content,
  OrganisationV2Content,
  ValueChainV2Content,
} from "./AccountKnowledgeV2Blocks"
import { AccountKnowledgeUpdateControlsMobile } from "./AccountKnowledgeUpdateControls"
import { useAccountKnowledgeRun } from "./use-account-knowledge-run"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import { triggerN8nWorkflow } from "@/lib/n8n/trigger-client"
import {
  ACCOUNT_ISSUES_MAP_RESULT_TYPE,
  COMMERCIAL_STRATEGY_RESULT_TYPE,
} from "@/lib/intelligence/account-intelligence-contracts"
import { ClientIntelligenceSectorMobileTab } from "./ClientIntelligenceSectorTab"
import { ClientIntelligenceSocleTab } from "./ClientIntelligenceSocleTab"
import { AccountIssuesTopList } from "./AccountIssuesBlocks"
import { CommercialStrategyGeneratedContent } from "./CommercialStrategyBlocks"
import { AccountWatchSettingsCard } from "./AccountWatchSettingsCard"
import { ScoreBadge } from "./ScoreBadge"
import { ScoreDetailModal } from "./ScoreDetailModal"
import { CompanyDocumentsModal } from "./CompanyDocumentsModal"
import { DocumentViewerShell } from "@/components/documents/DocumentViewerShell"
import {
  type TabKey,
  INTELLIGENCE_PROCESS_STEPS,
} from "./intelligence-process"
import {
  type AnalysisTypeKey,
  ANALYSIS_SECTIONS,
  ClientAnalysisContent,
  ProcessDiagnosticContent,
  ClientAnalysisIcon,
  ProcessDiagnosticIcon,
  ExpandIcon,
  CollapseIcon,
} from "./ClientIntelligenceDesktopView"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { PitchDocumentDialog } from "./PitchDocumentDialog"
import { AccountKnowledgeV3Mobile } from "./folio-v3/AccountKnowledgeV3Mobile"

type ConnaissanceRunStatus = "idle" | "loading" | "done" | "error"

export function ClientIntelligenceMobileView({ data, financialReference = null }: { data: ClientIntelligenceData; financialReference?: FinancialReference | null }) {
  const { company, client, sector, diagnostic, diagnosticPdfUrl, signals, contacts, opportunities, missions, accountSignals } = data
  const supabase = useMemo(() => createBrowserClient(), [])

  const [activePanel, setActivePanel] = useState<TabKey>("accueil")
  const [signalsExpanded, setSignalsExpanded] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<"client" | "processus" | null>(null)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [openPitchDocumentId, setOpenPitchDocumentId] = useState<string | null>(null)
  const [scoreSummary, setScoreSummary] = useState(data.scoreSummary)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false)
  const pdfDialogRef = useRef<HTMLDialogElement>(null)

  // Lot 1 — le contenu affiché vient directement de `data` (Server Component),
  // rafraîchi par `router.refresh()` au succès du run. Aucun miroir local : la
  // copie précédente se désynchronisait de la fiche après une curation.
  const v3State = data.accountKnowledgeV3
  const v3 = v3State?.data
  const knowledge = v3State || data.accountKnowledge
  const knowledgeSourceIndex = useMemo(
    () => buildSourceIndex(data.accountKnowledgeSources),
    [data.accountKnowledgeSources],
  )
  const {
    status: knowledgeRunStatus,
    errorMessage: knowledgeErrorMsg,
    trigger: triggerKnowledgeRun,
  } = useAccountKnowledgeRun(company.id)

  // ADR-0012 Lot 4 — enjeux (matérialisation côté callback, D-5) : pas de
  // contenu à parser côté client, on recharge la liste ouverte au succès.
  const [issues, setIssues] = useState(data.accountIssues)
  const [issuesRunId, setIssuesRunId] = useState<string | null>(null)
  const [issuesErrorMsg, setIssuesErrorMsg] = useState<string | null>(null)
  const [issuesTriggering, setIssuesTriggering] = useState(false)
  const issuesInFlightRef = useRef(false)

  const reloadIssues = useCallback(async () => {
    const { data: rows } = await supabase
      .from("account_issues")
      .select("id,title,category,problem_statement,evidence_level,provenance,importance,urgency,criticality,business_impact,accessibility,kredo_fit,contact_ids,recommended_next_probe,status,created_at")
      .eq("company_id", company.id)
      .eq("status", "open")
      .order("importance", { ascending: false })
    if (!rows) return
    setIssues(rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      problemStatement: r.problem_statement,
      evidenceLevel: r.evidence_level,
      provenance: r.provenance,
      importance: r.importance,
      urgency: r.urgency,
      criticality: r.criticality,
      businessImpact: r.business_impact,
      accessibility: r.accessibility,
      kredoFit: r.kredo_fit,
      contactIds: r.contact_ids ?? [],
      recommendedNextProbe: r.recommended_next_probe,
      status: r.status,
      createdAt: r.created_at,
    })))
  }, [supabase, company.id])

  const issuesTracker = useRunTracker({
    runId: issuesRunId,
    resultType: ACCOUNT_ISSUES_MAP_RESULT_TYPE,
    withResult: false,
    onSucceeded: () => {
      issuesInFlightRef.current = false
      void reloadIssues()
    },
    onFailed: (message) => {
      issuesInFlightRef.current = false
      setIssuesErrorMsg(message)
    },
    onTimeout: () => { issuesInFlightRef.current = false },
  })

  const issuesRunStatus: ConnaissanceRunStatus = issuesTriggering || issuesTracker.phase === "tracking"
    ? "loading"
    : issuesTracker.phase === "succeeded"
      ? "done"
      : issuesErrorMsg || issuesTracker.phase === "failed" || issuesTracker.phase === "timeout"
        ? "error"
        : "idle"

  async function handleGenerateIssues() {
    if (issuesInFlightRef.current) return
    issuesInFlightRef.current = true
    setIssuesTriggering(true)
    setIssuesErrorMsg(null)
    setIssuesRunId(null)
    try {
      setIssuesRunId(await triggerN8nWorkflow({
        workflowId: "intel-031-issues-map",
        entityType: "company",
        entityId: company.id,
      }))
    } catch (err) {
      setIssuesErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      issuesInFlightRef.current = false
    } finally {
      setIssuesTriggering(false)
    }
  }

  function handleDismissIssue(issueId: string) {
    setIssues((prev) => prev.filter((i) => i.id !== issueId))
  }

  // ADR-0012 Lot 5 — même pattern que knowledgeContent (content_json pur, D-5).
  const [strategy, setStrategy] = useState(data.commercialStrategy)
  const [strategyRunId, setStrategyRunId] = useState<string | null>(null)
  const [strategyErrorMsg, setStrategyErrorMsg] = useState<string | null>(null)
  const [strategyTriggering, setStrategyTriggering] = useState(false)
  const strategyInFlightRef = useRef(false)

  const strategyTracker = useRunTracker<CommercialStrategyContent>({
    runId: strategyRunId,
    resultType: COMMERCIAL_STRATEGY_RESULT_TYPE,
    onSucceeded: (result) => {
      strategyInFlightRef.current = false
      if (result) setStrategy({ data: result.contentJson, resultId: result.id })
    },
    onFailed: (message) => {
      strategyInFlightRef.current = false
      setStrategyErrorMsg(message)
    },
    onTimeout: () => { strategyInFlightRef.current = false },
  })

  const strategyRunStatus: ConnaissanceRunStatus = strategyTriggering || strategyTracker.phase === "tracking"
    ? "loading"
    : strategyTracker.phase === "succeeded"
      ? "done"
      : strategyErrorMsg || strategyTracker.phase === "failed" || strategyTracker.phase === "timeout"
        ? "error"
        : "idle"

  async function handleGenerateStrategy() {
    if (strategyInFlightRef.current) return
    strategyInFlightRef.current = true
    setStrategyTriggering(true)
    setStrategyErrorMsg(null)
    setStrategyRunId(null)
    try {
      setStrategyRunId(await triggerN8nWorkflow({
        workflowId: "intel-032-strategy",
        entityType: "company",
        entityId: company.id,
      }))
    } catch (err) {
      setStrategyErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      strategyInFlightRef.current = false
    } finally {
      setStrategyTriggering(false)
    }
  }

  useEffect(() => {
    const dialog = pdfDialogRef.current
    if (!dialog) return
    if (pdfDialogOpen && diagnosticPdfUrl) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [pdfDialogOpen, diagnosticPdfUrl])

  if (activePanel !== "accueil") {
    const stepDetails = {
      socle: {
        title: "Socle du compte",
        description: "SIREN, NAF, taille et rattachement à la taxonomie sectorielle.",
      },
      connaissance: {
        title: "Connaissance compte",
        description: "Ce que l'on sait factuellement du compte : identité, organisation, interlocuteurs, relation et signaux.",
      },
      secteur: {
        title: "Intelligence sectorielle",
        description: "Enjeux, contraintes et fenêtres commerciales du secteur, contextualisés pour ce compte.",
      },
      enjeux: {
        title: "Cartographie des enjeux",
        description: "Transformer les constats en problématiques client.",
      },
      strategie: {
        title: "Stratégie commerciale",
        description: "Définir l’angle d’approche et les messages clés.",
      },
      roadmap: {
        title: "Roadmap commerciale",
        description: "Convertir la stratégie en prochaines actions.",
      },
    }[activePanel]

    return (
      <div data-theme="cockpit" className="flex min-h-full flex-col gap-4 bg-canvas p-4 pb-24">
        <div className="border-b border-border pb-3">
          <div className="flex items-center gap-1.5 -ml-1">
            <button
              type="button"
              onClick={() => setActivePanel("accueil")}
              className="inline-flex items-center justify-center text-white hover:text-white/80 transition-colors rounded p-1 min-h-[44px] cursor-pointer"
              aria-label="Retour à l'accueil"
            >
              <svg className="h-4.5 w-4.5 fill-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,5 7,12 16,19" />
              </svg>
            </button>
            <h1 className="font-heading text-base font-bold text-heading uppercase tracking-wide">
              {stepDetails.title}
            </h1>
          </div>
          {activePanel !== "connaissance" && stepDetails.description && (
            <p className="text-[11px] text-body mt-0.5 font-medium">
              {stepDetails.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 mt-1">
          {activePanel === "socle" && (
            <ClientIntelligenceSocleTab data={data} isMobile />
          )}

          {activePanel === "connaissance" && (
            <>
              {/* ADR-0012 Lot 2 — blocs relationnels toujours disponibles (sans run n8n) */}
              <div className="space-y-3 mb-3">
                <ContactsKeyCard contacts={contacts} />
                <CommercialRelationCard opportunities={opportunities} missions={missions} />
                <AccountSignalsCard
                  signals={accountSignals}
                  isMobile={true}
                  companyId={company.id}
                  companyName={company.name}
                  lastUpdatedAt={data.accountWatch.lastRunAt}
                />
              </div>

              {/* Lot 1 — action réelle de l'onglet Entreprise */}
              <AccountKnowledgeUpdateControlsMobile
                state={knowledge}
                lastUpdatedAt={data.accountKnowledgeLastUpdatedAt}
                status={knowledgeRunStatus}
                errorMessage={knowledgeErrorMsg}
                onUpdate={() => void triggerKnowledgeRun()}
              />

              {v3 ? (
                <div className="mb-3 space-y-4 border-t border-border/30 pt-4 mt-2">
                  <AccountKnowledgeV3Mobile content={v3} sources={knowledgeSourceIndex} signals={data.accountSignals} />
                  {data.accountKnowledge && (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      {data.accountKnowledge.version === 1 ? (
                        <AccountKnowledgeOpenQuestions data={data.accountKnowledge.data} resultId={data.accountKnowledge.resultId} />
                      ) : (
                        <AccountKnowledgeOpenQuestionsV2 data={data.accountKnowledge.data as any} />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {knowledge?.version === 1 && (
                    <div className="mb-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                        Synthèse générée (moteur IA)
                      </p>
                      <AccountKnowledgeGeneratedContent data={knowledge.data} resultId={knowledge.resultId} />
                    </div>
                  )}

                  {knowledge?.version === 2 && (
                    <div className="mb-3 space-y-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                        Connaissance entreprise (moteur IA, sourcée)
                      </p>
                      <IdentityV2Content
                        identity={knowledge.data.identity}
                        summary={knowledge.data.account_summary}
                        sources={knowledgeSourceIndex}
                      />
                      {hasMarketPositioningContent(knowledge.data) && (
                        <MarketPositioningV2Content
                          positioning={knowledge.data.market_positioning}
                          sources={knowledgeSourceIndex}
                        />
                      )}
                      {hasValueChainContent(knowledge.data) && (
                        <ValueChainV2Content
                          valueChain={knowledge.data.company_value_chain}
                          sources={knowledgeSourceIndex}
                        />
                      )}
                      {hasOrganisationContent(knowledge.data) && (
                        <OrganisationV2Content
                          organisation={knowledge.data.organisation}
                          contacts={data.contacts}
                          sources={knowledgeSourceIndex}
                        />
                      )}
                      <AccountKnowledgeOpenQuestionsV2 data={knowledge.data} />
                    </div>
                  )}
                </>
              )}

              {/* 2 analyses sous forme d'icônes sur une seule ligne */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedAnalysis(selectedAnalysis === "client" ? null : "client")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-2.5 rounded-xl border text-center transition-all cursor-pointer min-h-[90px]",
                    selectedAnalysis === "client"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-surface hover:bg-surface-hover text-muted"
                  )}
                >
                  <ClientAnalysisIcon className="h-6 w-6" />
                  <span className="text-[10px] font-bold leading-tight">Analyse client</span>
                </button>

                <button
                  type="button"
                  disabled={!diagnostic && !diagnosticPdfUrl}
                  onClick={() => {
                    if (selectedAnalysis === "processus") {
                      setSelectedAnalysis(null)
                      setPdfDialogOpen(false)
                    } else {
                      setSelectedAnalysis("processus")
                      if (diagnosticPdfUrl) setPdfDialogOpen(true)
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-2.5 rounded-xl border text-center transition-all cursor-pointer min-h-[90px]",
                    selectedAnalysis === "processus"
                      ? "border-primary bg-primary/5 text-primary"
                      : (diagnostic || diagnosticPdfUrl)
                      ? "border-border bg-surface hover:bg-surface-hover text-muted"
                      : "border-border/40 bg-surface/50 opacity-50 cursor-not-allowed text-muted"
                  )}
                >
                  <ProcessDiagnosticIcon className="h-6 w-6" />
                  <span className="text-[10px] font-bold leading-tight">Diagnostic process</span>
                </button>
              </div>

              {/* Raccourcis/Pastilles vers les sections d'analyse */}
              {selectedAnalysis && selectedAnalysis !== "processus" && ANALYSIS_SECTIONS[selectedAnalysis as AnalysisTypeKey]?.length > 0 && (
                <div className="sticky top-0 z-10 -mx-4 mb-2 border-b border-border/30 bg-canvas/90 px-4 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 overflow-x-auto justify-start no-scrollbar">
                    {ANALYSIS_SECTIONS[selectedAnalysis].map((section) => {
                      const SIcon = section.icon
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() =>
                            document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                          }
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-surface/80 px-3 py-1 text-[11px] font-semibold text-body transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 cursor-pointer"
                        >
                          <SIcon className="h-3 w-3" />
                          {section.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Contenu complet de l'analyse */}
              {selectedAnalysis === "client" && (
                client ? (
                  <>
                    {/* Cadre indiquant la date de réalisation / dernière mise à jour */}
                    <div className="rounded-lg border border-border bg-surface p-3.5 mb-4 flex items-center justify-between gap-3 shadow-sm">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Mise à jour de l&apos;analyse</span>
                        <div className="mt-1">
                          <FreshnessLine
                            latestRunAt={data.freshness.latestRunAt}
                            latestRunStatus={data.freshness.latestRunStatus}
                            fallbackSource={client.source}
                          />
                        </div>
                      </div>
                      <ProvenanceBadge source={client.source} />
                    </div>
                    <ClientAnalysisContent data={client.data} />
                  </>
                ) : (
                  <p className="text-xs text-muted italic">Aucune synthèse client disponible.</p>
                )
              )}

              {selectedAnalysis === "processus" && (
                diagnosticPdfUrl && !pdfDialogOpen ? (
                  <div className="h-[70vh] min-h-[400px]">
                    <DocumentViewerShell
                      fileName={`Diagnostic process — ${company.name}`}
                      fileUrl={diagnosticPdfUrl}
                      metadata={{
                        "Compte": company.name,
                        "Type": "Diagnostic process",
                        "Source": diagnostic?.source === "engine" ? "Moteur IA" : "Import",
                      }}
                      actions={
                        <button
                          type="button"
                          onClick={() => setPdfDialogOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-hover px-2.5 py-1 text-[11px] font-semibold text-body hover:text-heading transition-colors cursor-pointer"
                        >
                          <ExpandIcon className="h-3 w-3" />
                          Plein écran
                        </button>
                      }
                    />
                  </div>
                ) : !diagnosticPdfUrl && diagnostic ? (
                  <ProcessDiagnosticContent data={diagnostic.data} />
                ) : !diagnosticPdfUrl ? (
                  <p className="text-xs text-muted italic">Aucun diagnostic process disponible.</p>
                ) : null
              )}

              {/* Dialog PDF plein écran */}
              {diagnosticPdfUrl && (
                <dialog
                  ref={pdfDialogRef}
                  onClose={() => setPdfDialogOpen(false)}
                  className="m-0 p-0 border-0 w-screen h-dvh max-w-[100vw] max-h-[100dvh] bg-canvas [&::backdrop]:bg-black/75"
                >
                  <DocumentViewerShell
                    fileName={`Diagnostic process — ${company.name}`}
                    fileUrl={diagnosticPdfUrl}
                    metadata={{
                      "Compte": company.name,
                      "Type": "Diagnostic process",
                      "Source": diagnostic?.source === "engine" ? "Moteur IA" : "Import",
                    }}
                    className="h-full rounded-none border-0"
                    actions={
                      <button
                        type="button"
                        onClick={() => setPdfDialogOpen(false)}
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-hover px-2.5 py-1 text-[11px] font-semibold text-body hover:text-heading transition-colors cursor-pointer"
                      >
                        <CollapseIcon className="h-3 w-3" />
                        Condenser
                      </button>
                    }
                  />
                </dialog>
              )}
            </>
          )}

          {activePanel === "secteur" && (
            <ClientIntelligenceSectorMobileTab
              data={data.sectorSnapshot}
              fallback={sector ? {
                companyId: company.id,
                companyName: company.name,
                companySegment: company.segment,
                sectorName: company.sector,
                sectorAnalysis: sector.data,
              } : null}
            />
          )}

          {activePanel === "enjeux" && (
            <>
              <button
                type="button"
                onClick={handleGenerateIssues}
                disabled={issuesRunStatus === "loading"}
                className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-fg shadow-sm active:scale-98 transition-all min-h-[44px] disabled:opacity-60"
              >
                {issuesRunStatus === "loading" ? "Génération en cours…" : "Actualiser la cartographie des enjeux"}
              </button>
              {issuesErrorMsg && (
                <p className="mb-3 text-[11px] font-medium text-danger">{issuesErrorMsg}</p>
              )}
              <AccountIssuesTopList issues={issues} contacts={data.contacts} onDismiss={handleDismissIssue} />
            </>
          )}

          {activePanel === "strategie" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGenerateStrategy}
                disabled={strategyRunStatus === "loading"}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-fg shadow-sm active:scale-98 transition-all min-h-[44px] disabled:opacity-60"
              >
                <RefreshIcon className={cn("h-3.5 w-3.5", strategyRunStatus === "loading" && "animate-spin")} />
                {strategyRunStatus === "loading" ? "Génération en cours…" : "Lancer/actualiser la stratégie"}
              </button>
              {strategyErrorMsg && (
                <p className="text-[11px] font-medium text-danger">{strategyErrorMsg}</p>
              )}
              {strategy ? (
                <CommercialStrategyGeneratedContent
                  strategy={strategy.data}
                  issues={issues}
                  offers={data.offersCatalog}
                  isMobile
                />
              ) : (
                <p className="text-xs italic text-muted">
                  {issues.length === 0
                    ? "Cartographie d'abord les enjeux (étape 3) avant de lancer la stratégie."
                    : "Lance la génération pour obtenir un premier mapping enjeu↔offre."}
                </p>
              )}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-body">
                  Script d&apos;appel de 30 secondes ou fiche de préparation de rendez-vous, ancrés sur le catalogue
                  d&apos;offres Kredo et le contexte réel du compte.
                </p>
              </div>
              <ContextualCommunicationButton
                entryPoint="account_pitch"
                label="Générer un pitch"
                variant="brass"
                companyId={company.id}
                companyName={company.name}
                className="w-full min-h-[44px]"
              />
              <SectionBlock title="Pitchs déjà générés">
                {data.pitchDocuments.length === 0 ? (
                  <p className="text-xs text-muted">Aucun pitch généré pour ce compte pour l&apos;instant.</p>
                ) : (
                  <div className="space-y-2">
                    {data.pitchDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setOpenPitchDocumentId(doc.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm min-h-[44px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-heading">{doc.title}</p>
                          <p className="text-[11px] text-muted">
                            {doc.kind === "spoken_pitch" ? "Pitch oral 30 s" : doc.kind === "meeting_briefing" ? "Fiche de préparation RDV" : "Pitch"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionBlock>
              <PitchDocumentDialog
                documentId={openPitchDocumentId}
                onOpenChange={(open) => !open && setOpenPitchDocumentId(null)}
              />
            </div>
          )}

          {activePanel === "roadmap" && (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-4 py-8 text-center min-h-[140px]">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Roadmap commerciale à connecter.
              </span>
              <span className="text-[11px] text-muted/70">Disponible au lot 6</span>
            </div>
          )}

        </div>

        <ScoreDetailModal
          open={scoreModalOpen}
          onOpenChange={setScoreModalOpen}
          companyId={company.id}
          summary={scoreSummary}
          onRecomputed={setScoreSummary}
        />
      </div>
    )
  }

  return (
    <div data-theme="cockpit" className="flex min-h-full flex-col gap-4 bg-canvas p-4 pb-24">
      <div className="flex items-center gap-1.5 -ml-1">
        <Link
          href={`/prospection/accounts?drawer=${company.id}`}
          className="inline-flex items-center justify-center text-white hover:text-white/80 transition-colors rounded p-1 min-h-[44px]"
          aria-label="Retour"
        >
          <svg className="h-4.5 w-4.5 fill-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polygon points="16,5 7,12 16,19" />
          </svg>
        </Link>
        <h2 className="font-heading text-xl font-bold text-heading">
          Cockpit intelligence
        </h2>
      </div>

      {/* Header compact */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo name={company.name} logoPath={company.logoPath} website={company.website} size="xl" className="bg-white p-1 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-bold text-white">{company.name}</h1>
            <p className="text-[11px] text-body">
              {company.sector}
            </p>
            <div className="mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                {lifecycleLabel(company.lifecycleStatus)}
              </span>
            </div>
          </div>
        </div>
        <ScoreBadge summary={scoreSummary} onClick={() => setScoreModalOpen(true)} className="shrink-0" />
      </div>

      {/* Bouton Consulter les documents (Mobile style) */}
      <button
        onClick={() => setIsDocsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-brand-brass border border-brand-brass/25 py-3 text-white hover:bg-brand-brass-hover transition-all cursor-pointer shadow-sm active:scale-98"
      >
        <img
          src="/icons_set/cockpit_intelligence/dossier.png"
          alt=""
          className="size-6 object-contain"
        />
        <span className="text-xs font-bold">Consulter les documents</span>
      </button>

      {financialReference ? <FinancialReferenceMobileCard reference={financialReference} /> : null}

      <AccountWatchSettingsCard
        companyId={company.id}
        initialSettings={data.accountWatch}
        isMobile
      />

      {/* Signaux Récents (Collapsible Frame) */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setSignalsExpanded(!signalsExpanded)}
          className="w-full flex items-center justify-center gap-2 p-3.5 text-center hover:bg-surface-hover transition-colors focus-visible:outline-none"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Signaux récents ({signals.length})
          </span>
          <svg
            className={cn(
              "w-4 h-4 text-muted transition-transform duration-200",
              signalsExpanded ? "transform rotate-180" : ""
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {signalsExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-border/30 bg-canvas/10 animate-in fade-in duration-200">
            {signals.length === 0 ? (
              <p className="text-xs italic text-muted py-2">Aucun signal récent capté pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-3 mt-1">
                {signals.map((signal, i) => (
                  <li key={i} className="flex flex-col gap-2 py-1.5 text-xs border-b border-border/10 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2.5 items-start flex-1 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                        <span className="text-xs leading-relaxed text-body">{signal}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 justify-start mt-2">
                      <a
                        href={
                          signal.match(/(https?:\/\/[^\s]+)/)?.[0] ||
                          `https://www.google.com/search?q=${encodeURIComponent(`${company.name} ${signal}`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden bg-brand-blue hover:bg-primary-deep hover:-translate-y-0.5 active:scale-[0.97] text-white border-none shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(37,84,184,0.2)] transition-all duration-200 rounded-xl min-h-[44px] px-3 text-[10px] font-bold select-none cursor-pointer flex items-center gap-1.5 justify-center"
                        title="Accéder à la source"
                      >
                        <span className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-white/15 blur-xl transition-all duration-300 group-hover:scale-110" />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:animate-[kredo-action-shine-sweep_0.55s_cubic-bezier(0.4,0,0.2,1)_forwards]" />
                        <img
                          src="/icons_set/cockpit_intelligence/recherche_actualités.png"
                          alt=""
                          width={12}
                          height={12}
                          className="relative z-10 size-3 object-contain transition-transform duration-200 group-hover:scale-110"
                        />
                        <span className="relative z-10">Voir la source</span>
                      </a>
                      <ContextualCommunicationButton
                        entryPoint="signal_card"
                        companyId={company.id}
                        companyName={company.name}
                        primaryEntity={{ type: "company", id: company.id }}
                        label="Contacter sur ce signal"
                        className="group relative overflow-hidden bg-brand-blue hover:bg-primary-deep hover:-translate-y-0.5 active:scale-[0.97] text-white border-none shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(72,77,245,0.2)] transition-all duration-200 rounded-xl min-h-[44px] px-3 text-[10px] font-bold select-none cursor-pointer flex items-center gap-1.5 justify-center"
                        aria-label={`Contacter ${company.name} sur le signal ${i + 1}`}
                        refs={{ signalRef: signal }}
                        leftIcon={
                          <>
                            <span className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-white/15 blur-xl transition-all duration-300 group-hover:scale-110" />
                            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:animate-[kredo-action-shine-sweep_0.55s_cubic-bezier(0.4,0,0.2,1)_forwards]" />
                            <img
                              src="/icons_set/cockpit_intelligence/redaction_message_ai.png"
                              alt=""
                              width={12}
                              height={12}
                              className="relative z-10 size-3 object-contain transition-transform duration-200 group-hover:scale-110"
                            />
                          </>
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Timeline verticale mobile */}
      <div className="flex flex-col gap-0 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">
          Processus commercial
        </span>
        {INTELLIGENCE_PROCESS_STEPS.map((step, idx) => (
          <Fragment key={step.key}>
            <button
              type="button"
              onClick={() => setActivePanel(step.key)}
              aria-label={`Étape ${idx + 1} : ${step.label}. ${step.description}`}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border border-border bg-surface text-left min-h-[48px]",
                "transition-all hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-heading text-xs font-bold text-heading leading-tight">
                    {step.label}
                  </div>
                  <div className="text-[10px] text-body mt-0.5 leading-tight">
                    {step.description}
                  </div>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-muted shrink-0 ml-2" />
            </button>
            {idx < INTELLIGENCE_PROCESS_STEPS.length - 1 && (
              <div className="w-0.5 h-3.5 bg-border/50 ml-[25px]" />
            )}
          </Fragment>
        ))}
      </div>

      <ScoreDetailModal
        open={scoreModalOpen}
        onOpenChange={setScoreModalOpen}
        companyId={company.id}
        summary={scoreSummary}
        onRecomputed={setScoreSummary}
      />

      <CompanyDocumentsModal
        open={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        companyId={company.id}
        companyName={company.name}
        isMobile={true}
      />
    </div>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}
