"use client"

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { FinancialReferenceDesktopCard } from "@/components/finance/FinancialReferenceDesktopCard"
import type { FinancialReference } from "@/features/financial-modeling/data/financial-reference-presenter"
import { cn } from "@/lib/utils"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { ClientIntelligenceData, AnalyseClient, AnalyseSector, AnalyseDiagnostic } from "@/lib/intelligence/intelligence-data"
import type { AccountKnowledgeContent, CommercialStrategyContent } from "@/lib/intelligence/account-intelligence-contracts"
import { DocumentViewerShell } from "@/components/documents/DocumentViewerShell"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { PitchDocumentDialog } from "./PitchDocumentDialog"
import {
  ComingSoon,
  Field,
  lifecycleLabel,
  SectionBlock,
  SignalList,
  TagList,
} from "./intelligence-parts"
import {
  ContactsKeyCard,
  CommercialRelationCard,
  AccountSignalsCard,
  AccountKnowledgeGeneratedContent,
} from "./AccountKnowledgeBlocks"
import { SectorSnapshotContent } from "./SectorSnapshotContent"
import { AccountIssuesTable } from "./AccountIssuesBlocks"
import { CommercialStrategyGeneratedContent } from "./CommercialStrategyBlocks"
import { AccountWatchSettingsCard } from "./AccountWatchSettingsCard"
import { ScoreBadge } from "./ScoreBadge"
import { ScoreDetailModal } from "./ScoreDetailModal"
import { CompanyDocumentsModal } from "./CompanyDocumentsModal"
import { ClientIntelligenceSidebar } from "./ClientIntelligenceSidebar"
import { useCrmTabStore } from "@/lib/tabs/crm-tab-store"
import {
  type TabKey,
  type ProcessStepKey,
  INTELLIGENCE_PROCESS_STEPS,
  getProcessStepStatus,
} from "./intelligence-process"

