"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  deleteManualSourceAction,
  setManualSourceActiveAction,
} from "../../actions/source-management-actions"
import {
  KREDO_SOURCE_CATEGORY_LABELS,
  KREDO_SOURCE_CATEGORY_ORDER,
  type SourceCatalogEntry,
  type SourceManagementSnapshot,
} from "../../domain/source-management-contracts"
import {
  deleteManualSourceInSnapshot,
  setManualSourceActiveInSnapshot,
} from "../../domain/source-management-reconciliation"
import { MobileDarkSwitch } from "./MobileDarkSwitch"

export interface MobileEditorialSourceListProps {
  sources: SourceCatalogEntry[]
  onEdit: (source: SourceCatalogEntry) => void
  onSnapshotChange?: (updater: (current: SourceManagementSnapshot) => SourceManagementSnapshot) => void
  onRefresh?: () => Promise<void> | void
}

function MobileSourceRow({
  source,
  onEdit,
  onSnapshotChange,
  onRefresh,
}: {
  source: SourceCatalogEntry
  onEdit: (source: SourceCatalogEntry) => void
  onSnapshotChange?: (updater: (current: SourceManagementSnapshot) => SourceManagementSnapshot) => void
  onRefresh?: () => Promise<void> | void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isProtected = source.origin === "system" || Boolean(source.isLocked)

  const toggleActive = (next: boolean) => {
    if (isProtected || !source.id) return
    onSnapshotChange?.((curr) => setManualSourceActiveInSnapshot(curr, source.id, next))
    startTransition(async () => {
      const res = await setManualSourceActiveAction(source.id, next)
      if (!res.success) {
        onSnapshotChange?.((curr) => setManualSourceActiveInSnapshot(curr, source.id, !next))
      } else {
        router.refresh()
        void onRefresh?.()
      }
    })
  }

  const handleDelete = () => {
    if (isProtected || !source.id) return
    startTransition(async () => {
      const res = await deleteManualSourceAction(source.id)
      if (res.success) {
        onSnapshotChange?.((curr) => deleteManualSourceInSnapshot(curr, source.id))
        setConfirmingDelete(false)
        router.refresh()
        void onRefresh?.()
      }
    })
  }

  const displayUrl =
    source.searchDomain ||
    (source.homepageUrl
      ? source.homepageUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
      : "")
  const descriptionText = source.family ?? source.publisher ?? ""

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5 transition-colors">
      {/* Ligne 1 : Nom + Toggle / Statut */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-xs text-white truncate" title={source.name || "Source"}>
            {source.name || "Source sans nom"}
          </p>
          {displayUrl ? (
            <p className="mt-0.5 text-[11px] font-mono text-white/50 truncate">
              {displayUrl}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center">
          {isProtected ? (
            <span className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/50">
              Système
            </span>
          ) : (
            <MobileDarkSwitch
              checked={Boolean(source.isActive)}
              disabled={isPending}
              onChange={toggleActive}
              label={`Activer ou désactiver ${source.name || "la source"}`}
            />
          )}
        </div>
      </div>

      {/* Ligne 2 : Métadonnées + Actions manuelles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-white/50">
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
          {descriptionText ? (
            <span className="truncate">{descriptionText}</span>
          ) : null}
          {source.effectiveness && source.effectiveness.effectivenessScore !== null ? (
            <span className="shrink-0 font-bold font-mono text-brand-brass">
              · {source.effectiveness.effectivenessScore}/100
            </span>
          ) : null}
        </div>

        {!isProtected ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmingDelete(false)}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-white hover:bg-danger/90 transition-colors cursor-pointer"
                >
                  {isPending ? "..." : "Confirmer"}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onEdit(source)}
                  aria-label={`Modifier ${source.name}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmingDelete(true)}
                  aria-label={`Supprimer ${source.name}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-transparent text-xs text-rose-400/80 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function groupByCategory(sources: SourceCatalogEntry[]) {
  const safeSources = (sources ?? []).filter(Boolean)
  const groups = new Map<string, SourceCatalogEntry[]>()
  for (const source of safeSources) {
    const key = source.kredoCategory ?? "__none__"
    const bucket = groups.get(key) ?? []
    bucket.push(source)
    groups.set(key, bucket)
  }
  const ordered: Array<{ key: string; label: string; sources: SourceCatalogEntry[] }> = []
  for (const category of KREDO_SOURCE_CATEGORY_ORDER) {
    const bucket = groups.get(category)
    if (bucket?.length) ordered.push({ key: category, label: KREDO_SOURCE_CATEGORY_LABELS[category], sources: bucket })
  }
  const uncategorized = groups.get("__none__")
  if (uncategorized?.length) ordered.push({ key: "__none__", label: "Non catégorisée", sources: uncategorized })
  return ordered
}

export function MobileEditorialSourceList({
  sources,
  onEdit,
  onSnapshotChange,
  onRefresh,
}: MobileEditorialSourceListProps) {
  const [filterQuery, setFilterQuery] = useState("")

  const filteredSources = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    if (!q) return sources
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.searchDomain && s.searchDomain.toLowerCase().includes(q)) ||
        (s.family && s.family.toLowerCase().includes(q)),
    )
  }, [sources, filterQuery])

  const groups = useMemo(() => groupByCategory(filteredSources), [filteredSources])

  const activeCount = useMemo(() => sources.filter((s) => s.isActive).length, [sources])

  return (
    <div className="space-y-4 pb-6">
      {/* ── BARRE DE RECHERCHE RAPIDE ────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>{activeCount} active(s) sur {sources.length} sources</span>
          {filterQuery ? (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="text-[10px] text-brand-brass hover:underline cursor-pointer"
            >
              Effacer le filtre
            </button>
          ) : null}
        </div>
        <div className="relative">
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrer les sources par nom ou domaine…"
            className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
          />
        </div>
      </div>

      {/* ── GROUPES PAR CATÉGORIE ────────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
          <p>Aucune source ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-white/10 pb-1.5 px-0.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  {group.label}
                </h4>
                <span className="text-[10px] font-semibold text-white/40 tabular-nums">
                  ({group.sources.length})
                </span>
              </div>

              <div className="space-y-2">
                {group.sources.map((source, index) => (
                  <MobileSourceRow
                    key={source.id || source.sourceKey || `mob-src-${group.key}-${index}`}
                    source={source}
                    onEdit={onEdit}
                    onSnapshotChange={onSnapshotChange}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
