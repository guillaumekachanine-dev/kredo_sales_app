"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { TerrainRevisionCard } from "./terrain-revision-model"

export type TerrainRevisionMobileProps = {
  cards: TerrainRevisionCard[]
  initialIndex?: number
  initialRevealed?: boolean
  onBack: () => void
  className?: string
}

export function TerrainRevisionMobile({
  cards,
  initialIndex = 0,
  initialRevealed = false,
  onBack,
  className,
}: TerrainRevisionMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, Math.max(0, cards.length - 1))),
  )
  const [isRevealed, setIsRevealed] = useState(initialRevealed)

  const total = cards.length
  const currentCard: TerrainRevisionCard | undefined = cards[currentIndex]
  const isLast = currentIndex === total - 1

  const handleReveal = useCallback(() => {
    setIsRevealed(true)
  }, [])

  const handleNext = useCallback(() => {
    if (total === 0) return
    setCurrentIndex((prev) => (prev + 1) % total)
    setIsRevealed(false)
  }, [total])

  const handlePrevious = useCallback(() => {
    if (total === 0) return
    if (isRevealed) {
      setIsRevealed(false)
    } else {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1))
      setIsRevealed(false)
    }
  }, [isRevealed, total])

  // Navigation clavier (Flèches, Espace, Entrée & Échap)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault()
        if (!isRevealed) {
          handleReveal()
        } else {
          handleNext()
        }
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault()
        handlePrevious()
      } else if (event.key === "Escape") {
        event.preventDefault()
        onBack()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isRevealed, handleNext, handlePrevious, handleReveal, onBack])

  if (!currentCard || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-edito-muted">
        <p className="text-sm">Aucune objection disponible pour ce segment.</p>
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
      data-terrain-surface="revision"
      data-revision-index={currentIndex}
      data-revision-side={isRevealed ? "answer" : "objection"}
      aria-label="Mode Révision Terrain"
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
              Révision
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
          aria-label={`Progression : objection ${currentIndex + 1} sur ${total}`}
        >
          {cards.map((_, i) => (
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

      {/* 2. Contenu central Flashcard (scrollable défensif pour contenu long) */}
      <div
        className="my-auto flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-live="polite"
      >
        <article
          onClick={!isRevealed ? handleReveal : undefined}
          onKeyDown={(event) => {
            if (!isRevealed && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault()
              handleReveal()
            }
          }}
          tabIndex={!isRevealed ? 0 : undefined}
          role={!isRevealed ? "button" : "region"}
          aria-label={!isRevealed ? "Objection. Cliquez pour voir la réponse." : "Réponse à l'objection."}
          className={cn(
            "flex min-h-[320px] sm:min-h-[360px] flex-col justify-between rounded-2xl border border-edito-border border-t-[3px] border-t-edito-brass bg-edito-surface p-5 shadow-sm sm:p-6 transition-all duration-150 motion-reduce:transition-none",
            !isRevealed && "cursor-pointer hover:border-edito-navy/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          {!isRevealed ? (
            /* RECTO : Objection */
            <div className="flex h-full flex-1 flex-col justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-brass-hover">
                  Objection
                </p>
                <h2 className="mt-4 font-heading text-lg font-bold tracking-tight leading-snug text-edito-heading sm:text-xl">
                  {currentCard.objection}
                </h2>
              </div>
              <p className="mt-6 text-[10px] font-bold tracking-wide text-edito-muted">
                Touchez la carte ou appuyez sur « Voir la réponse »
              </p>
            </div>
          ) : (
            /* VERSO : Réponse */
            <div className="flex h-full flex-1 flex-col justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-edito-brass-hover">
                  Réponse
                </p>
                <div className="mt-3 font-sans text-sm leading-relaxed text-edito-body sm:text-base">
                  {currentCard.response ?? "Aucune réponse formulée dans le corpus."}
                </div>
              </div>

              <div className="mt-6 border-t border-edito-border/70 pt-3">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-edito-muted">
                  Objection
                </span>
                <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-edito-muted">
                  {currentCard.objection}
                </p>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* 3. Contrôles séquentiels bas */}
      <footer className="shrink-0 pt-2 pb-1">
        {!isRevealed ? (
          <button
            type="button"
            onClick={handleReveal}
            aria-label="Voir la réponse à cette objection"
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-edito-navy bg-edito-navy font-sans text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-navy/90 active:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
          >
            Voir la réponse
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            aria-label={isLast ? "Recommencer la révision depuis le début" : "Passer à l'objection suivante"}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-edito-navy bg-edito-navy font-sans text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-edito-navy/90 active:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
          >
            Suivante
          </button>
        )}
      </footer>
    </section>
  )
}