export function ClientIntelligenceDesktopView({ data, financialReference = null }: { data: ClientIntelligenceData; financialReference?: FinancialReference | null }) {
  const [activeTab, setActiveTab] = useState<TabKey>("accueil")
  const [expandedViewer, setExpandedViewer] = useState(false)
  const [scoreSummary, setScoreSummary] = useState(data.scoreSummary)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false)
  const pdfDialogRef = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const setCrmActiveTab = useCrmTabStore((state) => state.setActiveTab)
  const { company } = data
  const { diagnosticPdfUrl } = data

  useEffect(() => {
    const dialog = pdfDialogRef.current
    if (!dialog) return
    if (expandedViewer && diagnosticPdfUrl) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [expandedViewer, diagnosticPdfUrl])

  const handleBackToAccounts = () => {
    setCrmActiveTab("home")
    if (pathname !== "/prospection/accounts") {
      router.push("/prospection/accounts")
    }
  }

  return (
    <div data-theme="edito-bright-cockpit" className="edito-bright-page flex h-full min-h-0 overflow-hidden bg-canvas">
      <ClientIntelligenceSidebar
        activeTab={activeTab}
        onBackToAccounts={handleBackToAccounts}
        onTabChange={setActiveTab}
      />

      {/* ── Colonne principale : identité + contenu analytique scrollable ─────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Header (compact) ─────────────────────────────────────────────── */}
        <header className="shrink-0 bg-canvas px-6 pt-5">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
            <div className="flex flex-col items-start">
              <h2 className="edito-title-marker font-heading text-2xl font-bold leading-tight tracking-tight text-heading">
                Cockpit intelligence
              </h2>
            </div>

            <div className="flex w-full items-start justify-between gap-6 rounded-xl border border-cockpit-petrol-medium bg-cockpit-petrol-medium p-5">
              {/* Côté gauche : Logo + Informations du compte */}
              <div className="flex items-start gap-4">
                <CompanyLogo
                  name={company.name}
                  logoPath={company.logoPath}
                  website={company.website}
                  size="2xl"
                  className="shrink-0 border-white bg-white p-1"
                />
                <div className="flex flex-col items-start gap-1">
                  <h1 className="font-heading text-2xl font-bold leading-tight text-white">
                    {company.name}
                  </h1>
                  <p className="text-xs leading-normal text-white/85">
                    {company.sector} · {company.segment} · {company.hqLocation}
                  </p>
                  <span className="text-xs text-white/70">
                    {lifecycleLabel(company.lifecycleStatus)}
                  </span>
                </div>
              </div>

              {/* Côté droit : Documents + Score de Priorité Commerciale */}
              <div className="flex shrink-0 items-center gap-4">
                <button
                  onClick={() => setIsDocsModalOpen(true)}
                  className="flex min-h-10 items-center gap-2 rounded border border-white/75 bg-white px-4 py-2 text-cockpit-petrol-medium transition-colors hover:bg-edito-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Image
                    src="/icons_set/cockpit_intelligence/dossier.png"
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                  />
                  <span className="text-sm font-semibold">Consulter les documents</span>
                </button>
                <ScoreBadge className="edito-score" summary={scoreSummary} onClick={() => setScoreModalOpen(true)} />
              </div>
            </div>
          </div>
        </header>

        {/* ── Contenu de l'onglet actif ─────────────────────────────────────── */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-canvas px-6 pb-8">
          <div className="mx-auto w-full max-w-6xl">
            {activeTab === "accueil" && (
              <AccueilTab
                data={data}
                onOpenTab={(tab) => setActiveTab(tab)}
                financialReference={financialReference}
              />
            )}
            {activeTab === "connaissance" && (
              <AnalyseTab
                data={data}
                isExpandedViewer={expandedViewer}
                onExpandViewer={setExpandedViewer}
              />
            )}
            {activeTab === "secteur" && (
              <div className="mx-auto max-w-4xl pt-6">
              {/* ADR-0012 Lot 3 : snapshot déterministe mutualisé (sector_intelligence
                  + tables sector_*) en priorité — seulement si le compte a un
                  sector_id (backfill honnête, ~27/95 comptes). Fallback FOLIO/moteur
                  sinon, exactement comme avant (Lot 0/2). */}
              {data.sectorSnapshot ? (
                <SectorSnapshotContent data={data.sectorSnapshot} />
              ) : data.sector ? (
                <SectorAnalysisContent data={data.sector.data} />
              ) : (
                <ComingSoon lot="lot 3">Intelligence sectorielle mutualisée, contextualisée pour ce compte</ComingSoon>
              )}
              </div>
            )}
            {activeTab === "enjeux" && (
              <div className="pt-6">
                <EnjeuxTab data={data} />
              </div>
            )}
            {activeTab === "strategie" && (
              <div className="pt-6">
                <StrategieTab data={data} />
              </div>
            )}
            {activeTab === "roadmap" && (
              <div className="pt-6">
                <ComingSoon lot="lot 6">Roadmap commerciale → opportunités, tâches et relances</ComingSoon>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Lecteur PDF plein écran (dialog native) ─────────────────────────── */}
      {diagnosticPdfUrl && (
        <dialog
          ref={pdfDialogRef}
          onClose={() => setExpandedViewer(false)}
          className="m-0 p-0 border-0 w-screen h-dvh max-w-[100vw] max-h-[100dvh] bg-canvas [&::backdrop]:bg-black/75"
        >
          <DocumentViewerShell
            fileName={`Diagnostic process — ${company.name}`}
            fileUrl={diagnosticPdfUrl}
            metadata={{
              "Compte": company.name,
              "Type": "Diagnostic process",
              "Source": data.diagnostic?.source === "engine" ? "Moteur IA" : "Import",
            }}
            className="h-full rounded-none border-0"
            actions={
              <button
                type="button"
                onClick={() => setExpandedViewer(false)}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-hover px-2.5 py-1 text-[11px] font-semibold text-body hover:text-heading transition-colors cursor-pointer"
              >
                <CollapseIcon className="h-3 w-3" />
                Condenser
              </button>
            }
          />
        </dialog>
      )}

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
        isMobile={false}
      />
    </div>
  )
}

// ─── Onglet Accueil — synthèse exécutive ──────────────────────────────────────

function AccueilTab({
  data,
  onOpenTab,
  financialReference,
}: {
  data: ClientIntelligenceData
  onOpenTab: (tab: Exclude<TabKey, "accueil">) => void
  financialReference: FinancialReference | null
}) {
  const { signals } = data
  return (
    <div className="space-y-6 py-6">
      {financialReference ? <FinancialReferenceDesktopCard reference={financialReference} /> : null}
      {/* ── Frise process horizontal ── */}
      <div className="edito-process-rail grid grid-cols-5 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {INTELLIGENCE_PROCESS_STEPS.map((step) => {
          const status = getProcessStepStatus(step.key, data)
          const Icon = STEP_ICONS[step.key]
          const toneCls = {
            success: "text-success bg-success/10 border-success/20",
            warning: "text-warning bg-warning/10 border-warning/20",
            neutral: "text-muted bg-surface-hover border-border",
          }[status.tone]

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onOpenTab(step.key)}
              aria-label={`${step.label}. Statut : ${status.label}`}
              className={cn(
                "flex min-h-40 flex-col items-start bg-primary p-4 text-left",
                "transition-colors hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-inset",
              )}
            >
              <div className="mb-3 shrink-0 text-secondary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 flex-1 font-heading text-xs font-bold uppercase tracking-wider leading-[16px] text-primary-fg">
                {step.label}
              </h3>
              <p className="mb-3 text-[11px] leading-normal text-white/75 line-clamp-3">
                {step.description}
              </p>
              <span className={cn("mt-auto inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", toneCls)}>
                {status.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AccountWatchSettingsCard
          companyId={data.company.id}
          initialSettings={data.accountWatch}
        />

        {/* ── Signaux récents ── */}
        {signals && signals.length > 0 && (
          <SectionBlock title="Signaux récents">
            <SignalList signals={signals} companyId={data.company.id} companyName={data.company.name} />
          </SectionBlock>
        )}
      </div>
    </div>
  )
}

// ─── Onglet Stratégie — génération de pitch (ADR-0009, lot H) ────────────────

const PITCH_KIND_LABEL: Record<string, string> = {
  spoken_pitch: "Pitch oral 30 s",
  meeting_briefing: "Fiche de préparation RDV",
}

function formatPitchDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function EnjeuxTab({ data }: { data: ClientIntelligenceData }) {
  const { company, contacts } = data
  const supabase = useMemo(() => createBrowserClient(), [])

  const [issues, setIssues] = useState(data.accountIssues)
  const [runStatus, setRunStatus] = useState<ConnaissanceRunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return
    const channel = supabase
      .channel(`account-issues-result-${runId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_intelligence_results", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as { status: string }
          if (row.status === "succeeded") {
            // Matérialisation faite côté callback (D-5) — on recharge les
            // enjeux ouverts directement, pas de contenu à parser côté client.
            void supabase
              .from("account_issues")
              .select("id,title,category,problem_statement,evidence_level,provenance,importance,urgency,criticality,business_impact,accessibility,kredo_fit,contact_ids,recommended_next_probe,status,created_at")
              .eq("company_id", company.id)
              .eq("status", "open")
              .order("importance", { ascending: false })
              .then(({ data: rows }) => {
                if (rows) {
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
                }
                setRunStatus("done")
              })
          } else if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  async function handleGenerate() {
    setRunStatus("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-031-issues-map",
          entityType: "company",
          entityId: company.id,
          input: {},
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }
      const { runId: newRunId } = (await res.json()) as { runId: string }
      setRunId(newRunId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  function handleDismiss(issueId: string) {
    setIssues((prev) => prev.filter((i) => i.id !== issueId))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Étape 3 — Cartographie des enjeux</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-heading">Enjeux de {company.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          {errorMsg && <p className="text-[11px] font-medium text-danger">{errorMsg}</p>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={runStatus === "loading"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-fg shadow-sm hover:bg-primary/95 transition-all active:scale-98 cursor-pointer min-h-[38px] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshIcon className={cn("h-3.5 w-3.5", runStatus === "loading" && "animate-spin")} />
            {runStatus === "loading" ? "Génération en cours…" : "Lancer/actualiser la cartographie des enjeux"}
          </button>
        </div>
      </div>
      <AccountIssuesTable issues={issues} contacts={contacts} onDismiss={handleDismiss} />
    </div>
  )
}

function StrategieTab({ data }: { data: ClientIntelligenceData }) {
  const { company, pitchDocuments, accountIssues, offersCatalog } = data
  const supabase = useMemo(() => createBrowserClient(), [])
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null)

  const [strategy, setStrategy] = useState(data.commercialStrategy)
  const [runStatus, setRunStatus] = useState<ConnaissanceRunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return
    const channel = supabase
      .channel(`commercial-strategy-result-${runId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_intelligence_results", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as { status: string; content_json: unknown; id: string }
          if (row.status === "succeeded") {
            setStrategy({ data: row.content_json as CommercialStrategyContent, resultId: row.id })
            setRunStatus("done")
          } else if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  async function handleGenerateStrategy() {
    setRunStatus("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-032-strategy",
          entityType: "company",
          entityId: company.id,
          input: {},
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }
      const { runId: newRunId } = (await res.json()) as { runId: string }
      setRunId(newRunId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Étape 4 — Stratégie commerciale</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-heading">Stratégie pour {company.name}</h2>
          <p className="mt-1 max-w-xl text-xs text-body">
            Relie les enjeux déjà cartographiés (étape 3) aux offres Kredo : angles d&apos;approche, messages
            clés par interlocuteur et objections anticipées.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {errorMsg && <p className="text-[11px] font-medium text-danger">{errorMsg}</p>}
          <button
            type="button"
            onClick={handleGenerateStrategy}
            disabled={runStatus === "loading"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-fg shadow-sm hover:bg-primary/95 transition-all active:scale-98 cursor-pointer min-h-[38px] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshIcon className={cn("h-3.5 w-3.5", runStatus === "loading" && "animate-spin")} />
            {runStatus === "loading" ? "Génération en cours…" : "Lancer/actualiser la stratégie"}
          </button>
        </div>
      </div>

      {strategy ? (
        <CommercialStrategyGeneratedContent
          strategy={strategy.data}
          issues={accountIssues}
          offers={offersCatalog}
          isMobile={false}
        />
      ) : (
        <p className="text-xs italic text-muted">
          Aucune stratégie générée pour l&apos;instant.{" "}
          {accountIssues.length === 0
            ? "Cartographie d'abord les enjeux (étape 3) avant de lancer la stratégie."
            : "Lance la génération pour obtenir un premier mapping enjeu↔offre."}
        </p>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap border-t border-border pt-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Angle d&apos;approche</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-heading">Générer un pitch pour {company.name}</h2>
          <p className="mt-1 max-w-xl text-xs text-body">
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
        />
      </div>

      <SectionBlock title="Pitchs déjà générés">
        {pitchDocuments.length === 0 ? (
          <p className="text-xs text-muted">Aucun pitch généré pour ce compte pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2">
            {pitchDocuments.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setOpenDocumentId(doc.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-heading">{doc.title}</p>
                  <p className="text-[11px] text-muted">
                    {doc.kind ? PITCH_KIND_LABEL[doc.kind] : "Pitch"} · {formatPitchDate(doc.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {doc.status === "ready" ? "Prêt" : doc.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </SectionBlock>

      <PitchDocumentDialog documentId={openDocumentId} onOpenChange={(open) => !open && setOpenDocumentId(null)} />
    </div>
  )
}

// ─── Onglet Analyse — sélecteur + raccourcis + sections aérées ───────────────

export type AnalysisTypeKey = "client" | "process"

const ANALYSIS_CATALOG: {
  key: AnalysisTypeKey
  label: string
  subtitle: string
  icon: (p: { className?: string }) => ReactNode
}[] = [
  {
    key: "client",
    label: "Analyse client",
    subtitle: "Portrait stratégique · signaux · contexte business",
    icon: ClientAnalysisIcon,
  },
  {
    key: "process",
    label: "Diagnostic process",
    subtitle: "Activités · frictions · pain points · feuille de route",
    icon: ProcessDiagnosticIcon,
  },
]

export const ANALYSIS_SECTIONS: Record<AnalysisTypeKey, { id: string; label: string; icon: (p: { className?: string }) => ReactNode }[]> = {
  client: [
    { id: "ac-synthese",       label: "Synthèse",       icon: SectionSyntheseIcon },
    { id: "ac-identite",       label: "Identité",        icon: SectionIdentiteIcon },
    { id: "ac-positionnement", label: "Positionnement", icon: SectionPositionnementIcon },
    { id: "ac-signaux",        label: "Signaux",         icon: SectionSignauxIcon },
    { id: "ac-contexte",       label: "Contexte",        icon: SectionContexteIcon },
  ],
  process: [
    { id: "dp-synthese",      label: "Synthèse",      icon: SectionSyntheseIcon },
    { id: "dp-activites",     label: "Activités",      icon: SectionCartographieIcon },
    { id: "dp-frictions",     label: "Frictions",      icon: SectionFrictionsIcon },
    { id: "dp-roadmap",       label: "Feuille de route", icon: SectionRoadmapFDRIcon },
    { id: "dp-matrice",       label: "Matrice impact", icon: SectionMatriceIcon },
  ],
}

type ConnaissanceRunStatus = "idle" | "loading" | "done" | "error"

function AnalyseTab({
  data,
  isExpandedViewer,
  onExpandViewer,
}: {
  data: ClientIntelligenceData
  isExpandedViewer: boolean
  onExpandViewer: (v: boolean) => void
}) {
  const [selected, setSelected] = useState<AnalysisTypeKey | null>(null)
  const { client, diagnostic, diagnosticPdfUrl, company, contacts, opportunities, missions, accountSignals } = data
  const supabase = useMemo(() => createBrowserClient(), [])

  // ADR-0012 Lot 2 — le contenu généré (account_knowledge) démarre avec ce que
  // la page a déjà persisté (run précédent), puis est remplacé en Realtime dès
  // qu'un nouveau run réussit — même pattern que SummaryDrawerContent/PitchMailDrawerContent.
  const [knowledgeContent, setKnowledgeContent] = useState(data.accountKnowledge?.data ?? null)
  const [knowledgeResultId, setKnowledgeResultId] = useState(data.accountKnowledge?.resultId ?? null)
  const [runStatus, setRunStatus] = useState<ConnaissanceRunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return
    const channel = supabase
      .channel(`account-knowledge-result-${runId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_intelligence_results", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as { id: string; status: string; content_json: AccountKnowledgeContent }
          if (row.status === "succeeded") {
            setKnowledgeContent(row.content_json)
            setKnowledgeResultId(row.id)
            setRunStatus("done")
          } else if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  async function handleGenerate() {
    setRunStatus("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-030-account-knowledge",
          entityType: "company",
          entityId: company.id,
          input: {},
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }
      const { runId: newRunId } = (await res.json()) as { runId: string }
      setRunId(newRunId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  function isAvailable(key: AnalysisTypeKey) {
    if (key === "client") return !!client
    return !!diagnostic || !!diagnosticPdfUrl
  }

  function handleSelect(key: AnalysisTypeKey) {
    const next = selected === key ? null : key
    setSelected(next)
    onExpandViewer(next === "process" && !!(diagnostic || diagnosticPdfUrl))
  }

  const activeSections = selected ? ANALYSIS_SECTIONS[selected] : []

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      {/* ── Blocs relationnels — toujours disponibles, sans run n8n (ADR-0012 étape 1) ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <ContactsKeyCard contacts={contacts} />
        <CommercialRelationCard opportunities={opportunities} missions={missions} />
      </div>
      <AccountSignalsCard
        signals={accountSignals}
        isMobile={false}
        companyId={company.id}
        companyName={company.name}
      />

      {/* ── Synthèse générée (account_knowledge, moteur) — quand disponible ── */}
      {knowledgeContent && knowledgeResultId && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
            Synthèse générée (moteur IA)
          </p>
          <AccountKnowledgeGeneratedContent data={knowledgeContent} resultId={knowledgeResultId} />
        </div>
      )}

      {/* ── Sélecteur d'analyse (FOLIO / diagnostic) ─────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Sélectionner une analyse
          </p>
          <div className="flex items-center gap-3">
            {errorMsg && <p className="text-[11px] font-medium text-danger">{errorMsg}</p>}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={runStatus === "loading"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-fg shadow-sm hover:bg-primary/95 transition-all active:scale-98 cursor-pointer min-h-[38px] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshIcon className={cn("h-3.5 w-3.5", runStatus === "loading" && "animate-spin")} />
              {runStatus === "loading" ? "Génération en cours…" : "Lancer/actualiser la connaissance compte"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {ANALYSIS_CATALOG.map((entry) => {
            const available = isAvailable(entry.key)
            const isSelected = selected === entry.key
            const Icon = entry.icon
            return (
              <button
                key={entry.key}
                type="button"
                disabled={!available}
                onClick={() => handleSelect(entry.key)}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition-all duration-200 cursor-pointer min-h-[38px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isSelected
                    ? "border-primary bg-surface"
                    : available
                    ? "border-border bg-surface hover:border-primary/50 hover:bg-surface-hover"
                    : "border-border/40 bg-surface/50 opacity-50 cursor-not-allowed",
                )}
              >
                {isSelected && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full bg-primary"
                  />
                )}
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
                  isSelected
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-canvas/40 text-muted group-hover:border-primary/30 group-hover:text-primary/70",
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={cn(
                  "font-heading text-xs font-bold leading-tight",
                  isSelected ? "text-primary" : "text-heading",
                )}>
                  {entry.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Barre de raccourcis (sticky dans le scroll container de <main>) ─── */}
      {selected && activeSections.length > 0 && (
        <div className="sticky top-0 z-10 -mx-6 border-b border-border/30 bg-canvas/90 px-6 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-x-auto justify-start">
            {activeSections.map((section) => {
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

      {/* ── Contenu de l'analyse sélectionnée ──────────────────────────────── */}
      {selected === "client" && client && (
        <ClientAnalysisContent data={client.data} />
      )}
      {selected === "process" && (diagnostic || diagnosticPdfUrl) && !isExpandedViewer && (
        diagnosticPdfUrl ? (
          <div className="h-[calc(100vh-220px)] min-h-[600px]">
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
                  onClick={() => onExpandViewer(true)}
                  className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-hover px-2.5 py-1 text-[11px] font-semibold text-body hover:text-heading transition-colors cursor-pointer"
                >
                  <ExpandIcon className="h-3 w-3" />
                  Plein écran
                </button>
              }
            />
          </div>
        ) : diagnostic ? (
          <ProcessDiagnosticContent data={diagnostic.data} />
        ) : null
      )}

      {/* État vide global — n'apparaît que si aucun bloc relationnel ni analyse */}
      {!selected && !client && !diagnostic && !knowledgeContent
        && contacts.length === 0 && opportunities.length === 0 && missions.length === 0 && accountSignals.length === 0 && (
        <ComingSoon lot="lot 2">Aucune connaissance disponible pour ce compte</ComingSoon>
      )}
    </div>
  )
}

function renderJsonValue(value: unknown, depth = 0, hasBullet = false): ReactNode {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (value.every(i => typeof i === "string" || typeof i === "number")) {
      return <span>{(value as (string | number)[]).join(", ")}</span>
    }
    return (
      <ul className="space-y-1.5 mt-0.5">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 items-start">
            <svg className="w-2 h-2 text-heading/70 shrink-0 mt-1.5" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
              <polygon points="20,10 80,50 20,90" />
            </svg>
            <span className="flex-1 leading-relaxed">{renderJsonValue(item, depth + 1, true)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === "object") {
    return (
      <div className={depth > 0 ? "space-y-1" : "space-y-2"}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => {
          const lk = k.toLowerCase()
          const isInlineKey = lk.includes("nom") || lk.includes("forces") || lk.includes("faiblesses") || lk.includes("impact") || lk.includes("échéance") || lk.includes("echeance")
          if (isInlineKey) {
            return (
              <div key={k} className="mt-1 first:mt-0 flex items-baseline gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  {!hasBullet && <span className="h-2 w-0.5 rounded-full bg-primary shrink-0" />}
                  <span className="text-[10px] text-heading font-bold uppercase tracking-wider whitespace-nowrap">
                    {k.replace(/_/g, " ")} :
                  </span>
                </div>
                <span className="text-xs text-body leading-relaxed">{renderJsonValue(v, depth + 1, hasBullet)}</span>
              </div>
            )
          }
          return (
            <div key={k} className="mt-3.5 first:mt-0">
              <div className="flex items-center gap-1.5 mb-2.5">
                {!hasBullet && <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />}
                <span className="text-[10px] text-heading font-bold uppercase tracking-wider">
                  {k.replace(/_/g, " ")}
                </span>
              </div>
              <div className="leading-relaxed">{renderJsonValue(v, depth + 1, hasBullet)}</div>
            </div>
          )
        })}
      </div>
    )
  }
  return String(value)
}



// ─── Wrapper de section aérée (cockpit-reading) ──────────────────────────────

function AnalysisSection({
  id,
  icon,
  label,
  description,
  children,
}: {
  id: string
  icon: ReactNode
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="cockpit-reading overflow-hidden rounded-xl border border-border scroll-mt-14"
    >
      {/* En-tête de section */}
      <div className="flex items-center gap-4 border-b border-border bg-primary px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
          {icon}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            {label}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-white/80 font-medium">{description}</p>
          )}
        </div>
      </div>
      {/* Contenu */}
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

// ─── Analyse client — sections ────────────────────────────────────────────────

export function ClientAnalysisContent({ data }: { data: AnalyseClient }) {
  return (
    <div className="space-y-6">
      {data.synthese && (
        <AnalysisSection
          id="ac-synthese"
          icon={<SectionSyntheseIcon className="h-5 w-5" />}
          label="Synthèse exécutive"
          description="Vue d'ensemble stratégique du compte"
        >
          <p className="text-sm leading-relaxed text-body whitespace-pre-line">{data.synthese}</p>
        </AnalysisSection>
      )}

      {Object.keys(data.identite).length > 0 && (
        <AnalysisSection
          id="ac-identite"
          icon={<SectionIdentiteIcon className="h-5 w-5" />}
          label="Identité & chiffres clés"
          description="Données factuelles et métriques essentielles"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.identite).map(([key, value]) => (
              <Field key={key} label={key.replace(/_/g, " ")} value={value} />
            ))}
          </div>
        </AnalysisSection>
      )}

      {Object.keys(data.positionnement).length > 0 && (
        <AnalysisSection
          id="ac-positionnement"
          icon={<SectionPositionnementIcon className="h-5 w-5" />}
          label="Positionnement"
          description="Stratégie, différenciation et axes de développement"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.positionnement).map(([key, value]) => (
              <Field key={key} label={key.replace(/_/g, " ")} value={value} />
            ))}
          </div>
        </AnalysisSection>
      )}

      {(data.signaux.tendanceCroissance || data.signaux.maturiteDigitale || data.signaux.recrutementsRecents) && (
        <AnalysisSection
          id="ac-signaux"
          icon={<SectionSignauxIcon className="h-5 w-5" />}
          label="Signaux & dynamiques"
          description="Tendances de croissance, maturité digitale et recrutements"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {data.signaux.tendanceCroissance && (
              <Field label="Tendance de croissance" value={data.signaux.tendanceCroissance} />
            )}
            {data.signaux.maturiteDigitale && (
              <Field label="Maturité digitale" value={data.signaux.maturiteDigitale} />
            )}
            {data.signaux.recrutementsRecents && (
              <Field label="Recrutements récents" value={data.signaux.recrutementsRecents} />
            )}
          </div>
        </AnalysisSection>
      )}

      {(data.contexteSectoriel.tendances || data.contexteSectoriel.concurrents.length > 0) && (
        <AnalysisSection
          id="ac-contexte"
          icon={<SectionContexteIcon className="h-5 w-5" />}
          label="Contexte sectoriel"
          description="Tendances de marché et paysage concurrentiel"
        >
          {data.contexteSectoriel.tendances && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-heading">
                  Tendances
                </span>
              </div>
              <p className="text-xs leading-relaxed text-body">{data.contexteSectoriel.tendances}</p>
            </div>
          )}
          {data.contexteSectoriel.concurrents.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-heading">
                  Concurrents identifiés
                </span>
              </div>
              <TagList items={data.contexteSectoriel.concurrents} />
            </div>
          )}
        </AnalysisSection>
      )}
    </div>
  )
}

// ─── Étude sectorielle — sections ─────────────────────────────────────────────

export function SectorAnalysisContent({ data }: { data: AnalyseSector }) {
  return (
    <div className="space-y-6">
      <AnalysisSection
        id="se-synthese"
        icon={<SectionSyntheseIcon className="h-5 w-5" />}
        label="Synthèse sectorielle"
        description="Vue stratégique du secteur d'activité"
      >
        <p className="text-sm leading-relaxed text-body whitespace-pre-line">{data.synthese}</p>
      </AnalysisSection>

      {!!data.volumeMarche && (
        <AnalysisSection
          id="se-marche"
          icon={<SectionMarcheIcon className="h-5 w-5" />}
          label="Volume de marché"
          description="Taille, croissance et dynamiques du marché"
        >
          <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.volumeMarche)}</div>
        </AnalysisSection>
      )}

      {!!data.segmentClientele && (
        <AnalysisSection
          id="se-segments"
          icon={<SectionSegmentsIcon className="h-5 w-5" />}
          label="Segments clients"
          description="Découpage et caractéristiques des segments cibles"
        >
          <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.segmentClientele)}</div>
        </AnalysisSection>
      )}

      {!!data.acteursCles && (
        <AnalysisSection
          id="se-acteurs"
          icon={<SectionActeursIcon className="h-5 w-5" />}
          label="Acteurs clés"
          description="Leaders, challengers et acteurs émergents"
        >
          {Array.isArray(data.acteursCles) && (data.acteursCles as unknown[]).every((a) => typeof a === "string") ? (
            <div className="flex flex-wrap gap-2">
              {(data.acteursCles as string[]).map((actor, idx) => (
                <span key={idx} className="rounded-full border border-border bg-canvas/50 px-3 py-1 text-[11px] font-medium text-body">
                  {actor}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.acteursCles)}</div>
          )}
        </AnalysisSection>
      )}

      {!!data.analyseConcurrentielle && (
        <AnalysisSection
          id="se-concurrence"
          icon={<SectionConcurrenceIcon className="h-5 w-5" />}
          label="Analyse concurrentielle"
          description="Forces en présence et dynamiques compétitives"
        >
          <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.analyseConcurrentielle)}</div>
        </AnalysisSection>
      )}

      {!!data.environnementNormatif && (
        <AnalysisSection
          id="se-normatif"
          icon={<SectionNormatifIcon className="h-5 w-5" />}
          label="Environnement normatif"
          description="Cadre réglementaire, normes et conformité"
        >
          <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.environnementNormatif)}</div>
        </AnalysisSection>
      )}
    </div>
  )
}

// ─── Diagnostic process — sections ───────────────────────────────────────────

export function ProcessDiagnosticContent({ data }: { data: AnalyseDiagnostic }) {
  return (
    <div className="space-y-6">
      <AnalysisSection
        id="dp-synthese"
        icon={<SectionSyntheseIcon className="h-5 w-5" />}
        label="Synthèse exécutive"
        description="Vue d'ensemble du diagnostic opérationnel"
      >
        <p className="text-sm leading-relaxed text-body whitespace-pre-line">{data.synthese}</p>
      </AnalysisSection>

      {!!data.cartographieActivites && (
        <AnalysisSection
          id="dp-activites"
          icon={<SectionCartographieIcon className="h-5 w-5" />}
          label="Cartographie des activités"
          description="Répartition du temps par fonction et activité opérationnelle"
        >
          <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.cartographieActivites)}</div>
        </AnalysisSection>
      )}

      {!!data.frictions && (
        <AnalysisSection
          id="dp-frictions"
          icon={<SectionFrictionsIcon className="h-5 w-5" />}
          label="Frictions & pain points"
          description="Frictions systémiques, par fonction et goulots d'étranglement"
        >
          <div className="space-y-4">
            {!!data.frictions.systemiques && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-heading">Frictions systémiques transverses</span>
                </div>
                <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.frictions.systemiques)}</div>
              </div>
            )}
            {!!data.frictions.parFonction && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-heading">Par fonction</span>
                </div>
                <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.frictions.parFonction)}</div>
              </div>
            )}
            {!!data.frictions.goulots && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-heading">Zones grises & goulots</span>
                </div>
                <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.frictions.goulots)}</div>
              </div>
            )}
          </div>
        </AnalysisSection>
      )}

      {!!data.feuilleDeRoute && (
        <AnalysisSection
          id="dp-roadmap"
          icon={<SectionRoadmapFDRIcon className="h-5 w-5" />}
          label="Feuille de route d'optimisation"
          description="Quick Wins · Projets structurants · Transformations profondes"
        >
          <div className="space-y-4">
            {!!data.feuilleDeRoute.quickWins && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="h-2.5 w-0.5 rounded-full bg-success shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-heading">Quick Wins — 0 à 3 mois</span>
                </div>
                <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.feuilleDeRoute.quickWins)}</div>
              </div>
            )}
            {!!data.feuilleDeRoute.projetsStructurants && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="h-2.5 w-0.5 rounded-full bg-warning shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-heading">Projets structurants — 3 à 12 mois</span>
                </div>
                <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.feuilleDeRoute.projetsStructurants)}</div>
              </div>
            )}
            {!!data.feuilleDeRoute.transformationsProfonde && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-heading">Transformations profondes — 12 à 24 mois</span>
                </div>
                <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.feuilleDeRoute.transformationsProfonde)}</div>
              </div>
            )}
          </div>
        </AnalysisSection>
      )}

      {!!data.matriceImpact && (
        <AnalysisSection
          id="dp-matrice"
          icon={<SectionMatriceIcon className="h-5 w-5" />}
          label="Matrice d'impact et priorisation"
          description="Classement des actions par impact et effort"
        >
          <div className="text-xs leading-relaxed text-body">{renderJsonValue(data.matriceImpact)}</div>
        </AnalysisSection>
      )}
    </div>
  )
}

// ─── Icônes — sélecteur d'analyses ───────────────────────────────────────────

export function ClientAnalysisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function SectorStudyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

// ─── Icônes — sections d'analyse ─────────────────────────────────────────────

function SectionSyntheseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

function SectionIdentiteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function SectionPositionnementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function SectionSignauxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function SectionContexteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function SectionMarcheIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function SectionSegmentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SectionActeursIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4" r="2" />
      <line x1="12" y1="6" x2="12" y2="11" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <line x1="12" y1="11" x2="5" y2="16" />
      <line x1="12" y1="11" x2="19" y2="16" />
    </svg>
  )
}

function SectionConcurrenceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SectionNormatifIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21" />
      <path d="M5 6l-1.5 3a3 3 0 0 0 6 0L8 6" />
      <path d="M19 6l-1.5 3a3 3 0 0 0 6 0L22 6" />
      <line x1="5" y1="6" x2="19" y2="6" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  )
}

function AnalyseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="13" r="2" />
      <path d="m16 19-3.5-3.5" />
    </svg>
  )
}

function IssuesMapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function StrategyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function RoadmapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

const STEP_ICONS: Record<ProcessStepKey, (props: { className?: string }) => ReactNode> = {
  connaissance: AnalyseIcon,
  secteur: SectorStudyIcon,
  enjeux: IssuesMapIcon,
  strategie: StrategyIcon,
  roadmap: RoadmapIcon,
}

export function ProcessDiagnosticIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
    </svg>
  )
}

function SectionCartographieIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function SectionFrictionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function SectionRoadmapFDRIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function SectionMatriceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

// ─── Actions Rapides du Header ──────────────────────────────────────────────

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

export function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

export function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  )
}
