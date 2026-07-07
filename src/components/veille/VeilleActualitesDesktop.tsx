"use client"

import { useState } from "react"
import { formatDateFr } from "@/lib/formatters"
import { DigestHeroCard } from "./DigestHeroCard"
import { NewsSignalCard } from "./NewsSignalCard"
import { IntelligenceReaderModal } from "./IntelligenceReaderModal"
import type { 
  VeilleDigest, 
  VeilleArticle, 
  SectorNews, 
  SectorEvent 
} from "@/app/(app)/veille/_data/veille-data"

interface VeilleActualitesDesktopProps {
  digest: VeilleDigest | null
  articles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
}

export function VeilleActualitesDesktop({
  digest,
  articles,
  pastDigests,
  sectorNews,
  sectorEvents,
}: VeilleActualitesDesktopProps) {
  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"article" | "digest">("article")
  const [selectedData, setSelectedData] = useState<VeilleArticle | VeilleDigest | null>(null)

  const handleOpenArticle = (article: VeilleArticle) => {
    setModalType("article")
    setSelectedData(article)
    setModalOpen(true)
  }

  const handleOpenDigest = (d: VeilleDigest) => {
    setModalType("digest")
    setSelectedData(d)
    setModalOpen(true)
  }

  // Calculate categories and sources counts from articles
  const categoryCounts = articles.reduce((acc, curr) => {
    if (curr.categorie) {
      acc[curr.categorie] = (acc[curr.categorie] || 0) + 1
    }
    return acc;
  }, {} as Record<string, number>)

  const sourceCounts = articles.reduce((acc, curr) => {
    if (curr.source_name) {
      acc[curr.source_name] = (acc[curr.source_name] || 0) + 1
    }
    return acc;
  }, {} as Record<string, number>)

  const hasData = !!digest

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-bold text-heading">
            Veille & actualités
          </h1>
          <p className="text-xs text-body">
            Briefing commercial hebdomadaire des signaux marché, sectoriels et clients
          </p>
        </div>

        {/* Historique scroll-to action */}
        {pastDigests.length > 1 && (
          <a
            href="#historique"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-xs font-semibold text-body hover:bg-surface-hover hover:text-heading transition-colors"
          >
            <svg
              className="size-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{"Consulter l'historique"}</span>
          </a>
        )}
      </header>

      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Column */}
          <section className="lg:col-span-3 space-y-6">
            {/* Hero digest card */}
            <DigestHeroCard
              digest={digest}
              articles={articles}
              onOpenDigest={() => handleOpenDigest(digest)}
              onOpenArticle={handleOpenArticle}
            />

            {/* List of articles */}
            <div className="space-y-4">
              <h2 className="font-heading text-sm font-bold text-heading flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                Détail des signaux identifiés
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.map((article) => (
                  <NewsSignalCard
                    key={article.id}
                    article={article}
                    onOpen={() => handleOpenArticle(article)}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Right Rail (Sidebar) */}
          <aside className="space-y-6">
            {/* Categories */}
            {Object.keys(categoryCounts).length > 0 && (
              <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 space-y-3">
                <h3 className="font-heading text-xs font-bold text-heading">
                  Thématiques de la semaine
                </h3>
                <ul className="space-y-2 text-xxs text-body">
                  {Object.entries(categoryCounts).map(([cat, count]) => (
                    <li key={cat} className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                      <span>{cat}</span>
                      <span className="rounded bg-canvas px-1.5 py-0.5 text-muted font-bold">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {Object.keys(sourceCounts).length > 0 && (
              <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 space-y-3">
                <h3 className="font-heading text-xs font-bold text-heading">
                  Sources analysées
                </h3>
                <ul className="space-y-2 text-xxs text-body">
                  {Object.entries(sourceCounts).map(([source, count]) => (
                    <li key={source} className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                      <span className="truncate pr-2">{source}</span>
                      <span className="rounded bg-canvas px-1.5 py-0.5 text-muted font-bold shrink-0">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Past digests history */}
            {pastDigests.length > 1 && (
              <div id="historique" className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 space-y-3">
                <h3 className="font-heading text-xs font-bold text-heading">
                  Briefings précédents
                </h3>
                <ul className="space-y-2.5 text-xxs text-body">
                  {pastDigests.slice(1).map((d) => (
                    <li key={d.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDigest(d)}
                        className="w-full text-left space-y-1 hover:text-primary transition-colors group"
                      >
                        <span className="block text-[10px] text-muted group-hover:text-primary transition-colors">
                          {formatDateFr(d.digest_date)}
                        </span>
                        <span className="block font-bold text-heading group-hover:text-primary transition-colors line-clamp-1">
                          {d.titre_digest}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* Empty State with Fallbacks */
        <div className="space-y-6">
          <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2-3V9m0 0a2 2 0 012 2v3m-2-3h2m-2 3h2m0 0v5a2 2 0 01-2 2h-3" />
              </svg>
            </div>
            <h3 className="font-heading text-sm font-bold text-heading">Aucun briefing disponible</h3>
            <p className="text-xs text-body leading-relaxed">
              {"Le premier digest hebdomadaire de veille automatisée n'a pas encore été généré. Dès qu'un run de veille aura eu lieu, vous retrouverez ici l'analyse structurée de vos signaux marché."}
            </p>
          </div>

          {/* Sector news and events fallback */}
          {(sectorNews.length > 0 || sectorEvents.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-5xl mx-auto">
              {sectorNews.length > 0 && (
                <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4 shadow-sm">
                  <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-success" />
                    Actualités sectorielles récentes
                  </h3>
                  <div className="space-y-3.5 divide-y divide-border/40">
                    {sectorNews.map((news) => (
                      <div key={news.id} className="pt-3.5 first:pt-0">
                        <span className="text-[10px] text-muted">{formatDateFr(news.published_at)}</span>
                        <h4 className="font-heading text-xs font-bold text-heading mt-0.5">{news.title}</h4>
                        {news.summary && <p className="text-xxs text-body leading-relaxed mt-1">{news.summary}</p>}
                        {news.url && (
                          <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2">
                            {"Lire l'article"}
                            <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sectorEvents.length > 0 && (
                <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4 shadow-sm">
                  <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-brand-brass" />
                    Événements déclencheurs commerciaux
                  </h3>
                  <div className="space-y-3.5 divide-y divide-border/40">
                    {sectorEvents.map((evt) => (
                      <div key={evt.id} className="pt-3.5 first:pt-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted">{formatDateFr(evt.event_date)}</span>
                          <span className="rounded bg-brand-brass/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-brass uppercase tracking-wider">
                            {evt.event_type}
                          </span>
                        </div>
                        <h4 className="font-heading text-xs font-bold text-heading mt-0.5">{evt.title}</h4>
                        {evt.description && <p className="text-xxs text-body leading-relaxed mt-1">{evt.description}</p>}
                        {evt.commercial_opportunity && (
                          <div className="rounded bg-canvas/40 border border-border/50 p-2 text-xxs mt-2">
                            <span className="font-bold text-heading block">Opportunité commerciale :</span>
                            <span className="text-body leading-normal">{evt.commercial_opportunity}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reader Modal */}
      <IntelligenceReaderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        data={selectedData}
      />
    </div>
  )
}
