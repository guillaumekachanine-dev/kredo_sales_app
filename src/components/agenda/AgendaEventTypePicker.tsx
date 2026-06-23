"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { AGENDA_CATEGORIES, AGENDA_EVENT_TYPES, type AgendaCategoryId } from "@/lib/agenda/agenda-config"

interface AgendaEventTypePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function CommerceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  )
}

function ManagementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

function RecrutementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

// ── Category card config ───────────────────────────────────────────────────────

const CATEGORY_VISUAL = {
  commerce: {
    icon: CommerceIcon,
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
    icon: ManagementIcon,
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
    icon: RecrutementIcon,
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
  useEffect(() => {
    if (open) {
      setStep("category")
      setSelectedCategory(null)
    }
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
              {step === "category" && (
                <p className="text-[11px] text-muted mt-0.5">Sélectionnez d'abord la famille d'activité</p>
              )}
              {step === "type" && currentCategory && (
                <p className="text-[11px] text-muted mt-0.5">{currentCategory.subtitle}</p>
              )}
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
              const Icon = vis.icon
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
                  <div
                    className={cn(
                      "flex items-center justify-center size-14 rounded-xl border transition-all duration-200",
                      "group-hover:scale-110 group-hover:shadow-sm",
                      vis.bgClass,
                      vis.borderClass,
                      vis.iconClass,
                    )}
                  >
                    <Icon className="size-7" />
                  </div>

                  {/* Label */}
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("text-sm font-bold tracking-tight", vis.labelClass)}>
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-muted leading-snug">{cat.subtitle}</span>
                  </div>

                  {/* Badge count */}
                  <span
                    className={cn(
                      "absolute top-2.5 right-2.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 tabular-nums",
                      vis.bgClass,
                      vis.labelClass,
                      vis.borderClass,
                      "border",
                    )}
                  >
                    {typesCount}
                  </span>

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

        {/* Footer hint */}
        <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between">
          <p className="text-[10px] text-muted">
            {step === "category"
              ? "3 familles · 16 types d'événements"
              : `${currentCategory?.types.length} types disponibles dans cette catégorie`}
          </p>
          {step === "type" && value && AGENDA_EVENT_TYPES[value] && (
            <span className="text-[10px] font-semibold text-muted">
              Sélectionné : <span className="text-heading">{AGENDA_EVENT_TYPES[value].label}</span>
            </span>
          )}
        </div>
      </div>
    </dialog>
  )
}
