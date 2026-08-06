"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import { cn } from "@/lib/utils"
import { CreateOpportunityDialog, QualifySignalDialog } from "./SignalDialogs"
import { extractMatchedCompany } from "./veille-utils"
import { LinkSignalDialog } from "./mobile/LinkSignalDialog"
import { VeilleAnalysesTab } from "./mobile/VeilleAnalysesTab"
import { VeilleArchivesTab } from "./mobile/VeilleArchivesTab"
import { VeilleArticleReader, type ArticleAction } from "./mobile/VeilleArticleReader"
import { VeilleNewsTab } from "./mobile/VeilleNewsTab"
import { VeilleSignalsView } from "./mobile/VeilleSignalsView"
import {
  buildArchiveEntries,
  buildDigestPeriods,
  buildNewsRows,
  type ArchiveEntryVM,
} from "./mobile/veille-mobile-view-models"
import type { StrategicWatchAnalysis } from "./veille-desktop-contracts"
import type {
  CompanyContextStats,
  VeilleArticle,
  VeilleDigest,
  WatchedAccountSignal,
} from "@/app/(app)/veille/_data/veille-data"

type VeilleTab = "actualites" | "veille" | "analyses" | "archives"

const TABS: Array<{ id: VeilleTab; label: string }> = [
  { id: "actualites", label: "Actualités" },
  { id: "veille", label: "Veille" },
  { id: "analyses", label: "Analyses" },
  { id: "archives", label: "Archives" },
]

interface VeilleActualitesMobileProps {
  /** Articles du digest sélectionné (contrat historique, conservé). */
  articles: VeilleArticle[]
  /** Articles de tous les briefings chargés — sert la navigation hebdomadaire. */
  feedArticles: VeilleArticle[]
  selectedDigestId: string | null
  pastDigests: VeilleDigest[]
  companies: CompanyContextStats[]
  watchedSignals: WatchedAccountSignal[]
  analyses: StrategicWatchAnalysis[]
}

