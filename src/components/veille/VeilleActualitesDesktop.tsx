"use client"

import {useMemo, useRef, useState, useEffect} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { Button } from "@/components/ui/Button"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import { formatDateFr } from "@/lib/formatters"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import { cn } from "@/lib/utils"
import type {
  CompanyContextStats,
  SectorEvent,
  SectorNews,
  VeilleArticle,
  VeilleDigest,
  WatchedAccountSignal,
} from "@/app/(app)/veille/_data/veille-data"
import {
  CreateAccountNoteDialog,
  CreateOpportunityDialog,
  QualifySignalDialog,
} from "./SignalDialogs"
import { VeilleHeaderActions } from "./VeilleHeaderActions"
import { VeilleLocalNavigation } from "./VeilleLocalNavigation"
import { extractMatchedCompany, getRelativeTimeFr } from "./veille-utils"
import {
  MONTHLY_WATCH_WORKFLOW_ID,
  getSecondaryItems,
  type GlobalWatchSettings,
  type GlobalWatchWorkflowHealth,
  type MonthlyWatchGenerationContext,
  type StrategicWatchAnalysis,
  type VeilleSection,
} from "./veille-desktop-contracts"

interface VeilleActualitesDesktopProps {
  digest: VeilleDigest | null
  articles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
  companies: CompanyContextStats[]
  watchedSignals: WatchedAccountSignal[]
  watchedCompanyIds: string[]
  globalWatchSettings: GlobalWatchSettings
  globalWatchHealth: GlobalWatchWorkflowHealth
  latestAnalysis: StrategicWatchAnalysis | null
  analysisHistory: StrategicWatchAnalysis[]
  monthlyGeneration: MonthlyWatchGenerationContext
}

const FILTERS = ["Tous", "Comptes", "Réglementaire", "Nominations", "Marché"] as const

function confidenceLabel(rank: number) {
  return rank <= 2 ? "élevée" : rank <= 4 ? "moyenne" : "faible"
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start || !end) return "Période non renseignée"
  return `${formatDateFr(start)} — ${formatDateFr(end)}`
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface px-6 py-12 text-center">
      <h2 className="font-heading text-base font-bold text-heading">{title}</h2>
      <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-body">{children}</div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-border pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-heading">
      {children}
    </h2>
  )
}

