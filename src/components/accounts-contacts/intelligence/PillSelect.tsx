"use client"

import { cn } from "@/lib/utils"

export interface PillSelectOption<T extends string> {
  value: T
  label: string
  hint?: string
}

export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  isMobile = false,
}: {
  options: PillSelectOption<T>[]
  value: T
  onChange: (value: T) => void
  isMobile?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3 text-xs font-semibold transition-colors",
              isMobile ? "min-h-[44px]" : "h-8",
              selected
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-body hover:bg-canvas"
            )}
            title={option.hint}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function ScenarioSelector({
  options,
  value,
  onChange,
  isMobile,
}: {
  options: PillSelectOption<string>[]
  value: string
  onChange: (value: string) => void
  isMobile?: boolean
}) {
  return <PillSelect options={options} value={value} onChange={onChange} isMobile={isMobile} />
}

export function ToneSelector({
  options,
  value,
  onChange,
  isMobile,
}: {
  options: PillSelectOption<string>[]
  value: string
  onChange: (value: string) => void
  isMobile?: boolean
}) {
  return <PillSelect options={options} value={value} onChange={onChange} isMobile={isMobile} />
}
