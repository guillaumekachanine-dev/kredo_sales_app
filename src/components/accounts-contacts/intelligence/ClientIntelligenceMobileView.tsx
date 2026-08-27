"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { WorkflowExecutionConfirmDialog } from "@/components/ui/WorkflowExecutionConfirmDialog"
import { cn } from "@/lib/utils"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { CommercialStrategyContent } from "@/lib/intelligence/account-intelligence-contracts"
import { ProvenanceBadge, SectionBlock, FreshnessLine } from "./intelligence-parts"
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
import { DocumentViewerShell } from "@/components/documents/DocumentViewerShell"
import { type TabKey } from "./intelligence-process"
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
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { CompanyIdentityPositioningContent } from "./CompanyIdentityPositioningContent"
import { ContactDirectoryDialog } from "@/components/accounts-contacts/directory/ContactDirectoryDialog"
import { AccountWatchSettingsDialog } from "@/components/accounts-contacts/intelligence/AccountWatchSettingsDialog"
import {
  AccountIntelligenceSignatureHeaderMobile,
  getAccountIntelligenceTabLabel,
  HeaderPlanes,
} from "./header/AccountIntelligenceSignatureHeader"
import {
  buildMobileAccountCockpit,
} from "@/lib/intelligence/mobile-account-cockpit"

type ConnaissanceRunStatus = "idle" | "loading" | "done" | "error"

