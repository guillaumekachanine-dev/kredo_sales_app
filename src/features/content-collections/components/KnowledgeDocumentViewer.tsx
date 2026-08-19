"use client"

import { useEffect, useState } from "react"
import { formatDateFr } from "@/lib/formatters"
import { fetchResolvedCollectionItemDetail } from "../data/content-collections-client-queries"
import type { ResolvedCollectionItem, ResolvedCollectionItemDetail } from "../domain/content-collections-contracts"

export interface KnowledgeDocumentViewerProps {
  item: ResolvedCollectionItem
  onCloseViewer: () => void
}

export function KnowledgeDocumentViewer({ item, onCloseViewer }: KnowledgeDocumentViewerProps) {
  const [detail, setDetail] = useState<ResolvedCollectionItemDetail | null>(null)
  const [loadedContentId, setLoadedContentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchResolvedCollectionItemDetail(item.contentType, item.contentId)
      .then((data) => {
        if (!active) return
        if (!data) {
          setError("Impossible de charger les détails du document.")
        } else {
          setDetail(data)
          setError(null)
        }
        setLoadedContentId(item.contentId)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Erreur lors du chargement du document.")
        setLoadedContentId(item.contentId)
      })
    return () => {
      active = false
    }
  }, [item.contentType, item.contentId])

  const isLoading = loadedContentId !== item.contentId

  const categoryChip = detail?.categoryLabel || item.categoryLabel || null
  const typeChip = detail?.typeLabel || item.typeLabel

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40 border-l border-white/5 transition-all duration-500 ease-out">
      {/* Header du viewer */}
      <div className="shrink-0 border-b border-white/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Ligne 1 : Pastilles Type et Catégorie */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex rounded-full bg-brand-brass/20 border border-brand-brass/40 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-brass">
                {typeChip}
              </span>
              {categoryChip ? (
                <span className="inline-flex rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/80">
                  {categoryChip}
                </span>
              ) : null}
            </div>

            {/* Ligne 2 : Titre principal */}
            <h3 className="font-heading text-lg font-bold leading-snug text-white">
              {detail?.title || item.title}
            </h3>

            {/* Ligne 3 : Provenance / Digest */}
            {detail?.digestTitle || detail?.sourceName ? (
              <p className="mt-1 text-xs text-white/70 truncate">
                {detail.digestTitle ? (
                  <>
                    {detail.digestTitle}
                    {detail.digestDate ? ` · Digest du ${formatDateFr(detail.digestDate)}` : ""}
                  </>
                ) : (
                  `Source : ${detail.sourceName}`
                )}
              </p>
            ) : null}

            {/* Ligne 4 : Date de publication / création */}
            <p className="mt-1 text-[11px] text-white/50">
              {detail?.date || item.date ? `Date : ${formatDateFr((detail?.date || item.date)!)}` : "Date non renseignée"}
            </p>
          </div>

          {/* Bouton de fermeture du viewer */}
          <button
            type="button"
            onClick={onCloseViewer}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Fermer la visionneuse"
            aria-label="Fermer la visionneuse"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu principal et surface de lecture */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="size-7 rounded-full border-2 border-brand-brass border-t-transparent animate-spin" />
            <p className="text-xs text-white/60">Chargement du document…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs font-semibold text-danger">
            {error}
          </div>
        ) : (
          <>
            {/* Surface de lecture claire (Fond clair épuré) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-xl space-y-4">
              {detail?.contentType === "veille_article" ? (
                <div className="space-y-4">
                  {detail.resume ? (
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Résumé</h4>
                      <p className="text-sm leading-relaxed text-slate-800">{detail.resume}</p>
                    </div>
                  ) : null}

                  {detail.analyseKredo ? (
                    <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Pourquoi c&apos;est important (Analyse Kredo)
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-900 font-medium">{detail.analyseKredo}</p>
                    </div>
                  ) : null}

                  {detail.actionCommerciale ? (
                    <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Action commerciale préconisée
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-800">{detail.actionCommerciale}</p>
                    </div>
                  ) : null}

                  {detail.url ? (
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <a
                        href={detail.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-amber-700 hover:underline"
                      >
                        Consulter l&apos;article original ↗
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contenu du document</h4>
                  {detail?.contentText ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                      {detail.contentText}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-500">Aucun contenu textuel disponible.</p>
                  )}
                </div>
              )}
            </div>

            {/* Section Paramètres (Métadonnées réelles uniquement) */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                Paramètres
              </h4>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2 text-xs">
                {detail?.sourceName ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Source :</span>
                    <span className="font-semibold text-white/90">{detail.sourceName}</span>
                  </div>
                ) : null}
                {categoryChip ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Catégorie :</span>
                    <span className="font-semibold text-white/90">{categoryChip}</span>
                  </div>
                ) : null}
                {detail?.secteurPrincipal ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Secteur principal :</span>
                    <span className="font-semibold text-white/90">{detail.secteurPrincipal}</span>
                  </div>
                ) : null}
                {detail?.digestTitle ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Digest :</span>
                    <span className="font-semibold text-white/90">{detail.digestTitle}</span>
                  </div>
                ) : null}
                {detail?.tags && detail.tags.length > 0 ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-white/50">Tags :</span>
                    <span className="font-semibold text-white/90">{detail.tags.join(", ")}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
