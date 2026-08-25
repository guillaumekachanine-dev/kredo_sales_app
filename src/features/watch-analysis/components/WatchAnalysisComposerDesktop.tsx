"use client"

// Compositeur Desktop de l'analyse à la demande (LOT L1).
//
// docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/03-PROMPT-LOT-0.md L1 §3-6
// Une SEULE modale (`IntelligenceSplitModalShell`) porte deux écrans internes
// — "compose" et "source-picker" — jamais une seconde modale empilée. La
// sélection en cours est conservée en revenant du picker au compositeur.

import { useMemo, useState } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { WorkflowExecutionConfirmDialog } from "@/components/ui/WorkflowExecutionConfirmDialog"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"
import { formatDateFr } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { VeilleArticle, VeilleDigest } from "@/app/(app)/veille/_data/veille-data"
import type { WatchAnalysisSource } from "@/lib/n8n/types"
import { fetchCollectionsSummary } from "@/features/content-collections/data/content-collections-client-queries"
import type { CollectionSummary } from "@/features/content-collections/domain/content-collections-contracts"
import { SOURCE_FAMILIES, SOURCE_FAMILY_LABELS, type SourceFamily } from "../domain/source-family"
import {
  fetchAccountSignalsForPicker,
  fetchIntelligenceDocumentsForPicker,
  type PickerAccountSignal,
  type PickerDocument,
} from "../data/watch-analysis-client-queries"
import { useDigestArticles } from "../hooks/use-digest-articles"
import { usePickerList } from "../hooks/use-picker-list"
import { useWatchAnalysisComposer } from "../hooks/use-watch-analysis-composer"
import { SourceItemViewer, type SourceViewerTarget } from "./SourceItemViewer"

export type WatchAnalysisComposerDesktopProps = {
  open: boolean
  onClose: () => void
  currentDigest: VeilleDigest | null
  currentDigestNumber: number | null
  pastDigests: VeilleDigest[]
  /** Corpus déjà chargé côté page — réutilisé pour éviter une requête (cadrage §12). */
  knownArticles: VeilleArticle[]
  onLaunched: (runId: string) => void
}

type SlotLabel = { title: string; detail: string }

const EMPTY_SLOT_LABEL: SlotLabel = { title: "Aucune source", detail: "Cliquez pour choisir une source." }

function digestSlotLabel(
  source: Extract<WatchAnalysisSource, { kind: "digest" }>,
  currentDigest: VeilleDigest | null,
  currentDigestNumber: number | null,
  pastDigests: VeilleDigest[],
): SlotLabel {
  const isCurrent = currentDigest?.id === source.digestId
  const digest = isCurrent ? currentDigest : (pastDigests.find((d) => d.id === source.digestId) ?? null)
  const title = isCurrent && currentDigestNumber ? `Digest #${currentDigestNumber}` : (digest?.titre_digest ?? "Digest")
  const detail = source.articleIds
    ? `${source.articleIds.length} article${source.articleIds.length > 1 ? "s" : ""} sélectionné${source.articleIds.length > 1 ? "s" : ""}`
    : "Digest complet"
  return { title, detail }
}

