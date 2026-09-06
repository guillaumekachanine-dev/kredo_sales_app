"use client"

import { useMemo, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { DigestLaunchOptions } from "../data/get-digest-launch-options"
import { launchDigest } from "../client/launch-digest"

export interface DigestLaunchSheetMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: DigestLaunchOptions
  onLaunched: (runId: string) => void
  disabled?: boolean
}

export function DigestLaunchSheetMobile({
  open,
  onOpenChange,
  options,
  onLaunched,
  disabled = false,
}: DigestLaunchSheetMobileProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [topicKey, setTopicKey] = useState<string>("global")
  const [corpusId, setCorpusId] = useState<string | null>(null)
  const [hasUserSelectedCorpus, setHasUserSelectedCorpus] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setStep(1)
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

    if (!hasUserSelectedCorpus) {
      const topicOption = options.topics.find((t) => t.topicKey === newTopicKey)
      if (topicOption?.defaultCorpusSlug) {
        const recommended = options.corpora.find(
          (c) => c.slug === topicOption.defaultCorpusSlug && c.selectable,
        )
        if (recommended) {
          setCorpusId(recommended.id)
          setStep(2)
          return
        }
      }
      setCorpusId(null)
    }

    setStep(2)
  }

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
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!isLaunching) onOpenChange(next)
      }}
      side="bottom"
      title="Générer un digest"
      subtitle={step === 1 ? "Étape 1/2 : Choisissez le sujet" : "Étape 2/2 : Choisissez les sources"}
      showMobileCloseButton
      footer={
        <div className="flex w-full flex-col gap-2.5">
          {error ? (
            <div role="alert" className="rounded-[var(--radius-small)] border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              {error}
            </div>
          ) : null}

          {step === 2 ? (
            <>
              {/* Résumé compact final */}
              <div className="rounded-[var(--radius-small)] border border-border bg-canvas/60 p-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Sujet</span>
                    <span className="block truncate font-bold text-heading mt-0.5">
                      {selectedTopic?.label ?? "Veille IA"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Corpus</span>
                    <span className="block truncate font-bold text-heading mt-0.5">
                      {selectedCorpus ? selectedCorpus.label : "Sources KREDO"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Sources</span>
                    <span className="block font-bold text-heading mt-0.5">
                      {resolvedSourcesCount} source{resolvedSourcesCount > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="brass"
                fullWidth
                size="lg"
                className="min-h-[48px] text-sm font-bold"
                onClick={handleLaunch}
                loading={isLaunching}
                disabled={disabled || isLaunching}
              >
                Générer le digest
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              size="lg"
              className="min-h-[48px] text-sm font-semibold"
              onClick={() => setStep(2)}
              disabled={isLaunching}
            >
              Étape suivante : Choisir les sources
            </Button>
          )}
        </div>
      }
    >
      <div className="py-2">
        {step === 1 ? (
          /* ÉTAPE 1 — SUJET */
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                Thématiques d&apos;actualité
              </p>
              <div className="mt-2 space-y-2">
                {thematicTopics.map((topic) => {
                  const isSelected = topicKey === topic.topicKey
                  return (
                    <button
                      key={topic.topicKey}
                      type="button"
                      onClick={() => handleSelectTopic(topic.topicKey)}
                      className={cn(
                        "flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-small)] border p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heading active:scale-[0.99]",
                        isSelected
                          ? "border-primary bg-primary/5 text-heading ring-1 ring-primary/40"
                          : "border-border bg-surface text-body hover:bg-surface-hover/60",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-heading">{topic.label}</span>
                        {topic.defaultCorpusSlug ? (
                          <span className="block text-[11px] text-muted mt-0.5">
                            Corpus conseillé : {topic.defaultCorpusSlug}
                          </span>
                        ) : null}
                      </div>
                      <span className="ml-3 shrink-0 text-muted">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {segmentTopics.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                  Segments métier
                </p>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {segmentTopics.map((segment) => {
                    const isSelected = topicKey === segment.topicKey
                    return (
                      <button
                        key={segment.topicKey}
                        type="button"
                        onClick={() => handleSelectTopic(segment.topicKey)}
                        className={cn(
                          "flex min-h-[48px] w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heading active:scale-[0.99]",
                          isSelected
                            ? "border-primary bg-primary/5 text-heading ring-1 ring-primary/40"
                            : "border-border bg-surface text-body hover:bg-surface-hover/60",
                        )}
                      >
                        <span className="truncate text-xs font-bold text-heading">{segment.label}</span>
                        <span className="ml-2 shrink-0 text-muted">
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* ÉTAPE 2 — SOURCES */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>Modifier le sujet sélectionné ({selectedTopic?.label})</span>
            </button>

            <div className="space-y-2">
              {/* Option par défaut */}
              <button
                type="button"
                onClick={() => handleSelectCorpus(null)}
                className={cn(
                  "flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heading active:scale-[0.99]",
                  corpusId === null
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                    : "border-border bg-surface hover:bg-surface-hover/60",
                )}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-heading">Sources KREDO par défaut</span>
                    <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[9px] font-semibold text-muted border border-border/60">
                      Socle
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">Flux éditoriaux et presse généraliste</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-heading">
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
                    className={cn(
                      "flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heading active:scale-[0.99]",
                      !isSelectable && "cursor-not-allowed opacity-50 bg-canvas/60 border-dashed",
                      isSelectable && isSelected && "border-primary bg-primary/5 ring-1 ring-primary/40",
                      isSelectable && !isSelected && "border-border bg-surface hover:bg-surface-hover/60",
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-heading">{corpus.label}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                          Thématique
                        </span>
                      </div>
                      {corpus.unavailableReason ? (
                        <p className="mt-0.5 text-[11px] text-danger">{corpus.unavailableReason}</p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted">{corpus.slug}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-heading">
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
                    className={cn(
                      "flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-small)] border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heading active:scale-[0.99]",
                      !isSelectable && "cursor-not-allowed opacity-50 bg-canvas/60 border-dashed",
                      isSelectable && isSelected && "border-primary bg-primary/5 ring-1 ring-primary/40",
                      isSelectable && !isSelected && "border-border bg-surface hover:bg-surface-hover/60",
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-heading">{corpus.label}</span>
                        <span className="rounded bg-brand-brass/10 px-1.5 py-0.5 text-[9px] font-semibold text-brand-brass">
                          Sectoriel
                        </span>
                      </div>
                      {corpus.unavailableReason ? (
                        <p className="mt-0.5 text-[11px] text-danger">{corpus.unavailableReason}</p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted">{corpus.slug}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-heading">
                      {corpus.sourcesCount} source{corpus.sourcesCount > 1 ? "s" : ""}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppDrawer>
  )
}
