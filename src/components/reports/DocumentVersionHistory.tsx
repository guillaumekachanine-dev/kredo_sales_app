"use client"

import { useMemo, useState } from "react"
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR")
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("fr-FR")
}

function getVersionPreview(version: DocumentVersion): string | null {
  if (typeof version.contentText === "string" && version.contentText.trim()) {
    return version.contentText
  }

  if (
    version.contentJson &&
    typeof version.contentJson === "object" &&
    !Array.isArray(version.contentJson) &&
    typeof (version.contentJson as Record<string, unknown>).body === "string"
  ) {
    return (version.contentJson as Record<string, string>).body
  }

  try {
    return JSON.stringify(version.contentJson, null, 2)
  } catch {
    return null
  }
}

export function DocumentVersionHistory({
  versions,
  compact = false,
}: DocumentVersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(versions[0]?.id ?? null)

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null,
    [selectedVersionId, versions]
  )

  if (versions.length === 0) {
    return <p className="text-sm text-muted">Aucune version enregistrée.</p>
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {versions.map((version) => {
          const isSelected = version.id === selectedVersion?.id

          return (
            <button
              key={version.id}
              type="button"
              onClick={() => setSelectedVersionId(version.id)}
              className={cn(
                "w-full rounded-[var(--radius-medium)] border px-3 py-3 text-left transition-colors",
                isSelected
                  ? "border-primary/25 bg-primary/[0.05]"
                  : "border-border bg-canvas/30 hover:bg-surface-hover"
              )}
            >
              <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", compact && "text-sm")}>
                <span className="font-semibold text-heading">V{version.versionNumber}</span>
                <span className="text-muted">·</span>
                <span className="text-body">{ORIGIN_LABELS[version.origin]}</span>
                <span className="text-muted">·</span>
                <span className="text-body">{formatDate(version.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {version.createdByName ?? "Auteur inconnu"}
              </p>
              {version.changeNote ? (
                <p className="mt-2 text-sm text-body">{version.changeNote}</p>
              ) : null}
            </button>
          )
        })}
      </div>

      {selectedVersion ? (
        <div className="space-y-2 rounded-[var(--radius-medium)] border border-border bg-canvas/35 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-heading">
              Consultation seule · Version {selectedVersion.versionNumber}
            </span>
            <span>·</span>
            <span>{formatTimestamp(selectedVersion.createdAt)}</span>
          </div>
          {selectedVersion.changeNote ? (
            <p className="text-sm text-body">
              Note : {selectedVersion.changeNote}
            </p>
          ) : null}
          {getVersionPreview(selectedVersion) ? (
            <div className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-body">
              {getVersionPreview(selectedVersion)}
            </div>
          ) : (
            <p className="text-sm text-muted">Aucun contenu exploitable pour cette version.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
