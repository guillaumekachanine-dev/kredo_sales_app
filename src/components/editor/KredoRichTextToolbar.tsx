"use client"

import React from "react"
import { RichTextColor, RichTextAlign } from "./rich-text-types"
import { cn } from "@/lib/utils"

export interface KredoRichTextToolbarProps {
  className?: string
  onCommand: (command: string, value?: string) => void
  onColorChange: (color: RichTextColor) => void
  onAlignChange: (align: RichTextAlign) => void
}

export function KredoRichTextToolbar({
  className,
  onCommand,
  onColorChange,
  onAlignChange
}: KredoRichTextToolbarProps) {
  const colors: { value: RichTextColor; label: string; bg: string }[] = [
    { value: "default", label: "Défaut", bg: "bg-heading" },
    { value: "muted", label: "Muted", bg: "bg-muted" },
    { value: "primary", label: "Primary", bg: "bg-primary" },
    { value: "success", label: "Success", bg: "bg-success" },
    { value: "warning", label: "Warning", bg: "bg-warning" },
    { value: "danger", label: "Danger", bg: "bg-danger" }
  ]

  const alignments: { value: RichTextAlign; icon: string }[] = [
    { value: "left", icon: "⫷" },
    { value: "center", icon: "⫸⫷" },
    { value: "right", icon: "⫸" },
    { value: "justify", icon: "≡" }
  ]

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 p-2 bg-surface border border-border rounded-t-lg select-none shrink-0",
        className
      )}
    >
      {/* Format Options */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCommand("bold")}
          title="Gras"
          className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded border border-border bg-canvas/30 hover:bg-surface-hover active:scale-95 text-xs font-bold text-heading"
        >
          G
        </button>
        <button
          type="button"
          onClick={() => onCommand("italic")}
          title="Italique"
          className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded border border-border bg-canvas/30 hover:bg-surface-hover active:scale-95 text-xs italic text-heading"
        >
          I
        </button>
      </div>

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCommand("insertUnorderedList")}
          title="Liste à puces"
          className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded border border-border bg-canvas/30 hover:bg-surface-hover active:scale-95 text-xs text-heading"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => onCommand("insertOrderedList")}
          title="Liste numérotée"
          className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded border border-border bg-canvas/30 hover:bg-surface-hover active:scale-95 text-xs text-heading"
        >
          1. List
        </button>
      </div>

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* Alignments */}
      <div className="flex items-center gap-1">
        {alignments.map((align) => (
          <button
            key={align.value}
            type="button"
            onClick={() => onAlignChange(align.value)}
            title={`Aligner à ${align.value}`}
            className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded border border-border bg-canvas/30 hover:bg-surface-hover active:scale-95 text-[10px] font-semibold text-heading"
          >
            {align.icon}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onColorChange(color.value)}
            title={`Couleur: ${color.label}`}
            className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded border border-border bg-canvas/30 hover:bg-surface-hover active:scale-95 text-xs"
          >
            <span className={cn("w-3 h-3 rounded-full", color.bg)} />
          </button>
        ))}
      </div>
    </div>
  )
}