function NewsFilters({
  search,
  onSearch,
  selectedFilter,
  onFilter,
}: {
  search: string
  onSearch: (value: string) => void
  selectedFilter: typeof FILTERS[number]
  onFilter: (value: typeof FILTERS[number]) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-border bg-surface px-3 py-2.5" aria-label="Filtres des actualités">
      <label className="relative min-w-[15rem] flex-1">
        <span className="sr-only">Rechercher un article</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Rechercher un signal, un secteur, une source…"
          className="h-9 w-full border border-border bg-canvas/40 px-3 text-xs text-heading outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-heading"
        />
      </label>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Catégorie">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={selectedFilter === filter}
            onClick={() => onFilter(filter)}
            className={cn(
              "min-h-9 border px-3 text-[10px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
              selectedFilter === filter
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-body hover:bg-surface-hover",
            )}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditorialArticle({ article, headingRef }: { article: VeilleArticle; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <article className="border border-border bg-edito-canvas/80 p-3 sm:p-4">
      <div className="paper-sheet border border-border/80 bg-surface px-8 py-9 lg:px-12 lg:py-11">
        <div className="mx-auto max-w-[74ch]">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-brass">{article.categorie || "Actualité"}</p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-3 font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-heading outline-none focus-visible:ring-2 focus-visible:ring-heading">
            {article.titre_fr}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>{getRelativeTimeFr(article.published_at)}</span><span aria-hidden="true">·</span>
            <span>Confiance {confidenceLabel(article.selection_rank)}</span><span aria-hidden="true">·</span>
            <span>via {article.source_name}</span>
          </div>
          <p className="mt-8 text-[15px] leading-[1.72] text-body">{article.resume}</p>

          {article.analyse_kredo ? (
            <section className="mt-9 border-t border-border pt-6">
              <h3 className="flex items-center gap-2 font-heading text-[15px] font-bold text-heading">
                <IntelligenceIcon name="recommendations" preferVector className="size-4 text-brand-brass" />
                Pourquoi c’est important
              </h3>
              <p className="mt-3 text-[14px] leading-[1.72] text-body">{article.analyse_kredo}</p>
            </section>
          ) : null}

          {article.action_commerciale ? (
            <section className="mt-7 border-t border-border pt-6">
              <h3 className="flex items-center gap-2 font-heading text-[15px] font-bold text-heading">
                <IntelligenceIcon name="generate_pitch" preferVector className="size-4 text-primary" />
                Lecture commerciale
              </h3>
              <p className="mt-3 text-[14px] leading-[1.72] text-body">{article.action_commerciale}</p>
            </section>
          ) : null}

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => <span key={tag} className="border border-border bg-edito-chip px-2 py-1 text-[9px] text-body">#{tag}</span>)}
            </div>
            {article.url ? (
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-heading">
                Lire la source <span className="sr-only">(nouvel onglet)</span>
              </a>
            ) : null}
          </footer>
        </div>
      </div>
    </article>
  )
}

function ArticleRail({
  company,
  watched,
  onPitch,
  onNote,
  onQualify,
  onOpportunity,
}: {
  company: CompanyContextStats | null
  watched: boolean
  onPitch: () => void
  onNote: () => void
  onQualify: () => void
  onOpportunity: () => void
}) {
  const actions = [
    { label: "Créer une note compte", icon: "write_email" as const, onClick: onNote },
    { label: "Qualifier le signal", icon: "prioritize" as const, onClick: onQualify },
    { label: "Transformer en opportunité", icon: "detect_risks" as const, onClick: onOpportunity },
  ]
  return (
    <aside className="border border-border bg-edito-canvas/55">
      <section className="p-4">
        <SectionHeading>Actions recommandées</SectionHeading>
        <div className="mt-3 space-y-2">
          <Button variant="brass" size="sm" fullWidth onClick={onPitch} leftIcon={<IntelligenceIcon name="generate_pitch" preferVector />} className="justify-between">
            Générer un pitch
          </Button>
          {actions.map((action) => (
            <Button key={action.label} variant="secondary" size="sm" fullWidth onClick={action.onClick} leftIcon={<IntelligenceIcon name={action.icon} preferVector />} className="justify-start">
              {action.label}
            </Button>
          ))}
        </div>
      </section>
      <section className="border-t border-border p-4">
        <SectionHeading>Contexte mobilisable</SectionHeading>
        <dl className="mt-3 divide-y divide-border text-[11px]">
          <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-muted">Fiche compte</dt><dd className={cn("font-bold", company ? "text-success" : "text-danger")}>{company ? company.name : "Non détecté"}</dd></div>
          <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-muted">Interactions</dt><dd className="font-bold text-heading">{company?.interactionsCount ?? "—"}</dd></div>
          <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-muted">Contacts clés</dt><dd className="font-bold text-heading">{company?.contactsCount ?? "—"}</dd></div>
          <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-muted">Analyses liées</dt><dd className="font-bold text-heading">{company?.docsCount ?? "—"}</dd></div>
          <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-muted">Statut de veille</dt><dd className="font-bold text-heading">{company ? (watched ? "Surveillé" : "Non surveillé") : "—"}</dd></div>
        </dl>
        {company ? <Link href={`/prospection/accounts?drawer=${company.id}`} className="mt-3 block border border-border bg-surface px-3 py-2 text-center text-[11px] font-bold text-primary hover:bg-surface-hover">Voir le compte</Link> : null}
      </section>
    </aside>
  )
}

function OtherArticles({ articles, selectedId, onSelect }: { articles: VeilleArticle[]; selectedId: string; onSelect: (article: VeilleArticle) => void }) {
  const others = getSecondaryItems(articles, selectedId, 3)
  return (
    <section className="mt-7">
      <SectionHeading>Autres articles de la semaine</SectionHeading>
      {others.length === 0 ? <p className="mt-4 text-xs text-muted">Aucun autre article ne correspond aux filtres.</p> : (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {others.map((article) => (
            <button key={article.id} type="button" onClick={() => onSelect(article)} className="min-h-[8rem] border border-border bg-surface p-4 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-heading">
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary">{article.categorie || article.source_name}</span>
              <span className="mt-2 block text-[13px] font-bold leading-5 text-heading line-clamp-3">{article.titre_fr}</span>
              <span className="mt-3 block text-[10px] text-muted">{article.source_name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function WatchedAccountsSection({ signals }: { signals: WatchedAccountSignal[] }) {
  const [selected, setSelected] = useState(signals[0] ?? null)
  if (!selected) return <EmptyState title="Aucun signal de compte surveillé"><p>Les signaux apparaîtront ici après une collecte de veille compte.</p></EmptyState>
  return (
    <div className="grid grid-cols-[18rem_minmax(0,1fr)] border border-border bg-surface">
      <section className="border-r border-border bg-edito-canvas/50 p-3">
        <SectionHeading>Signaux détectés ({signals.length})</SectionHeading>
        <div className="mt-3 max-h-[calc(100dvh-13rem)] space-y-2 overflow-y-auto veille-scrollbar">
          {signals.map((signal) => (
            <button key={signal.id} type="button" onClick={() => setSelected(signal)} aria-pressed={selected.id === signal.id} className={cn("w-full border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading", selected.id === signal.id ? "border-brand-brass bg-primary/[0.05]" : "border-border bg-surface hover:bg-surface-hover")}>
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary">{signal.category}</span>
              <span className="mt-1 block text-xs font-bold leading-5 text-heading">{signal.title}</span>
              <span className="mt-2 flex justify-between text-[10px] text-muted"><span>{signal.company.name}</span><span>{Math.round(signal.globalScore * 100)}%</span></span>
            </button>
          ))}
        </div>
      </section>
      <article className="paper-sheet px-8 py-8 lg:px-12">
        <div className="flex items-start justify-between gap-5 border-b border-border pb-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary">{selected.category} · {selected.type}</p><p className="mt-1 text-[11px] text-muted">Détecté le {formatDateFr(selected.detectedAt)}</p></div>
          <div className="flex items-center gap-2 border border-border bg-edito-canvas/60 px-3 py-2"><CompanyLogo name={selected.company.name} logoPath={selected.company.logoPath} website={selected.company.website} size="md" /><span className="text-xs font-bold text-heading">{selected.company.name}</span></div>
        </div>
        <h2 className="mt-7 max-w-[32ch] font-heading text-2xl font-bold leading-tight text-heading">{selected.title}</h2>
        <p className="mt-5 max-w-[74ch] whitespace-pre-wrap text-sm leading-7 text-body">{selected.summary || "Aucune synthèse disponible."}</p>
        {selected.recommendedAction ? <section className="mt-7 border-y border-border py-5"><h3 className="text-sm font-bold text-heading">Action recommandée</h3><p className="mt-2 text-sm leading-6 text-body">{selected.recommendedAction}</p></section> : null}
        <dl className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border py-4 text-center">
          <div><dt className="text-[9px] font-bold uppercase text-muted">Score global</dt><dd className="mt-1 text-lg font-bold text-heading">{Math.round(selected.globalScore * 100)}%</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-muted">Urgence</dt><dd className="mt-1 text-lg font-bold text-heading">{Math.round(selected.urgencyScore * 100)}%</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-muted">Confiance</dt><dd className="mt-1 text-lg font-bold text-heading">{Math.round(selected.confidenceScore * 100)}%</dd></div>
        </dl>
        <div className="mt-6 flex items-center justify-between gap-3">
          {selected.primarySource?.source_url ? <a href={selected.primarySource.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">Ouvrir la source <span className="sr-only">(nouvel onglet)</span></a> : <span />}
          <ContextualCommunicationButton intent="signal_outreach" origin="veille_signal" companyId={selected.company.id} companyName={selected.company.name} signalId={selected.id} refs={{ signalRef: selected.id }} label="Rédiger" variant="primary" className="h-10 border border-primary bg-primary px-4 text-xs font-bold text-primary-fg hover:bg-primary-deep" />
        </div>
      </article>
    </div>
  )
}

function StrategicAnalysisSection({
  analysis,
  generation,
}: {
  analysis: StrategicWatchAnalysis | null
  generation: MonthlyWatchGenerationContext
}) {
  const router = useRouter()
  const [run, setRun] = useState(generation.latestRun)
  const [pending, setPending] = useState(Boolean(generation.activeRun))
  const [error, setError] = useState<string | null>(generation.latestRun?.status === "failed" ? generation.latestRun.errorMessage : null)

  // Suivi unifié (src/lib/n8n/use-run-tracker) : Realtime en accélérateur,
  // relance périodique en garantie. L'abonnement précédent dépendait de `run`
  // tout en le mettant à jour — il se détruisait et se recréait à chaque
  // événement reçu, avec une fenêtre d'événements perdus entre les deux.
  const trackedRunId = run && (run.status === "queued" || run.status === "running") ? run.id : null

  useRunTracker({
    runId: trackedRunId,
    withResult: false,
    onSucceeded: () => {
      setRun((current) => (current ? { ...current, status: "succeeded" } : current))
      setPending(false)
      setError(null)
      router.refresh()
    },
    onFailed: (message) => {
      setRun((current) => (current ? { ...current, status: "failed", errorMessage: message } : current))
      setPending(false)
      setError(message)
      router.refresh()
    },
    onTimeout: () => {
      setPending(false)
    },
    onRunning: () => {
      setRun((current) => (current ? { ...current, status: "running" } : current))
    },
  })

  const generate = async () => {
    setPending(true)
    setError(null)
    const response = await fetch("/api/n8n/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workflowId: MONTHLY_WATCH_WORKFLOW_ID,
        entityType: "workspace",
        input: { ...generation.input, requestedAt: new Date().toISOString(), triggerMode: "manual" },
      }),
    })
    const payload = await response.json() as { runId?: string; error?: string }
    if (!response.ok || !payload.runId) {
      setPending(false)
      setError(payload.error ?? "Impossible de lancer l’analyse.")
      return
    }
    setRun({ id: payload.runId, status: "queued", createdAt: new Date().toISOString(), errorMessage: null })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary">Mois civil précédent</p>
          <h2 className="mt-1 font-heading text-xl font-bold text-heading">Analyse stratégique de {generation.input.periodStart.slice(0, 7)}</h2>
          <p className="mt-1 text-xs text-muted">{generation.input.digestIds.length} digest(s) · {generation.input.articleIds.length} article(s) collectés</p>
        </div>
        <Button variant="brass" onClick={generate} loading={pending} loadingLabel="Génération" disabled={generation.input.articleIds.length === 0}>
          {generation.isAlreadyCovered ? "Régénérer l’analyse" : "Générer l’analyse du mois écoulé"}
        </Button>
      </div>

      {pending ? (
        <div aria-live="polite" className="border border-brand-brass/35 bg-brand-brass/[0.06] p-4 text-sm text-heading">
          <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-brand-brass/30 border-t-brand-brass align-[-1px] motion-reduce:animate-none" aria-hidden="true" />
          Analyse en cours. Le rapport sera ajouté à la bibliothèque après le callback.
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 border border-danger/30 bg-danger/[0.04] p-4 text-sm text-danger">
          <span>{error}</span>
          <Link href={run ? `/automations?run=${run.id}` : "/automations"} className="font-bold underline">Voir le run</Link>
        </div>
      ) : null}

      {analysis ? (
        <article className="grid grid-cols-[minmax(0,1fr)_15rem] border border-border bg-surface">
          <div className="paper-sheet px-8 py-9 lg:px-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-brass">Dernier rapport disponible</p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-heading">{analysis.title}</h3>
            <p className="mt-2 text-xs text-muted">{formatPeriod(analysis.periodStart, analysis.periodEnd)} · généré le {formatDateFr(analysis.updatedAt)}</p>
            <p className="mt-7 max-w-[74ch] text-[15px] leading-7 text-body">
              {analysis.content?.executiveSummary ?? "Le document est disponible dans la bibliothèque de rapports."}
            </p>
            <Button variant="secondary" className="mt-7" onClick={() => router.push(`/reports?doc=${analysis.id}`)}>Ouvrir le rapport complet</Button>
          </div>
          <aside className="border-l border-border bg-edito-canvas/55 p-5">
            <SectionHeading>Fiche du rapport</SectionHeading>
            <dl className="mt-3 divide-y divide-border text-[11px]">
              <div className="flex justify-between py-2.5"><dt className="text-muted">État</dt><dd className="font-bold text-success">{analysis.status}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-muted">Version</dt><dd className="font-bold text-heading">v{analysis.versionNumber}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-muted">Digests</dt><dd className="font-bold text-heading">{analysis.content?.coverage.digestsCount ?? "—"}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-muted">Articles</dt><dd className="font-bold text-heading">{analysis.content?.coverage.articlesCount ?? "—"}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-muted">Sources</dt><dd className="font-bold text-heading">{analysis.content?.coverage.sourcesCount ?? "—"}</dd></div>
            </dl>
          </aside>
        </article>
      ) : (
        <EmptyState title="Aucune analyse stratégique disponible">
          <p>La première synthèse mensuelle utilisera uniquement les digests et articles déjà collectés sur le mois civil précédent.</p>
        </EmptyState>
      )}
    </div>
  )
}

function HistorySection({ digests, analyses }: { digests: VeilleDigest[]; analyses: StrategicWatchAnalysis[] }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <section>
        <SectionHeading>Digests de veille</SectionHeading>
        <div className="mt-3 divide-y divide-border border border-border bg-surface">
          {digests.length === 0 ? <p className="p-5 text-xs text-muted">Aucun digest disponible.</p> : digests.map((digest) => (
            <Link key={digest.id} href={`/veille?digestId=${digest.id}`} className="block p-4 transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-heading">
              <p className="text-[10px] text-muted">{formatDateFr(digest.digest_date)}</p>
              <h3 className="mt-1 text-sm font-bold text-heading">{digest.titre_digest}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-body">{digest.super_short_summary || digest.resume_hebdo}</p>
              <p className="mt-2 text-[10px] text-muted">{digest.nb_sources_actives} sources · {digest.nb_candidats_evalues} candidats évalués</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <SectionHeading>Analyses stratégiques</SectionHeading>
        <div className="mt-3 divide-y divide-border border border-border bg-surface">
          {analyses.length === 0 ? <p className="p-5 text-xs text-muted">Aucune analyse disponible.</p> : analyses.map((analysis) => (
            <Link key={analysis.id} href={`/reports?doc=${analysis.id}`} className="block p-4 transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-heading">
              <p className="text-[10px] text-muted">{formatPeriod(analysis.periodStart, analysis.periodEnd)}</p>
              <h3 className="mt-1 text-sm font-bold text-heading">{analysis.title}</h3>
              <p className="mt-2 text-[10px] text-muted">v{analysis.versionNumber} · {analysis.status} · {formatDateFr(analysis.updatedAt)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function NewsFallback({ news, events }: { news: SectorNews[]; events: SectorEvent[] }) {
  return (
    <div className="space-y-5">
      <EmptyState title="Aucun digest de veille disponible"><p>Le lecteur s’activera dès que le workflow global aura produit un digest.</p></EmptyState>
      {news.length > 0 || events.length > 0 ? (
        <div className="grid grid-cols-2 gap-5">
          <section className="border border-border bg-surface p-4"><SectionHeading>Actualités sectorielles récentes</SectionHeading><div className="mt-3 divide-y divide-border">{news.map((item) => <div key={item.id} className="py-3"><p className="text-[10px] text-muted">{formatDateFr(item.published_at)}</p><p className="mt-1 text-xs font-bold text-heading">{item.title}</p></div>)}</div></section>
          <section className="border border-border bg-surface p-4"><SectionHeading>Événements déclencheurs</SectionHeading><div className="mt-3 divide-y divide-border">{events.map((item) => <div key={item.id} className="py-3"><p className="text-[10px] text-muted">{formatDateFr(item.event_date)}</p><p className="mt-1 text-xs font-bold text-heading">{item.title}</p></div>)}</div></section>
        </div>
      ) : null}
    </div>
  )
}

export function VeilleActualitesDesktop({
  digest,
  articles: initialArticles,
  pastDigests,
  sectorNews,
  sectorEvents,
  companies,
  watchedSignals,
  watchedCompanyIds,
  globalWatchSettings,
  globalWatchHealth,
  latestAnalysis,
  analysisHistory,
  monthlyGeneration,
}: VeilleActualitesDesktopProps) {
  const [section, setSection] = useState<VeilleSection>("news")
  const [articles, setArticles] = useState(initialArticles)
  const [selectedArticle, setSelectedArticle] = useState(initialArticles[0] ?? null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tous")
  const [noteOpen, setNoteOpen] = useState(false)
  const [qualifyOpen, setQualifyOpen] = useState(false)
  const [opportunityOpen, setOpportunityOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Repli automatique de la sidebar principale
  useEffect(() => {
    useSidebarCollapse.getState().requestCollapse()
    return () => useSidebarCollapse.getState().requestRestore()
  }, [])

  const filteredArticles = useMemo(() => articles.filter((article) => {
    const haystack = `${article.titre_fr} ${article.resume} ${article.secteur_principal} ${article.source_name}`.toLocaleLowerCase("fr")
    if (!haystack.includes(search.trim().toLocaleLowerCase("fr"))) return false
    if (filter === "Tous") return true
    if (filter === "Comptes") return Boolean(extractMatchedCompany(article.titre_fr, article.resume, companies))
    const category = article.categorie.toLocaleLowerCase("fr")
    if (filter === "Réglementaire") return category.includes("réglement")
    if (filter === "Nominations") return category.includes("nominat")
    return category.includes("marché") || category.includes("invest")
  }), [articles, companies, filter, search])

  const matchedCompany = selectedArticle ? extractMatchedCompany(selectedArticle.titre_fr, selectedArticle.resume, companies) : null
  const watched = Boolean(matchedCompany && watchedCompanyIds.includes(matchedCompany.id))

  const selectArticle = (article: VeilleArticle) => {
    setSelectedArticle(article)
    window.requestAnimationFrame(() => {
      headingRef.current?.focus()
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const pitch = () => {
    if (!selectedArticle) return
    const mustInclude = [
      `Signal : ${selectedArticle.titre_fr}`,
      `Source : ${selectedArticle.source_name}`,
      `Résumé : ${selectedArticle.resume}`,
      selectedArticle.analyse_kredo ? `Analyse KREDO : ${selectedArticle.analyse_kredo}` : null,
      selectedArticle.action_commerciale ? `Action commerciale proposée : ${selectedArticle.action_commerciale}` : null,
    ].filter(Boolean).join("\n")
    const preset = buildCommunicationEntryPreset("signal_outreach", {
      origin: "veille_signal",
      companyId: matchedCompany?.id ?? null,
      companyName: matchedCompany?.name ?? null,
      signalId: selectedArticle.id,
      sectorName: selectedArticle.secteur_principal || selectedArticle.categorie,
      mustInclude,
    })
    if (preset.ok) openCommunicationComposer(preset.request)
  }

  const requireCompany = (action: () => void) => {
    if (matchedCompany) action()
    else setMessage("Aucun compte n’est détecté pour ce signal. Qualifiez-le avant cette action.")
  }

  const content = section === "watched-accounts"
    ? <WatchedAccountsSection signals={watchedSignals} />
    : section === "strategic-analysis"
      ? <StrategicAnalysisSection analysis={latestAnalysis} generation={monthlyGeneration} />
      : section === "history"
        ? <HistorySection digests={pastDigests} analyses={analysisHistory} />
        : selectedArticle
          ? (
              <>
                <NewsFilters search={search} onSearch={setSearch} selectedFilter={filter} onFilter={setFilter} />
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_18rem] items-start gap-4">
                  <EditorialArticle article={selectedArticle} headingRef={headingRef} />
                  <ArticleRail
                    company={matchedCompany}
                    watched={watched}
                    onPitch={pitch}
                    onNote={() => requireCompany(() => setNoteOpen(true))}
                    onQualify={() => setQualifyOpen(true)}
                    onOpportunity={() => requireCompany(() => setOpportunityOpen(true))}
                  />
                </div>
                <OtherArticles articles={filteredArticles} selectedId={selectedArticle.id} onSelect={selectArticle} />
              </>
            )
          : <NewsFallback news={sectorNews} events={sectorEvents} />

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body">
      <VeilleLocalNavigation active={section} onChange={setSection} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-heading">Veille & actualités</h1>
          <VeilleHeaderActions initialSettings={globalWatchSettings} initialHealth={globalWatchHealth} latestDigest={pastDigests[0] ?? digest} />
        </header>
        <main className="veille-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1480px] px-6 py-6">{content}</div>
        </main>
      </div>

      {message ? <div role="status" className="fixed bottom-5 right-5 z-50 max-w-sm border border-border bg-heading px-4 py-3 text-xs font-semibold text-primary-fg"><button type="button" onClick={() => setMessage(null)} className="mr-3 underline" aria-label="Fermer">Fermer</button>{message}</div> : null}
      {selectedArticle ? (
        <>
          <QualifySignalDialog open={qualifyOpen} onOpenChange={setQualifyOpen} article={selectedArticle} onSuccess={(updated) => { setArticles((current) => current.map((article) => article.id === updated.id ? updated : article)); setSelectedArticle(updated); setMessage("Signal qualifié et mis à jour.") }} />
          {matchedCompany ? (
            <>
              <CreateAccountNoteDialog open={noteOpen} onOpenChange={setNoteOpen} companyId={matchedCompany.id} companyName={matchedCompany.name} signalTitle={selectedArticle.titre_fr} onSuccess={() => setMessage(`Note ajoutée pour ${matchedCompany.name}.`)} />
              <CreateOpportunityDialog open={opportunityOpen} onOpenChange={setOpportunityOpen} companyId={matchedCompany.id} companyName={matchedCompany.name} signalTitle={selectedArticle.titre_fr} onSuccess={() => setMessage(`Opportunité créée pour ${matchedCompany.name}.`)} />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
