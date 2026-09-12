"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  removeSourceFromCorpusAction,
  renameCorpusSourceAction,
  setCorpusAccountWatchEnabledAction,
  setCorpusActivationAction,
  setCorpusItemEnabledAction,
  setCorpusNewsEnabledAction,
  updateCorpusEditorialAction,
} from "../actions/source-management-actions"
import type { SourceCorpusItemView, SourceCorpusView } from "../domain/source-management-contracts"

function PencilIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function TrashIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function CheckIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CloseIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

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
  const displayUrl = item.source?.searchDomain || (item.source?.homepageUrl ? item.source.homepageUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "")
  const descriptionText = item.source?.family ?? item.tier ?? "Corpus"

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]">
      {/* 1. Identity (Ligne 1: Nom + URL | Ligne 2: Description) */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-xs text-white truncate" title={`${name}${displayUrl ? ` (${displayUrl})` : ""}`}>
          <span>{name}</span>
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

      {/* 2. Efficacité & Switch */}
      <div className="flex shrink-0 items-center gap-3">
        {item.source?.effectiveness && item.source.effectiveness.effectivenessScore !== null ? (
          <div className="text-right hidden sm:block">
            <p className="font-bold text-xs text-brand-brass font-mono">
              {item.source.effectiveness.effectivenessScore}/100
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {item.source.effectiveness.observations} runs
            </p>
          </div>
        ) : null}

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

function CorpusItemEditableRow({ item }: { item: SourceCorpusItemView }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const initialName = item.source?.name ?? item.externalSrcId ?? "Source inconnue"
  const [nameDraft, setNameDraft] = useState(initialName)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isProtected = item.source?.origin === "system" || Boolean(item.source?.isLocked)
  const isNameChanged = nameDraft.trim() !== initialName && nameDraft.trim().length > 0

  const toggle = (next: boolean) => {
    if (!item.isCollectable || !item.id) return
    startTransition(async () => {
      await setCorpusItemEnabledAction(item.id, next)
      router.refresh()
    })
  }

  const handleRename = () => {
    if (isProtected || !item.id) return
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setActionError("Le nom ne peut pas être vide.")
      return
    }
    setActionError(null)
    startTransition(async () => {
      const res = await renameCorpusSourceAction(item.id, trimmed)
      if (res.success) {
        router.refresh()
      } else {
        setActionError(res.error)
      }
    })
  }

  const handleRemove = () => {
    if (!item.id) return
    setActionError(null)
    startTransition(async () => {
      const res = await removeSourceFromCorpusAction(item.id)
      if (res.success) {
        setConfirmingRemove(false)
        router.refresh()
      } else {
        setActionError(res.error)
      }
    })
  }

  const displayUrl = item.source?.searchDomain || (item.source?.homepageUrl ? item.source.homepageUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "")
  const descriptionText = item.source?.family ?? item.tier ?? "Corpus"

  if (confirmingRemove) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs space-y-2">
        <p className="font-semibold text-white">Retirer cette source du corpus ?</p>
        <p className="text-[11px] text-white/70 leading-relaxed">
          Cette source sera retirée de ce corpus. Elle restera disponible dans le catalogue si elle est utilisée ailleurs.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmingRemove(false)}
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRemove}
            className="rounded-lg bg-danger px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-danger/90 transition-colors cursor-pointer"
          >
            {isPending ? "Retrait..." : "Retirer"}
          </button>
        </div>
        {actionError ? <p className="text-[11px] text-danger font-medium">{actionError}</p> : null}
      </div>
    )
  }

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.06]">
      {/* 1. Ligne 1 : Nom éditable (ou protégé) + Poubelle */}
      <div className="flex items-center justify-between gap-2">
        {isProtected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-xs text-white truncate" title={initialName}>
              {initialName}
            </span>
            <span className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
              Source protégée
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="text"
              value={nameDraft}
              disabled={isPending}
              maxLength={120}
              onChange={(e) => {
                setNameDraft(e.target.value)
                setActionError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleRename()
                } else if (e.key === "Escape") {
                  setNameDraft(initialName)
                  setActionError(null)
                }
              }}
              placeholder="Nom de la source"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white placeholder-white/40 focus:border-brand-brass focus:outline-none"
            />
            {isNameChanged ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={isPending}
                  title="Enregistrer le renommage"
                  aria-label="Enregistrer le renommage"
                  className="flex size-7 items-center justify-center rounded-md bg-brand-brass text-[#0f122c] hover:bg-brand-brass-hover transition-colors cursor-pointer"
                >
                  <CheckIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(initialName)
                    setActionError(null)
                  }}
                  disabled={isPending}
                  title="Annuler le renommage"
                  aria-label="Annuler le renommage"
                  className="flex size-7 items-center justify-center rounded-md bg-white/10 text-white/70 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <CloseIcon className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={() => setConfirmingRemove(true)}
          disabled={isPending}
          title="Retirer cette source du corpus"
          aria-label="Retirer cette source du corpus"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-white/40 hover:border-danger/30 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>

      {actionError ? (
        <p className="text-[11px] text-danger font-medium">{actionError}</p>
      ) : null}

      {/* 2. Ligne 2 : Métadonnées (URL, famille, score) & Switch */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-white/50 pt-1 border-t border-white/5">
        <div className="min-w-0 flex-1 truncate">
          {displayUrl ? <span className="font-mono">{displayUrl}</span> : null}
          {displayUrl && descriptionText ? <span className="mx-1.5">·</span> : null}
          {descriptionText ? <span>{descriptionText}</span> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {item.source?.effectiveness && item.source.effectiveness.effectivenessScore !== null ? (
            <span className="font-bold text-brand-brass font-mono">
              {item.source.effectiveness.effectivenessScore}/100
            </span>
          ) : null}

          <DarkSwitch
            checked={Boolean(item.isEnabled)}
            disabled={!item.isCollectable || isPending}
            onChange={toggle}
            label={`Activer ou désactiver ${initialName}`}
          />
        </div>
      </div>
    </div>
  )
}

