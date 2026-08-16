"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/Badge"
import {
  CORPUS_QUALITY_VERDICT_LABELS,
  type SourceCorpusItemView,
  type SourceCorpusView,
} from "../domain/source-management-contracts"
import {
  setCorpusAccountWatchEnabledAction,
  setCorpusActivationAction,
  setCorpusItemEnabledAction,
  setCorpusNewsEnabledAction,
} from "../actions/source-management-actions"

function qualityVariant(verdict: SourceCorpusView["qualityVerdict"]) {
  if (verdict === "production_ready") return "success" as const
  if (verdict === "rejected") return "danger" as const
  return "warning" as const
}

function ItemRow({ item }: { item: SourceCorpusItemView }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      await setCorpusItemEnabledAction(item.id, !item.isEnabled)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 text-xs last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-heading">{item.source?.name ?? "Source inconnue"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
          <Badge variant="neutral" size="sm">{item.pack}</Badge>
          {item.tier ? <Badge variant="neutral" size="sm">{item.tier}</Badge> : null}
          {typeof item.utilityScore === "number" ? <span>Score {item.utilityScore}</span> : null}
          {item.automationFit ? <span className="capitalize">{item.automationFit.replace("_", " ")}</span> : null}
          {!item.isCollectable ? <Badge variant="neutral" size="sm">Hors veille récurrente</Badge> : null}
          {item.newsEligible ? <Badge variant="info" size="sm">Actualités</Badge> : null}
          {item.accountWatchEligible ? <Badge variant="info" size="sm">Veille comptes</Badge> : null}
        </div>
        {item.exclusionReason ? <p className="mt-1 text-[10px] text-danger">{item.exclusionReason}</p> : null}
      </div>
      <label className="flex shrink-0 items-center gap-2 text-[11px] text-heading">
        {item.isEnabled ? "Actif" : "Inactif"}
        <input
          type="checkbox"
          checked={item.isEnabled}
          disabled={isPending}
          onChange={toggle}
          className="size-4 accent-primary"
          aria-label={`Activer ou désactiver ${item.source?.name ?? "cette source"} dans le corpus`}
        />
      </label>
    </div>
  )
}

export interface SourceCorpusCardProps {
  corpus: SourceCorpusView
  variant: "table" | "cards"
}

export function SourceCorpusCard({ corpus, variant }: SourceCorpusCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const toggleActivation = () => {
    startTransition(async () => {
      await setCorpusActivationAction(corpus.id, corpus.activationState === "active" ? "draft" : "active")
      router.refresh()
    })
  }

  const toggleNews = () => {
    startTransition(async () => {
      await setCorpusNewsEnabledAction(corpus.id, !corpus.enabledForNews)
      router.refresh()
    })
  }

  const toggleAccountWatch = () => {
    startTransition(async () => {
      await setCorpusAccountWatchEnabledAction(corpus.id, !corpus.enabledForAccountWatch)
      router.refresh()
    })
  }

  return (
    <details className={cnCard(variant)}>
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-heading">{corpus.sectorName ?? corpus.slug}</p>
            <Badge variant={qualityVariant(corpus.qualityVerdict)} size="sm">
              {CORPUS_QUALITY_VERDICT_LABELS[corpus.qualityVerdict]}
            </Badge>
            <Badge variant={corpus.activationState === "active" ? "success" : "neutral"} size="sm">
              {corpus.activationState === "active" ? "Actif" : "Brouillon"}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {corpus.slug} · v{corpus.version} · snapshot {corpus.snapshotDate}
          </p>
          <p className="mt-1 text-[11px] text-body">
            {corpus.activeSources}/{corpus.totalSources} sources actives · {corpus.collectableSources} collectables · {corpus.accountsFed} comptes alimentés
          </p>
        </div>
        <svg className="mt-1 size-4 shrink-0 text-muted transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="space-y-4 border-t border-border/60 px-3 pb-3 pt-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={corpus.activationState === "active"} disabled={isPending} onChange={toggleActivation} className="size-4 accent-primary" />
            Corpus activé
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={corpus.enabledForNews} disabled={isPending} onChange={toggleNews} className="size-4 accent-primary" />
            Usage Actualités
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={corpus.enabledForAccountWatch} disabled={isPending} onChange={toggleAccountWatch} className="size-4 accent-primary" />
            Usage Veille comptes
          </label>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-heading">Sources du corpus</p>
          {corpus.items.length === 0 ? (
            <p className="text-[11px] text-muted">Aucune source dans ce corpus.</p>
          ) : (
            corpus.items.map((item) => <ItemRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </details>
  )
}

function cnCard(variant: "table" | "cards") {
  return variant === "table"
    ? "group border border-border bg-surface"
    : "group border border-border bg-surface open:pb-1"
}
