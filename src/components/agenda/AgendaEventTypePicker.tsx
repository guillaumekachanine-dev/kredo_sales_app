"use client"

import React, { useEffect, useEffectEvent, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { AGENDA_CATEGORIES, type AgendaCategoryId } from "@/lib/agenda/agenda-config"

interface AgendaEventTypePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
}

// ── Category card config ───────────────────────────────────────────────────────

const CATEGORY_VISUAL = {
  commerce: {
    // Cobalt primary
    bgClass: "bg-primary/8",
    bgHoverClass: "hover:bg-primary/14",
    bgSelectedClass: "bg-primary/18",
    borderClass: "border-primary/20",
    borderHoverClass: "hover:border-primary/50",
    borderSelectedClass: "border-primary",
    iconClass: "text-primary",
    ringClass: "ring-primary/30",
    labelClass: "text-primary",
    dotClass: "bg-primary",
  },
  management: {
    // Success green
    bgClass: "bg-success/8",
    bgHoverClass: "hover:bg-success/14",
    bgSelectedClass: "bg-success/16",
    borderClass: "border-success/20",
    borderHoverClass: "hover:border-success/50",
    borderSelectedClass: "border-success",
    iconClass: "text-success",
    ringClass: "ring-success/30",
    labelClass: "text-success",
    dotClass: "bg-success",
  },
  recrutement: {
    // Brand brass gold
    bgClass: "bg-brand-brass/8",
    bgHoverClass: "hover:bg-brand-brass/14",
    bgSelectedClass: "bg-brand-brass/16",
    borderClass: "border-brand-brass/20",
    borderHoverClass: "hover:border-brand-brass/50",
    borderSelectedClass: "border-brand-brass",
    iconClass: "text-brand-brass",
    ringClass: "ring-brand-brass/30",
    labelClass: "text-brand-brass",
    dotClass: "bg-brand-brass",
  },
} as const

export function AgendaEventTypePicker({
  open,
  onOpenChange,
  value,
  onChange,
}: AgendaEventTypePickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState<"category" | "type">("category")
  const [selectedCategory, setSelectedCategory] = useState<AgendaCategoryId | null>(null)

  // Init step when opening
  const resetPickerState = useEffectEvent(() => {
    setStep("category")
    setSelectedCategory(null)
  })

  useEffect(() => {
    if (open) queueMicrotask(resetPickerState)
  }, [open])

  // Native dialog control
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onOpenChange(false)
    }
    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [onOpenChange])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onOpenChange(false)
  }

  const handleCategorySelect = (catId: AgendaCategoryId) => {
    setSelectedCategory(catId)
    setStep("type")
  }

  const handleTypeSelect = (typeId: string) => {
    onChange(typeId)
    onOpenChange(false)
  }

  const handleBack = () => {
    setStep("category")
    setSelectedCategory(null)
  }

  const currentCategory = selectedCategory
    ? AGENDA_CATEGORIES.find((c) => c.id === selectedCategory)
    : null

  const currentVisual = selectedCategory ? CATEGORY_VISUAL[selectedCategory] : null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 m-auto w-full border border-border bg-surface text-heading outline-none",
        "rounded-[var(--radius-large)] backdrop:bg-heading/25 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95 duration-200",
        step === "category" ? "max-w-xl" : "max-w-sm"
      )}
      style={{ padding: 0 }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {step === "type" && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center size-7 rounded-md text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                aria-label="Retour aux catégories"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold font-heading text-heading">
                {step === "category" ? "Choisir la nature de l'événement" : currentCategory?.label}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center size-7 rounded-md text-muted hover:text-heading transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── STEP 1: Category cards ─────────────────────────────── */}
        {step === "category" && (
          <div className="grid grid-cols-3 gap-3 p-5">
            {AGENDA_CATEGORIES.map((cat) => {
              const vis = CATEGORY_VISUAL[cat.id]
              const typesCount = cat.types.length

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center gap-3 rounded-xl border p-5 text-center cursor-pointer",
                    "transition-all duration-200 ease-out",
                    "select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                    "hover:scale-[1.04] hover:shadow-[var(--shadow-overlay-md)] hover:-translate-y-0.5",
                    `focus-visible:${vis.ringClass}`,
                    vis.bgClass,
                    vis.bgHoverClass,
                    vis.borderClass,
                    vis.borderHoverClass,
                  )}
                >
                  {/* Glow decoration on hover */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      "pointer-events-none",
                    )}
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, currentColor 12%, transparent), transparent 70%)`,
                    }}
                    aria-hidden
                  />

                  {/* Icon container */}
                  <div className="flex items-center justify-center size-20 transition-transform duration-200 group-hover:scale-110">
                    <img
                      src={
                        cat.id === "commerce"
                          ? "/icons_set/equipe/equipe_metiers.png"
                          : cat.id === "recrutement"
                          ? "/icons_set/equipe/equipe_vivier_consultants.png"
                          : "/icons_set/equipe/equipe_marche.png"
                      }
                      alt={cat.label}
                      className="size-20 object-contain"
                    />
                  </div>

                  {/* Label */}
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("text-sm font-bold tracking-tight", vis.labelClass)}>
                      {cat.label}
                    </span>
                  </div>

                  {/* Bottom arrow hint */}
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                    vis.labelClass,
                  )}>
                    <span>Choisir</span>
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── STEP 2: Type list ──────────────────────────────────── */}
        {step === "type" && currentCategory && currentVisual && (
          <div className="flex flex-col py-2 max-h-[60vh] overflow-y-auto">
            {currentCategory.types.map((t) => {
              const isSelected = t.id === value
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeSelect(t.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-5 py-3 text-left cursor-pointer",
                    "transition-colors duration-150 outline-none",
                    "focus-visible:bg-canvas",
                    isSelected
                      ? cn("bg-canvas", currentVisual.bgSelectedClass)
                      : "hover:bg-canvas",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0 transition-transform duration-200",
                      currentVisual.dotClass,
                      isSelected ? "scale-125" : "scale-100",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium flex-1",
                      isSelected ? "font-bold text-heading" : "text-body",
                    )}
                  >
                    {t.label}
                  </span>
                  {isSelected && (
                    <svg
                      className={cn("size-4 shrink-0", currentVisual.iconClass)}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}

      </div>
    </dialog>
  )
}