export function WatchAnalysisComposerDesktop({
  open,
  onClose,
  currentDigest,
  currentDigestNumber,
  pastDigests,
  knownArticles,
  onLaunched,
}: WatchAnalysisComposerDesktopProps) {
  const initialDigestSource = useMemo<WatchAnalysisSource | null>(
    () => (currentDigest ? { kind: "digest", digestId: currentDigest.id } : null),
    [currentDigest],
  )

  const composer = useWatchAnalysisComposer({ initialDigestSource, onLaunched })

  // Libellés d'affichage capturés au moment de la sélection (pas de re-résolution
  // depuis les IDs bruts, plus simple et strictement local à l'UI).
  const [slotLabels, setSlotLabels] = useState<Record<number, SlotLabel>>(() => {
    const initial: Record<number, SlotLabel> = {}
    if (currentDigest) initial[0] = digestSlotLabel({ kind: "digest", digestId: currentDigest.id }, currentDigest, currentDigestNumber, pastDigests)
    return initial
  })
  const [activeFamily, setActiveFamily] = useState<SourceFamily>("digest")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleClose = () => {
    onClose()
  }

  const handleOpenPicker = (slotIndex: number) => {
    const existing = composer.slots[slotIndex]
    setActiveFamily(existing?.kind ?? "digest")
    composer.openPicker(slotIndex)
  }

  const handleValidate = (source: WatchAnalysisSource, label: SlotLabel) => {
    if (composer.pickerSlotIndex === null) return
    setSlotLabels((current) => ({ ...current, [composer.pickerSlotIndex as number]: label }))
    composer.confirmPickerSelection(source)
  }

  const handleRemove = (slotIndex: number) => {
    composer.removeSlot(slotIndex)
    setSlotLabels((current) => {
      const next = { ...current }
      delete next[slotIndex]
      return next
    })
  }

  const handleLaunch = async () => {
    const result = await composer.launch()
    if (result.ok) {
      setSlotLabels(currentDigest ? { 0: digestSlotLabel({ kind: "digest", digestId: currentDigest.id }, currentDigest, currentDigestNumber, pastDigests) } : {})
      handleClose()
    }
  }

  return (
    <>
      <IntelligenceSplitModalShell
        open={open}
        onClose={handleClose}
        isMobile={false}
        title={composer.screen === "compose" ? "Générer une analyse" : "Choisir une source"}
        subtitle={composer.screen === "source-picker" ? SOURCE_FAMILY_LABELS[activeFamily] : undefined}
        leftPane={null}
        rightPane={null}
        headerActions={
          composer.screen === "source-picker" ? (
            <button
              type="button"
              onClick={composer.backToCompose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Retour au compositeur"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : null
        }
        content={
          composer.screen === "compose" ? (
            <ComposeScreen composer={composer} slotLabels={slotLabels} onOpenPicker={handleOpenPicker} onRemove={handleRemove} onLaunch={() => setConfirmOpen(true)} />
          ) : (
            <SourcePickerScreen
              activeFamily={activeFamily}
              onChangeFamily={setActiveFamily}
              currentDigest={currentDigest}
              currentDigestNumber={currentDigestNumber}
              pastDigests={pastDigests}
              knownArticles={knownArticles}
              existingSlotSource={composer.pickerSlotIndex !== null ? composer.slots[composer.pickerSlotIndex] : null}
              onValidate={handleValidate}
            />
          )
        }
      />

      <WorkflowExecutionConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        actionLabel="Lancer l’analyse"
        runType="intel-021-monthly-watch-analysis"
        onConfirm={handleLaunch}
        pending={composer.isLaunching}
      />
    </>
  )
}

function ComposeScreen({
  composer,
  slotLabels,
  onOpenPicker,
  onRemove,
  onLaunch,
}: {
  composer: ReturnType<typeof useWatchAnalysisComposer>
  slotLabels: Record<number, SlotLabel>
  onOpenPicker: (slotIndex: number) => void
  onRemove: (slotIndex: number) => void
  onLaunch: () => void
}) {
  const slotHeadings = ["SOURCE 1 · Principale", "SOURCE 2 · Complémentaire", "SOURCE 3 · Complémentaire"]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="grid grid-cols-3 gap-3.5">
            {[0, 1, 2].map((slotIndex) => {
              const source = composer.slots[slotIndex]
              const label = source ? (slotLabels[slotIndex] ?? EMPTY_SLOT_LABEL) : EMPTY_SLOT_LABEL
              const isActive = Boolean(source)

              return (
                <div
                  key={slotIndex}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-between rounded-2xl border p-4 text-center transition-all",
                    isActive
                      ? "border-brand-brass/60 bg-gradient-to-b from-brand-brass/15 via-brand-brass/5 to-white/[0.03] shadow-[0_0_20px_rgba(212,175,55,0.12)] text-white"
                      : "border-dashed border-white/15 bg-white/[0.02] text-white/60 hover:border-white/30 hover:bg-white/[0.04]",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.1em]",
                      isActive ? "text-brand-brass" : "text-white/40",
                    )}
                  >
                    {slotHeadings[slotIndex]}
                  </p>

                  {isActive ? (
                    <div className="my-auto flex flex-col items-center justify-center space-y-1 py-2 w-full">
                      <span className="flex size-7 items-center justify-center rounded-full bg-brand-brass/20 text-brand-brass text-xs mb-1 font-bold">
                        ✓
                      </span>
                      <p className="line-clamp-2 text-xs font-bold text-white leading-tight px-1">
                        {label.title}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-white/70 px-1">
                        {label.detail}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenPicker(slotIndex)}
                      className="my-auto flex flex-col items-center justify-center gap-1.5 py-4 w-full text-xs font-semibold text-white/60 transition-colors hover:text-white"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-white/20 text-base">
                        +
                      </span>
                      <span>Choisir une source</span>
                    </button>
                  )}

                  {isActive ? (
                    <div className="flex shrink-0 items-center justify-center gap-1.5 pt-1.5 w-full border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => onOpenPicker(slotIndex)}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-brass hover:bg-white/10 transition-colors"
                      >
                        Remplacer
                      </button>
                      <span className="text-white/20">·</span>
                      <button
                        type="button"
                        onClick={() => onRemove(slotIndex)}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white/50 hover:bg-white/10 hover:text-danger transition-colors"
                      >
                        Retirer
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <label htmlFor="watch-analysis-intention" className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
              Intention de l&apos;analyse
            </label>
            <Textarea
              id="watch-analysis-intention"
              value={composer.intention}
              onChange={(event) => composer.setIntention(event.target.value)}
              placeholder="Ex. Identifier les opportunités commerciales liées à la cybersécurité sur ces sources."
              rows={4}
              className="w-full border-white/10 bg-white/[0.03] text-white placeholder:text-white/40 focus:border-brand-brass/50 focus:ring-brand-brass/50"
            />
          </div>

          {composer.launchError ? (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {composer.launchError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-6 py-4">
        <Button variant="brass" fullWidth onClick={onLaunch} loading={composer.isLaunching} loadingLabel="Lancement" disabled={!composer.canLaunch}>
          Lancer l&apos;analyse
        </Button>
      </div>
    </div>
  )
}

const FAMILY_ICONS: Record<SourceFamily, string> = {
  digest: "📰",
  account_signals: "📡",
  intelligence_documents: "📄",
  knowledge_collection: "📚",
}

function SourcePickerScreen({
  activeFamily,
  onChangeFamily,
  currentDigest,
  currentDigestNumber,
  pastDigests,
  knownArticles,
  existingSlotSource,
  onValidate,
}: {
  activeFamily: SourceFamily
  onChangeFamily: (family: SourceFamily) => void
  currentDigest: VeilleDigest | null
  currentDigestNumber: number | null
  pastDigests: VeilleDigest[]
  knownArticles: VeilleArticle[]
  existingSlotSource: WatchAnalysisSource | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
}) {
  // Consulter une source ouvre un 3e volet à droite ; la nav des familles se
  // replie en rail pour lui laisser la place — même mécanisme que
  // `ManageCollectionsDesktop` (modale « Gérer la connaissance »).
  const [viewerTarget, setViewerTarget] = useState<SourceViewerTarget | null>(null)
  const isViewerOpen = viewerTarget !== null

  const handleChangeFamily = (family: SourceFamily) => {
    setViewerTarget(null)
    onChangeFamily(family)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 items-stretch">
      <aside
        className={cn(
          "h-full shrink-0 overflow-y-auto border-r border-white/10 transition-all duration-500 ease-out",
          isViewerOpen ? "w-14 p-2" : "w-56 p-3",
        )}
      >
        {isViewerOpen ? (
          <div className="flex flex-col items-center gap-2">
            {SOURCE_FAMILIES.map((family) => (
              <button
                key={family}
                type="button"
                onClick={() => handleChangeFamily(family)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                  activeFamily === family
                    ? "border border-brand-brass/40 bg-brand-brass/20 text-brand-brass"
                    : "border border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white",
                )}
                title={SOURCE_FAMILY_LABELS[family]}
                aria-label={SOURCE_FAMILY_LABELS[family]}
              >
                <span aria-hidden="true">{FAMILY_ICONS[family]}</span>
              </button>
            ))}
          </div>
        ) : (
          SOURCE_FAMILIES.map((family) => (
            <button
              key={family}
              type="button"
              onClick={() => handleChangeFamily(family)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                activeFamily === family ? "bg-primary text-primary-fg" : "text-white/70 hover:bg-white/5",
              )}
            >
              <span aria-hidden="true">{FAMILY_ICONS[family]}</span>
              {SOURCE_FAMILY_LABELS[family]}
            </button>
          ))
        )}
      </aside>

      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden bg-slate-950/20 transition-all duration-500 ease-out min-w-0",
          isViewerOpen ? "w-[420px] shrink-0 border-r border-white/10" : "flex-1",
        )}
      >
        {activeFamily === "digest" ? (
          <DigestFamilyPanel
            currentDigest={currentDigest}
            currentDigestNumber={currentDigestNumber}
            pastDigests={pastDigests}
            knownArticles={knownArticles}
            existingSlotSource={existingSlotSource?.kind === "digest" ? existingSlotSource : null}
            onValidate={onValidate}
            onOpenViewer={setViewerTarget}
            activeViewerItemId={viewerTarget?.family === "digest" ? viewerTarget.id : null}
          />
        ) : activeFamily === "account_signals" ? (
          <AccountSignalsFamilyPanel
            existingSlotSource={existingSlotSource?.kind === "account_signals" ? existingSlotSource : null}
            onValidate={onValidate}
            onOpenViewer={setViewerTarget}
            activeViewerItemId={viewerTarget?.family === "account_signals" ? viewerTarget.id : null}
          />
        ) : activeFamily === "intelligence_documents" ? (
          <DocumentsFamilyPanel
            existingSlotSource={existingSlotSource?.kind === "intelligence_documents" ? existingSlotSource : null}
            onValidate={onValidate}
            onOpenViewer={setViewerTarget}
            activeViewerItemId={viewerTarget?.family === "intelligence_documents" ? viewerTarget.id : null}
          />
        ) : (
          <CollectionsFamilyPanel
            existingSlotSource={existingSlotSource?.kind === "knowledge_collection" ? existingSlotSource : null}
            onValidate={onValidate}
            onOpenViewer={setViewerTarget}
            activeViewerItemId={viewerTarget?.family === "knowledge_collection" ? viewerTarget.id : null}
          />
        )}
      </div>

      {isViewerOpen ? (
        <div className="h-full flex-1 min-w-0 transition-all duration-500 ease-out">
          <SourceItemViewer target={viewerTarget} onClose={() => setViewerTarget(null)} />
        </div>
      ) : null}
    </div>
  )
}

/** Bouton "Consulter" — même traitement visuel que le bouton "Voir" de `KnowledgeListPane`. */
function ConsultButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all",
        isActive
          ? "bg-brand-brass text-slate-950 shadow-sm"
          : "bg-white/5 text-brand-brass border border-brand-brass/30 hover:bg-brand-brass/20",
      )}
    >
      <span>Consulter</span>
      <span aria-hidden="true">▸</span>
    </button>
  )
}

