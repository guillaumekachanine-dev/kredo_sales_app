"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { DocumentVersion } from "@/app/(app)/reports/_data/reports-types"

type DocumentVersionHistoryProps = {
  versions: DocumentVersion[]
  compact?: boolean
}

const ORIGIN_LABELS: Record<DocumentVersion["origin"], string> = {
  generated: "Généré",
  regenerated: "Régénéré",
  manual_edit: "Édition manuelle",
  duplicated: "Dupliqué",
  imported: "Importé",
}

export function DocumentVersionHistory({
  versions,
}: DocumentVersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  if (versions.length === 0) {
    return <p className="text-[9px] text-muted italic">Aucune version enregistrée.</p>
  }

  return (
    <div className="space-y-1.5">
      {versions.map((version) => {
        const isSelected = version.id === selectedVersionId

        // Format as DD/MM/YYYY
        const dateLabel = (() => {
          const d = new Date(version.createdAt)
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        })()

        return (
          <div key={version.id}>
            <button
              type="button"
              onClick={() => setSelectedVersionId(isSelected ? null : version.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                isSelected
                  ? "border-primary/25 bg-primary/[0.05]"
                  : "border-border/20 bg-canvas/20 hover:bg-surface-hover/30"
              )}
            >
              <span className={cn("text-[9px] font-semibold font-mono", isSelected ? "text-primary" : "text-muted")}>
                V{version.versionNumber} &ndash; {dateLabel}
              </span>
              <span className={cn("text-[8px] text-muted/60 transition-transform duration-150", isSelected && "rotate-180")}>
                ▼
              </span>
            </button>

            {/* Inline expanded detail */}
            {isSelected && (
              <div className="mt-1 rounded-lg border border-border/20 bg-canvas/30 px-2.5 py-2 space-y-1">
                <p className="text-[9px] text-muted">
                  <span className="font-semibold text-body">{ORIGIN_LABELS[version.origin]}</span>
                  {version.createdByName ? ` · ${version.createdByName}` : ""}
                </p>
                {version.changeNote && (
                  <p className="text-[9px] text-body leading-relaxed">{version.changeNote}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
