"use client"

import { cn } from "@/lib/utils"
import type { QuickActionOption } from "./page-quick-actions"

interface QuickActionChoiceGridProps {
  options: QuickActionOption[]
  selectedOptionId: string | null
  onSelect: (optionId: string) => void
}

const toneClasses = [
  {
    card: "bg-primary/[0.04] border-primary/18",
    icon: "bg-primary/10 border-primary/20 text-primary",
  },
  {
    card: "bg-warning/[0.05] border-warning/18",
    icon: "bg-warning/10 border-warning/20 text-warning",
  },
  {
    card: "bg-success/[0.04] border-success/18",
    icon: "bg-success/10 border-success/20 text-success",
  },
  {
    card: "bg-accent/[0.05] border-accent/18",
    icon: "bg-accent/10 border-accent/20 text-accent",
  },
] as const

export function QuickActionChoiceGrid({
  options,
  selectedOptionId,
  onSelect,
}: QuickActionChoiceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {options.map((option, index) => {
        const tone = toneClasses[index % toneClasses.length]
        const isSelected = selectedOptionId === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            data-autofocus={index === 0 ? "true" : undefined}
            aria-pressed={isSelected}
            className={cn(
              "kredo-hover-reference group flex min-h-36 w-full flex-col items-start gap-4 rounded-[var(--radius-medium)] border p-4 text-left",
              tone.card,
              isSelected && "border-primary bg-primary/[0.08] ring-1 ring-primary/22",
            )}
          >
            {option.icon ? (
              <span
                className={cn(
                  "inline-flex size-12 items-center justify-center rounded-[var(--radius-medium)] border",
                  tone.icon,
                )}
                aria-hidden="true"
              >
                <span className="size-6">{option.icon}</span>
              </span>
            ) : null}

            <span className="flex flex-col gap-1">
              <span className="text-sm font-bold text-heading">
                {option.label}
              </span>
              {option.description ? (
                <span className="text-xs leading-5 text-body">
                  {option.description}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
