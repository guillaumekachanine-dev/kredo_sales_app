"use client"

import { useState } from "react"
import { formatDateFr } from "@/lib/formatters"
import { NewsSignalCard } from "./NewsSignalCard"
import { IntelligenceReaderModal } from "./IntelligenceReaderModal"
import type { 
  VeilleDigest, 
  VeilleArticle, 
  SectorNews, 
  SectorEvent 
} from "@/app/(app)/veille/_data/veille-data"

interface VeilleActualitesMobileProps {
  digest: VeilleDigest | null
  articles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
}

export function VeilleActualitesMobile({
  digest,
  articles,
  pastDigests,
  sectorNews,
  sectorEvents,
}: VeilleActualitesMobileProps) {
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

  const hasData = !!digest
  const keyInsights = articles.slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto bg-canvas pb-20">
      {/* Mobile Sticky / Regular Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] bg-surface border-b border-border/80 px-4 py-3.5 space-y-0.5">
        <h1 className="font-heading text-base font-bold text-heading">
          Veille & actualités
        </h1>
        <p className="text-[10px] text-body">
          Briefing commercial hebdomadaire
        </p>
      </header>

      <div className="p-4 space-y-5">
        {hasData ? (
          <>
            {/* Condensed Digest Hero Card */}
            <article className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
                    Briefing
                  </span>
                  <span className="text-xxs text-muted font-medium">
                    {formatDateFr(digest.digest_date)}
                  </span>
                </div>
                <h2 className="font-heading text-sm font-bold text-heading leading-tight">
                  {digest.titre_digest}
                </h2>
              </div>

              {/* 3 Enseignements Clés list */}
              {keyInsights.length > 0 && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <span className="text-[10px] font-bold text-heading uppercase tracking-wider block">
                    Enseignements clés
                  </span>
                  <div className="space-y-2">
                    {keyInsights.map((insight, idx) => (
                      <div
                        key={insight.id}
                        onClick={() => handleOpenArticle(insight)}
                        className="flex items-start gap-2 active:bg-canvas/50 p-1.5 -mx-1.5 rounded transition-colors"
                      >
                        <span className="font-bold text-xxs text-brand-brass shrink-0 mt-0.5">
                          0{idx + 1}
                        </span>
                        <p className="text-xxs text-body leading-relaxed font-medium line-clamp-2">
                          {insight.titre_fr}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA button (Minimum height 44px for touch targets) */}
              <button
                type="button"
                onClick={() => handleOpenDigest(digest)}
                className="w-full min-h-[44px] flex items-center justify-center rounded-[var(--radius-medium)] bg-primary text-primary-fg text-xs font-bold shadow hover:bg-primary-deep transition-colors"
              >
                Ouvrir le briefing
              </button>
            </article>

            {/* Vertical Articles Feed */}
            <section className="space-y-3">
              <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider flex items-center gap-1.5 pl-1">
                <span className="size-1.5 rounded-full bg-primary" />
                Signaux du briefing ({articles.length})
              </h3>
              <div className="space-y-3">
                {articles.map((article) => (
                  <NewsSignalCard
                    key={article.id}
                    article={article}
                    onOpen={() => handleOpenArticle(article)}
                  />
                ))}
              </div>
            </section>

            {/* Past digests list (Touch target list) */}
            {pastDigests.length > 1 && (
              <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 space-y-3">
                <h3 className="font-heading text-xs font-bold text-heading">
                  Briefings précédents
                </h3>
                <div className="divide-y divide-border/50">
                  {pastDigests.slice(1).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleOpenDigest(d)}
                      className="w-full text-left py-3 active:bg-canvas/30 rounded px-1 -mx-1 flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="block text-[9px] text-muted">
                          {formatDateFr(d.digest_date)}
                        </span>
                        <span className="block font-heading text-xxs font-bold text-heading line-clamp-1">
                          {d.titre_digest}
                        </span>
                      </div>
                      <svg className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="space-y-6">
            <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-8 text-center space-y-3 shadow-sm">
              <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2-3V9m0 0a2 2 0 012 2v3m-2-3h2m-2 3h2m0 0v5a2 2 0 01-2 2h-3" />
                </svg>
              </div>
              <h3 className="font-heading text-xs font-bold text-heading">Aucun briefing</h3>
              <p className="text-xxs text-body leading-relaxed">
                {"Le digest hebdomadaire de veille automatisée n'a pas encore été généré. Dès qu'un run de veille aura eu lieu, vous le retrouverez ici."}
              </p>
            </div>

            {/* Fallbacks */}
            {sectorNews.length > 0 && (
              <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 space-y-3 shadow-sm">
                <h3 className="font-heading text-xs font-bold text-heading flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success" />
                  Actualités sectorielles
                </h3>
                <div className="space-y-3 divide-y divide-border/40">
                  {sectorNews.map((news) => (
                    <div key={news.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[9px] text-muted">{formatDateFr(news.published_at)}</span>
                        {news.source && <span className="text-[9px] text-heading font-semibold">{news.source}</span>}
                      </div>
                      <h4 className="font-heading text-xxs font-bold text-heading leading-tight">{news.title}</h4>
                      {news.summary && <p className="text-xxs text-body leading-relaxed">{news.summary}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sectorEvents.length > 0 && (
              <section className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 space-y-3 shadow-sm">
                <h3 className="font-heading text-xs font-bold text-heading flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-brand-brass" />
                  Événements déclencheurs
                </h3>
                <div className="space-y-3 divide-y divide-border/40">
                  {sectorEvents.map((evt) => (
                    <div key={evt.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-muted">{formatDateFr(evt.event_date)}</span>
                        <span className="rounded bg-brand-brass/10 px-1.5 py-0.5 text-[8px] font-bold text-brand-brass uppercase">
                          {evt.event_type}
                        </span>
                      </div>
                      <h4 className="font-heading text-xxs font-bold text-heading leading-tight">{evt.title}</h4>
                      {evt.commercial_opportunity && (
                        <div className="rounded bg-canvas/40 border border-border/50 p-2 text-xxs mt-1">
                          <span className="text-body leading-normal">{evt.commercial_opportunity}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

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
