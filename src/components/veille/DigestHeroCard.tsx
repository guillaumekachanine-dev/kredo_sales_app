"use client"

import { formatDateFr } from "@/lib/formatters"
import type { VeilleDigest, VeilleArticle } from "@/app/(app)/veille/_data/veille-data"

interface DigestHeroCardProps {
  digest: VeilleDigest
  articles: VeilleArticle[]
  onOpenDigest: () => void
  onOpenArticle: (article: VeilleArticle) => void
}

export function DigestHeroCard({
  digest,
  articles,
  onOpenDigest,
  onOpenArticle,
}: DigestHeroCardProps) {
  // Use first 3 articles as "key insights"
  const keyInsights = articles.slice(0, 3)

  return (
    <article className="rounded-[var(--radius-medium)] border border-border bg-surface shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Left Pane: Executive Summary */}
      <div className="flex-1 p-6 space-y-4 border-b md:border-b-0 md:border-r border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
              Dernier Briefing
            </span>
            <span className="text-xxs text-muted font-medium">
              Généré le {formatDateFr(digest.digest_date)}
            </span>
          </div>
          <h1 className="font-heading text-lg md:text-xl font-bold leading-tight text-heading">
            {digest.titre_digest}
          </h1>
        </div>

        <p className="text-xs text-body leading-relaxed line-clamp-4 md:line-clamp-none">
          {digest.resume_hebdo}
        </p>

        {/* Stats and CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex gap-4 text-xxs text-muted">
            {digest.nb_sources_actives > 0 && (
              <div>
                <strong className="text-heading font-semibold">
                  {digest.nb_sources_actives}
                </strong>{" "}
                sources actives
              </div>
            )}
            {digest.nb_candidats_evalues > 0 && (
              <div>
                <strong className="text-heading font-semibold">
                  {digest.nb_candidats_evalues}
                </strong>{" "}
                signaux scannés
              </div>
            )}
            {articles.length > 0 && (
              <div>
                <strong className="text-heading font-semibold">
                  {articles.length}
                </strong>{" "}
                retenus
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenDigest}
            className="inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Lire le résumé complet</span>
            <svg
              className="size-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right Pane: Key Takeaways (3 Enseignements clés) */}
      <div className="w-full md:w-80 bg-canvas/30 p-6 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-2">
            <svg
              className="size-4 text-brand-brass"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Enseignements clés
          </h2>

          {keyInsights.length === 0 ? (
            <p className="text-xxs text-muted italic">Aucun article associé pour ce digest.</p>
          ) : (
            <div className="space-y-3">
              {keyInsights.map((insight, idx) => (
                <div
                  key={insight.id}
                  onClick={() => onOpenArticle(insight)}
                  className="group cursor-pointer space-y-1 block hover:bg-surface/50 p-2 -mx-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-muted uppercase">
                      0{idx + 1} · {insight.categorie}
                    </span>
                  </div>
                  <h3 className="font-heading text-xxs font-bold text-heading group-hover:text-primary transition-colors line-clamp-2">
                    {insight.titre_fr}
                  </h3>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand visual baseline */}
        <div className="text-[10px] text-muted border-t border-border/60 pt-3 italic">
          IA-powered commercial intelligence.
        </div>
      </div>
    </article>
  )
}
