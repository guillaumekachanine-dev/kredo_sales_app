"use client"

import { cn } from "@/lib/utils"
import type { CompanyContextStats, VeilleArticle } from "@/app/(app)/veille/_data/veille-data"
import {
  IconAlertCircle,
  IconBook,
  IconChevronLeft,
  IconExternalLink,
} from "./icons"
import {
  categoryAccentSlot,
  formatNewsDate,
  normalizeCategory,
  type CategoryAccentSlot,
} from "./veille-mobile-view-models"

export type ArticleAction = "pitch" | "qualify" | "link" | "opportunity"

type VeilleArticleReaderProps = {
  article: VeilleArticle
  matchedCompany: CompanyContextStats | null
  onBack: () => void
  onAction: (action: ArticleAction) => void
}

/**
 * Teintes de catégorie. La couleur vit dans la pastille et le fond ; le libellé
 * reste en `text-heading` car la palette `dataviz` est trop claire pour servir
 * d'encre sur blanc (cf. `categoryAccentSlot`).
 */
const ACCENT_CLASSES: Record<CategoryAccentSlot, { chip: string; dot: string }> = {
  1: { chip: "bg-dataviz-1/10 border-dataviz-1/30", dot: "bg-dataviz-1" },
  2: { chip: "bg-dataviz-2/10 border-dataviz-2/30", dot: "bg-dataviz-2" },
  3: { chip: "bg-dataviz-3/10 border-dataviz-3/30", dot: "bg-dataviz-3" },
  4: { chip: "bg-dataviz-4/10 border-dataviz-4/30", dot: "bg-dataviz-4" },
  5: { chip: "bg-dataviz-5/10 border-dataviz-5/30", dot: "bg-dataviz-5" },
  6: { chip: "bg-dataviz-6/10 border-dataviz-6/30", dot: "bg-dataviz-6" },
  7: { chip: "bg-dataviz-7/10 border-dataviz-7/30", dot: "bg-dataviz-7" },
}

const ACTIONS: Array<{ id: ArticleAction; label: string }> = [
  { id: "pitch", label: "Générer un pitch / mail" },
  { id: "qualify", label: "Qualifier le signal" },
  { id: "link", label: "Ajouter à la liste" },
  { id: "opportunity", label: "Créer une fenêtre commerciale" },
]

export function VeilleArticleReader({
  article,
  matchedCompany,
  onBack,
  onAction,
}: VeilleArticleReaderProps) {
  const category = normalizeCategory(article.categorie)
  const accent = ACCENT_CLASSES[categoryAccentSlot(category?.key)]
  const publishedLabel = formatNewsDate(article.published_at)

  return (
    <div className="veille-scrollbar h-full overflow-y-auto overscroll-contain bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-2 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
        >
          <IconChevronLeft className="size-5" />
          Actualités
        </button>

        {/* Accès à la source : icône seule, en haut à droite. */}
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              article.source_name ? `Ouvrir la source sur ${article.source_name}` : "Ouvrir la source"
            }
            title="Ouvrir la source"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-small)] border border-border text-primary outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading"
          >
            <IconExternalLink className="size-5" />
          </a>
        ) : null}
      </div>

      <article className="px-4 pb-6 pt-4">
        {category ? (
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1",
              accent.chip,
            )}
          >
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", accent.dot)} />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-heading">
              {category.label}
            </span>
          </span>
        ) : null}

        <p className="mt-3 text-[13px] text-muted">
          {[article.source_name, publishedLabel].filter(Boolean).join(" • ")}
        </p>

        <h2 className="mt-2 font-heading text-[26px] font-bold leading-[1.22] tracking-tight text-heading">
          {article.titre_fr}
        </h2>

        {article.resume ? (
          <p className="mt-4 text-[15px] leading-[1.6] text-body">{article.resume}</p>
        ) : null}

        {article.analyse_kredo ? (
          <ReaderSection
            icon={<IconAlertCircle className="size-7" />}
            title="Pourquoi c'est important"
            body={article.analyse_kredo}
          />
        ) : null}

        {article.action_commerciale ? (
          <ReaderSection
            icon={<IconBook className="size-7" />}
            title="Lecture commerciale"
            body={article.action_commerciale}
          />
        ) : null}

        <section className="mt-6 border-t border-border pt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Actions commerciales
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction(action.id)}
                className="flex min-h-16 items-center justify-center rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2 text-center text-[13px] font-semibold leading-[1.25] text-heading outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading"
              >
                {action.label}
              </button>
            ))}
          </div>

          {matchedCompany ? (
            <p className="mt-3 text-xs text-muted">
              Compte détecté dans le texte : <strong className="text-heading">{matchedCompany.name}</strong>
            </p>
          ) : null}
        </section>
      </article>
    </div>
  )
}

function ReaderSection({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <section className="mt-6 border-t border-border pt-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-bold leading-6 text-primary">{title}</h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-body">{body}</p>
        </div>
      </div>
    </section>
  )
}