export function VeilleActualitesMobile({
  articles,
  feedArticles,
  selectedDigestId,
  pastDigests,
  companies,
  watchedSignals,
  analyses,
}: VeilleActualitesMobileProps) {
  const router = useRouter()

  const allArticles = feedArticles.length > 0 ? feedArticles : articles

  const [activeTab, setActiveTab] = useState<VeilleTab>("actualites")
  /** On mémorise l'ID du briefing, pas son rang : l'index se dérive ensuite,
      ce qui reste correct si la liste des briefings change. */
  const [activeDigestId, setActiveDigestId] = useState<string | null>(selectedDigestId)
  /** Article ouvert DANS l'onglet Actualités — la lecture ne quitte plus l'onglet. */
  const [openArticleId, setOpenArticleId] = useState<string | null>(null)
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)

  const [localSignals, setLocalSignals] = useState<WatchedAccountSignal[]>(watchedSignals)
  const [articleOverrides, setArticleOverrides] = useState<Record<string, VeilleArticle>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false)
  const [isQualifyOpen, setIsQualifyOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)

  const resolvedArticles = useMemo(
    () => allArticles.map((article) => articleOverrides[article.id] ?? article),
    [allArticles, articleOverrides],
  )

  const periods = useMemo(
    () => buildDigestPeriods(pastDigests, resolvedArticles),
    [pastDigests, resolvedArticles],
  )

  const activePeriodIndex = useMemo(() => {
    const index = periods.findIndex((period) => period.digestId === activeDigestId)
    return index >= 0 ? index : 0
  }, [periods, activeDigestId])

  const activePeriod = periods[activePeriodIndex] ?? null

  /** L'onglet Actualités ne montre QUE les articles du briefing de la semaine active. */
  const periodRows = useMemo(() => {
    if (!activePeriod) return []
    return buildNewsRows(
      resolvedArticles.filter((article) => article.digest_id === activePeriod.digestId),
    )
  }, [resolvedArticles, activePeriod])

  const openArticle = useMemo(() => {
    if (!openArticleId) return null
    return resolvedArticles.find((article) => article.id === openArticleId) ?? null
  }, [resolvedArticles, openArticleId])

  const matchedCompany = useMemo(
    () =>
      openArticle
        ? extractMatchedCompany(openArticle.titre_fr, openArticle.resume, companies)
        : null,
    [openArticle, companies],
  )

  const archiveEntries = useMemo(() => {
    const articleCountByDigest = new Map<string, number>()
    for (const article of resolvedArticles) {
      articleCountByDigest.set(article.digest_id, (articleCountByDigest.get(article.digest_id) ?? 0) + 1)
    }
    return buildArchiveEntries({ digests: pastDigests, analyses, articleCountByDigest })
  }, [pastDigests, analyses, resolvedArticles])

  const showFeedback = useCallback((message: string) => {
    setFeedback(message)
    window.setTimeout(() => setFeedback(null), 4000)
  }, [])

  const handleChangePeriod = useCallback(
    (index: number) => {
      if (index < 0 || index >= periods.length) return
      setActiveDigestId(periods[index].digestId)
      // Changer de semaine referme la lecture : l'article ouvert appartenait au
      // briefing précédent.
      setOpenArticleId(null)
      // Le contrat d'URL `digestId` reste la source de vérité côté serveur.
      router.push(`?digestId=${periods[index].digestId}`, { scroll: false })
    },
    [periods, router],
  )

  const handleGeneratePitch = useCallback(
    (article: VeilleArticle, company: CompanyContextStats | null) => {
      const mustInclude = [
        `Signal : ${article.titre_fr}`,
        article.source_name ? `Source : ${article.source_name}` : null,
        `Résumé : ${article.resume}`,
        article.analyse_kredo ? `Analyse KREDO : ${article.analyse_kredo}` : null,
        article.action_commerciale ? `Action commerciale proposée : ${article.action_commerciale}` : null,
        article.secteur_principal || article.categorie
          ? `Contexte : ${[article.secteur_principal, article.categorie].filter(Boolean).join(" / ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")

      const preset = buildCommunicationEntryPreset("signal_outreach", {
        origin: "veille_signal",
        companyId: company?.id ?? null,
        companyName: company?.name ?? null,
        signalId: article.id,
        sectorName: article.secteur_principal ?? article.categorie ?? null,
        mustInclude,
      })
      if (preset.ok) openCommunicationComposer(preset.request)
    },
    [],
  )

  const handleArticleAction = useCallback(
    (action: ArticleAction) => {
      if (!openArticle) return
      switch (action) {
        case "pitch":
          handleGeneratePitch(openArticle, matchedCompany)
          return
        case "qualify":
          setIsQualifyOpen(true)
          return
        case "link":
          setIsLinkOpen(true)
          return
        case "opportunity":
          if (!matchedCompany) {
            showFeedback("Liez d'abord le signal à un compte.")
            return
          }
          setIsOpportunityOpen(true)
      }
    },
    [openArticle, matchedCompany, handleGeneratePitch, showFeedback],
  )

  const handleOpenArchiveEntry = useCallback(
    (entry: ArchiveEntryVM) => {
      if (entry.kind === "analysis") {
        setSelectedAnalysisId(entry.id)
        setActiveTab("analyses")
        return
      }
      const index = periods.findIndex((period) => period.digestId === entry.id)
      if (index >= 0) handleChangePeriod(index)
      setActiveTab("actualites")
    },
    [periods, handleChangePeriod],
  )

  return (
    <div className="flex h-[calc(100dvh-var(--layout-mobile-content-bottom-offset)-var(--space-3))] min-h-0 flex-col overflow-hidden bg-canvas text-body">
      <div className="shrink-0 bg-surface px-4 pb-3 pt-4">
        <MobilePageHeader
          title="Veille & actualités"
          className="gap-0 [&_h1]:text-[26px] [&_h1]:font-bold [&_h1]:leading-8"
        />
      </div>

      <nav
        className="grid shrink-0 grid-cols-4 border-y border-border bg-surface"
        aria-label="Navigation Veille & actualités"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative min-h-12 px-1 text-[13px] font-semibold text-heading outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                active
                  ? "font-bold after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand-brass"
                  : "text-muted hover:bg-surface-hover/60",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* La hauteur du conteneur réserve déjà la barre de navigation basse :
          on n'ajoute ici que la safe-area, sans quoi un bandeau mort apparaît. */}
      <main className="min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {activeTab === "actualites" ? (
          openArticle ? (
            <VeilleArticleReader
              article={openArticle}
              matchedCompany={matchedCompany}
              onBack={() => setOpenArticleId(null)}
              onAction={handleArticleAction}
            />
          ) : (
            <VeilleNewsTab
              periods={periods}
              activePeriodIndex={activePeriodIndex}
              onChangePeriod={handleChangePeriod}
              rows={periodRows}
              onOpenArticle={setOpenArticleId}
            />
          )
        ) : null}

        {activeTab === "veille" ? (
          <VeilleSignalsView
            signals={localSignals}
            onDismissSignal={(signalId) =>
              setLocalSignals((previous) => previous.filter((signal) => signal.id !== signalId))
            }
          />
        ) : null}

        {activeTab === "analyses" ? (
          <VeilleAnalysesTab
            analyses={analyses}
            selectedAnalysisId={selectedAnalysisId}
            onSelectAnalysis={setSelectedAnalysisId}
          />
        ) : null}

        {activeTab === "archives" ? (
          <VeilleArchivesTab entries={archiveEntries} onOpenEntry={handleOpenArchiveEntry} />
        ) : null}
      </main>

      {feedback ? (
        <p
          role="status"
          className="fixed inset-x-4 bottom-[calc(var(--layout-mobile-content-bottom-offset)+1rem)] z-[var(--z-modal)] rounded-[var(--radius-small)] bg-heading px-4 py-3 text-center text-sm font-semibold text-surface"
        >
          {feedback}
        </p>
      ) : null}

      {openArticle ? (
        <>
          <QualifySignalDialog
            open={isQualifyOpen}
            onOpenChange={setIsQualifyOpen}
            article={openArticle}
            onSuccess={(updated) => {
              setArticleOverrides((previous) => ({ ...previous, [updated.id]: updated }))
              showFeedback("Signal qualifié et mis à jour.")
            }}
          />

          <LinkSignalDialog
            open={isLinkOpen}
            onOpenChange={setIsLinkOpen}
            article={openArticle}
            companies={companies}
            suggestedCompany={matchedCompany}
            onSuccess={(updated, message) => {
              setArticleOverrides((previous) => ({ ...previous, [updated.id]: updated }))
              showFeedback(message)
            }}
          />

          {matchedCompany ? (
            <CreateOpportunityDialog
              open={isOpportunityOpen}
              onOpenChange={setIsOpportunityOpen}
              companyId={matchedCompany.id}
              companyName={matchedCompany.name}
              signalTitle={openArticle.titre_fr}
              onSuccess={() => showFeedback(`Opportunité créée pour ${matchedCompany.name}.`)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