export interface SourceCorpusDetailViewProps {
  corpus: SourceCorpusView
  canEdit?: boolean
}

export function SourceCorpusDetailView({ corpus, canEdit = false }: SourceCorpusDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isEditing, setIsEditing] = useState(false)
  const [corpusNameDraft, setCorpusNameDraft] = useState(corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "")
  const [corpusDescDraft, setCorpusDescDraft] = useState(corpus?.description ?? "")
  const [corpusEditError, setCorpusEditError] = useState<string | null>(null)

  const items = Array.isArray(corpus?.items)
    ? corpus.items.filter((item): item is SourceCorpusItemView => Boolean(item))
    : []

  const handleStartEdit = () => {
    setCorpusNameDraft(corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "")
    setCorpusDescDraft(corpus?.description ?? "")
    setCorpusEditError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setCorpusNameDraft(corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "")
    setCorpusDescDraft(corpus?.description ?? "")
    setCorpusEditError(null)
    setIsEditing(false)
  }

  const handleSaveCorpus = () => {
    if (!corpus?.id) return
    const trimmed = corpusNameDraft.trim()
    if (!trimmed) {
      setCorpusEditError("Le nom du corpus ne peut pas être vide.")
      return
    }
    setCorpusEditError(null)
    startTransition(async () => {
      const res = await updateCorpusEditorialAction(corpus.id, {
        name: trimmed,
        description: corpusDescDraft.trim() || null,
      })
      if (res.success) {
        setIsEditing(false)
        router.refresh()
      } else {
        setCorpusEditError(res.error)
      }
    })
  }

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
      {/* ── BARRE CONTEXTUELLE DU CORPUS ───────────────────────────── */}
      {isEditing ? (
        <div className="space-y-3 rounded-xl border border-brand-brass/40 bg-white/[0.04] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div>
                <label htmlFor="corpus-name-input" className="block text-[11px] font-semibold text-white/70 mb-1">
                  Nom du corpus
                </label>
                <input
                  id="corpus-name-input"
                  type="text"
                  value={corpusNameDraft}
                  maxLength={120}
                  autoFocus
                  disabled={isPending}
                  onChange={(e) => {
                    setCorpusNameDraft(e.target.value)
                    setCorpusEditError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSaveCorpus()
                    } else if (e.key === "Escape") {
                      handleCancelEdit()
                    }
                  }}
                  placeholder="Nom du corpus"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white placeholder-white/40 focus:border-brand-brass focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="corpus-desc-input" className="block text-[11px] font-semibold text-white/70 mb-1">
                  Description du corpus (optionnelle)
                </label>
                <textarea
                  id="corpus-desc-input"
                  rows={3}
                  maxLength={500}
                  value={corpusDescDraft}
                  disabled={isPending}
                  onChange={(e) => {
                    setCorpusDescDraft(e.target.value)
                    setCorpusEditError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      handleCancelEdit()
                    }
                  }}
                  placeholder="Une ou deux phrases courtes décrivant le périmètre de ce corpus..."
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-brand-brass focus:outline-none resize-y"
                />
              </div>

              {corpusEditError ? (
                <p className="text-xs text-danger font-medium">{corpusEditError}</p>
              ) : null}

              {/* Lignes 3 & 4 informatives */}
              <p className="text-[11px] text-white/50">
                {totalSourcesCount} sources · {activeSourcesCount} actives · v{corpus?.version ?? "1.0"}
              </p>
              <p className="text-[11px] text-brand-brass font-medium">
                Efficacité observée : {corpus?.averageEffectivenessScore != null ? `${corpus.averageEffectivenessScore}/100` : "À observer"} ({corpus?.evaluatedSourcesCount ?? 0} / {totalSourcesCount} sources évaluées)
              </p>
            </div>

            {/* Boutons d'action Annuler / Enregistrer */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={handleCancelEdit}
                className="!border-white/15 !bg-white/5 hover:!bg-white/10 !text-white cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                variant="brass"
                size="sm"
                loading={isPending}
                onClick={handleSaveCorpus}
                className="cursor-pointer"
              >
                Enregistrer
              </Button>
            </div>
          </div>

          {/* Switches existants */}
          <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-white/5 text-xs text-white/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-white/70">Corpus actif</span>
              <DarkSwitch
                checked={corpus?.activationState === "active"}
                disabled={isPending}
                onChange={toggleActivation}
                label="Activer le corpus"
              />
            </label>

            {corpus?.scopeKind !== "thematic" ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Ligne 1 : Nom du corpus */}
              <h3 className="text-sm font-bold text-white truncate">
                {corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "Corpus"}
              </h3>

              {/* Ligne 2 : Description si présente */}
              {corpus?.description ? (
                <p className="mt-1 text-xs text-white/70 leading-relaxed max-w-2xl whitespace-pre-line">
                  {corpus.description}
                </p>
              ) : null}

              {/* Ligne 3 : Métadonnées existantes */}
              <p className="mt-1.5 text-[11px] text-white/50">
                {totalSourcesCount} sources · {activeSourcesCount} actives · v{corpus?.version ?? "1.0"}
              </p>

              {/* Ligne 4 : Efficacité observée */}
              <p className="mt-0.5 text-[11px] text-brand-brass font-medium">
                Efficacité observée : {corpus?.averageEffectivenessScore != null ? `${corpus.averageEffectivenessScore}/100` : "À observer"} ({corpus?.evaluatedSourcesCount ?? 0} / {totalSourcesCount} sources évaluées)
              </p>
            </div>

            {/* Bouton crayon complètement à droite sur la même ligne que le titre */}
            {canEdit ? (
              <button
                type="button"
                onClick={handleStartEdit}
                title="Modifier le corpus"
                aria-label="Modifier le corpus"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-white/50 transition-colors hover:border-white/10 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <PencilIcon className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Switches existants */}
          <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-white/5 text-xs text-white/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-white/70">Corpus actif</span>
              <DarkSwitch
                checked={corpus?.activationState === "active"}
                disabled={isPending}
                onChange={toggleActivation}
                label="Activer le corpus"
              />
            </label>

            {corpus?.scopeKind !== "thematic" ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── LISTE DES SOURCES DU CORPUS ───────────────────── */}
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-xs text-white/60">
            <span className="font-semibold text-white/80">Sources du corpus ({items.length})</span>
            <span className="text-[11px] text-white/40 italic">
              Le nom de la source est commun à tous les corpus qui l’utilisent.
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
              <p>Aucune source référencée dans ce corpus.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5">
              {items.map((item, index) => (
                <CorpusItemEditableRow
                  key={item.id || item.sourceId || item.externalSrcId || `corpus-item-edit-${index}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        items.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/50">
            <p>Aucune source référencée dans ce corpus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
            {items.map((item, index) => (
              <CorpusItemRow key={item.id || item.sourceId || item.externalSrcId || `corpus-item-${index}`} item={item} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
