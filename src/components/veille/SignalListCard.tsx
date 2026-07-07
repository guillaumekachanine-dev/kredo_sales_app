"use client"

import type { VeilleArticle } from "@/app/(app)/veille/_data/veille-data"
import { getRelativeTimeFr } from "./veille-utils"

interface SignalListCardProps {
  article: VeilleArticle
  isActive: boolean
  onClick: () => void
  companyName?: string
}

export function SignalListCard({
  article,
  isActive,
  onClick,
  companyName,
}: SignalListCardProps) {
  // Compute priority badge based on selection_rank
  // selection_rank 1-2: Élevée, 3-4: Moyenne, >=5: Faible
  const rank = article.selection_rank
  let priorityLabel = "Faible"
  let priorityClass = "border-[#242F52] bg-[#242F52]/10 text-muted"

  if (rank <= 2) {
    priorityLabel = "Élevée"
    priorityClass = "border-danger/30 bg-danger/10 text-[#FF6B6B]"
  } else if (rank <= 4) {
    priorityLabel = "Moyenne"
    priorityClass = "border-primary/30 bg-primary/10 text-primary"
  }

  // Display name: Account name (if matched) or sector
  const displayAccount = companyName || article.secteur_principal || "Transverse"

  return (
    <article
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-4 space-y-3 transition-all duration-200 ${isActive
          ? "border-primary/80 bg-[var(--color-surface-hover)] shadow-[0_0_12px_rgba(226,147,29,0.1)]"
          : "border-border/40 bg-surface/30 hover:bg-surface-hover/20 hover:border-border/80"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-heading text-xs font-bold leading-snug transition-colors line-clamp-2 ${isActive ? "text-primary" : "text-heading group-hover:text-primary"
          }`}>
          {article.titre_fr}
        </h3>
        {isActive && (
          <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">
            <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
            </svg>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-body font-medium truncate max-w-[120px]">
          {displayAccount}
        </span>
        <span className="text-muted shrink-0">
          {getRelativeTimeFr(article.published_at)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
        <span className="text-[9px] text-muted uppercase font-bold tracking-wider">
          {article.categorie || "Signal"}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${priorityClass}`}>
          {priorityLabel}
        </span>
      </div>
    </article>
  )
}
