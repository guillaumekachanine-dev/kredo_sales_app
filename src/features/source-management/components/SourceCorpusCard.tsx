"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  CORPUS_QUALITY_VERDICT_LABELS,
  type SourceCorpusItemView,
  type SourceCorpusView,
} from "../domain/source-management-contracts"
import {
  removeSourceFromCorpusAction,
  renameCorpusSourceAction,
  setCorpusAccountWatchEnabledAction,
  setCorpusActivationAction,
  setCorpusItemEnabledAction,
  setCorpusNewsEnabledAction,
  updateCorpusEditorialAction,
} from "../actions/source-management-actions"

function PencilIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CloseIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

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
          {item.source?.effectiveness && item.source.effectiveness.effectivenessScore !== null ? (
            <Badge variant="success" size="sm">
              {item.source.effectiveness.effectivenessScore}/100 ({item.source.effectiveness.observations} runs)
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              À observer ({item.source?.effectiveness?.observations ?? 0}/3 runs)
            </Badge>
          )}
          {typeof item.utilityScore === "number" ? <span>Score {item.utilityScore}</span> : null}
          {item.automationFit ? <span className="capitalize">{item.automationFit.replace("_", " ")}</span> : null}
          {!item.isCollectable ? <Badge variant="neutral" size="sm">Hors veille récurrente</Badge> : null}
          {item.newsEligible ? <Badge variant="info" size="sm">Actualités</Badge> : null}
          {item.accountWatchEligible ? <Badge variant="info" size="sm">Veille comptes</Badge> : null}
        </div>
        {item.exclusionReason ? <p className="mt-1 text-[10px] text-danger">{item.exclusionReason}</p> : null}
      </div>
      <label className="flex shrink-0 items-center gap-2 text-[11px] text-heading min-h-[44px] cursor-pointer">
        {item.isEnabled ? "Actif" : "Inactif"}
        <input
          type="checkbox"
          checked={item.isEnabled}
          disabled={isPending}
          onChange={toggle}
          className="size-5 accent-primary"
          aria-label={`Activer ou désactiver ${item.source?.name ?? "cette source"} dans le corpus`}
        />
      </label>
    </div>
  )
}

