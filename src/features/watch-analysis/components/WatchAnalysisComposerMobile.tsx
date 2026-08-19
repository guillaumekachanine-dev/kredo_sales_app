"use client"

// Compositeur Mobile de l'analyse à la demande (LOT L1).
//
// docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/03-PROMPT-LOT-0.md L1 §7
// Composant plein écran DÉDIÉ — ne réutilise pas le markup du compositeur
// Desktop (seuls les hooks/la logique le sont). Cartes empilées, cibles
// tactiles ≥ 44px. Le picker remplace temporairement l'écran du compositeur
// (jamais de double sheet).

import { useMemo, useState } from "react"
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

export type WatchAnalysisComposerMobileProps = {
  open: boolean
  onClose: () => void
  currentDigest: VeilleDigest | null
  pastDigests: VeilleDigest[]
  knownArticles: VeilleArticle[]
  onLaunched: (runId: string) => void
}

type SlotLabel = { title: string; detail: string }

const EMPTY_SLOT_LABEL: SlotLabel = { title: "Aucune source", detail: "Choisir une source" }

function digestSlotLabel(
  source: Extract<WatchAnalysisSource, { kind: "digest" }>,
  currentDigest: VeilleDigest | null,
  pastDigests: VeilleDigest[],
): SlotLabel {
  const isCurrent = currentDigest?.id === source.digestId
  const digest = isCurrent ? currentDigest : (pastDigests.find((d) => d.id === source.digestId) ?? null)
  const title = digest ? digest.titre_digest : "Digest"
  const detail = source.articleIds
    ? `${source.articleIds.length} article${source.articleIds.length > 1 ? "s" : ""} sélectionné${source.articleIds.length > 1 ? "s" : ""}`
    : `Digest complet · ${formatDateFr(digest?.digest_date ?? null)}`
  return { title, detail }
}

export function WatchAnalysisComposerMobile({
  open,
  onClose,
  currentDigest,
  pastDigests,
  knownArticles,
  onLaunched,
}: WatchAnalysisComposerMobileProps) {
  const initialDigestSource = useMemo<WatchAnalysisSource | null>(
    () => (currentDigest ? { kind: "digest", digestId: currentDigest.id } : null),
    [currentDigest],
  )

  const composer = useWatchAnalysisComposer({ initialDigestSource, onLaunched })

  const [slotLabels, setSlotLabels] = useState<Record<number, SlotLabel>>(() => {
    const initial: Record<number, SlotLabel> = {}
    if (currentDigest) initial[0] = digestSlotLabel({ kind: "digest", digestId: currentDigest.id }, currentDigest, pastDigests)
    return initial
  })
  const [activeFamily, setActiveFamily] = useState<SourceFamily>("digest")

  if (!open) return null

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
      setSlotLabels(currentDigest ? { 0: digestSlotLabel({ kind: "digest", digestId: currentDigest.id }, currentDigest, pastDigests) } : {})
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-[#0f122c] text-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {composer.screen === "source-picker" ? (
          <button
            type="button"
            onClick={composer.backToCompose}
            aria-label="Retour au compositeur"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/5"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-bold">
          {composer.screen === "compose" ? "Générer une analyse" : SOURCE_FAMILY_LABELS[activeFamily]}
        </h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/5"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {composer.screen === "compose" ? (
        <ComposeScreenMobile composer={composer} slotLabels={slotLabels} onOpenPicker={handleOpenPicker} onRemove={handleRemove} onLaunch={handleLaunch} />
      ) : (
        <SourcePickerScreenMobile
          activeFamily={activeFamily}
          onChangeFamily={setActiveFamily}
          currentDigest={currentDigest}
          pastDigests={pastDigests}
          knownArticles={knownArticles}
          existingSlotSource={composer.pickerSlotIndex !== null ? composer.slots[composer.pickerSlotIndex] : null}
          onValidate={handleValidate}
        />
      )}
    </div>
  )
}

