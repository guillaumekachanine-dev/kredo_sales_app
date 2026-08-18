"use client"

import { Fragment, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { cn } from "@/lib/utils"
import { deleteManualSourceAction, setManualSourceActiveAction } from "../actions/source-management-actions"
import {
  KREDO_SOURCE_CATEGORY_LABELS,
  KREDO_SOURCE_CATEGORY_ORDER,
  type SourceCatalogEntry,
} from "../domain/source-management-contracts"

function ValidationBadge({ source }: { source: SourceCatalogEntry }) {
  if (source.isLocked) return <Badge variant="brand">Verrouillée</Badge>
  if (!source.isActive) return <Badge variant="neutral">Désactivée</Badge>
  if (source.validationStatus === "unreachable") return <Badge variant="danger">Injoignable</Badge>
  if (source.validationStatus === "rejected") return <Badge variant="danger">Rejetée</Badge>
  if (source.validationStatus === "pending") return <Badge variant="warning">À vérifier</Badge>
  return <Badge variant="success">Active</Badge>
}

function CollectionModeBadge({ source }: { source: SourceCatalogEntry }) {
  return source.collectionMode === "rss"
    ? <Badge variant="info">RSS</Badge>
    : <Badge variant="neutral">Recherche site</Badge>
}

function RowActions({
  source,
  onEdit,
  variant,
}: {
  source: SourceCatalogEntry
  onEdit: (source: SourceCatalogEntry) => void
  variant: "table" | "cards"
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (source.origin === "system" || source.isLocked) {
    return <span className="text-[11px] text-muted">Socle verrouillé</span>
  }

  const toggleActive = () => {
    startTransition(async () => {
      await setManualSourceActiveAction(source.id, !source.isActive)
      router.refresh()
    })
  }

  const confirmDelete = () => {
    startTransition(async () => {
      await deleteManualSourceAction(source.id)
      router.refresh()
    })
  }

  return (
    <div className={cn("flex items-center gap-1.5", variant === "cards" && "flex-wrap")}>
      <Button variant="secondary" size="sm" onClick={() => onEdit(source)} disabled={isPending}>
        Modifier
      </Button>
      <Button variant="secondary" size="sm" onClick={toggleActive} loading={isPending}>
        {source.isActive ? "Désactiver" : "Activer"}
      </Button>
      {confirmingDelete ? (
        <Button variant="destructive" size="sm" onClick={confirmDelete} loading={isPending}>
          Confirmer la suppression
        </Button>
      ) : (
        <IconButton aria-label="Supprimer la source" variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)} disabled={isPending}>
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9.5 7V5.5a1.5 1.5 0 011.5-1.5h2a1.5 1.5 0 011.5 1.5V7m-8 0l.7 11.2A2 2 0 007.7 20h8.6a2 2 0 002-1.8L19 7" />
          </svg>
        </IconButton>
      )}
    </div>
  )
}

function groupByCategory(sources: SourceCatalogEntry[]) {
  const groups = new Map<string, SourceCatalogEntry[]>()
  for (const source of sources) {
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

export interface SourceBaseListProps {
  sources: SourceCatalogEntry[]
  variant: "table" | "cards"
  onEdit: (source: SourceCatalogEntry) => void
}

export function SourceBaseList({ sources, variant, onEdit }: SourceBaseListProps) {
  const groups = groupByCategory(sources)

  if (groups.length === 0) {
    return <p className="border border-dashed border-border p-4 text-center text-xs text-muted">Aucune source dans cette section.</p>
  }

  if (variant === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-muted">
              <th className="py-2 pr-3 font-semibold">Source</th>
              <th className="py-2 pr-3 font-semibold">Famille</th>
              <th className="py-2 pr-3 font-semibold">Collecte</th>
              <th className="py-2 pr-3 font-semibold">État</th>
              <th className="py-2 pr-3 font-semibold">Origine</th>
              <th className="py-2 pr-3 font-semibold">Efficacité</th>
              <th className="py-2 pr-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                <tr className="bg-canvas">
                  <td colSpan={7} className="py-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-heading">
                    {group.label}
                  </td>
                </tr>
                {group.sources.map((source) => (
                  <tr key={source.id} className="border-b border-border/60 align-middle">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-heading">{source.name}</p>
                      <p className="text-[11px] text-muted">{source.searchDomain}</p>
                    </td>
                    <td className="py-2 pr-3 text-body">{source.family ?? <span className="text-muted">Non renseignée</span>}</td>
                    <td className="py-2 pr-3"><CollectionModeBadge source={source} /></td>
                    <td className="py-2 pr-3"><ValidationBadge source={source} /></td>
                    <td className="py-2 pr-3 capitalize text-body">{source.origin}</td>
                    <td className="py-2 pr-3 text-body font-mono text-xs">
                      {source.effectiveness && source.effectiveness.effectivenessScore !== null
                        ? `${source.effectiveness.effectivenessScore}/100`
                        : "À observer"}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end">
                        <RowActions source={source} onEdit={onEdit} variant="table" />
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-heading">{group.label}</p>
          <div className="space-y-2">
            {group.sources.map((source) => (
              <details key={source.id} className="group border border-border bg-surface open:pb-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-heading">{source.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {source.effectiveness && source.effectiveness.effectivenessScore !== null
                        ? `${source.effectiveness.effectivenessScore}/100 · ${source.effectiveness.observations} runs`
                        : `À observer · ${source.effectiveness?.observations ?? 0}/3 runs`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ValidationBadge source={source} />
                    <svg className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </summary>
                <div className="space-y-3 px-3 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CollectionModeBadge source={source} />
                    <Badge variant="neutral" className="capitalize">{source.origin}</Badge>
                  </div>
                  <p className="text-[11px] text-muted">{source.searchDomain}</p>
                  <RowActions source={source} onEdit={onEdit} variant="cards" />
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
