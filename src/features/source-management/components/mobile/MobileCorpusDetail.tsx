"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import {
  removeSourceFromCorpusAction,
  renameCorpusSourceAction,
  setCorpusAccountWatchEnabledAction,
  setCorpusActivationAction,
  setCorpusItemEnabledAction,
  setCorpusNewsEnabledAction,
  updateCorpusEditorialAction,
} from "../../actions/source-management-actions"
import type {
  SourceCorpusItemView,
  SourceCorpusView,
  SourceManagementSnapshot,
} from "../../domain/source-management-contracts"
import {
  removeSourceFromCorpusInSnapshot,
  setCorpusAccountWatchEnabledInSnapshot,
  setCorpusActivationInSnapshot,
  setCorpusItemEnabledInSnapshot,
  setCorpusNewsEnabledInSnapshot,
  updateCorpusEditorialInSnapshot,
  updateSourceNameInSnapshot,
} from "../../domain/source-management-reconciliation"
import { MobileDarkSwitch } from "./MobileDarkSwitch"

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

export interface MobileCorpusDetailProps {
  corpus: SourceCorpusView
  canEdit?: boolean
  onSnapshotChange?: (updater: (current: SourceManagementSnapshot) => SourceManagementSnapshot) => void
  onRefresh?: (options?: { silent?: boolean }) => Promise<void>
}