function ComposeScreenMobile({
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
  const slotHeadings = ["Source 1 · Principale", "Source 2 · Complémentaire", "Source 3 · Complémentaire"]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {[0, 1, 2].map((slotIndex) => {
            const source = composer.slots[slotIndex]
            const label = source ? (slotLabels[slotIndex] ?? EMPTY_SLOT_LABEL) : EMPTY_SLOT_LABEL
            return (
              <div key={slotIndex} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">{slotHeadings[slotIndex]}</p>
                {source ? (
                  <div className="mt-2">
                    <p className="text-sm font-bold text-white">{label.title}</p>
                    <p className="mt-0.5 text-xs text-white/60">{label.detail}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <button type="button" onClick={() => onOpenPicker(slotIndex)} className="min-h-11 text-xs font-bold text-primary">
                        Remplacer
                      </button>
                      <button type="button" onClick={() => onRemove(slotIndex)} className="min-h-11 text-xs font-bold text-white/60">
                        Retirer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenPicker(slotIndex)}
                    className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 text-sm font-semibold text-white/70"
                  >
                    <span aria-hidden="true">+</span> Choisir une source
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5">
          <label htmlFor="watch-analysis-intention-mobile" className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
            Intention de l&apos;analyse
          </label>
          <Textarea
            id="watch-analysis-intention-mobile"
            value={composer.intention}
            onChange={(event) => composer.setIntention(event.target.value)}
            placeholder="Ex. Identifier les opportunités commerciales de ces sources."
            rows={4}
            className="mt-2 border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
          />
        </div>

        {composer.launchError ? (
          <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {composer.launchError}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button variant="brass" fullWidth onClick={onLaunch} loading={composer.isLaunching} loadingLabel="Lancement" disabled={!composer.canLaunch}>
          Lancer l&apos;analyse
        </Button>
      </div>
    </div>
  )
}

function SourcePickerScreenMobile({
  activeFamily,
  onChangeFamily,
  currentDigest,
  pastDigests,
  knownArticles,
  existingSlotSource,
  onValidate,
}: {
  activeFamily: SourceFamily
  onChangeFamily: (family: SourceFamily) => void
  currentDigest: VeilleDigest | null
  pastDigests: VeilleDigest[]
  knownArticles: VeilleArticle[]
  existingSlotSource: WatchAnalysisSource | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-2">
        {SOURCE_FAMILIES.map((family) => (
          <button
            key={family}
            type="button"
            onClick={() => onChangeFamily(family)}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-xs font-bold whitespace-nowrap",
              activeFamily === family ? "bg-primary text-primary-fg" : "bg-white/5 text-white/70",
            )}
          >
            {SOURCE_FAMILY_LABELS[family]}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeFamily === "digest" ? (
          <DigestFamilyPanelMobile
            currentDigest={currentDigest}
            pastDigests={pastDigests}
            knownArticles={knownArticles}
            existingSlotSource={existingSlotSource?.kind === "digest" ? existingSlotSource : null}
            onValidate={onValidate}
          />
        ) : activeFamily === "account_signals" ? (
          <AccountSignalsFamilyPanelMobile
            existingSlotSource={existingSlotSource?.kind === "account_signals" ? existingSlotSource : null}
            onValidate={onValidate}
          />
        ) : activeFamily === "intelligence_documents" ? (
          <DocumentsFamilyPanelMobile
            existingSlotSource={existingSlotSource?.kind === "intelligence_documents" ? existingSlotSource : null}
            onValidate={onValidate}
          />
        ) : (
          <CollectionsFamilyPanelMobile
            existingSlotSource={existingSlotSource?.kind === "knowledge_collection" ? existingSlotSource : null}
            onValidate={onValidate}
          />
        )}
      </div>
    </div>
  )
}

function PanelFooterMobile({ disabled, onValidate }: { disabled: boolean; onValidate: () => void }) {
  return (
    <div className="shrink-0 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      <Button variant="brass" fullWidth onClick={onValidate} disabled={disabled}>
        Valider la source
      </Button>
    </div>
  )
}

function DigestFamilyPanelMobile({
  currentDigest,
  pastDigests,
  knownArticles,
  existingSlotSource,
  onValidate,
}: {
  currentDigest: VeilleDigest | null
  pastDigests: VeilleDigest[]
  knownArticles: VeilleArticle[]
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "digest" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
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
    const label = digestSlotLabel(source as Extract<WatchAnalysisSource, { kind: "digest" }>, currentDigest, pastDigests)
    onValidate(source, label)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/5 px-3 py-2">
        {digestOptions.map((digest) => (
          <button
            key={digest.id}
            type="button"
            onClick={() => selectDigest(digest.id)}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-bold",
              digest.id === selectedDigestId ? "bg-primary/25 text-white" : "bg-white/5 text-white/60",
            )}
          >
            {formatDateFr(digest.digest_date)}
          </button>
        ))}
      </div>
      <div className="shrink-0 border-b border-white/5 px-4 py-2">
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-white">
          <input
            type="checkbox"
            checked={wantsFullDigest}
            onChange={(event) => setWantsFullDigest(event.target.checked)}
            className="size-5 shrink-0 accent-primary"
          />
          Tout le digest
        </label>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <p className="py-4 text-xs text-white/50">Chargement des articles…</p>
        ) : articles.length === 0 ? (
          <p className="py-4 text-xs text-white/50">Aucun article pour ce digest.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {articles.map((article) => (
              <li key={article.id}>
                <label className="flex min-h-11 items-center gap-2.5 py-2 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={selectedArticleIds.has(article.id)}
                    disabled={wantsFullDigest}
                    onChange={() => toggleArticle(article.id)}
                    className="size-5 shrink-0 accent-primary disabled:opacity-40"
                  />
                  <span className="min-w-0 flex-1 truncate">{article.titre_fr}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooterMobile disabled={!canValidate} onValidate={handleValidate} />
    </div>
  )
}

function AccountSignalsFamilyPanelMobile({
  existingSlotSource,
  onValidate,
}: {
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "account_signals" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un signal ou un compte…"
          className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <p className="py-4 text-xs text-white/50">Chargement des signaux…</p>
        ) : error ? (
          <p className="py-4 text-xs text-danger">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="py-4 text-xs text-white/50">Aucun signal disponible.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredItems.map((signal) => (
              <li key={signal.id}>
                <label className="flex min-h-11 items-center gap-2.5 py-2 text-sm text-white/85">
                  <input type="checkbox" checked={selected.has(signal.id)} onChange={() => toggle(signal.id)} className="size-5 shrink-0 accent-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{signal.title}</span>
                    <span className="block truncate text-xs text-white/50">{signal.companyName ?? "Compte non identifié"} · {formatDateFr(signal.detectedAt)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooterMobile disabled={selected.size === 0} onValidate={handleValidate} />
    </div>
  )
}

function DocumentsFamilyPanelMobile({
  existingSlotSource,
  onValidate,
}: {
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "intelligence_documents" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un document…"
          className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <p className="py-4 text-xs text-white/50">Chargement des documents…</p>
        ) : error ? (
          <p className="py-4 text-xs text-danger">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="py-4 text-xs text-white/50">Aucun document disponible.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredItems.map((doc) => (
              <li key={doc.id}>
                <label className="flex min-h-11 items-center gap-2.5 py-2 text-sm text-white/85">
                  <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggle(doc.id)} className="size-5 shrink-0 accent-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{doc.title}</span>
                    <span className="block truncate text-xs text-white/50">{doc.documentType} · {formatDateFr(doc.updatedAt)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooterMobile disabled={selected.size === 0} onValidate={handleValidate} />
    </div>
  )
}

function CollectionsFamilyPanelMobile({
  existingSlotSource,
  onValidate,
}: {
  existingSlotSource: Extract<WatchAnalysisSource, { kind: "knowledge_collection" }> | null
  onValidate: (source: WatchAnalysisSource, label: SlotLabel) => void
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une liste ou un corpus…"
          className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <p className="py-4 text-xs text-white/50">Chargement des listes…</p>
        ) : error ? (
          <p className="py-4 text-xs text-danger">{error}</p>
        ) : filteredItems.length === 0 ? (
          <p className="py-4 text-xs text-white/50">Aucune liste ni corpus disponible.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredItems.map((collection) => (
              <li key={collection.id}>
                <label className="flex min-h-11 items-center gap-2.5 py-2 text-sm text-white/85">
                  <input
                    type="radio"
                    name="watch-analysis-collection-mobile"
                    checked={selectedId === collection.id}
                    onChange={() => setSelectedId(collection.id)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{collection.name}</span>
                    <span className="block truncate text-xs text-white/50">
                      {collection.kind === "corpus" ? "Corpus" : "Liste"} · {collection.itemCount} élément{collection.itemCount > 1 ? "s" : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooterMobile disabled={!selectedId} onValidate={handleValidate} />
    </div>
  )
}
