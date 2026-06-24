"use client"

import { useLayoutEffect, useRef, useState } from "react"
import type { SkillTooltipState } from "./types"

function getTooltipPosition(rect: DOMRect, tooltipRect: DOMRect) {
  const padding = 16
  const preferredTop = rect.bottom + 12
  const centeredLeft = rect.left + rect.width / 2 - tooltipRect.width / 2

  const left = Math.max(
    padding,
    Math.min(centeredLeft, window.innerWidth - tooltipRect.width - padding)
  )

  const fitsBelow = preferredTop + tooltipRect.height + padding <= window.innerHeight
  const top = fitsBelow
    ? preferredTop
    : Math.max(padding, rect.top - tooltipRect.height - 12)

  return { left, top }
}

export function getSkillTooltipId(skillId: string) {
  return `pool-skill-tooltip-${skillId}`
}

export function SkillDescriptionTooltip({
  state,
}: {
  state: SkillTooltipState
}) {
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!state || !tooltipRef.current) {
      setPosition(null)
      return
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    setPosition(getTooltipPosition(state.rect, tooltipRect))
  }, [state])

  if (!state) return null

  return (
    <div
      ref={tooltipRef}
      id={getSkillTooltipId(state.id)}
      role="tooltip"
      className="pointer-events-none fixed z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[16px] border border-heading/10 bg-heading px-4 py-3 text-primary-fg shadow-2xl"
      style={position ?? { left: -9999, top: -9999 }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-fg/68">
        {state.name}
      </p>
      <p className="mt-2 max-h-56 overflow-y-auto text-[12px] leading-5 text-primary-fg/92">
        {state.description}
      </p>
    </div>
  )
}
