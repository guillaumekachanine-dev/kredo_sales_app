"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import type { PitchOutput } from "@/lib/n8n/types"
import {
  MeetingBriefingView,
  SpokenPitchView,
  buildCopyText,
} from "@/components/accounts-contacts/intelligence/PitchResult"
import { buildResultPresentationFromSnapshot } from "@/lib/communication/communication-result-documents"

type PitchDocumentContentProps = {
  contentJson: unknown
  contentText: string | null
  briefJson?: unknown | null
  fallbackClassName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parsePitchContent(value: unknown): PitchOutput | null {
  if (!isRecord(value)) return null
  if (value.kind === "spoken_pitch" && typeof value.hook === "string") {
    return value as unknown as PitchOutput
  }
  if (value.kind === "meeting_briefing" && typeof value.objective === "string") {
    return value as unknown as PitchOutput
  }
  return null
}

// Bug corrigé : PitchOutput (spoken_pitch/meeting_briefing) n'a jamais de champ
// `body` — la section "Contenu" tombait donc systématiquement sur "aucun contenu
// texte disponible" pour les documents commercial_pitch / prise_de_parole.
// Réutilise le même rendu que la génération en direct (PitchResult) pour rester
// visuellement cohérent.
export function PitchDocumentContent({ contentJson, contentText, briefJson, fallbackClassName }: PitchDocumentContentProps) {
  const [copied, setCopied] = useState(false)
  const result = parsePitchContent(contentJson)
  const presentation = buildResultPresentationFromSnapshot(briefJson)

  if (result) {
    return (
      <div className="space-y-3">
        {result.kind === "spoken_pitch" ? (
          <SpokenPitchView result={result} presentation={presentation} />
        ) : (
          <MeetingBriefingView result={result} presentation={presentation} />
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(buildCopyText(result, presentation)).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
        >
          {copied ? "✓ Copié" : "Copier"}
        </Button>
      </div>
    )
  }

  if (contentText) {
    return (
      <div className={fallbackClassName ?? "rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"}>
        {contentText}
      </div>
    )
  }

  return <p className="text-sm text-muted">Aucun contenu structuré disponible.</p>
}
