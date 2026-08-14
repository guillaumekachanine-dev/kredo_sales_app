"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { AccountSignalDesktopActions } from "@/components/accounts-contacts/intelligence/AccountSignalDesktopActions"
import { AccountWatchHeaderActions } from "@/components/accounts-contacts/intelligence/AccountWatchHeaderActions"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import type { IntelligenceIconKey } from "@/lib/intelligence/intelligence-registry"
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
  AddToListExplanationDialog,
  CreateAccountNoteDialog,
  CreateCommercialWindowDialog,
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
  digestNumber: number | null
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

export function getCategoryColorClass(category?: string) {
  if (!category) return "text-primary"
  const lower = category.toLowerCase()
  if (lower.includes("réglement")) return "text-danger"
  if (lower.includes("nominat")) return "text-info"
  if (lower.includes("marché")) return "text-brand-brass"
  if (lower.includes("invest")) return "text-success"
  if (lower.includes("tech")) return "text-primary"
  if (lower.includes("concurrence")) return "text-warning"
  return "text-primary"
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
    <div className="flex flex-col gap-3 p-4 border-b border-border bg-surface shrink-0" aria-label="Filtres des actualités">
      <label className="relative w-full">
        <span className="sr-only">Rechercher un article</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Rechercher un signal…"
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
              "border px-2 py-1 text-[9px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading",
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

function EditorialArticle({ article, headingRef, isMain }: { article: VeilleArticle; headingRef: React.RefObject<HTMLHeadingElement | null>; isMain?: boolean }) {
  const catColor = getCategoryColorClass(article.categorie)

  return (
    <article className="border border-border bg-edito-canvas/80 p-3 sm:p-4">
      <div className="paper-sheet border border-border/80 bg-surface px-8 py-9 lg:px-12 lg:py-11">
        <div className="mx-auto max-w-[74ch]">
          <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]">
            {isMain && (
              <span className="inline-block bg-primary text-primary-fg px-2 py-0.5">A LA UNE</span>
            )}
            <span className={catColor}>{article.categorie || "Actualité"}</span>
          </p>
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
  onAddToList,
  onOpportunity,
}: {
  company: CompanyContextStats | null
  watched: boolean
  onPitch: () => void
  onNote: () => void
  onQualify: () => void
  onAddToList: () => void
  onOpportunity: () => void
}) {
  const actions = [
    { label: "Qualifier le signal", icon: "prioritize" as const, onClick: onQualify },
    { label: "Ajouter à la liste", icon: "report" as const, onClick: onAddToList },
    { label: "Créer une fenêtre commerciale", icon: "detect_risks" as const, onClick: onOpportunity },
    { label: "Créer une note compte", icon: "write_email" as const, onClick: onNote },
  ]
  return (
    <aside className="border border-border bg-edito-canvas/55">
      <section className="p-4">
        <SectionHeading>Actions recommandées</SectionHeading>
        <div className="mt-3 space-y-2">
          <Button variant="brass" size="sm" fullWidth onClick={onPitch} leftIcon={<IntelligenceIcon name="generate_pitch" preferVector />} className="justify-between">
            Générer un pitch / mail
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

function VerticalArticleRail({
  articles,
  selectedId,
  onSelect,
  search,
  onSearch,
  selectedFilter,
  onFilter
}: {
  articles: VeilleArticle[]
  selectedId: string
  onSelect: (article: VeilleArticle) => void
  search: string
  onSearch: (value: string) => void
  selectedFilter: typeof FILTERS[number]
  onFilter: (value: typeof FILTERS[number]) => void
}) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-surface">
      <NewsFilters search={search} onSearch={onSearch} selectedFilter={selectedFilter} onFilter={onFilter} />
      <div className="flex-1 overflow-y-auto veille-scrollbar">
        {articles.length === 0 ? (
          <p className="p-4 text-xs text-muted">Aucun article ne correspond aux filtres.</p>
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => {
              const isSelected = article.id === selectedId
              const catColor = getCategoryColorClass(article.categorie)
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onSelect(article)}
                  aria-pressed={isSelected}
                  className={cn(
                    "block w-full text-left p-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-heading",
                    isSelected ? "bg-primary/[0.05] border-l-2 border-l-primary" : "hover:bg-surface-hover border-l-2 border-l-transparent"
                  )}
                >
                  <span className={cn("text-[9px] font-bold uppercase tracking-[0.08em]", catColor)}>
                    {article.categorie || article.source_name}
                  </span>
                  <span className="mt-1.5 block text-[13px] font-bold leading-5 text-heading line-clamp-3">
                    {article.titre_fr}
                  </span>
                  <span className="mt-2 block text-[10px] text-muted">
                    {article.source_name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function formatAccountWatchCadence(cadence?: string | null): string {
  if (cadence === "daily") return "quotidienne"
  if (cadence === "twice_weekly") return "2x/semaine"
  return "hebdomadaire"
}

type GroupedAccountSignals = {
  company: {
    id: string
    name: string
    website: string | null
    logoPath: string | null
    cadence?: string | null
  }
  signals: WatchedAccountSignal[]
}

function WatchedAccountsSection({ signals }: { signals: WatchedAccountSignal[] }) {
  const [dismissedSignalIds, setDismissedSignalIds] = useState<Set<string>>(() => new Set())
  const [feedback, setFeedback] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null)
  const visibleSignals = useMemo(
    () => signals.filter((signal) => !dismissedSignalIds.has(signal.id)),
    [dismissedSignalIds, signals],
  )

  const groupedAccounts = useMemo(() => {
    const map = new Map<string, GroupedAccountSignals>()
    for (const signal of visibleSignals) {
      const companyId = signal.company.id
      const existing = map.get(companyId)
      if (existing) {
        existing.signals.push(signal)
      } else {
        map.set(companyId, {
          company: signal.company,
          signals: [signal],
        })
      }
    }
    return Array.from(map.values())
  }, [visibleSignals])

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    groupedAccounts[0]?.company.id ?? null
  )

  const activeGroup = useMemo(() => {
    if (groupedAccounts.length === 0) return null
    return groupedAccounts.find((group) => group.company.id === selectedAccountId) ?? groupedAccounts[0]
  }, [groupedAccounts, selectedAccountId])

  if (groupedAccounts.length === 0 || !activeGroup) {
    return (
      <EmptyState title="Aucun compte suivi">
        <p>Les comptes suivis et leurs signaux apparaîtront ici après activation de la veille compte.</p>
      </EmptyState>
    )
  }

  const { company, signals: accountSignals } = activeGroup

  return (
    <div className="grid grid-cols-[17rem_minmax(0,1fr)] border border-border bg-surface min-h-[38rem]">
      {/* Colonne de gauche : Comptes suivis */}
      <section className="border-r border-border bg-edito-canvas/50 p-3.5">
        <SectionHeading>Comptes suivis ({groupedAccounts.length})</SectionHeading>
        <div className="mt-3.5 max-h-[calc(100dvh-13rem)] space-y-2.5 overflow-y-auto veille-scrollbar">
          {groupedAccounts.map((group) => {
            const isSelected = group.company.id === activeGroup.company.id
            const signalCount = group.signals.length
            const signalLabel = signalCount === 1 ? "1 signal détecté" : `${signalCount} signaux détectés`
            const cadenceLabel = formatAccountWatchCadence(group.company.cadence)

            return (
              <button
                key={group.company.id}
                type="button"
                onClick={() => setSelectedAccountId(group.company.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-center gap-3.5 border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading rounded-md",
                  isSelected
                    ? "border-brand-brass bg-primary/[0.05]"
                    : "border-border bg-surface hover:bg-surface-hover"
                )}
              >
                {/* Logo en grand carré aligné sur la gauche */}
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-edito-canvas p-1">
                  <CompanyLogo
                    name={group.company.name}
                    logoPath={group.company.logoPath}
                    website={group.company.website}
                    size="lg"
                  />
                </div>

                {/* Informations du compte */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-heading text-xs font-bold text-heading">
                    {group.company.name}
                  </p>
                  <p className="text-[10px] text-muted">
                    Veille {cadenceLabel}
                  </p>
                  <p className="text-[11px] font-bold text-brand-brass">
                    {signalLabel}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Colonne de droite : Page de veille dédiée au compte avec tous ses signaux */}
      <div className="paper-sheet px-6 py-7 lg:px-8 veille-scrollbar overflow-y-auto max-h-[calc(100dvh-13rem)]">
        {/* Entête du compte sélectionné */}
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border bg-edito-canvas p-1.5 shadow-2xs">
              <CompanyLogo
                name={company.name}
                logoPath={company.logoPath}
                website={company.website}
                size="xl"
              />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-heading">
                {company.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center border border-border bg-edito-canvas px-2 py-0.5 text-[10px] font-semibold text-heading">
                  Veille {formatAccountWatchCadence(company.cadence)}
                </span>
                <span>·</span>
                <span className="font-bold text-brand-brass">
                  {accountSignals.length} {accountSignals.length === 1 ? "signal détecté" : "signaux détectés"} au total
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <AccountWatchHeaderActions
              key={company.id}
              companyId={company.id}
              companyName={company.name}
              companyLogoPath={company.logoPath}
              companyWebsite={company.website}
              onFeedback={(message, tone) => setFeedback({ message, tone })}
            />
            <Link
              href={`/prospection/accounts/${company.id}`}
              className="inline-flex h-9 items-center gap-2 border border-border bg-surface px-4 text-xs font-bold text-primary hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-heading"
            >
              <span>Voir la fiche compte</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        {feedback ? (
          <p
            role={feedback.tone === "error" ? "alert" : "status"}
            className={cn(
              "mt-4 border px-3 py-2 text-xs",
              feedback.tone === "error"
                ? "border-danger/20 bg-danger/[0.04] text-danger"
                : feedback.tone === "success"
                  ? "border-success/20 bg-success/[0.04] text-success"
                  : "border-info/20 bg-info/[0.04] text-info",
            )}
          >
            {feedback.message}
          </p>
        ) : null}

        {/* Section présentant l'ensemble des signaux du compte */}
        <section className="mt-6 space-y-4">
          <SectionHeading>
            Signaux du compte ({accountSignals.length})
          </SectionHeading>

          <div className="space-y-4">
            {accountSignals.map((signal) => (
              <AccountSignalDesktopActions
                key={signal.id}
                signalId={signal.id}
                companyId={signal.company.id}
                companyName={signal.company.name}
                category={signal.category}
                title={signal.title}
                publishedAt={formatDateFr(signal.publishedAt ?? signal.detectedAt)}
                sourceName={signal.primarySource?.source_name ?? "Source non renseignée"}
                sourceUrl={signal.primarySource?.source_url ?? null}
                summary={signal.summary}
                analysis={signal.analysis ?? null}
                recommendedAction={signal.recommendedAction}
                globalScore={signal.globalScore}
                urgencyScore={signal.urgencyScore}
                confidenceScore={signal.confidenceScore}
                onDismiss={(signalId) => setDismissedSignalIds((current) => new Set(current).add(signalId))}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

type StrategicSectionKey = "trends" | "opportunities" | "priorityActions" | "risks" | "regulatory" | "weakSignals"

function CollapsibleSectionHeader({
  title,
  count,
  iconName,
  iconColorClass = "text-primary",
  isOpen,
  onToggle,
}: {
  title: string
  count: number
  iconName: IntelligenceIconKey
  iconColorClass?: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-3 border-t border-border pt-3.5 pb-1 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-heading"
    >
      <div className="flex items-center gap-2">
        <IntelligenceIcon name={iconName} preferVector className={cn("size-4 shrink-0", iconColorClass)} />
        <h4 className="font-heading text-sm font-bold text-heading">
          {title} ({count})
        </h4>
      </div>
      <div className="flex items-center gap-1.5 text-muted">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{isOpen ? "Masquer" : "Déplier"}</span>
        <ChevronDownIcon
          className={cn("size-4 transition-transform duration-200", isOpen ? "rotate-180" : "rotate-0")}
        />
      </div>
    </button>
  )
}

function StrategicAnalysisSection({
  analysis: initialAnalysis,
  analysisHistory,
  generation,
}: {
  analysis: StrategicWatchAnalysis | null
  analysisHistory: StrategicWatchAnalysis[]
  generation: MonthlyWatchGenerationContext
}) {
  const router = useRouter()
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    initialAnalysis?.id ?? analysisHistory[0]?.id ?? null
  )
  const [run, setRun] = useState(generation.latestRun)
  const [pending, setPending] = useState(Boolean(generation.activeRun))
  const [error, setError] = useState<string | null>(generation.latestRun?.status === "failed" ? generation.latestRun.errorMessage : null)

  const [openSections, setOpenSections] = useState<Record<StrategicSectionKey, boolean>>({
    trends: false,
    opportunities: false,
    priorityActions: false,
    risks: false,
    regulatory: false,
    weakSignals: false,
  })

  const toggleSection = (key: StrategicSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const activeAnalysis = useMemo(() => {
    if (analysisHistory.length === 0) return initialAnalysis
    return analysisHistory.find((item) => item.id === selectedAnalysisId) ?? initialAnalysis ?? analysisHistory[0] ?? null
  }, [analysisHistory, selectedAnalysisId, initialAnalysis])

  const content = activeAnalysis?.content ?? null

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary">Mois civil précédent</p>
          <h2 className="mt-0.5 font-heading text-lg font-bold text-heading">Analyse stratégique de {generation.input.periodStart.slice(0, 7)}</h2>
          <p className="mt-0.5 text-xs text-muted">{generation.input.digestIds.length} digest(s) · {generation.input.articleIds.length} article(s) collectés</p>
        </div>
        <Button variant="brass" onClick={generate} loading={pending} loadingLabel="Génération" disabled={generation.input.articleIds.length === 0}>
          {generation.isAlreadyCovered ? "Régénérer l’analyse" : "Générer l’analyse du mois écoulé"}
        </Button>
      </div>

      {pending ? (
        <div aria-live="polite" className="border border-brand-brass/35 bg-brand-brass/[0.06] p-3 text-sm text-heading">
          <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-brand-brass/30 border-t-brand-brass align-[-1px] motion-reduce:animate-none" aria-hidden="true" />
          Analyse en cours. Le rapport sera ajouté à la bibliothèque après le callback.
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 border border-danger/30 bg-danger/[0.04] p-3 text-sm text-danger">
          <span>{error}</span>
          <Link href={run ? `/automations?run=${run.id}` : "/automations"} className="font-bold underline">Voir le run</Link>
        </div>
      ) : null}

      {activeAnalysis ? (
        <article className="grid grid-cols-[minmax(0,1fr)_18rem] items-start border border-border bg-surface">
          <div className="paper-sheet border-r border-border px-6 py-7 lg:px-10 space-y-5">
            <div className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-brass">
                  Rapport d’analyse stratégique
                </p>
                <div className="flex items-center gap-2">
                  <span className="border border-border bg-edito-canvas px-2 py-0.5 text-[10px] font-bold text-heading">
                    v{activeAnalysis.versionNumber}
                  </span>
                  <span className="border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                    {activeAnalysis.status}
                  </span>
                </div>
              </div>
              <h3 className="mt-2 font-heading text-xl lg:text-2xl font-bold leading-snug text-heading">
                {activeAnalysis.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>{formatPeriod(activeAnalysis.periodStart, activeAnalysis.periodEnd)}</span>
                <span aria-hidden="true">·</span>
                <span>Généré le {formatDateFr(activeAnalysis.updatedAt)}</span>
                {content?.coverage ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-heading">
                      {content.coverage.articlesCount} articles · {content.coverage.sourcesCount} sources · {content.coverage.digestsCount} digests
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {content?.executiveSummary ? (
              <section className="space-y-2">
                <h4 className="flex items-center gap-2 font-heading text-sm font-bold text-heading">
                  <IntelligenceIcon name="recommendations" preferVector className="size-4 text-brand-brass" />
                  Synthèse exécutive
                </h4>
                <div className="border-l-4 border-brand-brass bg-edito-canvas/60 p-4 text-sm leading-relaxed font-medium text-heading">
                  {content.executiveSummary}
                </div>
              </section>
            ) : null}

            {content?.majorTrends && content.majorTrends.length > 0 ? (
              <section className="space-y-2">
                <CollapsibleSectionHeader
                  title="Enseignements clés &amp; Tendances majeures"
                  count={content.majorTrends.length}
                  iconName="prioritize"
                  iconColorClass="text-primary"
                  isOpen={openSections.trends}
                  onToggle={() => toggleSection("trends")}
                />
                {openSections.trends ? (
                  <div className="divide-y divide-border/40 space-y-2.5 pt-1">
                    {content.majorTrends.map((trend, i) => (
                      <div key={i} className="pt-2 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                            <h5 className="font-heading text-sm font-bold text-heading">{trend.title}</h5>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {trend.confidence ? (
                              <span className="border border-border bg-surface px-2 py-0.5 text-[9px] font-bold text-muted">
                                Confiance {Math.round(trend.confidence * 100)}%
                              </span>
                            ) : null}
                            {trend.sectors?.map((sec) => (
                              <span key={sec} className="border border-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-medium text-body">
                                #{sec}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-body pl-3.5">{trend.synthesis}</p>
                        {trend.articleIds?.length ? (
                          <p className="text-[10px] text-muted pl-3.5">{trend.articleIds.length} article(s) associé(s)</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {content?.commercialOpportunities && content.commercialOpportunities.length > 0 ? (
              <section className="space-y-2">
                <CollapsibleSectionHeader
                  title="Opportunités commerciales"
                  count={content.commercialOpportunities.length}
                  iconName="generate_pitch"
                  iconColorClass="text-brand-brass"
                  isOpen={openSections.opportunities}
                  onToggle={() => toggleSection("opportunities")}
                />
                {openSections.opportunities ? (
                  <div className="divide-y divide-border/40 space-y-2.5 pt-1">
                    {content.commercialOpportunities.map((opp, i) => (
                      <div key={i} className="pt-2 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-brass" aria-hidden="true" />
                            <h5 className="font-heading text-sm font-bold text-heading">{opp.title}</h5>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {opp.practices?.map((prac) => (
                              <span key={prac} className="border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                {prac}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-body pl-3.5">{opp.rationale}</p>
                        {opp.recommendedAction ? (
                          <div className="ml-3.5 flex flex-wrap items-center justify-between gap-2 border-l-2 border-brand-brass pl-3 py-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">Action recommandée</p>
                              <p className="mt-0.5 text-xs font-semibold leading-relaxed text-heading">{opp.recommendedAction}</p>
                            </div>
                            <Button
                              variant="brass"
                              size="sm"
                              onClick={() => {
                                const mustInclude = [
                                  `Opportunité : ${opp.title}`,
                                  `Période : ${content.period?.label ?? ""}`,
                                  `Argumentaire : ${opp.rationale}`,
                                  `Action recommandée : ${opp.recommendedAction}`,
                                ].join("\n")
                                const preset = buildCommunicationEntryPreset("signal_outreach", {
                                  origin: "veille_signal",
                                  sectorName: opp.practices?.[0] ?? "Général",
                                  mustInclude,
                                })
                                if (preset.ok) openCommunicationComposer(preset.request)
                              }}
                              leftIcon={<IntelligenceIcon name="write_email" preferVector />}
                              className="shrink-0 text-xs"
                            >
                              Préparer un pitch
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {content?.priorityActions && content.priorityActions.length > 0 ? (
              <section className="space-y-2">
                <CollapsibleSectionHeader
                  title="Actions prioritaires"
                  count={content.priorityActions.length}
                  iconName="detect_risks"
                  iconColorClass="text-primary"
                  isOpen={openSections.priorityActions}
                  onToggle={() => toggleSection("priorityActions")}
                />
                {openSections.priorityActions ? (
                  <div className="divide-y divide-border/40 space-y-2 pt-1">
                    {content.priorityActions.map((act, i) => {
                      const horizonLabel = act.horizon === "immediate" ? "Immédiat" : act.horizon === "30_days" ? "30 jours" : "Trimestre"
                      const horizonClass = act.horizon === "immediate" ? "border-danger/30 bg-danger/10 text-danger" : act.horizon === "30_days" ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-edito-chip text-muted"
                      return (
                        <div key={i} className="pt-2 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                            <div>
                              <h5 className="font-heading text-sm font-bold text-heading">{act.title}</h5>
                              <p className="mt-0.5 text-xs leading-relaxed text-body">{act.action}</p>
                            </div>
                          </div>
                          <span className={cn("shrink-0 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", horizonClass)}>
                            {horizonLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            ) : null}

            {content?.risksAndWatchpoints && content.risksAndWatchpoints.length > 0 ? (
              <section className="space-y-2">
                <CollapsibleSectionHeader
                  title="Risques &amp; Points de vigilance"
                  count={content.risksAndWatchpoints.length}
                  iconName="detect_risks"
                  iconColorClass="text-warning"
                  isOpen={openSections.risks}
                  onToggle={() => toggleSection("risks")}
                />
                {openSections.risks ? (
                  <div className="divide-y divide-border/40 space-y-2 pt-1">
                    {content.risksAndWatchpoints.map((risk, i) => (
                      <div key={i} className="pt-2 space-y-0.5">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                          <h5 className="font-heading text-sm font-bold text-heading">{risk.title}</h5>
                        </div>
                        <p className="text-xs leading-relaxed text-body pl-3.5">{risk.explanation}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {content?.regulatoryDevelopments && content.regulatoryDevelopments.length > 0 ? (
              <section className="space-y-2">
                <CollapsibleSectionHeader
                  title="Évolutions réglementaires"
                  count={content.regulatoryDevelopments.length}
                  iconName="sector_analysis"
                  iconColorClass="text-primary"
                  isOpen={openSections.regulatory}
                  onToggle={() => toggleSection("regulatory")}
                />
                {openSections.regulatory ? (
                  <div className="divide-y divide-border/40 space-y-2 pt-1">
                    {content.regulatoryDevelopments.map((reg, i) => (
                      <div key={i} className="pt-2 space-y-0.5">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                          <h5 className="font-heading text-sm font-bold text-heading">{reg.title}</h5>
                        </div>
                        <p className="text-xs leading-relaxed text-body pl-3.5">{reg.impact}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {content?.weakSignals && content.weakSignals.length > 0 ? (
              <section className="space-y-2">
                <CollapsibleSectionHeader
                  title="Signaux faibles"
                  count={content.weakSignals.length}
                  iconName="search_news"
                  iconColorClass="text-muted"
                  isOpen={openSections.weakSignals}
                  onToggle={() => toggleSection("weakSignals")}
                />
                {openSections.weakSignals ? (
                  <div className="divide-y divide-border/40 space-y-2 pt-1">
                    {content.weakSignals.map((sig, i) => (
                      <div key={i} className="pt-2 space-y-0.5">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                          <h5 className="font-heading text-xs font-bold text-heading">{sig.title}</h5>
                        </div>
                        <p className="text-xs leading-relaxed text-body pl-3.5">{sig.synthesis}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="sticky top-4 space-y-6 bg-edito-canvas/55 p-5">
            {analysisHistory.length > 1 ? (
              <div>
                <SectionHeading>Période d’analyse</SectionHeading>
                <div className="mt-3">
                  <label htmlFor="select-analysis-period" className="sr-only">
                    Sélectionner l’analyse stratégique
                  </label>
                  <select
                    id="select-analysis-period"
                    value={activeAnalysis.id}
                    onChange={(e) => setSelectedAnalysisId(e.target.value)}
                    className="h-10 w-full border border-border bg-surface px-3 text-xs font-semibold text-heading outline-none focus-visible:ring-2 focus-visible:ring-heading"
                  >
                    {analysisHistory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.content?.period?.label ?? item.title} ({formatDateFr(item.updatedAt)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div>
              <SectionHeading>Fiche du rapport</SectionHeading>
              <dl className="mt-3 divide-y divide-border text-[11px]">
                <div className="flex justify-between py-2.5"><dt className="text-muted">État</dt><dd className="font-bold uppercase text-success">{activeAnalysis.status}</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-muted">Version</dt><dd className="font-bold text-heading">v{activeAnalysis.versionNumber}</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-muted">Digests</dt><dd className="font-bold text-heading">{content?.coverage?.digestsCount ?? "—"}</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-muted">Articles</dt><dd className="font-bold text-heading">{content?.coverage?.articlesCount ?? "—"}</dd></div>
                <div className="flex justify-between py-2.5"><dt className="text-muted">Sources</dt><dd className="font-bold text-heading">{content?.coverage?.sourcesCount ?? "—"}</dd></div>
              </dl>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <SectionHeading>Actions documentaires</SectionHeading>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => router.push(`/reports?doc=${activeAnalysis.id}`)}
                leftIcon={<IntelligenceIcon name="report" preferVector />}
                className="justify-start text-xs"
              >
                Voir dans la bibliothèque
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => {
                  if (!content) return
                  const mustInclude = `Synthèse globale de l’analyse stratégique (${content.period?.label ?? ""}) :\n${content.executiveSummary}`
                  const preset = buildCommunicationEntryPreset("signal_outreach", {
                    origin: "veille_signal",
                    mustInclude,
                  })
                  if (preset.ok) openCommunicationComposer(preset.request)
                }}
                leftIcon={<IntelligenceIcon name="write_email" preferVector />}
                className="justify-start text-xs"
              >
                Composer une note
              </Button>
            </div>
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
  digestNumber,
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
  const [addToListOpen, setAddToListOpen] = useState(false)
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
      ? <StrategicAnalysisSection analysis={latestAnalysis} analysisHistory={analysisHistory} generation={monthlyGeneration} />
      : section === "history"
        ? <HistorySection digests={pastDigests} analyses={analysisHistory} />
        : selectedArticle
          ? (
              <div className="grid grid-cols-[minmax(0,1fr)_18rem] items-start gap-4">
                <EditorialArticle article={selectedArticle} headingRef={headingRef} isMain={selectedArticle.selection_rank === 1} />
                <ArticleRail
                  company={matchedCompany}
                  watched={watched}
                  onPitch={pitch}
                  onNote={() => requireCompany(() => setNoteOpen(true))}
                  onQualify={() => setQualifyOpen(true)}
                  onAddToList={() => setAddToListOpen(true)}
                  onOpportunity={() => setOpportunityOpen(true)}
                />
              </div>
            )
          : <NewsFallback news={sectorNews} events={sectorEvents} />

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-canvas text-body">
      <VeilleLocalNavigation active={section} onChange={setSection} />
      
      {section === "news" && selectedArticle ? (
        <VerticalArticleRail
          articles={filteredArticles}
          selectedId={selectedArticle.id}
          onSelect={selectArticle}
          search={search}
          onSearch={setSearch}
          selectedFilter={filter}
          onFilter={setFilter}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-heading">
            {section === "news" && digest
              ? `Actualités - Digest n°${digestNumber || "?"} du ${formatDateFr(digest.digest_date)}`
              : "Veille & actualités"}
          </h1>
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
          <AddToListExplanationDialog open={addToListOpen} onOpenChange={setAddToListOpen} />
          <CreateCommercialWindowDialog open={opportunityOpen} onOpenChange={setOpportunityOpen} article={selectedArticle} companyId={matchedCompany?.id} companyName={matchedCompany?.name} signalTitle={selectedArticle.titre_fr} onSuccess={() => setMessage("Fenêtre commerciale créée avec succès.")} />
          {matchedCompany ? (
            <CreateAccountNoteDialog open={noteOpen} onOpenChange={setNoteOpen} companyId={matchedCompany.id} companyName={matchedCompany.name} signalTitle={selectedArticle.titre_fr} onSuccess={() => setMessage(`Note ajoutée pour ${matchedCompany.name}.`)} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
