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

  const urlText = source.homepageUrl || (source.searchDomain ? `https://${source.searchDomain}` : "")

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]">
      {/* 1. Identity (Nom + URL) */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-xs text-white truncate" title={source.name || "Source"}>
          {source.name || "Source sans nom"}
        </p>
        {urlText ? (
          <p className="mt-0.5 text-[11px] text-white/50 truncate" title={urlText}>
            {urlText}
          </p>
        ) : null}
      </div>

      {/* 2. Famille */}
      <div className="min-w-0 w-24 shrink-0 text-right">
        <span className="text-xs text-white/60 truncate block" title={source.family ?? ""}>
          {source.family ?? <span className="text-white/30">—</span>}
        </span>
      </div>

      {/* 3. Efficacité */}
      <div className="min-w-0 w-32 shrink-0 text-right">
        {source.effectiveness && source.effectiveness.effectivenessScore !== null ? (
          <div>
            <p className="font-bold text-xs text-brand-brass font-mono">
              {source.effectiveness.effectivenessScore}/100
            </p>
            <p className="text-[10px] text-white/50 truncate">
              {source.effectiveness.observations} runs · {source.effectiveness.productiveObservations} productifs
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-white/60">À observer</p>
            <p className="text-[10px] text-white/40 truncate">
              {source.effectiveness?.observations ?? 0}/3 runs
            </p>
          </div>
        )}
      </div>

      {/* 4. Switch & Action Discrete */}
      <div className="flex shrink-0 items-center gap-1.5">
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
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <Fragment key={group.key}>
          {groupIndex > 0 ? (
            <div className="flex items-center my-3">
              <div className="h-px flex-1 bg-white/5" />
              <div className="size-1 rounded-full bg-brand-brass/40 mx-2" aria-hidden="true" />
              <div className="h-px flex-1 bg-white/5" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
            {group.sources.map((source, index) => (
              <SourceRow key={source?.id || source?.sourceKey || `source-${group.key}-${index}`} source={source} onEdit={onEdit} />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  )
}
