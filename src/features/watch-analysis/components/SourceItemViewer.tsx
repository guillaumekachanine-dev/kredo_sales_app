"use client"

// Volet latéral "Consulter" du picker de sources — mécanisme calqué sur
// `KnowledgeDocumentViewer` (modale « Gérer la connaissance ») : un troisième
// panneau se déploie à droite, alimenté par un fetch dédié par famille de
// source (digest/article, document d'intelligence, signal compte, liste).

import { useEffect, useState } from "react"
import { formatDateFr } from "@/lib/formatters"
import {
  fetchResolvedCollectionItemDetail,
  fetchResolvedCollectionItems,
} from "@/features/content-collections/data/content-collections-client-queries"
import type {
  ResolvedCollectionItem,
  ResolvedCollectionItemDetail,
} from "@/features/content-collections/domain/content-collections-contracts"
import { fetchAccountSignalDetailForPicker, type PickerAccountSignalDetail } from "../data/watch-analysis-client-queries"
import { SOURCE_FAMILY_LABELS, type SourceFamily } from "../domain/source-family"

export type SourceViewerTarget = {
  family: SourceFamily
  id: string
  title: string
}

type ViewerResult =
  | { status: "error"; message: string }
  | { status: "article"; detail: ResolvedCollectionItemDetail }
  | { status: "document"; detail: ResolvedCollectionItemDetail }
  | { status: "signal"; detail: PickerAccountSignalDetail }
  | { status: "collection"; detail: ResolvedCollectionItemDetail; items: ResolvedCollectionItem[] }

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
}

export function SourceItemViewer({ target, onClose }: { target: SourceViewerTarget; onClose: () => void }) {
  // `loadedKey` est DÉRIVÉ (jamais posé par un setState synchrone en corps
  // d'effet, cf. `usePickerList`) : `isLoading` compare la clé courante à la
  // clé résolue, seuls les callbacks `.then`/`.catch` écrivent l'état.
  const [result, setResult] = useState<ViewerResult | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const key = `${target.family}:${target.id}`

  useEffect(() => {
    let active = true

    const load = async () => {
      if (target.family === "digest") {
        const detail = await fetchResolvedCollectionItemDetail("veille_article", target.id)
        return detail ? ({ status: "article", detail } as const) : ({ status: "error", message: "Article introuvable." } as const)
      }
      if (target.family === "intelligence_documents") {
        const detail = await fetchResolvedCollectionItemDetail("intelligence_document", target.id)
        return detail ? ({ status: "document", detail } as const) : ({ status: "error", message: "Document introuvable." } as const)
      }
      if (target.family === "account_signals") {
        const detail = await fetchAccountSignalDetailForPicker(target.id)
        return detail ? ({ status: "signal", detail } as const) : ({ status: "error", message: "Signal introuvable." } as const)
      }
      // knowledge_collection : détail de la liste/corpus + aperçu de son contenu
      const [detail, items] = await Promise.all([
        fetchResolvedCollectionItemDetail("knowledge_list", target.id),
        fetchResolvedCollectionItems(target.id),
      ])
      return detail ? ({ status: "collection", detail, items } as const) : ({ status: "error", message: "Liste introuvable." } as const)
    }

    load()
      .then((next) => {
        if (!active) return
        setResult(next)
        setLoadedKey(key)
      })
      .catch(() => {
        if (!active) return
        setResult({ status: "error", message: "Erreur lors du chargement." })
        setLoadedKey(key)
      })

    return () => {
      active = false
    }
  }, [key, target.family, target.id])

  const isLoading = loadedKey !== key

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950/40 border-l border-white/5 transition-all duration-500 ease-out">
      {/* Header du viewer */}
      <div className="shrink-0 border-b border-white/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full bg-brand-brass/20 border border-brand-brass/40 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-brass">
              {SOURCE_FAMILY_LABELS[target.family]}
            </span>
            <h3 className="mt-2 font-heading text-lg font-bold leading-snug text-white">{target.title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
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

      {/* Contenu */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {isLoading || !result ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <span className="size-7 rounded-full border-2 border-brand-brass border-t-transparent animate-spin" />
            <p className="text-xs text-white/60">Chargement…</p>
          </div>
        ) : result.status === "error" ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs font-semibold text-danger">
            {result.message}
          </div>
        ) : result.status === "article" ? (
          <ArticleContent detail={result.detail} />
        ) : result.status === "document" ? (
          <DocumentContent detail={result.detail} />
        ) : result.status === "signal" ? (
          <SignalContent detail={result.detail} />
        ) : (
          <CollectionContent detail={result.detail} items={result.items} />
        )}
      </div>
    </div>
  )
}

