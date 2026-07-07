"use client"

import { formatDateFr } from "@/lib/formatters"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import type { VeilleArticle } from "@/app/(app)/veille/_data/veille-data"

interface NewsSignalCardProps {
  article: VeilleArticle
  onOpen: () => void
}

function buildMustInclude(article: VeilleArticle): string {
  const parts = [
    `Signal : ${article.titre_fr}`,
    article.source_name ? `Source : ${article.source_name}` : null,
    `Résumé : ${article.resume}`,
    article.analyse_kredo ? `Analyse KREDO : ${article.analyse_kredo}` : null,
    article.action_commerciale ? `Action commerciale proposée : ${article.action_commerciale}` : null,
    article.secteur_principal || article.categorie
      ? `Contexte : ${[article.secteur_principal, article.categorie].filter(Boolean).join(" / ")}`
      : null,
  ]
  return parts.filter(Boolean).join("\n")
}

export function NewsSignalCard({ article, onOpen }: NewsSignalCardProps) {
  return (
    <article 
      onClick={onOpen}
      className="group cursor-pointer rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4 shadow-sm hover:border-primary/40 hover:shadow transition-all duration-200"
    >
      {/* Top row: Category, Sector badges, and published date */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-primary uppercase tracking-wider">
            {article.categorie || "Signal"}
          </span>
          {article.secteur_principal && (
            <>
              <span className="text-muted">•</span>
              <span className="rounded bg-surface-hover px-1.5 py-0.5 text-muted font-medium">
                {article.secteur_principal}
              </span>
            </>
          )}
        </div>
        {article.published_at && (
          <span className="text-muted">
            {formatDateFr(article.published_at)}
          </span>
        )}
      </div>

      {/* Title & Source */}
      <div className="space-y-1">
        <h3 className="font-heading text-sm font-bold leading-snug text-heading group-hover:text-primary transition-colors">
          {article.titre_fr}
        </h3>
        {article.source_name && (
          <p className="text-xxs text-muted font-medium">
            via <span className="text-heading font-semibold">{article.source_name}</span>
          </p>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-body leading-relaxed line-clamp-3">
        {article.resume}
      </p>

      {/* Analysis Snippet - visually distinct */}
      {article.analyse_kredo && (
        <div className="border-l-2 border-primary/30 pl-3 space-y-1 py-0.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-heading">
            {"Pourquoi c'est important"}
          </h4>
          <p className="text-xxs text-body leading-relaxed line-clamp-2">
            {article.analyse_kredo}
          </p>
        </div>
      )}

      {/* Bottom row: Tags and touch-friendly CTA */}
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40">
        <div className="flex flex-wrap gap-1">
          {article.tags && article.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[9px] text-muted">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openCommunicationComposer({
                origin: "veille_signal",
                preset: {
                  scenario: "signal_outreach",
                  channel: "email",
                  objective: "get_meeting",
                  tone: "direct",
                  length: "standard",
                  mustInclude: buildMustInclude(article),
                },
              })
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface px-3 text-xs font-semibold text-body hover:bg-surface-hover hover:text-heading transition-colors"
          >
            {"Générer un pitch"}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-xs font-bold text-primary hover:underline"
          >
            Consulter
          </button>
        </div>
      </div>
    </article>
  )
}
