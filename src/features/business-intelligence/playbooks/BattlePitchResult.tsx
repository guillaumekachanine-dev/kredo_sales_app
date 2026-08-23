"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import type { BattleSituationDraft } from "./battle-situation-options"
import type { SpokenPitchOutput } from "@/lib/n8n/types"
import { saveResultAsDocument } from "@/components/accounts-contacts/intelligence/save-as-document"

export type BattlePitchResultProps = {
  actor: CompetitiveMapActor
  resultId: string
  contentJson: unknown
  draft: BattleSituationDraft
  onReset: () => void
  onBackToRevision: () => void
  isMobile: boolean
}

function isSpokenPitchOutput(value: unknown): value is SpokenPitchOutput {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as Record<string, unknown>).kind === "spoken_pitch" &&
    typeof (value as Record<string, unknown>).hook === "string"
  )
}

export function BattlePitchResult({
  actor,
  resultId,
  contentJson,
  draft,
  onReset,
  onBackToRevision,
  isMobile,
}: BattlePitchResultProps) {
  const [copied, setCopied] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [isSavingDoc, setIsSavingDoc] = useState(!!resultId)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Récupération idempotente du documentId en tâche de fond dès l'affichage
  useEffect(() => {
    if (!resultId) return
    let active = true

    saveResultAsDocument({ resultId })
      .then((res) => {
        if (!active) return
        setIsSavingDoc(false)
        if (res.success && res.documentId) {
          setDocumentId(res.documentId)
        } else if (res.error) {
          setSaveError(res.error)
        }
      })
      .catch((err) => {
        if (!active) return
        setIsSavingDoc(false)
        setSaveError("Erreur lors de la préparation du document.")
        console.error("[BattlePitchResult] saveResultAsDocument error:", err)
      })

    return () => {
      active = false
    }
  }, [resultId])

  const pitch = isSpokenPitchOutput(contentJson) ? contentJson : null

  const handleCopy = () => {
    if (!pitch) return
    const textToCopy = [
      pitch.hook ? `Accroche : ${pitch.hook}` : null,
      pitch.problem_recognition ? `Diagnostic : ${pitch.problem_recognition}` : null,
      pitch.offer_link ? `Lien avec l'offre : ${pitch.offer_link}` : null,
      pitch.ask ? `Demande : ${pitch.ask}` : null,
      pitch.alt_close ? `Repli : ${pitch.alt_close}` : null,
    ]
      .filter(Boolean)
      .join("\n\n")

    void navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Rendu de la trame du pitch (les 5 blocs)
  const renderPitchBlocks = (themeColors: {
    hook: string
    problem: string
    offer: string
    ask: string
    alt: string
  }) => {
    if (!pitch) {
      return (
        <p className="text-sm text-edito-body italic">
          Le format du pitch n’est pas reconnu pour un affichage structuré.
        </p>
      )
    }

    return (
      <div className="space-y-6">
        {pitch.hook && (
          <div className={cn("border-l-2 pl-4 py-0.5 text-left", themeColors.hook)}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-brass mb-1">
              Accroche
            </span>
            <p className="text-sm text-edito-body leading-relaxed">{pitch.hook}</p>
          </div>
        )}
        {pitch.problem_recognition && (
          <div className={cn("border-l-2 pl-4 py-0.5 text-left", themeColors.problem)}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-navy mb-1">
              Diagnostic
            </span>
            <p className="text-sm text-edito-body leading-relaxed">{pitch.problem_recognition}</p>
          </div>
        )}
        {pitch.offer_link && (
          <div className={cn("border-l-2 pl-4 py-0.5 text-left", themeColors.offer)}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-petrol mb-1">
              Lien avec l’offre
            </span>
            <p className="text-sm text-edito-body leading-relaxed">{pitch.offer_link}</p>
          </div>
        )}
        {pitch.ask && (
          <div className={cn("border-l-2 pl-4 py-0.5 text-left", themeColors.ask)}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-navy mb-1">
              Demande
            </span>
            <p className="text-sm text-edito-body leading-relaxed">{pitch.ask}</p>
          </div>
        )}
        {pitch.alt_close && (
          <div className={cn("border-l-2 pl-4 py-0.5 text-left", themeColors.alt)}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted mb-1">
              Repli (Objection)
            </span>
            <p className="text-sm text-edito-body leading-relaxed">{pitch.alt_close}</p>
          </div>
        )}
      </div>
    )
  }

  // ─── RENDU MOBILE ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-edito-border bg-white p-4 text-edito-ink shadow-sm space-y-4">
          <header className="flex items-start justify-between gap-2 border-b border-edito-border pb-3">
            <div className="text-left">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-edito-brass bg-edito-brass/10 px-1.5 py-0.5 rounded">
                Pitch de situation
              </span>
              <h3 className="mt-1 font-heading text-base font-bold text-edito-navy">
                {actor.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded border px-3 py-1 text-[10px] font-bold transition-all",
                copied
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-edito-border bg-edito-chip text-edito-navy hover:bg-edito-border"
              )}
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </header>

          {/* Métadonnées légères */}
          <div className="space-y-1.5 text-xs border-b border-edito-border pb-3 text-left">
            <p className="text-edito-body">
              <strong className="text-[10px] uppercase text-edito-muted mr-1.5">Interlocuteur :</strong>
              {draft.persona?.label || "Non spécifié"}
            </p>
            <p className="text-edito-body">
              <strong className="text-[10px] uppercase text-edito-muted mr-1.5">Offre :</strong>
              {draft.offer?.name || "Non spécifiée"}
            </p>
            <p className="text-edito-body">
              <strong className="text-[10px] uppercase text-edito-muted mr-1.5">Enjeu :</strong>
              {draft.issue?.label}
            </p>
            <p className="text-edito-body">
              <strong className="text-[10px] uppercase text-edito-muted mr-1.5">Angle :</strong>
              {draft.angle?.label}
            </p>
          </div>

          {/* Contenu généré */}
          <div className="py-2">
            {renderPitchBlocks({
              hook: "border-edito-brass",
              problem: "border-edito-navy",
              offer: "border-edito-petrol",
              ask: "border-edito-navy",
              alt: "border-edito-muted",
            })}
          </div>

          {/* Notes de ton */}
          {pitch?.tone_notes && pitch.tone_notes.length > 0 && (
            <div className="rounded-lg bg-edito-chip px-3 py-2 text-left space-y-1">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                Note de ton
              </span>
              {pitch.tone_notes.map((note, index) => (
                <p key={index} className="text-[11px] text-edito-body leading-relaxed">
                  🎙 {note}
                </p>
              ))}
            </div>
          )}

          {/* Warnings */}
          {pitch?.warnings && pitch.warnings.length > 0 && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-left space-y-1">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-700">
                Avertissements
              </span>
              {pitch.warnings.map((w, index) => (
                <p key={index} className="text-[11px] text-rose-600 leading-relaxed">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          {/* Métadonnées très discrètes */}
          {pitch?.word_count && (
            <div className="text-[10px] text-edito-muted text-right italic pt-1">
              {pitch.word_count} mots
            </div>
          )}
        </div>

        {/* CTAs empilés sur mobile avec hauteur >= 44px */}
        <div className="space-y-2">
          {documentId ? (
            <Link
              href={`/reports?doc=${documentId}`}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg bg-brand-brass hover:bg-brand-brass-hover text-slate-950 px-4 font-bold text-xs transition-all min-h-11 w-full"
              )}
            >
              <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ouvrir dans Rapports
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 rounded-lg bg-white/5 border border-white/10 text-white/30 px-4 font-bold text-xs min-h-11 w-full"
            >
              {isSavingDoc ? "Préparation du document..." : saveError ? "Erreur de sauvegarde" : "Ouvrir dans Rapports"}
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center rounded-lg border border-white/10 bg-slate-900/40 hover:bg-white/[0.05] text-white px-4 font-bold text-xs transition-all min-h-11 w-full"
          >
            Nouvelle situation
          </button>

          <button
            type="button"
            onClick={onBackToRevision}
            className="flex items-center justify-center rounded-lg text-white/50 hover:text-white px-4 font-semibold text-xs min-h-11 w-full"
          >
            Revenir à la révision
          </button>
        </div>
      </div>
    )
  }

  // ─── RENDU DESKTOP ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl text-edito-ink space-y-6">
      <div className="rounded-xl border border-edito-border bg-white p-6 md:p-8 shadow-md space-y-6">
        <header className="flex items-start justify-between gap-4 border-b border-edito-border pb-4">
          <div className="flex items-start gap-3 text-left">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-edito-brass/10 text-edito-brass">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                Pitch de situation
              </span>
              <h3 className="mt-0.5 font-heading text-lg font-bold text-edito-navy">
                {actor.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold transition-all min-h-[36px]",
              copied
                ? "border-success/30 bg-success/10 text-success"
                : "border-edito-border bg-edito-chip text-edito-navy hover:bg-edito-border"
            )}
          >
            <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? "Copié !" : "Copier le texte"}
          </button>
        </header>

        {/* Métadonnées grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-b border-edito-border pb-5 text-left">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
              Interlocuteur
            </span>
            <span className="text-sm font-semibold text-edito-ink">
              {draft.persona?.label || "Non spécifié"}
            </span>
            {draft.persona?.sublabel && (
              <span className="block text-[11px] font-normal text-edito-muted leading-tight mt-0.5">
                {draft.persona.sublabel}
              </span>
            )}
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
              Offre associée
            </span>
            <span className="text-sm font-semibold text-edito-ink">
              {draft.offer?.name || "Non spécifiée"}
            </span>
            {draft.offer?.practiceName && (
              <span className="block text-[11px] font-normal text-edito-muted leading-tight mt-0.5">
                {draft.offer.practiceName}
              </span>
            )}
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
              Cadrage
            </span>
            <span className="block text-xs text-edito-body leading-normal">
              <strong>Enjeu :</strong> {draft.issue?.label}
            </span>
            <span className="block text-xs text-edito-body leading-normal mt-0.5">
              <strong>Angle :</strong> {draft.angle?.label}
            </span>
          </div>
        </div>

        {/* Trame narrative */}
        <div className="py-2">
          {renderPitchBlocks({
            hook: "border-edito-brass",
            problem: "border-edito-navy",
            offer: "border-edito-petrol",
            ask: "border-edito-navy",
            alt: "border-edito-muted",
          })}
        </div>

        {/* Notes de ton */}
        {pitch?.tone_notes && pitch.tone_notes.length > 0 && (
          <div className="rounded-lg bg-edito-chip px-4 py-3 text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted mb-1.5">
              Note de ton
            </span>
            <ul className="space-y-1 text-xs text-edito-body">
              {pitch.tone_notes.map((note, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="text-edito-brass">🎙</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {pitch?.warnings && pitch.warnings.length > 0 && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1.5">
              Avertissements
            </span>
            <ul className="space-y-1 text-xs text-rose-600">
              {pitch.warnings.map((w, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span>⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Métadonnées très discrètes */}
        <footer className="flex items-center justify-between text-[10px] text-edito-muted italic border-t border-edito-border pt-3">
          <span>Raccordé au run ID : {resultId.substring(0, 8)}...</span>
          {pitch?.word_count && <span>~{pitch.word_count} mots</span>}
        </footer>
      </div>

      {/* Barre de CTAs horizontale sur desktop */}
      <div className="flex items-center justify-between gap-4 px-2">
        <button
          type="button"
          onClick={onBackToRevision}
          className="text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          Revenir à la révision
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-white/10 bg-slate-900/40 hover:bg-white/[0.05] text-white px-4 py-2 text-xs font-bold transition-all min-h-9"
          >
            Nouvelle situation
          </button>

          {documentId ? (
            <Link
              href={`/reports?doc=${documentId}`}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-brass hover:bg-brand-brass-hover text-slate-950 px-4 py-2 text-xs font-bold transition-all min-h-9"
              )}
            >
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ouvrir dans Rapports
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 px-4 py-2 text-xs font-bold min-h-9"
            >
              {isSavingDoc ? "Enregistrement..." : saveError ? "Erreur" : "Ouvrir dans Rapports"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
