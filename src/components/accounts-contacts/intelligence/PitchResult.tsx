"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { CommunicationQaFlag, MeetingBriefingOutput, PitchOutput, SpokenPitchOutput } from "@/lib/n8n/types"
import { saveResultAsDocument } from "./save-as-document"

type SaveStatus = "idle" | "saving" | "saved" | "error"

export function buildCopyText(result: PitchOutput): string {
  if (result.kind === "spoken_pitch") {
    return [result.hook, result.problem_recognition, result.offer_link, result.ask, result.alt_close]
      .filter(Boolean)
      .join("\n\n")
  }
  const lines = [
    `Objectif : ${result.objective}`,
    `Message clé : ${result.key_message}`,
    "",
    "Arguments :",
    ...result.arguments.map((a) => `- ${a.title} — ${a.evidence}`),
    "",
    "Objections attendues :",
    ...result.expected_objections.map((o) => `- "${o.objection}" → ${o.response}`),
  ]
  if (result.cross_sell_hypotheses.length) {
    lines.push("", "Cross-sell possible :", ...result.cross_sell_hypotheses.map((h) => `- ${h}`))
  }
  if (result.close_options.length) {
    lines.push("", "Sorties possibles du RDV :", ...result.close_options.map((c) => `- ${c}`))
  }
  return lines.join("\n")
}

export function SpokenPitchView({ result }: { result: SpokenPitchOutput }) {
  const blocks: { label: string; text: string }[] = [
    { label: "Accroche", text: result.hook },
    { label: "Diagnostic", text: result.problem_recognition },
    { label: "Lien vers l'offre", text: result.offer_link },
    { label: "Ask", text: result.ask },
    { label: "Repli", text: result.alt_close },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-canvas overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
        </div>
        <span className="text-[10px] font-bold text-muted whitespace-nowrap">~30 s · {result.word_count || "?"} mots</span>
      </div>
      {blocks.map((b) => (
        <div key={b.label} className="rounded border border-border bg-canvas/40 px-3 py-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{b.label}</span>
          <p className="text-xs leading-relaxed text-body">{b.text}</p>
        </div>
      ))}
      {result.tone_notes.length > 0 && (
        <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary">
          {result.tone_notes.map((n, i) => <p key={i}>🎙 {n}</p>)}
        </div>
      )}
    </div>
  )
}

export function MeetingBriefingView({ result }: { result: MeetingBriefingOutput }) {
  return (
    <div className="space-y-4">
      <div className="rounded border border-border bg-canvas/40 px-3 py-2.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Objectif du RDV</span>
        <p className="text-xs leading-relaxed text-body">{result.objective}</p>
      </div>
      <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Message clé</span>
        <p className="text-xs leading-relaxed text-heading font-semibold">{result.key_message}</p>
      </div>

      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Arguments</span>
        <div className="space-y-2">
          {result.arguments.map((a, i) => (
            <div key={i} className="rounded border border-border bg-surface px-3 py-2">
              <p className="text-xs font-semibold text-heading">{a.title}</p>
              <p className="mt-1 text-[11px] text-body leading-relaxed">{a.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Objections attendues</span>
        <div className="space-y-2">
          {result.expected_objections.map((o, i) => (
            <div key={i} className="rounded border border-border bg-surface px-3 py-2">
              <p className="text-xs font-semibold italic text-danger">&quot;{o.objection}&quot;</p>
              <p className="mt-1 text-[11px] text-body leading-relaxed border-t border-border pt-1">{o.response}</p>
            </div>
          ))}
        </div>
      </div>

      {result.cross_sell_hypotheses.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Cross-sell possible</span>
          <ul className="space-y-1 text-xs text-body">
            {result.cross_sell_hypotheses.map((h, i) => <li key={i}>▸ {h}</li>)}
          </ul>
        </div>
      )}

      {result.data_points_to_mention.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Chiffres à citer</span>
          <ul className="space-y-1 text-xs text-body">
            {result.data_points_to_mention.map((d, i) => <li key={i}>▸ {d}</li>)}
          </ul>
        </div>
      )}

      {result.close_options.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Sorties possibles du RDV</span>
          <ul className="space-y-1 text-xs text-body">
            {result.close_options.map((c, i) => <li key={i}>▸ {c}</li>)}
          </ul>
        </div>
      )}

      {result.do_not_say.length > 0 && (
        <div className="rounded border border-danger/20 bg-danger/5 px-3 py-2 text-[11px] text-danger">
          {result.do_not_say.map((d, i) => <p key={i}>✕ {d}</p>)}
        </div>
      )}
    </div>
  )
}

export function PitchResult({
  result,
  qaFlags,
  companyName,
  scenarioLabel,
  resultId,
  isMobile = false,
  onReset,
}: {
  result: PitchOutput
  qaFlags: CommunicationQaFlag[]
  companyName: string
  scenarioLabel: string
  resultId: string | null
  isMobile?: boolean
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [documentStatus, setDocumentStatus] = useState<SaveStatus>("idle")
  const failedFlags = qaFlags.filter((f) => !f.passed)
  const allPassed = failedFlags.length === 0

  function handleCopy() {
    void navigator.clipboard.writeText(buildCopyText(result)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSaveAsDocument() {
    if (!resultId) {
      setDocumentStatus("error")
      return
    }
    setDocumentStatus("saving")
    const res = await saveResultAsDocument({ resultId })
    setDocumentStatus(res.error ? "error" : "saved")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-heading">
            {result.kind === "spoken_pitch" ? "Pitch oral 30 s" : "Fiche de préparation RDV"}
          </h2>
          <p className="text-[11px] text-muted mt-0.5">{companyName} · {scenarioLabel}</p>
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

      {result.kind === "spoken_pitch" ? <SpokenPitchView result={result} /> : <MeetingBriefingView result={result} />}

      {result.source_refs.length > 0 && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Sources utilisées</span>
          <ul className="space-y-1 text-[11px] text-muted">
            {result.source_refs.map((ref, i) => <li key={i}>• {ref}</li>)}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] text-[var(--color-status-warning-ink)] space-y-1">
          {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
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
          onClick={handleSaveAsDocument}
          disabled={!resultId || documentStatus === "saving" || documentStatus === "saved"}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            documentStatus === "saved"
              ? "border-success/30 bg-success/10 text-success cursor-default"
              : documentStatus === "error"
                ? "border-danger/30 bg-danger/5 text-danger"
                : "border-border bg-surface text-body hover:bg-canvas"
          )}
        >
          {documentStatus === "saving" && "Enregistrement…"}
          {documentStatus === "saved" && "✓ Enregistré dans la bibliothèque"}
          {documentStatus === "error" && "Échec — réessayer"}
          {documentStatus === "idle" && "Enregistrer dans la bibliothèque"}
        </button>
      </div>
    </div>
  )
}
