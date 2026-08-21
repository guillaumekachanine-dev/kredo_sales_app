"use client"

import { useMemo, useState } from "react"
import type { SegmentNewsLibrary, SegmentNewsLibraryItem } from "../data/business-intelligence-workspace-types"
import { provenanceLabel } from "../home/home-model"

type NewsTypeFilter = "all" | "news" | "signal"
type NewsPeriodFilter = "all" | "30d" | "90d" | "365d"

function formatDate(value: string | null): string {
  if (!value) return "Date non renseignée"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function filterByPeriod(item: SegmentNewsLibraryItem, period: NewsPeriodFilter): boolean {
  if (period === "all" || !item.publishedAt) return true
  const itemTime = new Date(item.publishedAt).getTime()
  if (Number.isNaN(itemTime)) return true
  const now = Date.now()
  const daysDiff = (now - itemTime) / (1000 * 60 * 60 * 24)
  if (period === "30d") return daysDiff <= 30
  if (period === "90d") return daysDiff <= 90
  if (period === "365d") return daysDiff <= 365
  return true
}

export function SectorNewsChapterDesktop({ news }: { news: SegmentNewsLibrary }) {
  const [typeFilter, setTypeFilter] = useState<NewsTypeFilter>("all")
  const [periodFilter, setPeriodFilter] = useState<NewsPeriodFilter>("all")

  const filteredItems = useMemo(() => {
    return news.items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false
      return filterByPeriod(item, periodFilter)
    })
  }, [news.items, typeFilter, periodFilter])

  const newsCount = news.items.filter((i) => i.type === "news").length
  const signalCount = news.items.filter((i) => i.type === "signal").length

  return (
    <div className="space-y-6" data-chapter="sector-news">
      {/* En-tête du chapitre */}
      <section className="rounded-xl border border-edito-border bg-edito-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Veille & Signaux d’affaires</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-edito-navy">Actualités sectorielles</h1>
            <p className="mt-1 text-xs text-edito-body">
              Bibliothèque de veille sectorielle et signaux actionnables du segment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-edito-border bg-edito-canvas px-3 py-1.5 text-xs font-semibold text-edito-navy">
              {newsCount} actualité{newsCount > 1 ? "s" : ""} · {signalCount} signal{signalCount > 1 ? "aux" : ""}
            </span>
          </div>
        </div>

        {/* Barre de filtres */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-edito-border pt-4">
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Filtrer par type de contenu">
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted mr-1">Type :</span>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter === "all"}
              onClick={() => setTypeFilter("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30 ${
                typeFilter === "all"
                  ? "bg-edito-navy text-text-inverse"
                  : "border border-edito-border bg-edito-surface text-edito-body hover:bg-edito-canvas"
              }`}
            >
              Tous ({news.items.length})
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter === "news"}
              onClick={() => setTypeFilter("news")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30 ${
                typeFilter === "news"
                  ? "bg-edito-navy text-text-inverse"
                  : "border border-edito-border bg-edito-surface text-edito-body hover:bg-edito-canvas"
              }`}
            >
              Actualités ({newsCount})
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={typeFilter === "signal"}
              onClick={() => setTypeFilter("signal")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30 ${
                typeFilter === "signal"
                  ? "bg-edito-navy text-text-inverse"
                  : "border border-edito-border bg-edito-surface text-edito-body hover:bg-edito-canvas"
              }`}
            >
              Signaux ({signalCount})
            </button>
          </div>

          <div className="flex items-center gap-2" role="radiogroup" aria-label="Filtrer par période">
            <span className="text-[10px] font-bold uppercase tracking-wider text-edito-muted mr-1">Période :</span>
            {(
              [
                { id: "all", label: "Toutes" },
                { id: "30d", label: "30 jours" },
                { id: "90d", label: "90 jours" },
                { id: "365d", label: "1 an" },
              ] as const
            ).map((period) => (
              <button
                key={period.id}
                type="button"
                role="radio"
                aria-checked={periodFilter === period.id}
                onClick={() => setPeriodFilter(period.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30 ${
                  periodFilter === period.id
                    ? "bg-edito-chip font-bold text-edito-navy border border-edito-border"
                    : "text-edito-muted hover:text-edito-body"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Liste des contenus */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-edito-border bg-edito-surface p-10 text-center">
          <h2 className="font-heading text-base font-bold text-edito-navy">Aucun contenu trouvé</h2>
          <p className="mt-1 text-xs text-edito-muted">
            Aucune actualité ni aucun signal ne correspond aux filtres sélectionnés.
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-edito-border bg-edito-surface overflow-hidden">
          <ul className="divide-y divide-edito-border">
            {filteredItems.map((item) => (
              <li key={`${item.type}-${item.id}`} className="p-5 transition-colors hover:bg-edito-canvas/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          item.type === "signal"
                            ? "bg-edito-brass/20 text-edito-brass border border-edito-brass/40"
                            : "bg-edito-chip text-edito-navy border border-edito-border"
                        }`}
                      >
                        {item.type === "signal" ? "Signal d’affaires" : "Actualité"}
                      </span>
                      {item.source ? (
                        <span className="text-[10px] font-semibold text-edito-muted">{item.source}</span>
                      ) : null}
                      <span className="text-[10px] text-edito-muted">· {formatDate(item.publishedAt)}</span>
                      {item.level ? (
                        <span className="rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold text-edito-muted">
                          {provenanceLabel(item.level)}
                        </span>
                      ) : null}
                      {item.urgencyScore !== null && item.urgencyScore > 0 ? (
                        <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold text-danger">
                          U. {item.urgencyScore}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-2 font-heading text-sm font-bold text-edito-navy">{item.title}</h2>

                    {item.summary ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-edito-body max-w-4xl">{item.summary}</p>
                    ) : null}

                    {item.recommendedAction ? (
                      <p className="mt-2 text-xs font-semibold text-edito-petrol">
                        Action recommandée : {item.recommendedAction}
                      </p>
                    ) : null}
                  </div>

                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex min-h-9 items-center rounded-md border border-edito-border bg-edito-surface px-3 text-xs font-semibold text-edito-navy transition-colors hover:bg-edito-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
                    >
                      Source ↗
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function SectorNewsChapterMobile({ news }: { news: SegmentNewsLibrary }) {
  const [typeFilter, setTypeFilter] = useState<NewsTypeFilter>("all")

  const filteredItems = useMemo(() => {
    if (typeFilter === "all") return news.items
    return news.items.filter((item) => item.type === typeFilter)
  }, [news.items, typeFilter])

  const newsCount = news.items.filter((i) => i.type === "news").length
  const signalCount = news.items.filter((i) => i.type === "signal").length

  return (
    <div className="space-y-4 px-4 py-4" data-chapter="sector-news-mobile">
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Veille sectorielle</p>
        <h1 className="mt-1 font-heading text-xl font-bold text-heading">Actualités & Signaux</h1>
        <p className="mt-1 text-xs text-muted">
          {news.items.length} contenu{news.items.length > 1 ? "s" : ""} disponible{news.items.length > 1 ? "s" : ""}
        </p>

        {/* Pilules de filtres mobiles */}
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`min-h-11 flex-1 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              typeFilter === "all"
                ? "bg-brand-primary text-text-inverse"
                : "border border-border bg-surface text-body"
            }`}
          >
            Tous ({news.items.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("news")}
            className={`min-h-11 flex-1 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              typeFilter === "news"
                ? "bg-brand-primary text-text-inverse"
                : "border border-border bg-surface text-body"
            }`}
          >
            News ({newsCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("signal")}
            className={`min-h-11 flex-1 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              typeFilter === "signal"
                ? "bg-brand-primary text-text-inverse"
                : "border border-border bg-surface text-body"
            }`}
          >
            Signaux ({signalCount})
          </button>
        </div>
      </section>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-xs text-muted">Aucun contenu trouvé pour ce filtre.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((item) => (
            <li key={`${item.type}-${item.id}`} className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    item.type === "signal"
                      ? "bg-brand-brass/20 text-brand-brass"
                      : "bg-surface-raised text-muted"
                  }`}
                >
                  {item.type === "signal" ? "Signal" : item.source ?? "Actualité"}
                </span>
                <time className="text-[10px] text-muted">{formatDate(item.publishedAt)}</time>
              </div>

              <h2 className="font-heading text-xs font-bold text-heading leading-snug">{item.title}</h2>

              {item.summary ? (
                <p className="text-[11px] leading-relaxed text-body">{item.summary}</p>
              ) : null}

              {item.recommendedAction ? (
                <p className="text-[10px] font-semibold text-primary">
                  Action : {item.recommendedAction}
                </p>
              ) : null}

              {item.url ? (
                <div className="pt-2 border-t border-border/50">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-surface-raised text-xs font-semibold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Consulter la source ↗
                  </a>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
