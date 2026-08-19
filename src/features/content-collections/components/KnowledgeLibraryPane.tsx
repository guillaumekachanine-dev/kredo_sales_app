"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils"
import type { CollectionSummary } from "../domain/content-collections-contracts"

export interface KnowledgeLibraryPaneProps {
  collections: CollectionSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
  creatingOpen: boolean
  setCreatingOpen: (open: boolean) => void
  newName: string
  setNewName: (name: string) => void
  onCreate: () => void
  isPending: boolean
  isCollapsed?: boolean
  onExpandLibrary?: () => void
}

export function KnowledgeLibraryPane({
  collections,
  selectedId,
  onSelect,
  isLoading,
  creatingOpen,
  setCreatingOpen,
  newName,
  setNewName,
  onCreate,
  isPending,
  isCollapsed = false,
  onExpandLibrary,
}: KnowledgeLibraryPaneProps) {
  // Mode rail étroit quand le viewer est ouvert
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center justify-between border-r border-white/5 bg-[#0f122c] py-4 px-1.5 transition-all duration-300 ease-out">
        <button
          type="button"
          onClick={onExpandLibrary}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          title="Agrandir la bibliothèque"
          aria-label="Agrandir la bibliothèque"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="my-auto flex flex-col items-center gap-2 overflow-y-auto py-2">
          {collections.map((col) => {
            const isSelected = col.id === selectedId
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  onSelect(col.id)
                  onExpandLibrary?.()
                }}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                  isSelected
                    ? "border border-brand-brass/40 bg-brand-brass/20 text-brand-brass"
                    : "border border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white"
                )}
                title={`${col.name} (${col.itemCount})`}
              >
                {col.name.charAt(0).toUpperCase()}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setCreatingOpen(true)
            onExpandLibrary?.()
          }}
          className="flex size-10 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          title="Créer une liste"
          aria-label="Créer une liste"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-r border-white/5 bg-[#0f122c] transition-all duration-300 ease-out">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-white/50">Chargement…</div>
        ) : collections.length === 0 ? (
          <div className="p-4 text-center text-xs text-white/50">Aucune liste pour l&apos;instant.</div>
        ) : (
          <ul className="space-y-1">
            {collections.map((col) => {
              const isSelected = col.id === selectedId
              return (
                <li key={col.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(col.id)}
                    className={cn(
                      "group flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                      isSelected
                        ? "border-brand-brass/40 bg-brand-brass/10 text-white shadow-sm"
                        : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-1.5 min-w-0">
                      <span className="truncate text-xs font-bold leading-tight">
                        {col.name} <span className="font-normal text-white/60">({col.itemCount})</span>
                      </span>
                    </div>
                    {col.description ? (
                      <p className="line-clamp-2 text-[10px] leading-snug text-white/50 group-hover:text-white/65">
                        {col.description}
                      </p>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-white/5 p-3">
        {creatingOpen ? (
          <div className="space-y-2">
            <Input
              autoFocus
              size="sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la liste"
              fullWidth
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/35 focus:border-brand-brass/60"
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate()
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                fullWidth
                onClick={onCreate}
                disabled={isPending || !newName.trim()}
                loading={isPending}
                className="bg-brand-brass text-slate-950 font-semibold hover:bg-brand-brass-hover"
              >
                Créer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCreatingOpen(false)
                  setNewName("")
                }}
                className="text-white/70 hover:bg-white/5 hover:text-white"
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            fullWidth
            onClick={() => setCreatingOpen(true)}
            className="w-full justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08]"
          >
            + Créer une liste
          </Button>
        )}
      </div>
    </div>
  )
}
