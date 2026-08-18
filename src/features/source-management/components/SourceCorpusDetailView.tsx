"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  setCorpusAccountWatchEnabledAction,
  setCorpusActivationAction,
  setCorpusItemEnabledAction,
  setCorpusNewsEnabledAction,
} from "../actions/source-management-actions"
import type { SourceCorpusItemView, SourceCorpusView } from "../domain/source-management-contracts"

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

function CorpusItemRow({ item }: { item: SourceCorpusItemView }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (!item) return null

  const toggle = (next: boolean) => {
    if (!item.isCollectable || !item.id) return
    startTransition(async () => {
      await setCorpusItemEnabledAction(item.id, next)
      router.refresh()
    })
  }

  const name = item.source?.name ?? item.externalSrcId ?? "Source inconnue"
  const url = item.source?.homepageUrl || (item.source?.searchDomain ? `https://${item.source.searchDomain}` : "")
  const family = item.source?.family ?? item.tier ?? "Corpus sectoriel"

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]">
      {/* 1. Identity (Nom + URL) */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-xs text-white truncate" title={name}>
          {name}
        </p>
        {url ? (
          <p className="mt-0.5 text-[11px] text-white/50 truncate" title={url}>
            {url}
          </p>
        ) : null}
      </div>

      {/* 2. Famille */}
      <div className="min-w-0 w-24 shrink-0 text-right">
        <span className="text-xs text-white/60 truncate block" title={family}>
          {family}
        </span>
      </div>

      {/* 3. Note (Reserved Slot) */}
      <div className="w-8 shrink-0 text-center">
        <span className="text-xs text-white/35 font-mono">
          {typeof item.utilityScore === "number" ? item.utilityScore : "—"}
        </span>
      </div>

      {/* 4. Switch */}
      <div className="flex shrink-0 items-center">
        <DarkSwitch
          checked={Boolean(item.isEnabled)}
          disabled={!item.isCollectable || isPending}
          onChange={toggle}
          label={`Activer ou désactiver ${name}`}
        />
      </div>
    </div>
  )
}

export interface SourceCorpusDetailViewProps {
  corpus: SourceCorpusView
}

export function SourceCorpusDetailView({ corpus }: SourceCorpusDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const items = Array.isArray(corpus?.items)
    ? corpus.items.filter((item): item is SourceCorpusItemView => Boolean(item))
    : []

  const toggleActivation = (next: boolean) => {
    if (!corpus?.id) return
    startTransition(async () => {
      await setCorpusActivationAction(corpus.id, next ? "active" : "draft")
      router.refresh()
    })
  }

  const toggleNews = (next: boolean) => {
    if (!corpus?.id) return
    startTransition(async () => {
      await setCorpusNewsEnabledAction(corpus.id, next)
      router.refresh()
    })
  }

  const toggleAccountWatch = (next: boolean) => {
    if (!corpus?.id) return
    startTransition(async () => {
      await setCorpusAccountWatchEnabledAction(corpus.id, next)
      router.refresh()
    })
  }

  const totalSourcesCount = corpus?.totalSources ?? items.length
  const activeSourcesCount = corpus?.activeSources ?? items.filter((i) => i.isEnabled).length

  return (
    <div className="space-y-4 px-5 py-5 sm:px-6">
      {/* ── BARRE CONTEXTUELLE COMPACTE ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-white truncate">
            {corpus?.sectorName ?? corpus?.slug ?? "Corpus sectoriel"}
          </h3>
          <p className="mt-0.5 text-[11px] text-white/50">
            {totalSourcesCount} sources · {activeSourcesCount} actives · v{corpus?.version ?? "1.0"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs text-white/80">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-white/70">Corpus actif</span>
            <DarkSwitch
              checked={corpus?.activationState === "active"}
              disabled={isPending}
              onChange={toggleActivation}
              label="Activer le corpus"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-white/70">Actualités</span>
            <DarkSwitch
              checked={Boolean(corpus?.enabledForNews)}
              disabled={isPending}
              onChange={toggleNews}
              label="Activer pour les actualités"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-white/70">Veille comptes</span>
            <DarkSwitch
              checked={Boolean(corpus?.enabledForAccountWatch)}
              disabled={isPending}
              onChange={toggleAccountWatch}
              label="Activer pour la veille comptes"
            />
          </label>
        </div>
      </div>

      {/* ── DEUX COLONNES DE SOURCES DE CORPUS ───────────────────── */}
      {items.length === 0 ? (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
          <p>Aucune source référencée dans ce corpus sectoriel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
          {items.map((item, index) => (
            <CorpusItemRow key={item.id || item.sourceId || item.externalSrcId || `corpus-item-${index}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
