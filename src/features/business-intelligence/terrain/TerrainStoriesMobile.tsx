"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  formatStorySourceIds,
  stripCommercialLabel,
  type TerrainStory,
} from "./terrain-stories-model"

export type TerrainStoriesMobileProps = {
  stories: TerrainStory[]
  initialIndex?: number
  onBack: () => void
  className?: string
}

const SWIPE_THRESHOLD_PX = 44

export function TerrainStoriesMobile({
  stories,
  initialIndex = 0,
  onBack,
  className,
}: TerrainStoriesMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, Math.max(0, stories.length - 1))),
  )
  const touchStartY = useRef<number | null>(null)

  const total = stories.length
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1
  const currentStory: TerrainStory | undefined = stories[currentIndex]

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(total - 1, prev + 1))
  }, [total])

  // Navigation clavier (Flèches & Échap)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault()
        if (!isLast) handleNext()
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault()
        if (!isFirst) handlePrevious()
      } else if (event.key === "Escape") {
        event.preventDefault()
        onBack()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFirst, isLast, handleNext, handlePrevious, onBack])

  // Gestion du swipe vertical (Touch events)
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartY.current = event.touches[0]?.clientY ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    const startY = touchStartY.current
    const endY = event.changedTouches[0]?.clientY
    touchStartY.current = null

    if (startY === null || endY === undefined) return
    const deltaY = startY - endY

    if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return

    if (deltaY > 0) {
      // Swipe vers le haut -> story suivante
      if (!isLast) handleNext()
    } else {
      // Swipe vers le bas -> story précédente
      if (!isFirst) handlePrevious()
    }
  }

  if (!currentStory || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-edito-muted">
        <p className="text-sm">Aucune story disponible pour ce segment.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-edito-border bg-edito-surface px-4 text-xs font-bold text-edito-navy"
        >
          ← Retour Terrain
        </button>
      </div>
    )
  }

  const progressLabel = `${String(currentIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`

  return (
    <section
      className={cn(
        "flex min-h-[calc(100dvh-7.5rem)] flex-col justify-between px-4 py-3 select-none",
        className,
      )}
      data-terrain-surface="stories"
      data-story-index={currentIndex}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Mode Stories Terrain"
    >
      {/* 1. Header de navigation haute & Progression */}
      <header className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour à l'accueil Terrain"
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg pr-3 font-sans text-xs font-extrabold text-edito-navy hover:text-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 stroke-[2.5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Terrain</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-muted">
              Stories
            </span>
            <span className="font-mono text-xs font-bold text-edito-heading">
              {progressLabel}
            </span>
          </div>
        </div>

        {/* Barre de progression segmentée */}
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Progression : story ${currentIndex + 1} sur ${total}`}
        >
          {stories.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none",
                i <= currentIndex ? "bg-edito-brass" : "bg-edito-border",
              )}
            />
          ))}
        </div>
      </header>

      {/* 2. Contenu central de la Story (avec défilement interne défensif) */}
      <div
        className="my-auto flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-live="polite"
      >
        <article className="flex min-h-[300px] flex-col justify-center rounded-2xl border border-edito-border bg-edito-surface p-5 shadow-sm sm:p-6">
          {currentStory.kind === "message" ? (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-brass-hover">
                Message sectoriel
              </p>
              <h2 className="mt-3 font-heading text-xl font-bold tracking-tight leading-snug text-edito-navy sm:text-2xl">
                {currentStory.text}
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-edito-muted">
                Le message cadre la posture et l’angle d’entrée sur l’ensemble du segment.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-brass-hover">
                {currentStory.title}
              </p>
              <h2 className="mt-3 font-heading text-lg font-bold tracking-tight leading-snug text-edito-heading sm:text-xl">
                {currentStory.thesis}
              </h2>

              {currentStory.commercialConclusion ? (
                <div className="mt-4 rounded-r-lg border-l-2 border-edito-brass bg-edito-amber-soft/40 p-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-edito-brass-hover">
                    Donc, commercialement
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-edito-ink">
                    {stripCommercialLabel(currentStory.commercialConclusion)}
                  </p>
                </div>
              ) : null}

              {currentStory.srcIds.length > 0 ? (
                <p className="mt-4 text-[11px] font-bold tracking-wide text-edito-muted">
                  {formatStorySourceIds(currentStory.srcIds)}
                </p>
              ) : null}
            </div>
          )}
        </article>
      </div>

      {/* 3. Contrôles de navigation séquentielle basse */}
      <footer className="shrink-0 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isFirst}
            onClick={handlePrevious}
            aria-label="Story précédente"
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border font-sans text-xs font-extrabold transition-colors select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isFirst
                ? "cursor-not-allowed border-edito-border/50 bg-edito-chip/50 text-edito-muted/60"
                : "border-edito-border bg-edito-surface text-edito-navy hover:bg-edito-canvas active:bg-edito-chip",
            )}
          >
            Précédent
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Conclure les stories et retourner à l'accueil Terrain"
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-edito-navy bg-edito-navy font-sans text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-navy/90 active:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
            >
              Retour Terrain
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Story suivante"
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-edito-navy bg-edito-navy font-sans text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-navy/90 active:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
            >
              Suivant
            </button>
          )}
        </div>
      </footer>
    </section>
  )
}