function PanelFooter({ disabled, onValidate }: { disabled: boolean; onValidate: () => void }) {
  return (
    <div className="shrink-0 border-t border-white/10 px-5 py-3 text-right">
      <Button variant="brass" size="sm" onClick={onValidate} disabled={disabled}>
        Valider la source
      </Button>
    </div>
  )
}

function DigestFamilyPanel({
  currentDigest,
  currentDigestNumber,
  pastDigests,
  knownArticles,
  existingSlotSource,
  onValidate,
  onOpenViewer,
  activeViewerItemId,
}: {
  currentDigest: VeilleDigest | null
  currentDigestNumber: number | null
  pastDigests: VeilleDigest[]
  knownArticles: VeilleArticle[]
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "digest" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
  onOpenViewer: (target: SourceViewerTarget) => void
  activeViewerItemId?: string | null
}) {
  const digestOptions = useMemo(() => {
    const options: VeilleDigest[] = []
    if (currentDigest) options.push(currentDigest)
    for (const digest of pastDigests) {
      if (!options.some((d) => d.id === digest.id)) options.push(digest)
    }
    return options
  }, [currentDigest, pastDigests])

  const [selectedDigestId, setSelectedDigestId] = useState<string | null>(
    existingSlotSource?.digestId ?? currentDigest?.id ?? digestOptions[0]?.id ?? null,
  )
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(
    () => new Set(existingSlotSource?.articleIds ?? []),
  )
  const [wantsFullDigest, setWantsFullDigest] = useState(!existingSlotSource?.articleIds)

  const { articles, loading } = useDigestArticles(selectedDigestId, knownArticles)

  const selectDigest = (digestId: string) => {
    setSelectedDigestId(digestId)
    setSelectedArticleIds(new Set())
    setWantsFullDigest(true)
  }

  const toggleArticle = (articleId: string) => {
    setWantsFullDigest(false)
    setSelectedArticleIds((current) => {
      const next = new Set(current)
      if (next.has(articleId)) next.delete(articleId)
      else next.add(articleId)
      return next
    })
  }

  const canValidate = Boolean(selectedDigestId) && (wantsFullDigest || selectedArticleIds.size > 0)

  const handleValidate = () => {
    if (!selectedDigestId) return
    const source: WatchAnalysisSource = wantsFullDigest
      ? { kind: "digest", digestId: selectedDigestId }
      : { kind: "digest", digestId: selectedDigestId, articleIds: Array.from(selectedArticleIds) }
    const label = digestSlotLabel(source as Extract<WatchAnalysisSource, { kind: "digest" }>, currentDigest, currentDigestNumber, pastDigests)
    onValidate(source, label)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
        <div className="w-52 shrink-0 overflow-y-auto border-r border-white/5 p-2">
          {digestOptions.length === 0 ? (
            <p className="p-3 text-xs text-white/50">Aucun digest disponible.</p>
          ) : (
            digestOptions.map((digest) => {
              const isCurrent = digest.id === currentDigest?.id
              const isSelected = digest.id === selectedDigestId
              return (
                <button
                  key={digest.id}
                  type="button"
                  onClick={() => selectDigest(digest.id)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-xs transition-colors",
                    isSelected ? "bg-primary/20 text-white" : "text-white/70 hover:bg-white/5",
                  )}
                >
                  <span className="font-bold">{isCurrent && currentDigestNumber ? `Digest #${currentDigestNumber}` : digest.titre_digest}</span>
                  <span className="text-white/50">{formatDateFr(digest.digest_date)}</span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-white/5 p-3">
            <label className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                checked={wantsFullDigest}
                onChange={(event) => setWantsFullDigest(event.target.checked)}
                className="size-4 shrink-0 accent-primary"
              />
              Tout le digest
            </label>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="p-3 text-xs text-white/50">Chargement des articles…</p>
            ) : articles.length === 0 ? (
              <p className="p-3 text-xs text-white/50">Aucun article pour ce digest.</p>
            ) : (
              <ul className="space-y-1">
                {articles.map((article) => (
                  <li key={article.id} className="flex items-center gap-1.5">
                    <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-sm text-white/85 hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={selectedArticleIds.has(article.id)}
                        disabled={wantsFullDigest}
                        onChange={() => toggleArticle(article.id)}
                        className="size-4 shrink-0 accent-primary disabled:opacity-40"
                      />
                      <span className="min-w-0 flex-1 truncate">{article.titre_fr}</span>
                    </label>
                    <ConsultButton
                      isActive={activeViewerItemId === article.id}
                      onClick={() => onOpenViewer({ family: "digest", id: article.id, title: article.titre_fr })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <PanelFooter disabled={!canValidate} onValidate={handleValidate} />
    </div>
  )
}

function AccountSignalsFamilyPanel({
  existingSlotSource,
  onValidate,
  onOpenViewer,
  activeViewerItemId,
}: {
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "account_signals" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
  onOpenViewer: (target: SourceViewerTarget) => void
  activeViewerItemId?: string | null
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(existingSlotSource?.signalIds ?? []))
  const matches = (signal: PickerAccountSignal, query: string) =>
    signal.title.toLowerCase().includes(query) || (signal.companyName?.toLowerCase().includes(query) ?? false)
  const { filteredItems, loading, error, query, setQuery } = usePickerList(true, fetchAccountSignalsForPicker, matches)

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleValidate = () => {
    const signalIds = Array.from(selected)
    onValidate(
      { kind: "account_signals", signalIds },
      { title: SOURCE_FAMILY_LABELS.account_signals, detail: `${signalIds.length} signal${signalIds.length > 1 ? "aux" : ""} sélectionné${signalIds.length > 1 ? "s" : ""}` },
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/5 p-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un signal ou un compte…"
          className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="p-3 text-xs text-white/50">Chargement des signaux…</p>
        ) : error ? (
          <p className="p-3 text-xs text-danger">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-3 text-xs text-white/50">Aucun signal disponible.</p>
        ) : (
          <ul className="space-y-1">
            {filteredItems.map((signal) => (
              <li key={signal.id} className="flex items-center gap-1.5">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-sm text-white/85 hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selected.has(signal.id)}
                    onChange={() => toggle(signal.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{signal.title}</span>
                    <span className="block truncate text-xs text-white/50">
                      {signal.companyName ?? "Compte non identifié"} · {formatDateFr(signal.detectedAt)}
                      {signal.globalScore !== null ? ` · score ${signal.globalScore}` : ""}
                    </span>
                  </span>
                </label>
                <ConsultButton
                  isActive={activeViewerItemId === signal.id}
                  onClick={() => onOpenViewer({ family: "account_signals", id: signal.id, title: signal.title })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooter disabled={selected.size === 0} onValidate={handleValidate} />
    </div>
  )
}

function DocumentsFamilyPanel({
  existingSlotSource,
  onValidate,
  onOpenViewer,
  activeViewerItemId,
}: {
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "intelligence_documents" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
  onOpenViewer: (target: SourceViewerTarget) => void
  activeViewerItemId?: string | null
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(existingSlotSource?.documentIds ?? []))
  const matches = (doc: PickerDocument, query: string) => doc.title.toLowerCase().includes(query)
  const { filteredItems, loading, error, query, setQuery } = usePickerList(true, fetchIntelligenceDocumentsForPicker, matches)

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleValidate = () => {
    const documentIds = Array.from(selected)
    onValidate(
      { kind: "intelligence_documents", documentIds },
      { title: SOURCE_FAMILY_LABELS.intelligence_documents, detail: `${documentIds.length} document${documentIds.length > 1 ? "s" : ""} sélectionné${documentIds.length > 1 ? "s" : ""}` },
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/5 p-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un document…"
          className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="p-3 text-xs text-white/50">Chargement des documents…</p>
        ) : error ? (
          <p className="p-3 text-xs text-danger">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-3 text-xs text-white/50">Aucun document disponible.</p>
        ) : (
          <ul className="space-y-1">
            {filteredItems.map((doc) => (
              <li key={doc.id} className="flex items-center gap-1.5">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-sm text-white/85 hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selected.has(doc.id)}
                    onChange={() => toggle(doc.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{doc.title}</span>
                    <span className="block truncate text-xs text-white/50">{doc.documentType} · {formatDateFr(doc.updatedAt)}</span>
                  </span>
                </label>
                <ConsultButton
                  isActive={activeViewerItemId === doc.id}
                  onClick={() => onOpenViewer({ family: "intelligence_documents", id: doc.id, title: doc.title })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooter disabled={selected.size === 0} onValidate={handleValidate} />
    </div>
  )
}

function CollectionsFamilyPanel({
  existingSlotSource,
  onValidate,
  onOpenViewer,
  activeViewerItemId,
}: {
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "knowledge_collection" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
  onOpenViewer: (target: SourceViewerTarget) => void
  activeViewerItemId?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(existingSlotSource?.collectionId ?? null)
  const matches = (collection: CollectionSummary, query: string) => collection.name.toLowerCase().includes(query)
  const { filteredItems, loading, error, query, setQuery } = usePickerList(true, fetchCollectionsSummary, matches)

  const handleValidate = () => {
    if (!selectedId) return
    const collection = filteredItems.find((item) => item.id === selectedId)
    onValidate(
      { kind: "knowledge_collection", collectionId: selectedId },
      { title: collection?.name ?? "Liste / Corpus", detail: collection ? (collection.kind === "corpus" ? "Corpus" : "Liste") : "Liste / Corpus" },
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/5 p-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une liste ou un corpus…"
          className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="p-3 text-xs text-white/50">Chargement des listes…</p>
        ) : error ? (
          <p className="p-3 text-xs text-danger">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-3 text-xs text-white/50">Aucune liste ni corpus disponible.</p>
        ) : (
          <ul className="space-y-1">
            {filteredItems.map((collection) => (
              <li key={collection.id} className="flex items-center gap-1.5">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-sm text-white/85 hover:bg-white/5">
                  <input
                    type="radio"
                    name="watch-analysis-collection"
                    checked={selectedId === collection.id}
                    onChange={() => setSelectedId(collection.id)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{collection.name}</span>
                    <span className="block truncate text-xs text-white/50">
                      {collection.kind === "corpus" ? "Corpus" : "Liste"}
                      {collection.description ? ` · ${collection.description}` : ""} · {collection.itemCount} élément{collection.itemCount > 1 ? "s" : ""}
                    </span>
                  </span>
                </label>
                <ConsultButton
                  isActive={activeViewerItemId === collection.id}
                  onClick={() => onOpenViewer({ family: "knowledge_collection", id: collection.id, title: collection.name })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooter disabled={!selectedId} onValidate={handleValidate} />
    </div>
  )
}
