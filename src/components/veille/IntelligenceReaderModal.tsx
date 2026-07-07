"use client"

import { AppDialog } from "@/components/ui/AppDialog"
import { formatDateFr } from "@/lib/formatters"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import type { VeilleArticle, VeilleDigest } from "@/app/(app)/veille/_data/veille-data"

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

interface IntelligenceReaderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "article" | "digest"
  data: VeilleArticle | VeilleDigest | null
}

export function IntelligenceReaderModal({
  open,
  onOpenChange,
  type,
  data,
}: IntelligenceReaderModalProps) {
  if (!data) return null

  const isArticle = type === "article"

  if (isArticle) {
    const article = data as VeilleArticle
    return (
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          <div className="flex flex-col gap-1.5 pr-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {article.categorie || "Actualité"}
            </span>
            <h2 className="font-heading text-base font-bold leading-tight text-heading">
              {article.titre_fr}
            </h2>
          </div>
        }
        className="sm:max-w-2xl sm:max-h-[calc(100dvh-6rem)]"
      >
        <div className="space-y-5 text-xs text-body">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xxs text-muted border-b border-border pb-3">
            {article.source_name && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-heading">Source:</span>
                <span>{article.source_name}</span>
              </div>
            )}
            {article.published_at && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-heading">Publié le:</span>
                <span>{formatDateFr(article.published_at)}</span>
              </div>
            )}
            {article.secteur_principal && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-heading">Secteur:</span>
                <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px]">
                  {article.secteur_principal}
                </span>
              </div>
            )}
          </div>

          {/* Résumé */}
          <div className="space-y-2">
            <h3 className="font-heading text-xs font-bold text-heading">
              {"Résumé de l'actualité"}
            </h3>
            <p className="leading-relaxed whitespace-pre-wrap">{article.resume}</p>
          </div>

          {/* Analyse KREDO */}
          {article.analyse_kredo && (
            <div className="rounded-[var(--radius-medium)] border border-primary/10 bg-primary/[0.03] p-4 space-y-2">
              <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                Analyse stratégique KREDO
              </h3>
              <p className="leading-relaxed text-heading whitespace-pre-wrap">
                {article.analyse_kredo}
              </p>
            </div>
          )}

          {/* Action / Angle Commercial */}
          {article.action_commerciale && (
            <div className="rounded-[var(--radius-medium)] border border-brand-brass/25 bg-brand-brass/[0.04] p-4 space-y-2">
              <h3 className="font-heading text-xs font-bold text-brand-brass flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand-brass" />
                Angle commercial & Pitch préconisé
              </h3>
              <p className="leading-relaxed text-heading whitespace-pre-wrap">
                {article.action_commerciale}
              </p>
            </div>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions footer */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
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
              className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-medium)] bg-primary text-primary-fg px-4 text-xs font-bold shadow hover:bg-primary-deep transition-colors"
            >
              {"Générer un pitch"}
            </button>

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
              >
                <span>{"Consulter la source d'origine"}</span>
                <svg
                  className="size-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </AppDialog>
    )
  } else {
    const digest = data as VeilleDigest
    return (
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          <div className="flex flex-col gap-1 pr-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Briefing Hebdomadaire
            </span>
            <h2 className="font-heading text-base font-bold leading-tight text-heading">
              {digest.titre_digest}
            </h2>
          </div>
        }
        className="sm:max-w-2xl sm:max-h-[calc(100dvh-6rem)]"
      >
        <div className="space-y-5 text-xs text-body">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xxs text-muted border-b border-border pb-3">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-heading">Date:</span>
              <span>{formatDateFr(digest.digest_date)}</span>
            </div>
            {digest.nb_sources_actives > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-heading">Sources analysées:</span>
                <span>{digest.nb_sources_actives}</span>
              </div>
            )}
            {digest.nb_candidats_evalues > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-heading">Articles scannés:</span>
                <span>{digest.nb_candidats_evalues}</span>
              </div>
            )}
          </div>

          {/* Résumé exécutif */}
          <div className="space-y-2">
            <h3 className="font-heading text-xs font-bold text-heading">
              Résumé exécutif hebdomadaire
            </h3>
            <p className="leading-relaxed whitespace-pre-wrap">{digest.resume_hebdo}</p>
          </div>

          {/* Modèles IA */}
          <div className="rounded-[var(--radius-medium)] border border-border bg-canvas/30 p-3 flex flex-wrap gap-x-6 gap-y-2 text-xxs text-muted">
            {digest.model_classement && (
              <div>
                <span className="font-semibold text-heading">Tri IA:</span>{" "}
                <code>{digest.model_classement}</code>
              </div>
            )}
            {digest.model_analyse && (
              <div>
                <span className="font-semibold text-heading">Analyse IA:</span>{" "}
                <code>{digest.model_analyse}</code>
              </div>
            )}
          </div>
        </div>
      </AppDialog>
    )
  }
}
