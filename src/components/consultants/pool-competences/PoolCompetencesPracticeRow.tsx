"use client"

import type { RefCallback } from "react"
import type { PracticeTerritory } from "@/lib/consultants/pool-competences-data"
import { cn } from "@/lib/utils"
import { practiceImages, toneClasses } from "./pool-competences-shared"

type PoolCompetencesPracticeRowProps = {
  bindPracticeRef: (slug: string) => RefCallback<HTMLButtonElement>
  onSelectPractice: (slug: string) => void
  practices: PracticeTerritory[]
  selectedSlug: string
}

export function PoolCompetencesPracticeRow(props: PoolCompetencesPracticeRowProps) {
  const { bindPracticeRef, onSelectPractice, practices, selectedSlug } = props

  return (
    <div
      className="relative z-20 grid gap-4"
      style={{ gridTemplateColumns: `repeat(${practices.length}, minmax(0, 1fr))` }}
    >
      {practices.map((practice) => {
        const tone = toneClasses[practice.tone]
        const active = practice.slug === selectedSlug

        return (
          <button
            key={practice.id}
            ref={bindPracticeRef(practice.slug)}
            type="button"
            onClick={() => onSelectPractice(practice.slug)}
            aria-pressed={active}
            className={cn(
              "group relative min-h-[192px] overflow-hidden rounded-[28px] border px-5 py-5 text-left transition-[border-color,background-color,transform] duration-300 focus:outline-none focus:ring-2 focus:ring-primary/35",
              active
                ? cn("bg-surface", tone.border)
                : "border-border bg-surface/82 hover:border-heading/10 hover:bg-surface"
            )}
          >
            {practiceImages[practice.slug] && (
              <span
                className="pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-300"
                style={{
                  backgroundImage: `url(${practiceImages[practice.slug]})`,
                  opacity: active ? 0.14 : 0.07,
                }}
                aria-hidden="true"
              />
            )}

            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  active
                    ? "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 50%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 46%)",
              }}
              aria-hidden="true"
            />

            <span className="relative flex h-full flex-col justify-between">
              <span className="flex items-start justify-between gap-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                    active ? tone.fill : "bg-canvas text-muted"
                  )}
                >
                  {active ? "Active" : "Practice"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  {practice.skillNames.length} competences
                </span>
              </span>

              <span className="mt-5 block">
                <span className="block text-[18px] font-bold leading-[1.15] tracking-tight text-heading">
                  {practice.name}
                </span>
                <span className="mt-3 block text-sm leading-5 text-body">
                  {practice.description}
                </span>
              </span>

              <span className="mt-5 flex flex-wrap gap-2">
                {practice.stackTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                      active
                        ? "border-border/70 bg-surface text-body"
                        : "border-border bg-canvas/72 text-body"
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