function EditableItemRow({ item }: { item: SourceCorpusItemView }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initialName = item.source?.name ?? item.externalSrcId ?? "Source inconnue"
  const [nameDraft, setNameDraft] = useState(initialName)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)

  const isProtected = item.source?.origin === "system" || Boolean(item.source?.isLocked)
  const isNameChanged = nameDraft.trim() !== initialName && nameDraft.trim().length > 0

  const handleRename = () => {
    if (isProtected || !item.id) return
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setItemError("Le nom ne peut pas être vide.")
      return
    }
    setItemError(null)
    startTransition(async () => {
      const res = await renameCorpusSourceAction(item.id, trimmed)
      if (res.success) {
        router.refresh()
      } else {
        setItemError(res.error)
      }
    })
  }

  const handleRemove = () => {
    if (!item.id) return
    setItemError(null)
    startTransition(async () => {
      const res = await removeSourceFromCorpusAction(item.id)
      if (res.success) {
        setConfirmingRemove(false)
        router.refresh()
      } else {
        setItemError(res.error)
      }
    })
  }

  if (confirmingRemove) {
    return (
      <div className="space-y-2 rounded-lg border border-danger/40 bg-danger/5 p-3 text-xs">
        <p className="font-semibold text-danger">Retirer cette source du corpus ?</p>
        <p className="text-[11px] text-body leading-relaxed">
          Cette source sera retirée de ce corpus. Elle restera disponible dans le catalogue si elle est utilisée ailleurs.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirmingRemove(false)}
            className="min-h-[44px] min-w-[44px]"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleRemove}
            className="min-h-[44px] min-w-[44px]"
          >
            {isPending ? "Retrait..." : "Retirer"}
          </Button>
        </div>
        {itemError ? <p className="text-[11px] text-danger font-medium">{itemError}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-2 border-b border-border/50 py-3 text-xs last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isProtected ? (
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-heading truncate">{initialName}</span>
            <Badge variant="neutral" size="sm">Source protégée</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="text"
              value={nameDraft}
              disabled={isPending}
              maxLength={120}
              onChange={(e) => {
                setNameDraft(e.target.value)
                setItemError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleRename()
                } else if (e.key === "Escape") {
                  setNameDraft(initialName)
                  setItemError(null)
                }
              }}
              placeholder="Nom de la source"
              className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-heading focus:border-primary focus:outline-none"
            />
            {isNameChanged ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={isPending}
                  title="Enregistrer"
                  aria-label="Enregistrer le renommage"
                  className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-brand-brass text-secondary-fg hover:bg-brand-brass-hover transition-colors cursor-pointer"
                >
                  <CheckIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(initialName)
                    setItemError(null)
                  }}
                  disabled={isPending}
                  title="Annuler"
                  aria-label="Annuler le renommage"
                  className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-heading transition-colors cursor-pointer"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirmingRemove(true)}
          className="min-h-[44px] min-w-[44px] shrink-0"
        >
          Retirer
        </Button>
      </div>

      {itemError ? (
        <p className="text-[11px] text-danger font-medium">{itemError}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        {item.source?.domain ? <span className="font-mono">{item.source.domain}</span> : null}
        {item.source?.domain && item.source?.family ? <span>·</span> : null}
        {item.source?.family ? <span>{item.source.family}</span> : null}
        {item.source?.effectiveness?.effectivenessScore != null ? (
          <Badge variant="success" size="sm">
            {item.source.effectiveness.effectivenessScore}/100
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export interface SourceCorpusCardProps {
  corpus: SourceCorpusView
  variant: "table" | "cards"
  canEdit?: boolean
}

export function SourceCorpusCard({ corpus, variant, canEdit = false }: SourceCorpusCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isEditing, setIsEditing] = useState(false)
  const [corpusNameDraft, setCorpusNameDraft] = useState(corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "")
  const [corpusDescDraft, setCorpusDescDraft] = useState(corpus?.description ?? "")
  const [corpusError, setCorpusError] = useState<string | null>(null)

  const handleStartEdit = () => {
    setCorpusNameDraft(corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "")
    setCorpusDescDraft(corpus?.description ?? "")
    setCorpusError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setCorpusNameDraft(corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "")
    setCorpusDescDraft(corpus?.description ?? "")
    setCorpusError(null)
    setIsEditing(false)
  }

  const handleSaveCorpus = () => {
    if (!corpus?.id) return
    const trimmed = corpusNameDraft.trim()
    if (!trimmed) {
      setCorpusError("Le nom du corpus ne peut pas être vide.")
      return
    }
    setCorpusError(null)
    startTransition(async () => {
      const res = await updateCorpusEditorialAction(corpus.id, {
        name: trimmed,
        description: corpusDescDraft.trim() || null,
      })
      if (res.success) {
        setIsEditing(false)
        router.refresh()
      } else {
        setCorpusError(res.error)
      }
    })
  }

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
            <p className="font-semibold text-heading">{corpus.name ?? corpus.sectorName ?? corpus.slug}</p>
            <Badge variant={qualityVariant(corpus.qualityVerdict)} size="sm">
              {CORPUS_QUALITY_VERDICT_LABELS[corpus.qualityVerdict]}
            </Badge>
            <Badge variant={corpus.activationState === "active" ? "success" : "neutral"} size="sm">
              {corpus.activationState === "active" ? "Actif" : "Brouillon"}
            </Badge>
          </div>

          {corpus.description ? (
            <p className="mt-1 text-xs text-muted leading-relaxed whitespace-pre-line">
              {corpus.description}
            </p>
          ) : null}

          <p className="mt-1 text-[11px] text-muted">
            {corpus.slug} · v{corpus.version} · snapshot {corpus.snapshotDate}
          </p>
          <p className="mt-1 text-[11px] text-body">
            {corpus.activeSources}/{corpus.totalSources} sources actives · {corpus.collectableSources} collectables
            {corpus.scopeKind !== "thematic" ? ` · ${corpus.accountsFed} comptes alimentés` : ""}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-brand-brass">
            Efficacité observée : {corpus.averageEffectivenessScore != null ? `${corpus.averageEffectivenessScore}/100` : "À observer"} ({corpus.evaluatedSourcesCount} / {corpus.totalSources} sources évaluées)
          </p>
        </div>
        <svg className="mt-1 size-4 shrink-0 text-muted transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="space-y-4 border-t border-border/60 px-3 pb-3 pt-3">
        {/* Barre d'action Édition (Mobile) */}
        {canEdit && !isEditing ? (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartEdit}
              className="min-h-[44px] min-w-[44px] flex items-center gap-1.5"
            >
              <PencilIcon className="size-4" />
              <span>Modifier le corpus</span>
            </Button>
          </div>
        ) : null}

        {/* Formulaire d'édition du corpus en mode édition */}
        {isEditing ? (
          <div className="space-y-3 rounded-lg border border-brand-brass/40 bg-surface-hover/30 p-3">
            <div>
              <label htmlFor={`mobile-corpus-name-${corpus.id}`} className="block text-[11px] font-semibold text-heading mb-1">
                Nom du corpus
              </label>
              <input
                id={`mobile-corpus-name-${corpus.id}`}
                type="text"
                value={corpusNameDraft}
                maxLength={120}
                autoFocus
                disabled={isPending}
                onChange={(e) => {
                  setCorpusNameDraft(e.target.value)
                  setCorpusError(null)
                }}
                placeholder="Nom du corpus"
                className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-heading focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor={`mobile-corpus-desc-${corpus.id}`} className="block text-[11px] font-semibold text-heading mb-1">
                Description (optionnelle)
              </label>
              <textarea
                id={`mobile-corpus-desc-${corpus.id}`}
                rows={2}
                maxLength={500}
                value={corpusDescDraft}
                disabled={isPending}
                onChange={(e) => {
                  setCorpusDescDraft(e.target.value)
                  setCorpusError(null)
                }}
                placeholder="Courte description du corpus..."
                className="min-h-[60px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-body focus:border-primary focus:outline-none resize-y"
              />
            </div>

            {corpusError ? (
              <p className="text-xs text-danger font-medium">{corpusError}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={handleCancelEdit}
                className="min-h-[44px] min-w-[44px]"
              >
                Annuler
              </Button>
              <Button
                variant="brass"
                size="sm"
                loading={isPending}
                onClick={handleSaveCorpus}
                className="min-h-[44px] min-w-[44px]"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        ) : null}

        {/* Toggles du corpus */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input type="checkbox" checked={corpus.activationState === "active"} disabled={isPending} onChange={toggleActivation} className="size-5 accent-primary" />
            Corpus activé
          </label>
          {corpus.scopeKind !== "thematic" ? (
            <>
              <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={corpus.enabledForNews} disabled={isPending} onChange={toggleNews} className="size-5 accent-primary" />
                Usage Actualités
              </label>
              <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={corpus.enabledForAccountWatch} disabled={isPending} onChange={toggleAccountWatch} className="size-5 accent-primary" />
                Usage Veille comptes
              </label>
            </>
          ) : null}
        </div>

        {/* Liste verticale des sources */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-heading">
              Sources du corpus ({corpus.items.length})
            </p>
            {isEditing ? (
              <p className="text-[10px] text-muted italic">
                Nom commun aux corpus
              </p>
            ) : null}
          </div>

          {corpus.items.length === 0 ? (
            <p className="text-[11px] text-muted">Aucune source dans ce corpus.</p>
          ) : isEditing ? (
            corpus.items.map((item) => <EditableItemRow key={item.id} item={item} />)
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
