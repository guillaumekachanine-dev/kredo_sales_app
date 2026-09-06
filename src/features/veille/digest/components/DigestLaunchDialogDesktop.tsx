"use client"

import { useMemo, useState } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { DigestLaunchOptions } from "../data/get-digest-launch-options"
import { launchDigest } from "../client/launch-digest"

export interface DigestLaunchDialogDesktopProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: DigestLaunchOptions
  onLaunched: (runId: string) => void
  disabled?: boolean
}

export function DigestLaunchDialogDesktop({
  open,
  onOpenChange,
  options,
  onLaunched,
  disabled = false,
}: DigestLaunchDialogDesktopProps) {
  const [topicKey, setTopicKey] = useState<string>("global")
  const [corpusId, setCorpusId] = useState<string | null>(null)
  const [hasUserSelectedCorpus, setHasUserSelectedCorpus] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTopicKey("global")
      setCorpusId(null)
      setHasUserSelectedCorpus(false)
      setIsLaunching(false)
      setError(null)
    }
  }

  const thematicTopics = useMemo(
    () => options.topics.filter((t) => t.group === "thematique"),
    [options.topics],
  )
  const segmentTopics = useMemo(
    () => options.topics.filter((t) => t.group === "segment"),
    [options.topics],
  )

  const thematicCorpora = useMemo(
    () => options.corpora.filter((c) => c.group === "thematique"),
    [options.corpora],
  )
  const sectorCorpora = useMemo(
    () => options.corpora.filter((c) => c.group === "sectoriel"),
    [options.corpora],
  )

  const selectedTopic = useMemo(
    () => options.topics.find((t) => t.topicKey === topicKey) ?? options.topics[0] ?? null,
    [options.topics, topicKey],
  )

  const selectedCorpus = useMemo(() => {
    if (!corpusId) return null
    return options.corpora.find((c) => c.id === corpusId) ?? null
  }, [options.corpora, corpusId])

  const handleSelectTopic = (newTopicKey: string) => {
    setTopicKey(newTopicKey)
    setError(null)

    // Si l'utilisateur n'a pas encore choisi manuellement un corpus,
    // préselectionner le corpus recommandé du sujet s'il est disponible.
    if (!hasUserSelectedCorpus) {
      const topicOption = options.topics.find((t) => t.topicKey === newTopicKey)
      if (topicOption?.defaultCorpusSlug) {
        const recommended = options.corpora.find(
          (c) => c.slug === topicOption.defaultCorpusSlug && c.selectable,
        )
        if (recommended) {
          setCorpusId(recommended.id)
          return
        }
      }
      setCorpusId(null)
    }
  };

  const handleSelectCorpus = (newCorpusId: string | null) => {
    if (newCorpusId !== null) {
      const target = options.corpora.find((c) => c.id === newCorpusId)
      if (target && !target.selectable) return
    }
    setCorpusId(newCorpusId)
    setHasUserSelectedCorpus(true)
    setError(null)
  }

  const handleLaunch = async () => {
    if (isLaunching || disabled) return
    setIsLaunching(true)
    setError(null)

    const result = await launchDigest({
      topicKey,
      corpusId,
    })

    if (!result.ok) {
      setError(result.error)
      setIsLaunching(false)
      return
    }

    setIsLaunching(false)
    onOpenChange(false)
    onLaunched(result.runId)
  }

  const resolvedSourcesCount = selectedCorpus
    ? selectedCorpus.sourcesCount
    : options.defaultSourcesCount

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!isLaunching) onOpenChange(next)
      }}
      title="Générer un digest"
      description="Choisissez le sujet éditorial et le corpus de sources pour orienter la collecte."
      dataTheme="edito-bright-veille"
      className="sm:max-w-[44rem]"
      headerClassName="border-b border-border pb-4"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isLaunching}
          >
            Annuler
          </Button>
          <Button
            variant="brass"
            size="md"
            onClick={handleLaunch}
            loading={isLaunching}
            disabled={disabled || isLaunching}
            leftIcon={
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            }
          >
            Générer le digest
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        {/* BLOC 1 : SUJET */}
        <section aria-labelledby="dialog-section-sujet">
          <div className="flex items-center justify-between">
            <h3 id="dialog-section-sujet" className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
              1. Sujet éditorial
            </h3>
            <span className="text-[11px] text-muted">« Qu&apos;est-ce que je retiens ? »</span>
          </div>

          <div className="mt-2.5 space-y-3">
            {/* Thématiques */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-heading">Thématiques</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {thematicTopics.map((topic) => {
                  const isSelected = topicKey === topic.topicKey
                  return (
                    <button
                      key={topic.topicKey}
                      type="button"
                      onClick={() => handleSelectTopic(topic.topicKey)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex flex-col items-start justify-between rounded-[var(--radius-small)] border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-heading",
                        isSelected
                          ? "border-primary bg-primary/5 text-heading shadow-xs ring-1 ring-primary/40"
                          : "border-border bg-surface text-body hover:border-border-strong hover:bg-surface-hover/60",
                      )}
                    >
                      <span className="text-xs font-bold text-heading">{topic.label}</span>
                      {topic.defaultCorpusSlug ? (
                        <span className="mt-1 text-[10px] text-muted">
                          Corpus conseillé : {topic.defaultCorpusSlug}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Segments métier dynamiques (si présents) */}
            {segmentTopics.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-heading">Segments métier</p>
                <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {segmentTopics.map((segment) => {
                    const isSelected = topicKey === segment.topicKey
                    return (
                      <button
                        key={segment.topicKey}
                        type="button"
                        onClick={() => handleSelectTopic(segment.topicKey)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex items-center justify-between rounded-[var(--radius-small)] border px-3 py-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-heading",
                          isSelected
                            ? "border-primary bg-primary/5 text-heading shadow-xs ring-1 ring-primary/40"
                            : "border-border bg-surface text-body hover:border-border-strong hover:bg-surface-hover/60",
                        )}
                      >
                        <span className="truncate text-xs font-medium text-heading">{segment.label}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted">Segment</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* BLOC 2 : CORPUS DE SOURCES */}
        <section aria-labelledby="dialog-section-corpus" className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h3 id="dialog-section-corpus" className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
              2. Corpus de sources
            </h3>
            <span className="text-[11px] text-muted">« Où est-ce que je cherche ? »</span>
          </div>

          <div className="mt-2.5 space-y-2">
            {/* Option par défaut : Socle KREDO */}
            <button
              type="button"
              onClick={() => handleSelectCorpus(null)}
              aria-pressed={corpusId === null}
              className={cn(
                "flex w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-heading",
                corpusId === null
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                  : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover/60",
              )}
            >
              <div>
                <span className="text-xs font-bold text-heading">Sources KREDO par défaut</span>
                <span className="ml-2 inline-flex items-center rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted border border-border/60">
                  Socle
                </span>
                <p className="mt-0.5 text-[11px] text-muted">
                  Ensemble des flux éditoriaux et presse généraliste validés.
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-heading">
                {options.defaultSourcesCount} sources
              </span>
            </button>

            {/* Corpus thématiques */}
            {thematicCorpora.map((corpus) => {
              const isSelected = corpusId === corpus.id
              const isSelectable = corpus.selectable

              return (
                <button
                  key={corpus.id}
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => handleSelectCorpus(corpus.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-heading",
                    !isSelectable && "cursor-not-allowed opacity-50 bg-canvas/60 border-dashed",
                    isSelectable && isSelected && "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40",
                    isSelectable && !isSelected && "border-border bg-surface hover:border-border-strong hover:bg-surface-hover/60",
                  )}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-heading">{corpus.label}</span>
                      <span className="inline-flex shrink-0 items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Thématique
                      </span>
                    </div>
                    {corpus.unavailableReason ? (
                      <p className="mt-0.5 text-[11px] text-danger">{corpus.unavailableReason}</p>
                    ) : (
                      <p className="mt-0.5 truncate text-[11px] text-muted">{corpus.slug}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-heading">
                    {corpus.sourcesCount} source{corpus.sourcesCount > 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}

            {/* Corpus sectoriels */}
            {sectorCorpora.map((corpus) => {
              const isSelected = corpusId === corpus.id
              const isSelectable = corpus.selectable

              return (
                <button
                  key={corpus.id}
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => handleSelectCorpus(corpus.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-heading",
                    !isSelectable && "cursor-not-allowed opacity-50 bg-canvas/60 border-dashed",
                    isSelectable && isSelected && "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40",
                    isSelectable && !isSelected && "border-border bg-surface hover:border-border-strong hover:bg-surface-hover/60",
                  )}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-heading">{corpus.label}</span>
                      <span className="inline-flex shrink-0 items-center rounded bg-brand-brass/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-brass">
                        Sectoriel
                      </span>
                    </div>
                    {corpus.unavailableReason ? (
                      <p className="mt-0.5 text-[11px] text-danger">{corpus.unavailableReason}</p>
                    ) : (
                      <p className="mt-0.5 truncate text-[11px] text-muted">{corpus.slug}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-heading">
                    {corpus.sourcesCount} source{corpus.sourcesCount > 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* RÉSUMÉ COMPACT BAS DE MODALE */}
        <div className="rounded-[var(--radius-small)] border border-border bg-canvas/60 p-3">
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Sujet</dt>
              <dd className="mt-0.5 truncate font-bold text-heading">
                {selectedTopic?.label ?? "Veille IA & Marché"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Sources</dt>
              <dd className="mt-0.5 truncate font-bold text-heading">
                {selectedCorpus ? selectedCorpus.label : "Sources KREDO par défaut"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Corpus</dt>
              <dd className="mt-0.5 font-bold text-heading">
                {resolvedSourcesCount} source{resolvedSourcesCount > 1 ? "s" : ""}
              </dd>
            </div>
          </dl>
        </div>

        {error ? (
          <div role="alert" className="rounded-[var(--radius-small)] border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        ) : null}
      </div>
    </AppDialog>
  )
}
