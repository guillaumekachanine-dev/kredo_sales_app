"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import { cn } from "@/lib/utils"
import {
  CreateAccountNoteDialog,
  CreateOpportunityDialog,
  QualifySignalDialog,
} from "./SignalDialogs"
import { extractMatchedCompany } from "./veille-utils"
import { VeilleAnalysesTab } from "./mobile/VeilleAnalysesTab"
import { VeilleArchivesTab } from "./mobile/VeilleArchivesTab"
import { VeilleNewsTab } from "./mobile/VeilleNewsTab"
import { VeilleReaderTab } from "./mobile/VeilleReaderTab"
import { VeilleSignalsView } from "./mobile/VeilleSignalsView"
import {
  buildArchiveEntries,
  buildNewsRows,
  buildSignalGroups,
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
  /** Flux complet des briefings chargés — alimente Actualités et Archives. */
  feedArticles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  companies: CompanyContextStats[]
  watchedSignals: WatchedAccountSignal[]
  analyses: StrategicWatchAnalysis[]
}

export function VeilleActualitesMobile({
  articles,
  feedArticles,
  pastDigests,
  companies,
  watchedSignals,
  analyses,
}: VeilleActualitesMobileProps) {
  const router = useRouter()

  const allArticles = feedArticles.length > 0 ? feedArticles : articles

  const [activeTab, setActiveTab] = useState<VeilleTab>("actualites")
  const [veillePane, setVeillePane] = useState<"reader" | "signals">("reader")
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)

  const [localSignals, setLocalSignals] = useState<WatchedAccountSignal[]>(watchedSignals)
  const [articleOverrides, setArticleOverrides] = useState<Record<string, VeilleArticle>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false)
  const [isQualifyOpen, setIsQualifyOpen] = useState(false)

  const resolvedArticles = useMemo(
    () => allArticles.map((article) => articleOverrides[article.id] ?? article),
    [allArticles, articleOverrides],
  )

  const newsRows = useMemo(() => buildNewsRows(resolvedArticles), [resolvedArticles])

  /** À défaut de sélection explicite, on ouvre l'article disponible le plus récent. */
  const selectedArticle = useMemo(() => {
    if (resolvedArticles.length === 0) return null
    if (selectedArticleId) {
      const match = resolvedArticles.find((article) => article.id === selectedArticleId)
      if (match) return match
    }
    const mostRecentId = newsRows[0]?.id
    return resolvedArticles.find((article) => article.id === mostRecentId) ?? resolvedArticles[0]
  }, [resolvedArticles, selectedArticleId, newsRows])

  const matchedCompany = useMemo(
    () =>
      selectedArticle
        ? extractMatchedCompany(selectedArticle.titre_fr, selectedArticle.resume, companies)
        : null,
    [selectedArticle, companies],
  )

  const signalGroupsCount = useMemo(() => buildSignalGroups(localSignals).length, [localSignals])

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

  const openArticle = useCallback((articleId: string) => {
    setSelectedArticleId(articleId)
    setVeillePane("reader")
    setActiveTab("veille")
  }, [])

  const handleOpenArchiveEntry = useCallback(
    (entry: ArchiveEntryVM) => {
      if (entry.kind === "analysis") {
        setSelectedAnalysisId(entry.id)
        setActiveTab("analyses")
        return
      }

      // Briefing : on conserve le contrat d'URL `digestId` déjà en place et on
      // ouvre le lecteur sur l'article le plus récent de ce briefing.
      const firstOfDigest = newsRows.find((row) => row.digestId === entry.id)
      router.push(`?digestId=${entry.id}`, { scroll: false })
      if (firstOfDigest) {
        openArticle(firstOfDigest.id)
      } else {
        setVeillePane("reader")
        setActiveTab("veille")
      }
    },
    [newsRows, openArticle, router],
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

  const handleReaderAction = useCallback(
    (action: "pitch" | "note" | "opportunity" | "qualify") => {
      if (!selectedArticle) return
      if (action === "pitch") {
        handleGeneratePitch(selectedArticle, matchedCompany)
        return
      }
      if (action === "qualify") {
        setIsQualifyOpen(true)
        return
      }
      if (!matchedCompany) {
        showFeedback("Qualifiez d'abord le signal pour le rattacher à un compte.")
        return
      }
      if (action === "note") setIsNoteOpen(true)
      else setIsOpportunityOpen(true)
    },
    [selectedArticle, matchedCompany, handleGeneratePitch, showFeedback],
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
          <VeilleNewsTab rows={newsRows} onOpenArticle={openArticle} />
        ) : null}

        {activeTab === "veille" ? (
          veillePane === "signals" ? (
            <VeilleSignalsView
              signals={localSignals}
              onBack={() => setVeillePane("reader")}
              onDismissSignal={(signalId) =>
                setLocalSignals((previous) => previous.filter((signal) => signal.id !== signalId))
              }
            />
          ) : (
            <VeilleReaderTab
              article={selectedArticle}
              matchedCompany={matchedCompany}
              watchedGroupsCount={signalGroupsCount}
              onOpenSignals={() => setVeillePane("signals")}
              onAction={handleReaderAction}
            />
          )
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

      {selectedArticle ? (
        <>
          <QualifySignalDialog
            open={isQualifyOpen}
            onOpenChange={setIsQualifyOpen}
            article={selectedArticle}
            onSuccess={(updated) => {
              setArticleOverrides((previous) => ({ ...previous, [updated.id]: updated }))
              setSelectedArticleId(updated.id)
              showFeedback("Signal qualifié et mis à jour.")
            }}
          />

          {matchedCompany ? (
            <>
              <CreateAccountNoteDialog
                open={isNoteOpen}
                onOpenChange={setIsNoteOpen}
                companyId={matchedCompany.id}
                companyName={matchedCompany.name}
                signalTitle={selectedArticle.titre_fr}
                onSuccess={() => showFeedback(`Note ajoutée pour ${matchedCompany.name}.`)}
              />
              <CreateOpportunityDialog
                open={isOpportunityOpen}
                onOpenChange={setIsOpportunityOpen}
                companyId={matchedCompany.id}
                companyName={matchedCompany.name}
                signalTitle={selectedArticle.titre_fr}
                onSuccess={() => showFeedback(`Opportunité créée pour ${matchedCompany.name}.`)}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
