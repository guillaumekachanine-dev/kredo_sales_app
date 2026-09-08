"use client"

import Image from "next/image"
import { useLayoutEffect, useRef, type RefCallback } from "react"
import type { PracticeTerritory } from "@/lib/consultants/pool-competences-data"
import { cn } from "@/lib/utils"
import { practiceIcons, toneClasses } from "./pool-competences-shared"

type PoolCompetencesPracticeRowProps = {
  bindPracticeRef: (slug: string) => RefCallback<HTMLButtonElement>
  onSelectPractice: (slug: string) => void
  practices: PracticeTerritory[]
  selectedSlug: string
}

export function PoolCompetencesPracticeRow(props: PoolCompetencesPracticeRowProps) {
  const { bindPracticeRef, onSelectPractice, practices, selectedSlug } = props
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const previousRectsRef = useRef<Map<string, DOMRect> | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const animationTimeoutRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const previousRects = previousRectsRef.current

    if (!previousRects) {
      return
    }

    previousRectsRef.current = null

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current)
    }

    const animatedNodes: HTMLButtonElement[] = []

    buttonRefs.current.forEach((node, slug) => {
      const previousRect = previousRects.get(slug)

      if (!previousRect) {
        return
      }

      const currentRect = node.getBoundingClientRect()
      const deltaX = previousRect.left - currentRect.left
      const deltaY = previousRect.top - currentRect.top

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return
      }

      animatedNodes.push(node)
      node.style.transition = "none"
      node.style.transform = `translate(${deltaX}px, ${deltaY}px)`
    })

    if (animatedNodes.length === 0) {
      return
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animatedNodes.forEach((node) => {
        node.style.transition =
          "transform 560ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms ease, border-color 360ms ease, background-color 360ms ease"
        node.style.transform = ""
      })

      animationTimeoutRef.current = window.setTimeout(() => {
        animatedNodes.forEach((node) => {
          node.style.transition = ""
          node.style.transform = ""
        })
      }, 620)
    })

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [selectedSlug])

  const capturePracticeRects = () => {
    const rects = new Map<string, DOMRect>()

    buttonRefs.current.forEach((node, slug) => {
      rects.set(slug, node.getBoundingClientRect())
    })

    previousRectsRef.current = rects
  }

  const handleSelectPractice = (slug: string) => {
    if (slug === selectedSlug) {
      return
    }

    capturePracticeRects()
    onSelectPractice(slug)
  }

  const setPracticeRef = (slug: string): RefCallback<HTMLButtonElement> => {
    const parentRef = bindPracticeRef(slug)

    return (node) => {
      if (node) {
        buttonRefs.current.set(slug, node)
      } else {
        buttonRefs.current.delete(slug)
      }

      parentRef(node)
    }
  }

  const selectedPractice = practices.find((practice) => practice.slug === selectedSlug)
  const secondaryPractices = practices.filter((practice) => practice.slug !== selectedSlug)

  const renderPracticeCard = (practice: PracticeTerritory) => {
    const tone = toneClasses[practice.tone]
    const active = practice.slug === selectedSlug
    const iconSrc = practiceIcons[practice.slug]

    return (
      <button
        key={practice.id}
        ref={setPracticeRef(practice.slug)}
        type="button"
        onClick={() => handleSelectPractice(practice.slug)}
        aria-pressed={active}
        className={cn(
          "group relative overflow-hidden rounded-[16px] border text-left transition-[border-color,background-color,opacity,transform] duration-500 ease-out motion-reduce:duration-150 focus:outline-none focus:ring-2 focus:ring-primary/35",
          active
            ? cn("w-full max-w-[306px] px-2.5 py-2 bg-surface shadow-sm", tone.border)
            : "min-h-[50px] basis-[calc(50%-0.375rem)] px-2 py-1.5 opacity-35 sm:basis-[calc(25%-0.5rem)] lg:w-[128px] lg:basis-[128px] lg:max-w-[128px] lg:shrink-0 border-border bg-surface/62 hover:border-heading/10 hover:bg-surface hover:opacity-85"
        )}
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              active
                ? "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 50%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 46%)",
          }}
          aria-hidden="true"
        />

        <span className="relative flex h-full flex-col">
          <span
            className={cn(
              "flex min-h-10 items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-500",
              tone.soft
            )}
          >
            <span className={cn("flex shrink-0 items-center justify-center", active ? "h-9 w-9" : "h-8 w-8")}>
              {iconSrc ? (
                <Image
                  src={iconSrc}
                  alt=""
                  aria-hidden
                  width={34}
                  height={34}
                  className={cn("object-contain", active ? "h-8 w-8" : "h-7 w-7")}
                />
              ) : (
                <span className="text-[11px] font-black uppercase text-muted">
                  {practice.name.slice(0, 2)}
                </span>
              )}
            </span>

            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-[1.15] tracking-tight text-heading">
                {practice.name}
              </span>
            </span>
          </span>

          <span
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150",
              active
                ? "mt-3 grid-rows-[1fr] opacity-100 translate-y-0"
                : "mt-0 grid-rows-[0fr] opacity-0 -translate-y-1"
            )}
          >
            <span className="min-h-0">
              <span className="block border-t border-border/70 pt-2.5 text-[11px] leading-4 text-body">
                {practice.description}
              </span>
            </span>
          </span>

          <span className="sr-only">
            {active
              ? `${practice.name} selectionnee. ${practice.description}`
              : `Selectionner ${practice.name}`}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="relative z-20">
      <div className="flex flex-wrap justify-center gap-2 lg:flex-nowrap lg:gap-2">
        {secondaryPractices.map(renderPracticeCard)}
      </div>

      {selectedPractice ? (
        <div className="mt-3 flex justify-center">
          {renderPracticeCard(selectedPractice)}
        </div>
      ) : null}
    </div>
  )
}
