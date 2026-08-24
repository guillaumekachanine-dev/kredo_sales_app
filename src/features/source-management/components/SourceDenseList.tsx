"use client"

import { Fragment, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  deleteManualSourceAction,
  setManualSourceActiveAction,
} from "../actions/source-management-actions"
import {
  KREDO_SOURCE_CATEGORY_LABELS,
  KREDO_SOURCE_CATEGORY_ORDER,
  type SourceCatalogEntry,
} from "../domain/source-management-contracts"

function DarkSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/60 cursor-pointer",
        checked ? "border-brand-brass bg-brand-brass" : "border-white/20 bg-white/10",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "block size-3.5 rounded-full shadow-sm transition-transform duration-200 motion-reduce:transition-none",
          checked ? "translate-x-[17px] bg-[#0f122c]" : "translate-x-0.5 bg-white",
        )}
      />
    </button>
  )
}

function DiscreteOverflowMenu({
  source,
  onEdit,
}: {
  source: SourceCatalogEntry
  onEdit: (source: SourceCatalogEntry) => void
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (source.origin === "system" || source.isLocked) {
    return null
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteManualSourceAction(source.id)
      setIsOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Actions de la source"
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <svg className="size-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-8 z-50 min-w-[120px] rounded-lg border border-white/10 bg-[#161a3d] p-1 shadow-xl animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onEdit(source)
              }}
              disabled={isPending}
              className="flex w-full items-center px-2.5 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white rounded-md cursor-pointer"
            >
              Modifier
            </button>
            {confirmingDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex w-full items-center px-2.5 py-1.5 text-xs text-rose-400 font-semibold transition-colors hover:bg-rose-500/20 rounded-md cursor-pointer"
              >
                Confirmer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={isPending}
                className="flex w-full items-center px-2.5 py-1.5 text-xs text-rose-400 transition-colors hover:bg-white/10 rounded-md cursor-pointer"
              >
                Supprimer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SourceRow({
  source,
  onEdit,
}: {
  source: SourceCatalogEntry
  onEdit: (source: SourceCatalogEntry) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (!source) return null

  const toggleActive = (next: boolean) => {
    if (source.origin === "system" || source.isLocked || !source.id) return
    startTransition(async () => {
      await setManualSourceActiveAction(source.id, next)
      router.refresh()
    })
  }

  const displayUrl = source.searchDomain || (source.homepageUrl ? source.homepageUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "")
  const descriptionText = source.family ?? source.publisher ?? ""

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]">
      {/* 1. Identity (Ligne 1: Nom + URL | Ligne 2: Description) */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-xs text-white truncate" title={`${source.name || "Source"}${displayUrl ? ` (${displayUrl})` : ""}`}>
          <span>{source.name || "Source sans nom"}</span>
          {displayUrl ? (
            <span className="ml-1.5 font-normal text-[11px] text-white/50">
              ({displayUrl})
            </span>
          ) : null}
        </p>
        {descriptionText ? (
          <p className="mt-0.5 text-[11px] text-white/50 truncate" title={descriptionText}>
            {descriptionText}
          </p>
        ) : null}
      </div>

      {/* 2. Efficacité & Actions (Switch + Menu) */}
      <div className="flex shrink-0 items-center gap-3">
        {source.effectiveness && source.effectiveness.effectivenessScore !== null ? (
          <div className="text-right hidden sm:block">
            <p className="font-bold text-xs text-brand-brass font-mono">
              {source.effectiveness.effectivenessScore}/100
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {source.effectiveness.observations} runs
            </p>
          </div>
        ) : null}

        <DarkSwitch
          checked={Boolean(source.isActive)}
          disabled={source.origin === "system" || source.isLocked || isPending}
          onChange={toggleActive}
          label={`Activer ou désactiver ${source.name || "la source"}`}
        />
        <DiscreteOverflowMenu source={source} onEdit={onEdit} />
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

export interface SourceDenseListProps {
  sources: SourceCatalogEntry[]
  onEdit: (source: SourceCatalogEntry) => void
}

export function SourceDenseList({ sources, onEdit }: SourceDenseListProps) {
  const groups = groupByCategory(sources)

  if (groups.length === 0) {
    return (
      <div className="flex h-full min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
        <p>Aucune source disponible dans le socle éditorial.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              {group.label}
            </h4>
            <span className="text-[10px] font-semibold text-white/35">
              ({group.sources.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {group.sources.map((source, index) => (
              <SourceRow
                key={source?.id || source?.sourceKey || `source-${group.key}-${index}`}
                source={source}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

