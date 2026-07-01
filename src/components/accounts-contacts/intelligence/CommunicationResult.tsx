"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { CommunicationBrief, CommunicationOutput, CommunicationQaFlag } from "@/lib/n8n/types"
import { saveCommunicationInteraction } from "./save-communication-interaction"

type SaveStatus = "idle" | "saving" | "saved" | "error"

export function CommunicationResult({
  result,
  qaFlags,
  companyId,
  companyName,
  channelLabel,
  brief,
  isMobile = false,
  onReset,
}: {
  result: CommunicationOutput
  qaFlags: CommunicationQaFlag[]
  companyId: string
  companyName: string
  channelLabel: string
  brief: CommunicationBrief
  isMobile?: boolean
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const failedFlags = qaFlags.filter((f) => !f.passed)
  const allPassed = failedFlags.length === 0

  function handleCopy() {
    const subject = result.subjects?.[0]
    const text = subject ? `${subject}\n\n${result.body}` : result.body
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSave() {
    setSaveStatus("saving")
    const res = await saveCommunicationInteraction({ companyId, brief, result })
    setSaveStatus(res.error ? "error" : "saved")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-heading">Message généré</h2>
          <p className="text-[11px] text-muted mt-0.5">{companyName} · {channelLabel}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body border border-border rounded px-2 py-1"
        >
          Refaire
        </button>
      </div>

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider w-fit",
          allPassed
            ? "border-success/20 bg-success/10 text-success"
            : "border-warning/25 bg-warning/10 text-[var(--color-status-warning-ink)]"
        )}
      >
        <span className={cn("size-1.5 rounded-full", allPassed ? "bg-success" : "bg-warning")} />
        {allPassed ? "Qualité OK" : "À vérifier"}
      </div>

      {!allPassed && (
        <ul className="space-y-1 text-[11px] text-[var(--color-status-warning-ink)]">
          {failedFlags.map((flag, i) => (
            <li key={i}>• {flag.detail || flag.check}</li>
          ))}
        </ul>
      )}

      {result.subjects && result.subjects.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Objet</span>
          <p className="text-xs font-semibold text-heading border border-border rounded px-3 py-2 bg-surface">
            {result.subjects[0]}
          </p>
        </div>
      )}

      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Message</span>
        <div className="rounded border border-border bg-canvas/40 px-3 py-3 text-xs leading-relaxed text-body whitespace-pre-wrap">
          {result.body}
        </div>
      </div>

      {result.key_points && result.key_points.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Points clés</span>
          <ul className="space-y-1 text-xs text-body">
            {result.key_points.map((point, i) => (
              <li key={i}>▸ {point}</li>
            ))}
          </ul>
        </div>
      )}

      {result.source_refs && result.source_refs.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Sources utilisées</span>
          <ul className="space-y-1 text-[11px] text-muted">
            {result.source_refs.map((ref, i) => (
              <li key={i}>• {ref}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings && result.warnings.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-border space-y-2">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            copied
              ? "border-success/30 bg-success/10 text-success"
              : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
          )}
        >
          {copied ? "✓ Copié !" : "Copier dans le presse-papier"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveStatus === "saving" || saveStatus === "saved"}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            saveStatus === "saved"
              ? "border-success/30 bg-success/10 text-success cursor-default"
              : saveStatus === "error"
                ? "border-danger/30 bg-danger/5 text-danger"
                : "border-border bg-surface text-body hover:bg-canvas"
          )}
        >
          {saveStatus === "saving" && "Enregistrement…"}
          {saveStatus === "saved" && "✓ Enregistré dans l'historique du compte"}
          {saveStatus === "error" && "Échec — réessayer"}
          {saveStatus === "idle" && "Enregistrer dans l'historique du compte"}
        </button>
      </div>
    </div>
  )
}
