"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { cn } from "@/lib/utils"
import { ManualSourceForm } from "./ManualSourceForm"
import { SourceCorpusDetailView } from "./SourceCorpusDetailView"
import { SourceCorpusImportWizard } from "./SourceCorpusImportWizard"
import { SourceDenseList } from "./SourceDenseList"
import { SourceManagementSynthesisView } from "./SourceManagementSynthesisView"
import type { SourceCatalogEntry, SourceManagementSnapshot } from "../domain/source-management-contracts"

type PanelView =
  | { kind: "synthesis" }
  | { kind: "editorial_base" }
  | { kind: "corpus"; corpusId: string }
  | { kind: "create" }
  | { kind: "edit"; source: SourceCatalogEntry }
  | { kind: "import" }

export interface SourceManagementDialogDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: SourceManagementSnapshot
}

function SynthesisIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  )
}

function EditorialBaseIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function CorpusIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  )
}

function ChevronRight({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function SourceManagementDialogDesktop({ open, onOpenChange, snapshot }: SourceManagementDialogDesktopProps) {
  const [view, setView] = useState<PanelView>({ kind: "synthesis" })

  const catalogSources = [...snapshot.systemSources, ...snapshot.manualSources]
  const activeCatalogCount = catalogSources.filter((s) => s.isActive).length

  const activeCorpus = view.kind === "corpus"
    ? [...snapshot.sectorCorpora, ...snapshot.thematicCorpora].find((c) => c.id === view.corpusId)
    : null

  const headerRightActions = snapshot.canManage ? (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setView({ kind: "create" })}
        className="!border-white/15 !bg-white/5 hover:!bg-white/10 !text-white"
      >
        + Source
      </Button>
      <Button
        variant="brass"
        size="sm"
        onClick={() => setView({ kind: "import" })}
      >
        + Corpus
      </Button>
    </div>
  ) : null

  const leftPaneNav = (
    <div className="p-4 space-y-2">
      {/* 1. Synthèse */}
      <button
        type="button"
        onClick={() => setView({ kind: "synthesis" })}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer",
          view.kind === "synthesis"
            ? "border-brand-brass/40 bg-brand-brass/10 text-white"
            : "border-transparent bg-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
        )}
      >
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            view.kind === "synthesis"
              ? "bg-brand-brass/20 text-brand-brass"
              : "bg-white/[0.05] text-white/60 group-hover:bg-white/10 group-hover:text-white",
          )}
        >
          <SynthesisIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">Synthèse</p>
          <p className="mt-0.5 text-[10px] text-white/50 truncate">Sources, corpus et couverture</p>
        </div>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            view.kind === "synthesis" ? "text-brand-brass translate-x-0" : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
          )}
        />
      </button>

      {/* 2. Socle éditorial */}
      <button
        type="button"
        onClick={() => setView({ kind: "editorial_base" })}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer",
          view.kind === "editorial_base" || view.kind === "create" || view.kind === "edit"
            ? "border-brand-brass/40 bg-brand-brass/10 text-white"
            : "border-transparent bg-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
        )}
      >
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            view.kind === "editorial_base" || view.kind === "create" || view.kind === "edit"
              ? "bg-brand-brass/20 text-brand-brass"
              : "bg-white/[0.05] text-white/60 group-hover:bg-white/10 group-hover:text-white",
          )}
        >
          <EditorialBaseIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">Socle éditorial</p>
          <p className="mt-0.5 text-[10px] text-white/50 truncate">{activeCatalogCount} sources actives</p>
        </div>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            view.kind === "editorial_base" || view.kind === "create" || view.kind === "edit"
              ? "text-brand-brass translate-x-0"
              : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
          )}
        />
      </button>

      {/* 3. Corpus thématiques */}
      <div className="pt-2 space-y-1 border-t border-white/5">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Corpus thématiques</p>
        {snapshot.thematicCorpora.length === 0 ? (
          <p className="px-3 py-1 text-[10px] text-white/40 italic">Aucun corpus thématique importé</p>
        ) : (
          snapshot.thematicCorpora.map((corpus) => {
            const isActive = view.kind === "corpus" && view.corpusId === corpus.id
            return (
              <button
                key={corpus.id}
                type="button"
                onClick={() => setView({ kind: "corpus", corpusId: corpus.id })}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
                  isActive
                    ? "border-brand-brass/40 bg-brand-brass/10 text-white"
                    : "border-transparent bg-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-brand-brass/20 text-brand-brass"
                      : "bg-white/[0.05] text-white/60 group-hover:bg-white/10 group-hover:text-white",
                  )}
                >
                  <CorpusIcon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{corpus.name ?? corpus.sectorName ?? corpus.slug}</p>
                  <p className="mt-0.5 text-[10px] text-white/50 truncate">
                    {corpus.activeSources} / {corpus.totalSources} sources actives
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    isActive ? "text-brand-brass translate-x-0" : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
                  )}
                />
              </button>
            )
          })
        )}
      </div>

      {/* 4. Corpus sectoriels (1 entrée par corpus réel) */}
      <div className="pt-2 space-y-1 border-t border-white/5">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Corpus sectoriels</p>
        {snapshot.sectorCorpora.length === 0 ? (
          <p className="px-3 py-1 text-[10px] text-white/40 italic">Aucun corpus sectoriel importé</p>
        ) : (
          snapshot.sectorCorpora.map((corpus) => {
            const isActive = view.kind === "corpus" && view.corpusId === corpus.id
            return (
              <button
                key={corpus.id}
                type="button"
                onClick={() => setView({ kind: "corpus", corpusId: corpus.id })}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
                  isActive
                    ? "border-brand-brass/40 bg-brand-brass/10 text-white"
                    : "border-transparent bg-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-brand-brass/20 text-brand-brass"
                      : "bg-white/[0.05] text-white/60 group-hover:bg-white/10 group-hover:text-white",
                  )}
                >
                  <CorpusIcon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{corpus.name ?? corpus.sectorName ?? corpus.slug}</p>
                  <p className="mt-0.5 text-[10px] text-white/50 truncate">
                    {corpus.activeSources} / {corpus.totalSources} sources actives
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    isActive ? "text-brand-brass translate-x-0" : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/60",
                  )}
                />
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const rightPaneContent = (
    <div className="flex-1 overflow-y-auto">
      {view.kind === "synthesis" ? (
        <SourceManagementSynthesisView snapshot={snapshot} />
      ) : view.kind === "editorial_base" ? (
        <div className="p-5 sm:p-6">
          <SourceDenseList
            sources={catalogSources}
            onEdit={(source) => setView({ kind: "edit", source })}
          />
        </div>
      ) : view.kind === "corpus" && activeCorpus ? (
        <SourceCorpusDetailView corpus={activeCorpus} />
      ) : view.kind === "create" ? (
        <div className="p-5 sm:p-6">
          <ManualSourceForm
            mode="create"
            onCancel={() => setView({ kind: "editorial_base" })}
            onSuccess={() => setView({ kind: "editorial_base" })}
          />
        </div>
      ) : view.kind === "edit" ? (
        <div className="p-5 sm:p-6">
          <ManualSourceForm
            mode="edit"
            initial={view.source}
            onCancel={() => setView({ kind: "editorial_base" })}
            onSuccess={() => setView({ kind: "editorial_base" })}
          />
        </div>
      ) : view.kind === "import" ? (
        <div className="p-5 sm:p-6">
          <SourceCorpusImportWizard variant="desktop" onClose={() => setView({ kind: "synthesis" })} />
        </div>
      ) : (
        <SourceManagementSynthesisView snapshot={snapshot} />
      )}
    </div>
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      title="Gérer les sources informationnelles"
      onClose={() => {
        setView({ kind: "synthesis" })
        onOpenChange(false)
      }}
      leftPane={leftPaneNav}
      rightPane={rightPaneContent}
      headerRightActions={headerRightActions}
      leftPaneWidth="32%"
    />
  )
}
