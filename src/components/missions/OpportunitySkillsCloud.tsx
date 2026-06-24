"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { SkillDescriptionTooltip, getSkillTooltipId } from "@/components/consultants/pool-competences/SkillDescriptionTooltip"
import type { SkillTooltipState } from "@/components/consultants/pool-competences/types"

const CLOUD_PADDING = {
  top: 18,
  right: 18,
  bottom: 18,
  left: 18,
}

type OpportunitySkillsCloudItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  count: number
  opportunityCount: number
  relatedClients: string[]
}

type LayoutWord = {
  id: string
  name: string
  description: string | null
  relatedClients: string[]
  fontSize: number
  height: number
  width: number
  x: number
  y: number
  paddingX: number
  paddingY: number
  emphasis: number
  driftX: number
  driftY: number
  driftScale: number
  duration: number
  delay: number
  gap: number
}

let measurementContext: CanvasRenderingContext2D | null = null

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function getEmphasis(value: number, min: number, max: number) {
  const spread = Math.max(1, max - min)
  return (value - min) / spread
}

function measureTextWidth(label: string, fontSize: number) {
  if (typeof document === "undefined") {
    return label.length * fontSize * 0.62
  }

  if (!measurementContext) {
    const canvas = document.createElement("canvas")
    measurementContext = canvas.getContext("2d")
  }

  if (!measurementContext) {
    return label.length * fontSize * 0.62
  }

  measurementContext.font = `600 ${fontSize}px sans-serif`
  return measurementContext.measureText(label).width
}

function overlaps(next: Pick<LayoutWord, "x" | "y" | "width" | "height"> & { gap: number }, placed: LayoutWord[]) {
  return placed.some((word) => {
    return !(
      next.x + next.width + next.gap <= word.x - word.gap ||
      next.x - next.gap >= word.x + word.width + word.gap ||
      next.y + next.height + next.gap <= word.y - word.gap ||
      next.y - next.gap >= word.y + word.height + word.gap
    )
  })
}

