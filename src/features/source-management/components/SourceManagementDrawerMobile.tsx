"use client"

import { useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { ManualSourceForm } from "./ManualSourceForm"
import { SourceCorpusImportWizard } from "./SourceCorpusImportWizard"
import { MobileSourceManagementSynthesis } from "./mobile/MobileSourceManagementSynthesis"
import { MobileEditorialSourceList } from "./mobile/MobileEditorialSourceList"
import { MobileCorpusDetail } from "./mobile/MobileCorpusDetail"
import { buildSourceManagementOverview } from "../domain/source-management-overview"
import type {
  SourceCatalogEntry,
  SourceManagementSnapshot,
} from "../domain/source-management-contracts"

export type MobilePanelView =
  | { kind: "home" }
  | { kind: "synthesis" }
  | { kind: "editorial_base" }
  | { kind: "corpus"; corpusId: string }
  | { kind: "create" }
  | { kind: "edit"; source: SourceCatalogEntry }
  | { kind: "import" }

export interface SourceManagementDrawerMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: SourceManagementSnapshot
  onSnapshotChange?: (updater: (current: SourceManagementSnapshot) => SourceManagementSnapshot) => void
  onRefresh?: (options?: { silent?: boolean }) => Promise<void>
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

function ArrowLeftIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function MobileSourceManagementHome({
  snapshot,
  onSelectView,
}: {
  snapshot: SourceManagementSnapshot
  onSelectView: (view: MobilePanelView) => void
}) {
  const overview = buildSourceManagementOverview(snapshot)
  const catalogSources = [...snapshot.systemSources, ...snapshot.manualSources]
  const activeCatalogCount = catalogSources.filter((s) => s.isActive).length

  const activePercent = overview.uniqueSourceCount > 0
    ? Math.round((overview.activeSourceCount / overview.uniqueSourceCount) * 100)
    : 0

  return (
    <div className="space-y-5 pb-6">
      {/* ── BLOC A : SYNTHÈSE (ENTRÉE PRIORITAIRE) ────────────────── */}
      <button
        type="button"
        onClick={() => onSelectView({ kind: "synthesis" })}
        className="group w-full min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all active:bg-white/[0.07] hover:border-brand-brass/40 cursor-pointer"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-brass/15 text-brand-brass">
              <SynthesisIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-brand-brass transition-colors">
                Synthèse
              </p>
              <p className="text-[11px] text-white/50">
                Sources, corpus et couverture
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-white/30 group-hover:translate-x-0.5 group-hover:text-brand-brass transition-all" />
        </div>

        {/* Mini résumé en pilules d'indicateurs */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
          <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Sources</p>
            <p className="text-xs font-bold text-white tabular-nums mt-0.5">
              {overview.activeSourceCount} <span className="text-[10px] font-normal text-white/45">/ {overview.uniqueSourceCount}</span>
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Couverture</p>
            <p className="text-xs font-bold text-brand-brass tabular-nums mt-0.5">
              {activePercent}%
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Corpus</p>
            <p className="text-xs font-bold text-white tabular-nums mt-0.5">
              {overview.activeCorpusCount} <span className="text-[10px] font-normal text-white/45">/ {overview.corpusCount}</span>
            </p>
          </div>
        </div>
      </button>

      {/* ── BLOC B : SOCLE ÉDITORIAL ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => onSelectView({ kind: "editorial_base" })}
        className="group w-full min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition-all active:bg-white/[0.07] hover:border-brand-brass/40 cursor-pointer"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/70 group-hover:bg-brand-brass/15 group-hover:text-brand-brass transition-colors">
              <EditorialBaseIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-brand-brass transition-colors">
                Socle éditorial
              </p>
              <p className="text-[11px] text-white/50">
                {activeCatalogCount} sources actives ({catalogSources.length} au catalogue)
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-white/30 group-hover:translate-x-0.5 group-hover:text-brand-brass transition-all" />
        </div>
      </button>

      {/* ── BLOC C : CORPUS THÉMATIQUES ──────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/60">
            Corpus thématiques
          </h4>
          <span className="text-[10px] font-semibold text-white/40 tabular-nums">
            ({snapshot.thematicCorpora.length})
          </span>
        </div>

        {snapshot.thematicCorpora.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/45 italic">
            Aucun corpus thématique importé
          </p>
        ) : (
          <div className="space-y-1.5">
            {snapshot.thematicCorpora.map((corpus) => (
              <button
                key={corpus.id}
                type="button"
                onClick={() => onSelectView({ kind: "corpus", corpusId: corpus.id })}
                className="group flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left transition-all active:bg-white/[0.07] hover:border-brand-brass/40 cursor-pointer"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60 group-hover:bg-brand-brass/15 group-hover:text-brand-brass transition-colors">
                    <CorpusIcon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {corpus.name ?? corpus.sectorName ?? corpus.slug}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-white/50">
                      {corpus.activeSources} / {corpus.totalSources} sources actives
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border",
                      corpus.activationState === "active"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-white/15 bg-white/5 text-white/50",
                    )}
                  >
                    {corpus.activationState === "active" ? "Actif" : "Brouillon"}
                  </span>
                  <ChevronRight className="size-4 text-white/30 group-hover:translate-x-0.5 group-hover:text-brand-brass transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── BLOC D : CORPUS SECTORIELS ───────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/60">
            Corpus sectoriels
          </h4>
          <span className="text-[10px] font-semibold text-white/40 tabular-nums">
            ({snapshot.sectorCorpora.length})
          </span>
        </div>

        {snapshot.sectorCorpora.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/45 italic">
            Aucun corpus sectoriel importé. Utilisez « + Corpus » pour importer un registre E3.
          </p>
        ) : (
          <div className="space-y-1.5">
            {snapshot.sectorCorpora.map((corpus) => (
              <button
                key={corpus.id}
                type="button"
                onClick={() => onSelectView({ kind: "corpus", corpusId: corpus.id })}
                className="group flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left transition-all active:bg-white/[0.07] hover:border-brand-brass/40 cursor-pointer"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60 group-hover:bg-brand-brass/15 group-hover:text-brand-brass transition-colors">
                    <CorpusIcon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {corpus.name ?? corpus.sectorName ?? corpus.slug}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-white/50">
                      {corpus.activeSources} / {corpus.totalSources} sources actives
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border",
                      corpus.activationState === "active"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-white/15 bg-white/5 text-white/50",
                    )}
                  >
                    {corpus.activationState === "active" ? "Actif" : "Brouillon"}
                  </span>
                  <ChevronRight className="size-4 text-white/30 group-hover:translate-x-0.5 group-hover:text-brand-brass transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── ACTIONS GLOBALES COMPACTES (canManage) ────────────────── */}
      {snapshot.canManage ? (
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSelectView({ kind: "create" })}
            className="min-h-[44px] !border-white/15 !bg-white/5 hover:!bg-white/10 !text-white justify-center cursor-pointer"
          >
            + Source
          </Button>
          <Button
            variant="brass"
            size="sm"
            onClick={() => onSelectView({ kind: "import" })}
            className="min-h-[44px] justify-center cursor-pointer"
          >
            + Corpus
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function SourceManagementDrawerMobile({
  open,
  onOpenChange,
  snapshot,
  onSnapshotChange,
  onRefresh,
}: SourceManagementDrawerMobileProps) {
  const [view, setView] = useState<MobilePanelView>({ kind: "home" })

  const handleOpenChange = (next: boolean) => {
    if (next) setView({ kind: "home" })
    onOpenChange(next)
  }

  const handleBack = () => {
    if (view.kind === "edit") {
      setView({ kind: "editorial_base" })
    } else {
      setView({ kind: "home" })
    }
  }

  const catalogSources = [...snapshot.systemSources, ...snapshot.manualSources]
  const allCorpora = [...snapshot.sectorCorpora, ...snapshot.thematicCorpora]
  const activeCorpus =
    view.kind === "corpus" ? allCorpora.find((c) => c.id === view.corpusId) : null

  // Résolution du titre et sous-titre de la vue courante
  const headerTitle =
    view.kind === "home" ? "Gérer les sources" :
    view.kind === "synthesis" ? "Synthèse" :
    view.kind === "editorial_base" ? "Socle éditorial" :
    view.kind === "corpus" ? (activeCorpus?.name ?? activeCorpus?.sectorName ?? activeCorpus?.slug ?? "Détail du corpus") :
    view.kind === "create" ? "Ajouter une source" :
    view.kind === "edit" ? "Modifier la source" :
    view.kind === "import" ? "Importer un corpus" :
    "Gérer les sources"

  const headerSubtitle =
    view.kind === "home" ? "Socle éditorial, corpus thématiques et corpus sectoriels." :
    view.kind === "synthesis" ? "Indicateurs, répartition et volumétrie" :
    view.kind === "editorial_base" ? `${catalogSources.filter((s) => s.isActive).length} sources actives` :
    view.kind === "corpus" ? `${activeCorpus?.activeSources ?? 0} / ${activeCorpus?.totalSources ?? 0} sources actives` :
    undefined

  const customTitle = view.kind === "home" ? (
    <div className="flex items-center justify-between gap-2 w-full pr-1">
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-base font-bold text-white truncate">
          {headerTitle}
        </h2>
        <p className="text-[11px] text-white/50 truncate">
          {headerSubtitle}
        </p>
      </div>
      {snapshot.canManage ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setView({ kind: "create" })}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            + Source
          </button>
          <button
            type="button"
            onClick={() => setView({ kind: "import" })}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-brass px-2.5 text-xs font-bold text-secondary-fg hover:bg-brand-brass-hover transition-colors cursor-pointer"
          >
            + Corpus
          </button>
        </div>
      ) : null}
    </div>
  ) : (
    <div className="flex items-center gap-2.5 w-full">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Retour à l'écran précédent"
        className="flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeftIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-base font-bold text-white truncate">
          {headerTitle}
        </h2>
        {headerSubtitle ? (
          <p className="text-[11px] text-white/50 truncate">
            {headerSubtitle}
          </p>
        ) : null}
      </div>
    </div>
  )

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={customTitle}
      side="right"
      width="wide"
      showMobileCloseButton
      headerClassName="border-b border-white/10 bg-[#0f122c] pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
      contentClassName="bg-[#0f122c] p-4 text-white"
      onRequestClose={(reason) => {
        if (view.kind !== "home" && reason !== "backdrop") {
          handleBack()
          return false
        }
        return true
      }}
    >
      {view.kind === "home" ? (
        <MobileSourceManagementHome
          snapshot={snapshot}
          onSelectView={setView}
        />
      ) : view.kind === "synthesis" ? (
        <MobileSourceManagementSynthesis snapshot={snapshot} />
      ) : view.kind === "editorial_base" ? (
        <MobileEditorialSourceList
          sources={catalogSources}
          onEdit={(source) => setView({ kind: "edit", source })}
          onSnapshotChange={onSnapshotChange}
          onRefresh={onRefresh}
        />
      ) : view.kind === "corpus" && activeCorpus ? (
        (() => {
          const corpus = activeCorpus
          return (
            <MobileCorpusDetail
              corpus={corpus}
              canEdit={snapshot.canManage && corpus.scopeKind !== "system"}
              onSnapshotChange={onSnapshotChange}
              onRefresh={onRefresh}
            />
          )
        })()
      ) : view.kind === "create" ? (
        <ManualSourceForm
          mode="create"
          onCancel={() => setView({ kind: "home" })}
          onSuccess={() => {
            void onRefresh?.()
            setView({ kind: "editorial_base" })
          }}
        />
      ) : view.kind === "edit" ? (
        <ManualSourceForm
          mode="edit"
          initial={view.source}
          onCancel={() => setView({ kind: "editorial_base" })}
          onSuccess={() => {
            void onRefresh?.()
            setView({ kind: "editorial_base" })
          }}
        />
      ) : view.kind === "import" ? (
        <SourceCorpusImportWizard variant="mobile" onClose={() => {
          void onRefresh?.()
          setView({ kind: "home" })
        }} />
      ) : (
        <MobileSourceManagementHome
          snapshot={snapshot}
          onSelectView={setView}
        />
      )}
    </AppDrawer>
  )
}