function MobileCorpusItemRow({
  item,
  onSnapshotChange,
  onRefresh,
}: {
  item: SourceCorpusItemView
  onSnapshotChange?: (updater: (current: SourceManagementSnapshot) => SourceManagementSnapshot) => void
  onRefresh?: (options?: { silent?: boolean }) => Promise<void>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (!item) return null

  const toggle = (next: boolean) => {
    if (!item.isCollectable || !item.id) return
    onSnapshotChange?.((current) =>
      setCorpusItemEnabledInSnapshot(current, item.id, next),
    )
    startTransition(async () => {
      const res = await setCorpusItemEnabledAction(item.id, next)
      if (!res.success) {
        onSnapshotChange?.((current) =>
          setCorpusItemEnabledInSnapshot(current, item.id, !next),
        )
      } else {
        router.refresh()
      }
      void onRefresh?.()
    })
  }

  const name = item.source?.name ?? item.externalSrcId ?? "Source inconnue"
  const displayUrl =
    item.source?.searchDomain ||
    (item.source?.homepageUrl
      ? item.source.homepageUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
      : "")
  const descriptionText = item.source?.family ?? item.tier ?? "Corpus"

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-xs text-white truncate" title={name}>
          {name}
        </p>
        {displayUrl ? (
          <p className="mt-0.5 font-mono text-[11px] text-white/50 truncate">
            {displayUrl}
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-white/45">
          {descriptionText ? <span>{descriptionText}</span> : null}
          {item.source?.effectiveness && item.source.effectiveness.effectivenessScore !== null ? (
            <span className="font-mono font-bold text-brand-brass">
              · {item.source.effectiveness.effectivenessScore}/100
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <MobileDarkSwitch
          checked={Boolean(item.isEnabled)}
          disabled={!item.isCollectable || isPending}
          onChange={toggle}
          label={`Activer ou désactiver ${name}`}
        />
      </div>
    </div>
  )
}

function MobileCorpusItemEditableRow({
  item,
  onSnapshotChange,
  onRefresh,
}: {
  item: SourceCorpusItemView
  onSnapshotChange?: (updater: (current: SourceManagementSnapshot) => SourceManagementSnapshot) => void
  onRefresh?: (options?: { silent?: boolean }) => Promise<void>
}) {
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
    onSnapshotChange?.((current) =>
      setCorpusItemEnabledInSnapshot(current, item.id, next),
    )
    startTransition(async () => {
      const res = await setCorpusItemEnabledAction(item.id, next)
      if (!res.success) {
        onSnapshotChange?.((current) =>
          setCorpusItemEnabledInSnapshot(current, item.id, !next),
        )
      } else {
        router.refresh()
      }
      void onRefresh?.()
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
        onSnapshotChange?.((current) =>
          updateSourceNameInSnapshot(current, res.sourceId ?? item.sourceId, trimmed),
        )
        router.refresh()
        void onRefresh?.()
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
        onSnapshotChange?.((current) =>
          removeSourceFromCorpusInSnapshot(current, item.id),
        )
        router.refresh()
        void onRefresh?.()
      } else {
        setActionError(res.error)
      }
    })
  }

  const displayUrl =
    item.source?.searchDomain ||
    (item.source?.homepageUrl
      ? item.source.homepageUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
      : "")
  const descriptionText = item.source?.family ?? item.tier ?? "Corpus"

  if (confirmingRemove) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs space-y-2.5">
        <p className="font-semibold text-white">Retirer cette source du corpus ?</p>
        <p className="text-[11px] text-white/70 leading-relaxed">
          Cette source sera retirée de ce corpus uniquement. Elle restera préservée dans le catalogue.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmingRemove(false)}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRemove}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-danger px-3 py-1 text-xs font-bold text-white hover:bg-danger/90 transition-colors cursor-pointer"
          >
            {isPending ? "Retrait..." : "Retirer"}
          </button>
        </div>
        {actionError ? <p className="text-[11px] text-danger font-medium">{actionError}</p> : null}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2.5 transition-colors">
      {/* Ligne 1 : Nom éditable (ou tag système) + Bouton Retirer */}
      <div className="flex items-center justify-between gap-2">
        {isProtected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-xs text-white truncate" title={initialName}>
              {initialName}
            </span>
            <span className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
              Protégée
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
              className="w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white placeholder-white/40 focus:border-brand-brass focus:outline-none"
            />
            {isNameChanged ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={isPending}
                  title="Valider le renommage"
                  aria-label="Valider le renommage"
                  className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-brand-brass text-secondary-fg hover:bg-brand-brass-hover transition-colors cursor-pointer"
                >
                  <CheckIcon className="size-4" />
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
                  className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <CloseIcon className="size-4" />
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
          className="flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-transparent text-rose-400/70 hover:border-danger/30 hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>

      {actionError ? (
        <p className="text-[11px] text-danger font-medium">{actionError}</p>
      ) : null}

      {/* Ligne 2 : Métadonnées + Toggle d'activation */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5 text-[11px] text-white/50">
        <div className="min-w-0 flex-1 truncate">
          {displayUrl ? <span className="font-mono">{displayUrl}</span> : null}
          {displayUrl && descriptionText ? <span className="mx-1.5">·</span> : null}
          {descriptionText ? <span>{descriptionText}</span> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.source?.effectiveness && item.source.effectiveness.effectivenessScore !== null ? (
            <span className="font-bold text-brand-brass font-mono">
              {item.source.effectiveness.effectivenessScore}/100
            </span>
          ) : null}

          <MobileDarkSwitch
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

export function MobileCorpusDetail({
  corpus,
  canEdit = false,
  onSnapshotChange,
  onRefresh,
}: MobileCorpusDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isEditing, setIsEditing] = useState(false)
  const [corpusNameDraft, setCorpusNameDraft] = useState(
    corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "",
  )
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
    const nextDesc = corpusDescDraft.trim() || null
    startTransition(async () => {
      const res = await updateCorpusEditorialAction(corpus.id, {
        name: trimmed,
        description: nextDesc,
      })
      if (res.success) {
        setIsEditing(false)
        onSnapshotChange?.((current) =>
          updateCorpusEditorialInSnapshot(current, corpus.id, {
            name: trimmed,
            description: nextDesc,
          }),
        )
        router.refresh()
        void onRefresh?.()
      } else {
        setCorpusEditError(res.error)
      }
    })
  }

  const toggleActivation = (next: boolean) => {
    if (!corpus?.id) return
    const nextState = next ? "active" : "draft"
    onSnapshotChange?.((current) =>
      setCorpusActivationInSnapshot(current, corpus.id, nextState),
    )
    startTransition(async () => {
      const res = await setCorpusActivationAction(corpus.id, nextState)
      if (!res.success) {
        onSnapshotChange?.((current) =>
          setCorpusActivationInSnapshot(current, corpus.id, next ? "draft" : "active"),
        )
      } else {
        router.refresh()
      }
      void onRefresh?.()
    })
  }

  const toggleNews = (next: boolean) => {
    if (!corpus?.id) return
    onSnapshotChange?.((current) =>
      setCorpusNewsEnabledInSnapshot(current, corpus.id, next),
    )
    startTransition(async () => {
      const res = await setCorpusNewsEnabledAction(corpus.id, next)
      if (!res.success) {
        onSnapshotChange?.((current) =>
          setCorpusNewsEnabledInSnapshot(current, corpus.id, !next),
        )
      } else {
        router.refresh()
      }
      void onRefresh?.()
    })
  }

  const toggleAccountWatch = (next: boolean) => {
    if (!corpus?.id) return
    onSnapshotChange?.((current) =>
      setCorpusAccountWatchEnabledInSnapshot(current, corpus.id, next),
    )
    startTransition(async () => {
      const res = await setCorpusAccountWatchEnabledAction(corpus.id, next)
      if (!res.success) {
        onSnapshotChange?.((current) =>
          setCorpusAccountWatchEnabledInSnapshot(current, corpus.id, !next),
        )
      } else {
        router.refresh()
      }
      void onRefresh?.()
    })
  }

  const totalSourcesCount = corpus?.totalSources ?? items.length
  const activeSourcesCount = corpus?.activeSources ?? items.filter((i) => i.isEnabled).length

  return (
    <div className="space-y-4 pb-6">
      {/* ── EN-TÊTE DU CORPUS (LECTURE OU ÉDITION) ────────────────── */}
      {isEditing ? (
        <div className="rounded-xl border border-brand-brass/40 bg-white/[0.04] p-3.5 space-y-3 shadow-xs">
          <div>
            <label htmlFor="mobile-corpus-name" className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
              Nom du corpus
            </label>
            <input
              id="mobile-corpus-name"
              type="text"
              value={corpusNameDraft}
              maxLength={120}
              autoFocus
              disabled={isPending}
              onChange={(e) => {
                setCorpusNameDraft(e.target.value)
                setCorpusEditError(null)
              }}
              placeholder="Nom du corpus"
              className="w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white placeholder-white/40 focus:border-brand-brass focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="mobile-corpus-desc" className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
              Description (optionnelle)
            </label>
            <textarea
              id="mobile-corpus-desc"
              rows={2}
              maxLength={500}
              value={corpusDescDraft}
              disabled={isPending}
              onChange={(e) => {
                setCorpusDescDraft(e.target.value)
                setCorpusEditError(null)
              }}
              placeholder="Courte description du périmètre du corpus..."
              className="w-full min-h-[60px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-brand-brass focus:outline-none resize-y"
            />
          </div>

          {corpusEditError ? (
            <p className="text-xs text-danger font-medium">{corpusEditError}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={handleCancelEdit}
              className="min-h-[44px] min-w-[44px] !border-white/15 !bg-white/5 text-white hover:!bg-white/10 cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              variant="brass"
              size="sm"
              loading={isPending}
              onClick={handleSaveCorpus}
              className="min-h-[44px] min-w-[44px] cursor-pointer"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white truncate">
                {corpus?.name ?? corpus?.sectorName ?? corpus?.slug ?? "Corpus"}
              </h3>
              {corpus?.description ? (
                <p className="mt-1 text-xs text-white/70 leading-relaxed whitespace-pre-line">
                  {corpus.description}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-white/50">
                {totalSourcesCount} sources · {activeSourcesCount} actives · v{corpus?.version ?? "1.0"}
              </p>
              <p className="mt-0.5 text-[11px] text-brand-brass font-medium">
                Efficacité : {corpus?.averageEffectivenessScore != null ? `${corpus.averageEffectivenessScore}/100` : "À observer"} ({corpus?.evaluatedSourcesCount ?? 0}/{totalSourcesCount} évaluées)
              </p>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={handleStartEdit}
                aria-label="Modifier le corpus"
                className="flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <PencilIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── COMMUTATEURS DU CORPUS ───────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          <span className="text-xs font-semibold text-white">Corpus activé</span>
          <MobileDarkSwitch
            checked={corpus?.activationState === "active"}
            disabled={isPending}
            onChange={toggleActivation}
            label="Activer le corpus"
          />
        </div>

        {corpus?.scopeKind !== "thematic" ? (
          <>
            <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1 min-h-[44px]">
              <span className="text-xs font-medium text-white/80">Usage Actualités</span>
              <MobileDarkSwitch
                checked={Boolean(corpus?.enabledForNews)}
                disabled={isPending}
                onChange={toggleNews}
                label="Activer pour les actualités"
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1 min-h-[44px]">
              <span className="text-xs font-medium text-white/80">Usage Veille comptes</span>
              <MobileDarkSwitch
                checked={Boolean(corpus?.enabledForAccountWatch)}
                disabled={isPending}
                onChange={toggleAccountWatch}
                label="Activer pour la veille comptes"
              />
            </div>
          </>
        ) : null}
      </div>

      {/* ── LISTE DES SOURCES DU CORPUS ──────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
            Sources du corpus ({items.length})
          </h4>
          {isEditing ? (
            <span className="text-[10px] text-white/40 italic">
              Nom commun aux corpus
            </span>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-white/45">
            Aucune source référencée dans ce corpus.
          </div>
        ) : isEditing ? (
          <div className="space-y-2">
            {items.map((item, index) => (
              <MobileCorpusItemEditableRow
                key={item.id || item.sourceId || item.externalSrcId || `mob-edit-${index}`}
                item={item}
                onSnapshotChange={onSnapshotChange}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <MobileCorpusItemRow
                key={item.id || item.sourceId || item.externalSrcId || `mob-item-${index}`}
                item={item}
                onSnapshotChange={onSnapshotChange}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