function buildWordLayout(items: OpportunitySkillsCloudItem[], width: number, height: number): LayoutWord[] {
  if (width < 220 || height < 120 || items.length === 0) return []

  const originalPlaced: LayoutWord[] = []
  
  // Try placing with decreasing size scale if we fail to place all items
  for (let scale = 1.0; scale >= 0.55; scale -= 0.05) {
    const innerWidth = Math.max(1, width - CLOUD_PADDING.left - CLOUD_PADDING.right)
    const innerHeight = Math.max(1, height - CLOUD_PADDING.top - CLOUD_PADDING.bottom)
    const maxCount = Math.max(...items.map((item) => item.count))
    const minCount = Math.min(...items.map((item) => item.count))
    const density = clamp(items.length / 20, 0.72, 1.45)
    
    const fontMax = clamp(Math.min(innerWidth / 5.1, innerHeight / 3.05, 26) / density, 15, 25) * scale
    const fontMin = clamp(fontMax * 0.58, 10, 14.5)
    const placed: LayoutWord[] = []
    let allPlaced = true

    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      const emphasis = getEmphasis(item.count, minCount, maxCount)
      let fontSize = fontMin + (fontMax - fontMin) * emphasis
      fontSize = Math.round(fontSize * 10) / 10

      const paddingX = (12 + emphasis * 16) * scale
      const paddingY = (7 + emphasis * 6) * scale
      const gap = (10 + emphasis * 10) * scale
      const normalizedIndex = (index + 1) / (items.length + 1)
      
      // Pack anchors a bit closer to the center if space is constrained
      const centerFactor = scale < 0.9 ? 0.6 : 1.0
      const anchorRadiusX = innerWidth * (0.15 + Math.sqrt(normalizedIndex) * 0.35) * centerFactor
      const anchorRadiusY = innerHeight * (0.13 + Math.sqrt(normalizedIndex) * 0.31) * centerFactor
      const anchorAngle = index * 2.399963229728653

      let widthEstimate = measureTextWidth(item.name, fontSize) + paddingX * 2
      let heightEstimate = fontSize * 1.12 + paddingY * 2
      let positioned: LayoutWord | null = null

      for (let shrink = 0; shrink < 4 && !positioned; shrink += 1) {
        const tryFontSize = shrink === 0 ? fontSize : Math.max(fontMin, fontSize - shrink * 0.9)
        widthEstimate = measureTextWidth(item.name, tryFontSize) + paddingX * 2
        heightEstimate = tryFontSize * 1.12 + paddingY * 2

        // Search in a spiral with slightly more steps and tighter steps
        for (let step = 0; step < 350; step += 1) {
          const ring = step === 0 ? 0 : 6 + step * 2.0
          const angle = anchorAngle + step * 0.38
          const centerX = innerWidth / 2 + Math.cos(anchorAngle) * anchorRadiusX
          const centerY = innerHeight / 2 + Math.sin(anchorAngle) * anchorRadiusY

          const x = centerX + Math.cos(angle) * ring - widthEstimate / 2 + CLOUD_PADDING.left
          const y = centerY + Math.sin(angle) * ring - heightEstimate / 2 + CLOUD_PADDING.top

          const candidate = { x, y, width: widthEstimate, height: heightEstimate, gap }
          const insideBounds =
            candidate.x >= CLOUD_PADDING.left &&
            candidate.y >= CLOUD_PADDING.top &&
            candidate.x + candidate.width <= width - CLOUD_PADDING.right &&
            candidate.y + candidate.height <= height - CLOUD_PADDING.bottom

          if (!insideBounds || overlaps(candidate, placed)) continue

          const seed = hashString(item.id)
          positioned = {
            id: item.id,
            name: item.name,
            description: item.description,
            relatedClients: item.relatedClients,
            fontSize: tryFontSize,
            width: widthEstimate,
            height: heightEstimate,
            x,
            y,
            paddingX,
            paddingY,
            emphasis,
            driftX: ((seed % 9) - 4) * 1.2,
            driftY: (((seed >> 3) % 9) - 4) * 0.95,
            driftScale: 1 + (((seed >> 6) % 4) + 1) * 0.008,
            duration: 13 + (seed % 6),
            delay: ((seed >> 4) % 7) * 0.8,
            gap,
          }
          break
        }
      }

      if (positioned) {
        placed.push(positioned)
      } else {
        allPlaced = false
        break
      }
    }

    // Save the first pass output in case we end up falling back
    if (scale === 1.0) {
      originalPlaced.push(...placed)
    }

    if (allPlaced && placed.length === items.length) {
      const minX = Math.min(...placed.map((word) => word.x))
      const minY = Math.min(...placed.map((word) => word.y))
      const maxX = Math.max(...placed.map((word) => word.x + word.width))
      const maxY = Math.max(...placed.map((word) => word.y + word.height))
      const offsetX = (width - (maxX - minX)) / 2 - minX
      const offsetY = (height - (maxY - minY)) / 2 - minY

      return placed.map((word) => ({
        ...word,
        x: clamp(word.x + offsetX, CLOUD_PADDING.left, width - CLOUD_PADDING.right - word.width),
        y: clamp(word.y + offsetY, CLOUD_PADDING.top, height - CLOUD_PADDING.bottom - word.height),
      }))
    }
  }

  // Fallback: If we couldn't fit them even at minimum scale, just return whatever we could fit on the first pass
  const finalFallback = originalPlaced.length > 0 ? originalPlaced : []
  if (finalFallback.length === 0) return []

  const minX = Math.min(...finalFallback.map((word) => word.x))
  const minY = Math.min(...finalFallback.map((word) => word.y))
  const maxX = Math.max(...finalFallback.map((word) => word.x + word.width))
  const maxY = Math.max(...finalFallback.map((word) => word.y + word.height))
  const offsetX = (width - (maxX - minX)) / 2 - minX
  const offsetY = (height - (maxY - minY)) / 2 - minY

  return finalFallback.map((word) => ({
    ...word,
    x: clamp(word.x + offsetX, CLOUD_PADDING.left, width - CLOUD_PADDING.right - word.width),
    y: clamp(word.y + offsetY, CLOUD_PADDING.top, height - CLOUD_PADDING.bottom - word.height),
  }))
}

function getPillStyle(word: LayoutWord, active: boolean) {
  return {
    fontSize: `${word.fontSize}px`,
    paddingInline: `${word.paddingX}px`,
    paddingBlock: `${word.paddingY}px`,
    lineHeight: 1,
    color: active
      ? "rgba(18, 28, 46, 0.98)"
      : `rgba(18, 28, 46, ${0.72 + word.emphasis * 0.18})`,
    background: active
      ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,245,240,0.94))"
      : `linear-gradient(180deg, rgba(255,255,255,${0.5 + word.emphasis * 0.18}), rgba(247,244,238,${0.38 + word.emphasis * 0.14}))`,
    borderColor: active
      ? "rgba(18, 28, 46, 0.18)"
      : `rgba(18, 28, 46, ${0.08 + word.emphasis * 0.08})`,
    boxShadow: active
      ? "0 22px 44px -28px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.72)"
      : "0 14px 34px -30px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.56)",
    opacity: active ? 1 : 0.82 + word.emphasis * 0.14,
  } as const
}

