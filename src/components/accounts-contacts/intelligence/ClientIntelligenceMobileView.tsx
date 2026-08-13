"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
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
import {
  buildMobileAccountCockpit,
  type MobileCockpitFeature,
} from "@/lib/intelligence/mobile-account-cockpit"

type ConnaissanceRunStatus = "idle" | "loading" | "done" | "error"

export function ClientIntelligenceMobileView({ data }: { data: ClientIntelligenceData }) {
  const { company, client, sector, diagnostic, diagnosticPdfUrl, contacts, opportunities, missions, accountSignals } = data
  const supabase = useMemo(() => createBrowserClient(), [])

  const [activePanel, setActivePanel] = useState<TabKey>("accueil")
  const [selectedAnalysis, setSelectedAnalysis] = useState<"client" | "processus" | null>(null)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [openPitchDocumentId, setOpenPitchDocumentId] = useState<string | null>(null)
  const pdfDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const openAccountIntelligence = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId: string }>).detail
      if (detail.companyId === company.id) setActivePanel("connaissance")
    }
    window.addEventListener("kredo:open-account-intelligence", openAccountIntelligence)
    return () => window.removeEventListener("kredo:open-account-intelligence", openAccountIntelligence)
  }, [company.id])

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

      </div>
    )
  }

  const cockpit = buildMobileAccountCockpit(data, new Date(data.loadedAt))

  return (
    <main data-theme="edito-bright-cockpit" className="-mt-[var(--space-3)] min-h-full bg-canvas pb-24 text-body">
      <header className="flex min-h-[88px] items-center gap-3 border-b-2 border-secondary bg-cockpit-cobalt px-4 py-3 text-white">
        <CompanyLogo name={company.name} logoPath={company.logoPath} website={company.website} size="lg" className="border-white/20 bg-white p-1" />
        <div className="flex min-w-0 flex-col justify-center gap-0.5">
          <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.17em] text-secondary">Cockpit Intelligence</p>
          <h1 className="truncate text-[22px] font-bold leading-7 tracking-[-0.02em] text-white">{company.name}</h1>
        </div>
      </header>

      <div className="px-4">
        <EditorialCockpitSection label="À faire maintenant" accentClassName="bg-secondary" actionClassName="border-secondary/35 bg-secondary/15 text-heading" feature={cockpit.nowAction} company={company} featured />
        <EditorialCockpitSection label="Actualité" accentClassName="bg-info" actionClassName="border-info/25 bg-info/10 text-info" feature={cockpit.actuality} company={company} />
        <EditorialCockpitSection label="À exploiter" accentClassName="bg-brand-brass" actionClassName="border-brand-brass/30 bg-brand-brass/10 text-heading" feature={cockpit.opportunityWindow} company={company} />
        <EditorialCockpitSection label="Développer" accentClassName="bg-success" actionClassName="border-success/25 bg-success/10 text-success" feature={cockpit.developmentAction} company={company} />

        <section className="py-3" aria-labelledby="mobile-cockpit-upcoming-title">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-5 bg-edito-navy" aria-hidden="true" />
            <h2 id="mobile-cockpit-upcoming-title" className="text-[10px] font-bold uppercase leading-4 tracking-[0.15em] text-muted">Prochains mouvements</h2>
          </div>
          {cockpit.upcoming.length > 0 ? (
            <ul className="mt-1.5 divide-y divide-border">
              {cockpit.upcoming.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="flex min-h-11 items-center justify-between gap-4 py-1.5 text-[13px] leading-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                    <span className="min-w-0 truncate font-semibold text-heading">{item.label}</span>
                    <span className={cn("shrink-0 text-[11px] font-semibold", item.overdue ? "text-danger" : "text-muted")}>{item.timing}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[13px] leading-5 text-muted">Aucun mouvement planifié.</p>}
        </section>
      </div>
    </main>
  )
}

function EditorialCockpitSection({ label, accentClassName, actionClassName, feature, company, featured = false }: {
  label: string
  accentClassName: string
  actionClassName: string
  feature: MobileCockpitFeature
  company: ClientIntelligenceData["company"]
  featured?: boolean
}) {
  return (
    <section className={cn(
      "border-b border-border py-3",
      featured && "-mx-4 border-y border-secondary/25 bg-secondary/[0.07] px-4",
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("h-0.5 w-5", accentClassName)} aria-hidden="true" />
        <h2 className={cn(
          "text-[10px] font-bold uppercase leading-4 tracking-[0.15em] text-muted",
          featured && "text-heading",
        )}>{label}</h2>
      </div>
      <h3 className={cn(
        "mt-1 max-w-[35ch] font-bold leading-5 tracking-[-0.01em] text-heading",
        featured ? "line-clamp-2 text-[18px]" : "line-clamp-3 text-[16px]",
      )}>{feature.title}</h3>
      {feature.meta ? <p className="mt-0.5 text-[12px] font-semibold leading-4 text-body">{feature.meta}</p> : null}
      {feature.context ? <p className="mt-0.5 line-clamp-1 text-[12px] leading-4 text-body">{feature.context}</p> : null}
      <EditorialFeatureActions feature={feature} company={company} actionClassName={actionClassName} />
    </section>
  )
}

function getFeatureSource(feature: MobileCockpitFeature, companyName: string): { href: string; label: string } {
  if (feature.actionKind === "agenda") return { href: feature.href ?? "/agenda", label: "Voir l’agenda" }
  if (feature.actionKind === "actuality") {
    if (feature.id.startsWith("article:")) return { href: "/veille", label: "Consulter la veille" }
    return { href: "/veille", label: "Consulter les signaux" }
  }
  if (feature.actionKind === "veille") return { href: feature.href ?? "/veille", label: "Ouvrir la veille" }
  if (feature.actionKind === "opportunity") {
    if (feature.missionId) return { href: feature.href ?? "/missions/actives", label: "Voir les missions" }
    if (feature.signalId) return { href: "/veille", label: "Consulter les signaux" }
    if (feature.id.startsWith("regulatory:")) return { href: feature.href ?? "/prospection/approche-sectorielle", label: "Voir le secteur" }
    return {
      href: feature.href ?? "/missions/opps",
      label: feature.opportunityId
        ? /renfort|staffing/i.test(feature.opportunityTitle ?? feature.title) ? "Voir le staffing" : "Voir l’opportunité"
        : "Voir le pipe",
    }
  }
  if (feature.opportunityId) return { href: `/missions/opps/${feature.opportunityId}/modifier`, label: "Voir l’opportunité" }
  if (feature.signalId) return { href: "/veille", label: "Consulter les signaux" }
  return {
    href: `/prospection/accounts?tab=contacts&q=${encodeURIComponent(companyName)}`,
    label: "Voir les contacts",
  }
}

function EditorialFeatureActions({ feature, company, actionClassName }: {
  feature: MobileCockpitFeature
  company: ClientIntelligenceData["company"]
  actionClassName: string
}) {
  const source = getFeatureSource(feature, company.name)
  const framedButtonClassName = "inline-flex min-h-11 min-w-0 items-center justify-center rounded-[var(--radius-medium)] border px-2.5 text-center text-[12px] font-bold leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
  const actionIsLink = feature.id === "plan-next-action" || feature.id === "actuality-empty" || feature.id === "window-empty"
  const intent = feature.actionKind === "agenda"
    ? "discovery_preparation"
    : feature.missionId
      ? "mission_renewal"
      : feature.actionKind === "actuality"
        ? "signal_outreach"
        : "prospection_follow_up"

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <Link
        href={source.href}
        className={cn(framedButtonClassName, "border-cockpit-cobalt/20 bg-cockpit-cobalt/[0.06] text-cockpit-cobalt hover:bg-cockpit-cobalt/10")}
      >
        {source.label}
      </Link>
      {actionIsLink ? (
        <Link href={feature.href ?? source.href} className={cn(framedButtonClassName, actionClassName)}>
          {feature.ctaLabel}
        </Link>
      ) : (
        <ContextualCommunicationButton
          intent={intent}
          companyId={company.id}
          companyName={company.name}
          contactId={feature.contactId}
          contactName={feature.contactName}
          opportunityId={feature.opportunityId}
          opportunityTitle={feature.opportunityTitle}
          missionId={feature.missionId}
          missionTitle={feature.missionTitle}
          signalId={feature.signalId}
          eventId={feature.eventId}
          eventTitle={feature.eventTitle}
          eventStartsAt={feature.eventStartsAt}
          primaryEntity={{ type: "company", id: company.id }}
          label={feature.ctaLabel}
          mustInclude={feature.signalTitle ?? feature.context ?? feature.title}
          variant="ghost"
          className={cn(framedButtonClassName, "!h-11 !w-full !min-w-0 !px-2.5", actionClassName)}
        />
      )}
    </div>
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
