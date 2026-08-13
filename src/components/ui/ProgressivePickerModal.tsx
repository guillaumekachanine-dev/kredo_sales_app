"use client"

import React, { createContext, useContext } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"

export type PickerVariant = "dark" | "bright"

interface ProgressivePickerContextValue {
  leaving: boolean
  variant: PickerVariant
}

const ProgressivePickerContext = createContext<ProgressivePickerContextValue | null>(null)

function useProgressivePicker() {
  const ctx = useContext(ProgressivePickerContext)
  if (!ctx) {
    throw new Error("ProgressivePicker subcomponents must be used within a ProgressivePickerModal")
  }
  return ctx
}

export interface ProgressivePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  step: string
  steps: string[]
  onBack?: () => void
  onReturnToCockpit?: () => void
  variant?: PickerVariant
  leaving?: boolean
  children: React.ReactNode
  className?: string
}

export function ProgressivePickerModal({
  open,
  onOpenChange,
  title,
  step,
  steps,
  onBack,
  onReturnToCockpit,
  variant = "dark",
  leaving = false,
  children,
  className,
}: ProgressivePickerModalProps) {
  const isDark = variant === "dark"

  return (
    <ProgressivePickerContext.Provider value={{ leaving, variant }}>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        className={cn(
          isDark ? "communication-picker-modal" : "communication-picker-modal-bright border border-border bg-surface text-heading",
          "sm:max-w-2xl",
          className
        )}
        headerClassName={isDark ? "communication-picker-modal-header" : "border-b border-border/60 pb-3"}
        bodyClassName={isDark ? "communication-picker-modal-body" : "pt-2"}
        title={
          <div className="flex items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Étape précédente"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer",
                  isDark
                    ? "text-muted hover:bg-canvas hover:text-heading"
                    : "text-body hover:bg-surface-hover hover:text-heading"
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : onReturnToCockpit ? (
              <button
                type="button"
                onClick={onReturnToCockpit}
                aria-label="Retour au cockpit"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                  isDark
                    ? "text-muted hover:bg-canvas hover:text-heading"
                    : "text-body hover:bg-surface-hover hover:text-heading",
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : null}
            <h2 className={cn("truncate font-heading text-sm font-bold", isDark ? "text-heading" : "text-heading")}>
              {title}
            </h2>
            <StepDots step={step} steps={steps} isDark={isDark} />
          </div>
        }
      >
        {children}
      </AppDialog>
    </ProgressivePickerContext.Provider>
  )
}

function StepDots({ step, steps, isDark }: { step: string; steps: string[]; isDark: boolean }) {
  return (
    <span className="ml-auto flex items-center gap-1.5" aria-hidden="true">
      {steps.map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            s === step
              ? isDark ? "w-4 bg-primary" : "w-4 bg-primary"
              : isDark ? "w-1.5 bg-border" : "w-1.5 bg-border-strong/50"
          )}
        />
      ))}
    </span>
  )
}

// ── Compound Components ────────────────────────────────────────────────────────

const CATEGORY_TONE_CLASSES: Record<1 | 2 | 3 | 4 | 5 | 6, { card: string }> = {
  1: { card: "border-dataviz-1/35 bg-dataviz-1/[0.05] hover:border-dataviz-1/70" },
  2: { card: "border-dataviz-2/35 bg-dataviz-2/[0.05] hover:border-dataviz-2/70" },
  3: { card: "border-dataviz-3/35 bg-dataviz-3/[0.05] hover:border-dataviz-3/70" },
  4: { card: "border-dataviz-4/35 bg-dataviz-4/[0.05] hover:border-dataviz-4/70" },
  5: { card: "border-dataviz-5/35 bg-dataviz-5/[0.05] hover:border-dataviz-5/70" },
  6: { card: "border-dataviz-6/35 bg-dataviz-6/[0.05] hover:border-dataviz-6/70" },
}

interface CategoryCardProps {
  value: string
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
  iconUrl: string
  selected: boolean
  onClick: () => void
  index: number
}

export function CategoryCard({
  value,
  label,
  dataviz,
  iconUrl,
  selected,
  onClick,
  index,
}: CategoryCardProps) {
  const { leaving, variant } = useProgressivePicker()
  const isDark = variant === "dark"

  return (
    <button
      key={value}
      type="button"
      onClick={onClick}
      style={{ animationDelay: leaving ? "0ms" : `${index * 45}ms` }}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center cursor-pointer",
        CATEGORY_TONE_CLASSES[dataviz].card,
        selected && (isDark ? "ring-2 ring-primary/70" : "ring-2 ring-primary"),
        "kredo-relief-hover",
        leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
      )}
    >
      <span className="relative z-10 flex size-11 items-center justify-center">
        <img
          src={iconUrl}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
        />
      </span>
      <span className="relative z-10 line-clamp-2 text-[11px] font-bold leading-tight text-heading">
        {label}
      </span>
    </button>
  )
}

interface ItemRowProps {
  value: string
  label: string
  description?: string | null
  selected: boolean
  onClick: () => void
  index: number
}

export function ItemRow({
  value,
  label,
  description,
  selected,
  onClick,
  index,
}: ItemRowProps) {
  const { leaving, variant } = useProgressivePicker()
  const isDark = variant === "dark"

  return (
    <button
      key={value}
      type="button"
      onClick={onClick}
      style={{ animationDelay: leaving ? "0ms" : `${index * 42}ms` }}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-left w-full cursor-pointer",
        "kredo-relief-hover",
        leaving ? "kredo-offer-card-out" : "kredo-offer-card-in",
        selected
          ? isDark ? "bg-primary/8" : "bg-primary/8 border border-primary/20"
          : isDark ? "bg-canvas/50 hover:bg-canvas" : "bg-canvas/50 hover:bg-canvas/90 border border-border/40",
      )}
    >
      <div className="flex flex-col gap-1">
        <span className={cn("text-xs font-bold", isDark ? "text-heading" : "text-heading")}>{label}</span>
        {description && (
          <span className={cn("line-clamp-2 text-[11px] leading-relaxed", isDark ? "text-muted" : "text-body/80")}>
            {description}
          </span>
        )}
      </div>
      {selected && <CheckIcon isDark={isDark} />}
    </button>
  )
}

function CheckIcon({ isDark }: { isDark: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className={cn("mt-0.5 size-4 shrink-0", isDark ? "text-primary" : "text-primary")}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

// Attach subcomponents to ProgressivePickerModal namespaces
ProgressivePickerModal.CategoryCard = CategoryCard
ProgressivePickerModal.ItemRow = ItemRow
