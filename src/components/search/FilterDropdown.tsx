"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type FilterOption = { value: string; label: string }

/**
 * Reusable multi-/single-select filter popover, styled as a chip.
 *
 * Domain-agnostic. `selected` drives display only. Mutations are delegated per
 * value via `onToggle` (and `onClear`) so the parent can write against the live
 * URL — never a stale prop snapshot. No external dependency — hand-rolled popover
 * matching the project's own primitives (AppDialog/AppDrawer).
 *
 * - mode="multi": checkboxes, active label shows a count badge ("Statut · 2").
 * - mode="single": radio-like, active label shows the chosen option ("Score ≥ 4").
 */
export function FilterDropdown({
  label,
  options,
  selected,
  mode = "multi",
  compact = false,
  panelWidthCh,
  panelAlign = "left",
  onToggle,
  onClear,
  fullWidthPanel = false,
}: {
  label: string
  options: FilterOption[]
  selected: string[]
  mode?: "multi" | "single"
  compact?: boolean
  panelWidthCh?: number
  panelAlign?: "left" | "right"
  onToggle: (value: string) => void
  onClear: () => void
  fullWidthPanel?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const active = selected.length > 0
  const summary =
    !active
      ? label
      : mode === "single"
        ? `${label} ${options.find((option) => option.value === selected[0])?.label ?? ""}`.trim()
        : `${label} · ${selected.length}`

  function selectValue(value: string) {
    onToggle(value)
    if (mode === "single") setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center rounded-full border font-semibold transition-colors",
          compact ? "gap-1 px-2.5 py-1 text-[11px] leading-4" : "gap-1 px-3 py-1 text-xs",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted hover:border-primary/30 hover:text-heading"
        )}
      >
        <span>{summary}</span>
        <span aria-hidden className={cn("text-[9px] transition-transform", open && "rotate-180")}>
          ▼
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="listbox"
          aria-multiselectable={mode === "multi"}
          className={cn(
            "absolute top-[calc(100%+4px)] z-[100] max-h-72 overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-lg",
            panelAlign === "right" ? "right-0" : "left-0",
            !panelWidthCh && (fullWidthPanel ? "w-[min(20rem,calc(100vw-2rem))]" : "min-w-[12rem]")
          )}
          style={panelWidthCh ? { width: `min(calc(100vw - 2rem), ${panelWidthCh}ch)` } : undefined}
        >
          {active && (
            <button
              type="button"
              onClick={onClear}
              className="mb-1 w-full rounded px-2 py-1 text-left text-[11px] font-semibold text-muted hover:bg-canvas hover:text-heading"
            >
              Tout effacer
            </button>
          )}
          {options.map((option) => {
            const checked = selected.includes(option.value)
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={checked}
                onClick={() => selectValue(option.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
                  checked ? "bg-primary/10 text-primary" : "text-body hover:bg-canvas"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[9px]",
                    mode === "single" ? "rounded-full" : "rounded",
                    checked ? "border-primary bg-primary text-primary-fg" : "border-border"
                  )}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="truncate capitalize">{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