export function OpportunitySkillsCloud({ items }: { items: OpportunitySkillsCloudItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [tooltipState, setTooltipState] = useState<SkillTooltipState>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const words = useMemo(() => buildWordLayout(items, size.width, size.height), [items, size.width, size.height])

  return (
    <section className="relative flex h-full min-h-[13rem] flex-col overflow-hidden rounded-[var(--radius-large)] border border-border/80 bg-surface skills-cloud-container">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,184,18,0.22),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(255,184,18,0.13),transparent_28%),radial-gradient(circle_at_56%_82%,rgba(255,184,18,0.15),transparent_34%),linear-gradient(145deg,rgba(255,184,18,0.18),rgba(255,184,18,0.08)_42%,rgba(252,251,247,0.94)_100%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-10 h-28 rounded-full bg-[radial-gradient(circle,rgba(255,184,18,0.17),transparent_68%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 right-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,184,18,0.12),transparent_72%)] blur-2xl" />

      <div className="relative flex h-full flex-col p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="inline-flex size-2 rounded-full bg-primary" aria-hidden="true" />
          Compétences recherchées
        </div>

        <div
          ref={containerRef}
          className="relative mt-3 flex-1 overflow-hidden"
          aria-label="Nuage des compétences recherchées"
        >
          <div className="pointer-events-none absolute inset-0 opacity-22 [background-image:radial-gradient(rgba(31,41,55,0.05)_0.7px,transparent_0.7px)] [background-position:0_0] [background-size:18px_18px]" />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="skills-cloud-wire" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(28,41,77,0.16)" />
                <stop offset="100%" stopColor="rgba(28,41,77,0.03)" />
              </linearGradient>
            </defs>
            <path
              d="M8 66C18 54 30 50 44 54C56 58 68 72 92 62"
              className="skills-cloud-wire skills-cloud-wire-1"
              fill="none"
              stroke="url(#skills-cloud-wire)"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M12 30C26 20 42 22 56 28C66 32 78 42 90 38"
              className="skills-cloud-wire skills-cloud-wire-2"
              fill="none"
              stroke="url(#skills-cloud-wire)"
              strokeWidth="0.55"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="21"
              cy="28"
              r="13"
              className="skills-cloud-circle skills-cloud-circle-1"
              fill="none"
              stroke="rgba(28,41,77,0.08)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="76"
              cy="68"
              r="17"
              className="skills-cloud-circle skills-cloud-circle-2"
              fill="none"
              stroke="rgba(28,41,77,0.06)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {words.length === 0 ? (
            <div aria-hidden="true" className="h-full" />
          ) : (
            words.map((word) => {
              const hasDescription = Boolean(word.description?.trim())
              const tooltipOpen = tooltipState?.id === word.id

              const openTooltip = (target: HTMLElement) => {
                if (!word.description) return
                setTooltipState({
                  id: word.id,
                  name: word.name,
                  description: word.description,
                  relatedClients: word.relatedClients,
                  rect: target.getBoundingClientRect(),
                })
              }

              return (
                <div
                  key={word.id}
                  className="absolute will-change-transform skills-cloud-pill"
                  style={{
                    left: word.x,
                    top: word.y,
                    animationName: reducedMotion ? undefined : "opportunity-skill-cloud-drift",
                    animationDuration: reducedMotion ? undefined : `${word.duration}s`,
                    animationDelay: reducedMotion ? undefined : `${word.delay}s`,
                    animationTimingFunction: reducedMotion ? undefined : "ease-in-out",
                    animationIterationCount: reducedMotion ? undefined : "infinite",
                    ["--cloud-drift-x" as string]: `${word.driftX}px`,
                    ["--cloud-drift-y" as string]: `${word.driftY}px`,
                    ["--cloud-drift-scale" as string]: `${word.driftScale}`,
                    ["--drift-duration" as string]: `${word.duration}s`,
                  }}
                >
                  {hasDescription ? (
                    <button
                      type="button"
                      aria-describedby={tooltipOpen ? getSkillTooltipId(word.id) : undefined}
                      onMouseEnter={(event) => openTooltip(event.currentTarget)}
                      onMouseLeave={() => setTooltipState(null)}
                      onFocus={(event) => openTooltip(event.currentTarget)}
                      onBlur={() => setTooltipState(null)}
                      className="inline-flex select-none items-center rounded-full border font-heading font-semibold tracking-[-0.015em] backdrop-blur-md transition-[transform,opacity,background-color,border-color,box-shadow,color] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary/25"
                      style={{
                        ...getPillStyle(word, tooltipOpen),
                        transform: tooltipOpen ? "translate3d(0,-1px,0) scale(1.04)" : "translate3d(0,0,0) scale(1)",
                      }}
                    >
                      {word.name}
                    </button>
                  ) : (
                    <span
                      className="inline-flex select-none items-center rounded-full border font-heading font-semibold tracking-[-0.015em] backdrop-blur-md transition-[transform,opacity,background-color,border-color,box-shadow,color] duration-300 ease-out"
                      style={getPillStyle(word, false)}
                    >
                      {word.name}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <SkillDescriptionTooltip state={tooltipState} />
    </section>
  )
}