export function ClientIntelligenceMobileView({ data }: { data: ClientIntelligenceData }) {
  const { company, client, sector, diagnostic, diagnosticPdfUrl, contacts, opportunities, missions, accountSignals } = data
  const supabase = useMemo(() => createBrowserClient(), [])

  const [activePanel, setActivePanel] = useState<TabKey>("accueil")
  const [selectedAnalysis, setSelectedAnalysis] = useState<"client" | "processus" | null>(null)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [openPitchDocumentId, setOpenPitchDocumentId] = useState<string | null>(null)
  const [watchSettingsOpen, setWatchSettingsOpen] = useState(false)
  const pdfDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const openAccountIntelligence = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId: string }>).detail
      if (detail.companyId === company.id) setActivePanel("connaissance")
    }
    window.addEventListener("kredo:open-account-intelligence", openAccountIntelligence)
    return () => window.removeEventListener("kredo:open-account-intelligence", openAccountIntelligence)
  }, [company.id])

  const v3State = data.accountKnowledgeV3
  const v3 = v3State?.data
  const knowledge = v3State || data.accountKnowledge
  const showStructuredCompanyProfile = !v3 && knowledge?.version !== 2
  const knowledgeSourceIndex = useMemo(
    () => buildSourceIndex(data.accountKnowledgeSources),
    [data.accountKnowledgeSources],
  )
  const {
    status: knowledgeRunStatus,
    errorMessage: knowledgeErrorMsg,
    trigger: triggerKnowledgeRun,
  } = useAccountKnowledgeRun(company.id)

  const [issues, setIssues] = useState(data.accountIssues)
  const [issuesRunId, setIssuesRunId] = useState<string | null>(null)
  const [issuesErrorMsg, setIssuesErrorMsg] = useState<string | null>(null)
  const [issuesTriggering, setIssuesTriggering] = useState(false)
  const [confirmIssuesOpen, setConfirmIssuesOpen] = useState(false)
  const [confirmStrategyOpen, setConfirmStrategyOpen] = useState(false)
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
    return (
      <div data-theme="cockpit" className="flex min-h-full flex-col bg-canvas pb-24">
        <AccountIntelligenceSignatureHeaderMobile
          company={company}
          title={getAccountIntelligenceTabLabel(activePanel)}
          onBack={() => setActivePanel("accueil")}
        />

        <div className="flex flex-col gap-4 p-4">
          {activePanel === "socle" && (
            <ClientIntelligenceSocleTab data={data} isMobile />
          )}

          {activePanel === "connaissance" && (
            <>
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

              <AccountKnowledgeUpdateControlsMobile
                state={knowledge}
                lastUpdatedAt={data.accountKnowledgeLastUpdatedAt}
                status={knowledgeRunStatus}
                errorMessage={knowledgeErrorMsg}
                onUpdate={() => void triggerKnowledgeRun()}
              />

              {showStructuredCompanyProfile ? (
                <div className="mb-3 space-y-3 border-t border-border/30 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Données structurées du compte
                  </p>
                  <CompanyIdentityPositioningContent
                    identity={data.companyProfile}
                    positioning={data.companyPositioning}
                  />
                </div>
              ) : null}

              {v3 ? (
                <div className="mb-3 space-y-4 border-t border-border/30 pt-4 mt-2">
                  <AccountKnowledgeV3Mobile content={v3} sources={knowledgeSourceIndex} signals={data.accountSignals} />
                  {data.accountKnowledge && (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      {data.accountKnowledge.version === 1 ? (
                        <AccountKnowledgeOpenQuestions data={data.accountKnowledge.data} resultId={data.accountKnowledge.resultId} />
                      ) : data.accountKnowledge.version === 2 ? (
                        <AccountKnowledgeOpenQuestionsV2 data={data.accountKnowledge.data} />
                      ) : null}
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

              {selectedAnalysis === "client" && (
                client ? (
                  <>
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
                onClick={() => setConfirmIssuesOpen(true)}
                disabled={issuesRunStatus === "loading"}
                className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-fg shadow-sm active:scale-98 transition-all min-h-[44px] disabled:opacity-60 cursor-pointer"
              >
                {issuesRunStatus === "loading" ? "Génération en cours…" : "Actualiser la cartographie des enjeux"}
              </button>
              {issuesErrorMsg && (
                <p className="mb-3 text-[11px] font-medium text-danger">{issuesErrorMsg}</p>
              )}
              <AccountIssuesTopList issues={issues} contacts={data.contacts} onDismiss={handleDismissIssue} />

              <WorkflowExecutionConfirmDialog
                open={confirmIssuesOpen}
                onOpenChange={setConfirmIssuesOpen}
                actionLabel="Actualiser la cartographie des enjeux"
                runType="intel-031-issues-map"
                onConfirm={handleGenerateIssues}
                pending={issuesRunStatus === "loading"}
              />
            </>
          )}

          {activePanel === "strategie" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setConfirmStrategyOpen(true)}
                disabled={strategyRunStatus === "loading"}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-fg shadow-sm active:scale-98 transition-all min-h-[44px] disabled:opacity-60 cursor-pointer"
              >
                <RefreshIcon className={cn("h-3.5 w-3.5", strategyRunStatus === "loading" && "animate-spin")} />
                {strategyRunStatus === "loading" ? "Génération en cours…" : "Lancer/actualiser la stratégie"}
              </button>
              {strategyErrorMsg && (
                <p className="text-[11px] font-medium text-danger">{strategyErrorMsg}</p>
              )}

              <WorkflowExecutionConfirmDialog
                open={confirmStrategyOpen}
                onOpenChange={setConfirmStrategyOpen}
                actionLabel="Lancer/actualiser la stratégie"
                runType="intel-032-strategy"
                onConfirm={handleGenerateStrategy}
                pending={strategyRunStatus === "loading"}
              />
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
      </div>
    )
  }

  const cockpit = buildMobileAccountCockpit(data, new Date(data.loadedAt))
  const latestSignal = accountSignals && accountSignals.length > 0 ? accountSignals[0] : null

  return (
    <main data-theme="edito-bright-cockpit" className="-mt-[var(--space-3)] min-h-full bg-canvas pb-24 text-body space-y-4">
      <AccountIntelligenceSignatureHeaderMobile
        company={company}
        title={getAccountIntelligenceTabLabel("accueil")}
      />

      <div className="px-4 space-y-4">
        {/* Section 1 : Informations générales */}
        <section className="rounded-2xl border border-edito-border bg-edito-surface/90 p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-3.5">
            {/* Logo grand format dans le coin supérieur gauche */}
            <div className="size-20 shrink-0 rounded-xl bg-white p-2.5 shadow-xs border border-border flex items-center justify-center overflow-hidden">
              <CompanyLogo
                name={company.name}
                logoPath={company.logoPath}
                website={company.website}
                fill
                className="h-full w-full rounded-none border-0 bg-white object-contain"
              />
            </div>

            {/* Segment métier et secteur d'activité (sans titres, seulement le contenu) */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              {company.segment ? (
                <p className="font-bold text-sm leading-snug text-heading">{company.segment}</p>
              ) : null}
              {company.sector ? (
                <p className="text-xs font-semibold leading-snug text-muted">{company.sector}</p>
              ) : null}
            </div>
          </div>

          {/* Ligne de 3 KPI côte à côte : Chiffre d'affaires, Effectifs, Siège social */}
          <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-muted">Chiffre d&apos;affaires</span>
              <span className="mt-0.5 block truncate text-[14px] font-bold text-heading">
                {data.companyProfile?.revenue || "—"}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-muted">Effectifs</span>
              <span className="mt-0.5 block truncate text-[14px] font-bold text-heading">
                {data.companyProfile?.employeeCount || data.companyProfile?.headcountFrance || "—"}
              </span>
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-semibold text-muted">Siège social</span>
              <span className="mt-0.5 block truncate text-[14px] font-bold text-heading">
                {company.hqLocation || data.companyProfile?.hqLocation || "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Section 2 : 4 boutons de raccourci vers les onglets (1 par ligne) */}
        <section className="space-y-2.5">
          <AccountIntelligenceTabBannerButton
            company={company}
            label="Entreprise"
            onClick={() => setActivePanel("connaissance")}
          />
          <AccountIntelligenceTabBannerButton
            company={company}
            label="Secteur"
            onClick={() => setActivePanel("secteur")}
          />
          <AccountIntelligenceTabBannerButton
            company={company}
            label="Enjeux"
            onClick={() => setActivePanel("enjeux")}
          />
          <AccountIntelligenceTabBannerButton
            company={company}
            label="Stratégie"
            onClick={() => setActivePanel("strategie")}
          />
        </section>

        {/* Section 3 : Actualités du compte */}
        <section className="rounded-2xl border border-info/25 bg-info/[0.06] p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-info/20 pb-2">
            <div className="h-0.5 w-5 bg-info" aria-hidden="true" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-info">Actualités du compte</h2>
          </div>

          <div>
            {latestSignal ? (
              <div>
                <span className="inline-block rounded bg-info/15 px-2 py-0.5 text-[10px] font-bold text-info uppercase tracking-wider mb-1">
                  Signal compte
                </span>
                <h3 className="font-bold text-sm text-heading line-clamp-2">{latestSignal.title}</h3>
                {latestSignal.summary ? (
                  <p className="mt-1 text-xs text-body leading-relaxed line-clamp-2">{latestSignal.summary}</p>
                ) : null}
              </div>
            ) : cockpit.actuality.title ? (
              <div>
                <span className="inline-block rounded bg-info/15 px-2 py-0.5 text-[10px] font-bold text-info uppercase tracking-wider mb-1">
                  Actualité sectorielle
                </span>
                <h3 className="font-bold text-sm text-heading line-clamp-2">{cockpit.actuality.title}</h3>
                {cockpit.actuality.context ? (
                  <p className="mt-1 text-xs text-body leading-relaxed line-clamp-2">{cockpit.actuality.context}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs italic text-muted">Aucune actualité récente ou signal détecté pour le moment.</p>
            )}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWatchSettingsOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-info/30 bg-info/15 px-3.5 text-xs font-bold text-info transition-all hover:bg-info/25 active:scale-98 cursor-pointer"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.27 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 0 1-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.149-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Paramétrer la veille
            </button>
          </div>
        </section>
      </div>

      <ContactDirectoryDialog
        open={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        initialCompanyId={company.id}
        isMobile={true}
      />

      <AccountWatchSettingsDialog
        open={watchSettingsOpen}
        onOpenChange={setWatchSettingsOpen}
        companyId={company.id}
        companyName={company.name}
        companyLogoPath={company.logoPath}
        companyWebsite={company.website}
        onBack={() => setWatchSettingsOpen(false)}
        onReturnToCockpit={() => setWatchSettingsOpen(false)}
      />
    </main>
  )
}

function AccountIntelligenceTabBannerButton({
  company,
  label,
  onClick,
}: {
  company: ClientIntelligenceData["company"]
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[52px] w-full items-center justify-between overflow-hidden rounded-xl border border-edito-border text-left shadow-xs transition-transform active:scale-[0.99] cursor-pointer"
    >
      <HeaderPlanes />
      <div className="relative z-10 flex min-w-0 items-center gap-2.5 pl-3">
        <div className="size-7 shrink-0 bg-white p-0.5 rounded shadow-xs flex items-center justify-center">
          <CompanyLogo
            name={company.name}
            logoPath={company.logoPath}
            website={company.website}
            fill
            className="h-full w-full rounded-none border-0 bg-white text-[10px]"
          />
        </div>
        <span className="max-w-[42vw] truncate text-[13px] font-black uppercase tracking-[0.03em] text-white">
          {company.name}
        </span>
      </div>
      <div className="relative z-10 pr-4 text-right">
        <span className="text-[12px] font-black uppercase tracking-[0.1em] text-white">
          {label}
        </span>
      </div>
    </button>
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
