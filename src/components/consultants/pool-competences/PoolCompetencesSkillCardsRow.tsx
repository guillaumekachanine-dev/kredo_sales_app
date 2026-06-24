"use client"

import type { RefCallback } from "react"
import type { PracticeTone, SkillCategory } from "@/lib/consultants/pool-competences-data"
import { cn } from "@/lib/utils"
import { getSkillTooltipId } from "./SkillDescriptionTooltip"
import {
  categoryGlyphs,
  categoryIcons,
  categoryLabels,
  type SkillGroup,
  toneClasses,
} from "./pool-competences-shared"
import type { SkillTooltipState } from "./types"

type PoolCompetencesSkillCardsRowProps = {
  activeCategory: SkillCategory | null
  bindSkillCardRef: (category: SkillCategory) => RefCallback<HTMLDivElement>
  groups: SkillGroup[]
  onCategoryFocus: (category: SkillCategory | null) => void
  onTogglePinnedCategory: (category: SkillCategory) => void
  onTooltipChange: (nextState: SkillTooltipState) => void
  pinnedCategory: SkillCategory | null
  reducedMotion: boolean
  selectedTone: PracticeTone
  tooltipState: SkillTooltipState
}

export function PoolCompetencesSkillCardsRow(props: PoolCompetencesSkillCardsRowProps) {
  const {
    activeCategory,
    bindSkillCardRef,
    groups,
    onCategoryFocus,
    onTogglePinnedCategory,
    onTooltipChange,
    pinnedCategory,
    reducedMotion,
    selectedTone,
    tooltipState,
  } = props
  const tone = toneClasses[selectedTone]

  return (
    <div
      className="relative z-10 grid gap-4"
      style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
    >
      {groups.map((group, index) => {
        const focused = !activeCategory || activeCategory === group.category
        const pinned = pinnedCategory === group.category

        return (
          <article
            key={group.category}
            ref={bindSkillCardRef(group.category)}
            onMouseEnter={() => onCategoryFocus(group.category)}
            onMouseLeave={() => onCategoryFocus(null)}
            onFocus={() => onCategoryFocus(group.category)}
            onBlur={() => onCategoryFocus(null)}
            className={cn(
              "min-h-[264px] rounded-[24px] border px-4 py-4 transition-[border-color,opacity,transform,background-color] duration-200",
              focused
                ? cn("border-border bg-surface", pinned && tone.border)
                : "border-border/80 bg-surface/68 opacity-45"
            )}
            style={
              reducedMotion
                ? undefined
                : {
                    animation: `pool-competences-card-in 420ms cubic-bezier(0.22, 1, 0.36, 1) ${140 + index * 55}ms both`,
                  }
            }
          >
            <button
              type="button"
              aria-pressed={pinned}
              onClick={() => onTogglePinnedCategory(group.category)}
              className="w-full text-left focus:outline-none"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                      focused ? tone.fill : "bg-canvas text-muted"
                    )}
                  >
                    {categoryIcons[group.category] ? (
                      <img
                        src={categoryIcons[group.category]}
                        alt=""
                        aria-hidden
                        className="w-6 h-6 object-contain"
                        style={{ filter: focused ? "brightness(0) invert(1)" : "none" }}
                      />
                    ) : (
                      categoryGlyphs[group.category]
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold uppercase tracking-[0.14em] text-heading">
                      {categoryLabels[group.category]}
                    </span>
                    <span className="mt-1 block text-[11px] text-body">
                      {group.skills.length} competences visibles
                    </span>
                  </span>
                </span>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                    pinned ? tone.fill : "bg-canvas text-muted"
                  )}
                >
                  {pinned ? "Fige" : "Focus"}
                </span>
              </span>
            </button>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border/70">
              <div
                className={cn("h-full rounded-full", focused ? tone.fill : "bg-border")}
                style={{ width: `${Math.min(100, 18 + group.skills.length * 9)}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {group.skills.map((skill) => {
                const description = skill.skillDescription?.trim()
                const hasDescription = Boolean(description)
                const tooltipOpen = tooltipState?.id === skill.id

                const openTooltip = (target: HTMLElement) => {
                  if (!description) return
                  onTooltipChange({
                    id: skill.id,
                    name: skill.name,
                    description,
                    rect: target.getBoundingClientRect(),
                  })
                }

                return (
                  <span
                    key={skill.id}
                    tabIndex={hasDescription ? 0 : -1}
                    aria-describedby={tooltipOpen ? getSkillTooltipId(skill.id) : undefined}
                    onMouseEnter={
                      hasDescription
                        ? (event) => openTooltip(event.currentTarget)
                        : undefined
                    }
                    onMouseLeave={
                      hasDescription ? () => onTooltipChange(null) : undefined
                    }
                    onFocus={
                      hasDescription
                        ? (event) => openTooltip(event.currentTarget)
                        : undefined
                    }
                    onBlur={
                      hasDescription ? () => onTooltipChange(null) : undefined
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold outline-none transition-colors",
                      focused
                        ? "border-border bg-canvas text-body"
                        : "border-transparent bg-canvas/50 text-muted",
                      hasDescription && "cursor-help focus:ring-2 focus:ring-primary/30"
                    )}
                  >
                    {skill.name}
                  </span>
                )
              })}
            </div>
          </article>
        )
      })}
    </div>
  )
}