function ArticleContent({ detail }: { detail: ResolvedCollectionItemDetail }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-xl space-y-4">
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

        {!detail.resume && !detail.analyseKredo && !detail.actionCommerciale ? (
          <p className="text-xs italic text-slate-500">Aucun contenu disponible pour cet article.</p>
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

      <MetaTable
        rows={[
          detail.sourceName ? ["Source", detail.sourceName] : null,
          detail.categoryLabel ? ["Catégorie", detail.categoryLabel] : null,
          detail.secteurPrincipal ? ["Secteur principal", detail.secteurPrincipal] : null,
          detail.digestTitle ? ["Digest", detail.digestTitle] : null,
          detail.date ? ["Date", formatDateFr(detail.date)] : null,
          detail.tags && detail.tags.length > 0 ? ["Tags", detail.tags.join(", ")] : null,
        ]}
      />
    </>
  )
}

function DocumentContent({ detail }: { detail: ResolvedCollectionItemDetail }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-xl space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contenu du document</h4>
        {detail.contentText ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{detail.contentText}</div>
        ) : (
          <p className="text-xs italic text-slate-500">Aucun contenu textuel disponible.</p>
        )}
      </div>

      <MetaTable
        rows={[
          detail.categoryLabel ? ["Type", detail.categoryLabel] : null,
          detail.date ? ["Dernière mise à jour", formatDateFr(detail.date)] : null,
        ]}
      />
    </>
  )
}

function SignalContent({ detail }: { detail: PickerAccountSignalDetail }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-xl space-y-4">
        {detail.summary ? (
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Résumé</h4>
            <p className="text-sm leading-relaxed text-slate-800">{detail.summary}</p>
          </div>
        ) : null}

        {detail.recommendedAction ? (
          <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Action recommandée</h4>
            <p className="text-sm leading-relaxed text-slate-900 font-medium">{detail.recommendedAction}</p>
          </div>
        ) : null}

        {detail.scoreJustification ? (
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Justification du score</h4>
            <p className="text-sm leading-relaxed text-slate-800">{detail.scoreJustification}</p>
          </div>
        ) : null}

        {!detail.summary && !detail.recommendedAction && !detail.scoreJustification ? (
          <p className="text-xs italic text-slate-500">Aucun contenu qualitatif disponible pour ce signal.</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ScoreTile label="Score global" value={detail.globalScore} />
        <ScoreTile label="Urgence" value={detail.urgencyScore} />
        <ScoreTile label="Confiance" value={detail.confidenceScore} />
        <ScoreTile label="Valeur potentielle" value={detail.potentialValueScore} />
      </div>

      <MetaTable
        rows={[
          detail.companyName ? ["Compte", detail.companyName] : null,
          ["Type", humanize(detail.signalType)],
          ["Catégorie", humanize(detail.signalCategory)],
          ["Détecté le", formatDateFr(detail.detectedAt)],
          detail.eventAt ? ["Événement le", formatDateFr(detail.eventAt)] : null,
        ]}
      />
    </>
  )
}

function CollectionContent({ detail, items }: { detail: ResolvedCollectionItemDetail; items: ResolvedCollectionItem[] }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900 shadow-xl space-y-3">
        {detail.resume ? (
          <p className="text-sm leading-relaxed text-slate-800">{detail.resume}</p>
        ) : (
          <p className="text-xs italic text-slate-500">Aucune description.</p>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
          Contenu ({items.length})
        </h4>
        {items.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs italic text-white/50">
            Cette liste est vide.
          </p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03]">
            {items.map((item) => (
              <li key={item.membershipId} className="px-3.5 py-2.5">
                <p className="truncate text-xs font-bold text-white">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  {[item.typeLabel, item.date ? formatDateFr(item.date) : null].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function MetaTable({ rows }: { rows: Array<[string, string] | null> }) {
  const visible = rows.filter((row): row is [string, string] => row !== null)
  if (visible.length === 0) return null

  return (
    <div className="space-y-2 pt-2 border-t border-white/5">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">Paramètres</h4>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2 text-xs">
        {visible.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-white/50">{label} :</span>
            <span className="font-semibold text-white/90">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
