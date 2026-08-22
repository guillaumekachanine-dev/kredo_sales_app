"use client"

// ADR-0019 Lot 5 — wizard mono-session d'ingestion d'une cartographie
// concurrentielle : Upload/Coller -> Résolution & Arbitrage -> Confirmation.
// Refonte graphique Éditorial / Intelligence (Proposition A canonique).

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { CompetitiveMapImportReportContent } from "@/components/reports/CompetitiveMapImportReportContent"
import {
  parseCompetitiveMapOutput,
  COMPETITIVE_MAP_CATEGORY_LABELS,
  type CompetitiveMapAccountInput,
  type CompetitiveMapOutput,
} from "../domain/competitive-map-output"
import type { CompetitiveMapEntryPreview } from "../data/resolve-competitive-map-entries"
import { resolveCompetitiveMapEntries } from "../data/resolve-competitive-map-entries"
import {
  confirmCompetitiveMapIngestion,
  type CompetitiveMapIngestionDecision,
  type ConfirmCompetitiveMapIngestionResult,
} from "../actions/ingest-competitive-map"
import {
  getCompetitiveMapImportDetail,
  getCompetitiveMapImportHistory,
  type CompetitiveMapImportHistoryItem,
} from "../data/get-competitive-map-import-history"

export type CompetitiveMapSegmentOption = {
  slug: string
  name: string
  macroSlug: string
  macroName: string
}

type WizardStep = "upload" | "arbitrate" | "confirm"

const WIZARD_STEPS: { id: WizardStep; index: string; label: string }[] = [
  { id: "upload", index: "01", label: "Préparer" },
  { id: "arbitrate", index: "02", label: "Arbitrer" },
  { id: "confirm", index: "03", label: "Finaliser" },
]

type ArbitrationState = {
  skip: boolean
  mode: "attach" | "create"
  selectedCandidateId: string | null
  name: string
  positioning: string
  forces: string
  vulnerabilite: string
  angleEntree: string
}

const SIREN_FORMAT = /^\d{9}$/

function suggestSegmentSlug(segmentLabel: string, segments: CompetitiveMapSegmentOption[]): string {
  const normalized = segmentLabel.trim().toLowerCase()
  const match = segments.find(
    (s) => normalized.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(normalized.slice(0, 24)),
  )
  return match?.slug ?? ""
}

function initialArbitration(entry: CompetitiveMapEntryPreview): ArbitrationState {
  const topCandidate = entry.candidates[0] ?? null
  const hasConfidentCandidate = entry.status !== "not_found" && topCandidate !== null
  return {
    skip: false,
    mode: hasConfidentCandidate ? "attach" : "create",
    selectedCandidateId: hasConfidentCandidate ? topCandidate.companyId : null,
    name: entry.input.nom,
    positioning: entry.input.justificationCategorie ?? "",
    forces: "",
    vulnerabilite: "",
    angleEntree: entry.input.angleEntree ?? "",
  }
}

function moneyLabel(value: number | null): string {
  if (value === null) return "—"
  return `${value.toLocaleString("fr-FR")} M€`
}

function formatShortDateFR(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

type CompetitiveMapImportWizardProps = {
  segments: CompetitiveMapSegmentOption[]
  initialSegmentSlug?: string | null
  embedded?: boolean
  onStepChange?: (step: WizardStep) => void
  onClose?: () => void
  /** Appelé une fois l'import CRM confirmé avec succès — sert à rafraîchir l'historique. */
  onImported?: () => void
}

export function CompetitiveMapImportWizard({
  segments,
  initialSegmentSlug,
  embedded = false,
  onStepChange,
  onClose,
  onImported,
}: CompetitiveMapImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload")

  const [rawText, setRawText] = useState("")
  const [sourceFileName, setSourceFileName] = useState("JSON collé")
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsed, setParsed] = useState<CompetitiveMapOutput | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [segmentSlug, setSegmentSlug] = useState(initialSegmentSlug ?? "")
  const [studyDate, setStudyDate] = useState("")

  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [entries, setEntries] = useState<CompetitiveMapEntryPreview[]>([])
  const [arbitration, setArbitration] = useState<Record<number, ArbitrationState>>({})
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ConfirmCompetitiveMapIngestionResult | null>(null)

  function changeStep(nextStep: WizardStep) {
    setStep(nextStep)
    onStepChange?.(nextStep)
  }

  const selectedSegment = segments.find((s) => s.slug === segmentSlug) ?? null

  async function handleFile(file: File) {
    const text = await file.text()
    setRawText(text)
    setSourceFileName(file.name)
  }

  function handleParse() {
    setParseErrors([])
    let json: unknown
    try {
      json = JSON.parse(rawText)
    } catch {
      setParseErrors(["Le contenu collé n'est pas un JSON valide."])
      return
    }

    const result = parseCompetitiveMapOutput(json)
    if ("errors" in result) {
      setParseErrors(result.errors.map((e) => `${e.path || "racine"} — ${e.message}`))
      setParsed(null)
      return
    }

    setParsed(result.data)
    setWarnings(result.warnings)
    setStudyDate(result.data.dateSnapshot)
    const suggested = suggestSegmentSlug(result.data.segmentLabel, segments)
    setSegmentSlug(suggested || (initialSegmentSlug ?? ""))
  }

  async function handleStartResolution() {
    if (!parsed || !segmentSlug || !studyDate) return
    setResolving(true)
    setResolveError(null)
    const { error, entries: resolved } = await resolveCompetitiveMapEntries(parsed.comptes)
    setResolving(false)

    if (error) {
      setResolveError(error)
      return
    }

    setEntries(resolved)
    const initial: Record<number, ArbitrationState> = {}
    for (const entry of resolved) initial[entry.index] = initialArbitration(entry)
    setArbitration(initial)
    setExpandedIndex(null) // Tous repliés par défaut (§10)
    changeStep("arbitrate")
  }

  function updateArbitration(index: number, patch: Partial<ArbitrationState>) {
    setArbitration((prev) => ({ ...prev, [index]: { ...prev[index], ...patch } }))
  }

  const decisionsToSubmit = useMemo<CompetitiveMapIngestionDecision[]>(() => {
    if (!segmentSlug || !studyDate) return []
    return entries
      .filter((entry) => !arbitration[entry.index]?.skip)
      .map((entry): CompetitiveMapIngestionDecision => {
        const state = arbitration[entry.index]
        const input: CompetitiveMapAccountInput = entry.input
        const attaching = state.mode === "attach" && state.selectedCandidateId

        return {
          action: attaching ? "attach" : "create",
          companyId: attaching ? state.selectedCandidateId : null,
          name: attaching ? null : state.name.trim(),
          siren: input.identifiantNational && SIREN_FORMAT.test(input.identifiantNational)
            ? input.identifiantNational
            : null,
          segmentSlug,
          category: input.categorie,
          positioning: state.positioning.trim() || null,
          forces: state.forces.trim() || null,
          vulnerabilite: state.vulnerabilite.trim() || null,
          angleEntree: state.angleEntree.trim() || null,
          empreinteMetier: input.empreinteMetier,
          maturiteNumerique: input.maturiteNumerique,
          appetenceScore: input.appetenceScore,
          accessibiliteScore: input.accessibiliteScore,
          appetenceProvisoire: true,
          isBenchmarkAccount: input.estCompteEtalon,
          profileJson: input.profil,
          confiance: input.confiance,
          studySnapshotDate: studyDate,
          caMeur: input.caMeur,
          exercice: input.exercice,
          perimetreCa: input.perimetreCa,
          effectifFrance: input.effectifFrance,
        }
      })
  }, [entries, arbitration, segmentSlug, studyDate])

  async function handleConfirm() {
    if (decisionsToSubmit.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    const outcome = await confirmCompetitiveMapIngestion(
      decisionsToSubmit,
      { sourceFileName, rawText },
      parsed ? `Import cartographie — ${parsed.secteur}` : undefined,
    )
    setSubmitting(false)

    if (outcome.error) {
      setSubmitError(outcome.error)
      return
    }

    setResult(outcome)
    changeStep("confirm")
    onImported?.()
  }

  const skippedCount = entries.filter((e) => arbitration[e.index]?.skip).length

  return (
    <div className={cn("mx-auto flex w-full flex-col gap-4 font-sans text-edito-body", embedded ? "px-6 py-5" : "px-6 py-6")}>
      {!embedded && (
        <header className="border-b border-edito-border pb-3">
          <h1 className="font-heading text-xl font-black tracking-tight text-edito-navy">
            Importer une cartographie concurrentielle
          </h1>
          <p className="mt-1 text-xs text-edito-muted">
            Rapprochement et ingestion d&apos;une étude sectorielle contre le référentiel CRM KREDO.
          </p>
        </header>
      )}

      {/* ÉTAPE 1 : PRÉPARER LE FICHIER */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Entrées côte à côte compactes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Déposer un export JSON */}
            <label className="group flex flex-col items-center justify-center rounded-lg border border-dashed border-edito-border bg-white p-4 text-center cursor-pointer transition-all hover:border-edito-brass hover:bg-edito-chip/40">
              <span className="mb-2 flex size-8 items-center justify-center rounded-full bg-edito-navy/10 text-edito-navy transition-transform group-hover:-translate-y-0.5">
                ↑
              </span>
              <span className="text-xs font-bold text-edito-navy">Déposer un export JSON</span>
              <span className="mt-0.5 text-[10px] text-edito-muted">ou parcourir cet appareil</span>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                }}
                className="sr-only"
              />
            </label>

            {/* Coller le contenu */}
            <div className="flex flex-col rounded-lg border border-edito-border bg-white p-3">
              <label htmlFor="prod-json-input" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                Coller le contenu JSON
              </label>
              <textarea
                id="prod-json-input"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={4}
                placeholder='{"secteur": "...", "comptes": [...]}'
                className="w-full flex-1 resize-none rounded border border-edito-border bg-edito-canvas p-2 font-mono text-[10px] leading-relaxed text-edito-ink outline-none focus:border-edito-navy"
              />
            </div>
          </div>

          {parseErrors.length > 0 && (
            <ul className="space-y-1 rounded border border-red-300 bg-red-50 p-2.5 text-[11px] text-red-700">
              {parseErrors.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          )}

          {/* Signature Action Bar: « Analyser le fichier » */}
          <div className="flex items-center justify-between rounded-lg border border-edito-brass/40 bg-gradient-to-r from-edito-navy via-[#243B63] to-edito-navy p-3 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded border border-edito-brass/50 bg-edito-brass/20 text-edito-brass text-xs">
                ⚙
              </div>
              <div>
                <p className="text-xs font-bold text-white">Analyseur de cartographie sectorielle</p>
                <p className="text-[10px] text-white/60">Contrôle de validité du JSON et extraction des métadonnées.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="flex items-center gap-2 rounded border border-edito-brass bg-edito-brass px-4 py-1.5 text-xs font-black text-edito-navy transition-all hover:bg-white disabled:opacity-40"
            >
              <span>Analyser le fichier</span>
              <span>→</span>
            </button>
          </div>

          {/* Étape 1 — APRÈS ANALYSE : Synthèse analytique compacte sans scroll */}
          {parsed && (
            <div className="space-y-3 rounded-lg border border-edito-border bg-white p-4 shadow-sm animate-in fade-in-50">
              <div className="flex items-center justify-between border-b border-edito-border pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-edito-brass">
                  Synthèse de l&apos;analyse
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  ✓ JSON Conforme
                </span>
              </div>

              {/* Micro-KPIs en grille horizontale */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Secteur détecté</span>
                  <span className="font-bold text-edito-navy">{parsed.secteur}</span>
                </div>
                <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Comptes cités</span>
                  <span className="font-bold text-edito-navy">{parsed.comptes.length} entreprise(s)</span>
                </div>
                <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Compte étalon</span>
                  <span className="font-bold text-edito-brass">{parsed.compteEtalon ?? "Non spécifié"}</span>
                </div>
                <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Avertissements</span>
                  <span className="font-bold text-edito-body">{warnings.length} avertissement(s)</span>
                </div>
              </div>

              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                  ⚠️ {w}
                </p>
              ))}

              {/* Rattachement Segment & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="prod-segment-select" className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                    Segment cible dans le référentiel <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="prod-segment-select"
                    value={segmentSlug}
                    onChange={(e) => setSegmentSlug(e.target.value)}
                    className="mt-1 w-full rounded border border-edito-border bg-white px-2.5 py-1.5 text-xs text-edito-navy outline-none focus:border-edito-navy"
                  >
                    <option value="">— Choisir un segment —</option>
                    {segments.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.macroName} › {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prod-date-input" className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                    Date de la cartographie <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prod-date-input"
                    type="date"
                    value={studyDate}
                    onChange={(e) => setStudyDate(e.target.value)}
                    className="mt-1 w-full rounded border border-edito-border bg-white px-2.5 py-1.5 text-xs text-edito-navy outline-none focus:border-edito-navy"
                  />
                </div>
              </div>

              {resolveError && (
                <p className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">
                  {resolveError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleStartResolution}
                  disabled={!segmentSlug || !studyDate || resolving}
                  className="flex items-center gap-2 rounded border border-edito-navy bg-edito-navy px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-edito-heading disabled:opacity-50"
                >
                  <span>{resolving ? "Résolution en cours…" : "Continuer vers la résolution"}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 2 : RÉSOUDRE LES COMPTES */}
      {step === "arbitrate" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-edito-border pb-2 text-[11px]">
            <span className="font-bold text-edito-navy">
              {entries.length} compte(s) — {entries.filter((e) => e.status === "resolved").length} résolu(s),{" "}
              {entries.filter((e) => e.status === "ambiguous").length} ambigu(s),{" "}
              {entries.filter((e) => e.status === "not_found").length} introuvable(s)
              {skippedCount > 0 ? `, ${skippedCount} exclu(s)` : ""}
            </span>
            {selectedSegment && (
              <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] font-bold text-edito-brass">
                {selectedSegment.name}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {entries.map((entry) => {
              const state = arbitration[entry.index]
              if (!state) return null
              const isExpanded = expandedIndex === entry.index

              return (
                <div
                  key={entry.index}
                  className={cn(
                    "rounded-lg border bg-white transition-all duration-200",
                    isExpanded
                      ? "border-edito-brass/60 shadow-md ring-1 ring-edito-brass/30"
                      : "border-edito-border hover:border-edito-navy/40",
                    state.skip && "opacity-50 bg-slate-50",
                  )}
                >
                  {/* Header Accordion Clickable */}
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? null : entry.index)}
                    className="cursor-pointer p-3"
                  >
                    {/* LIGNE 1 : Nom + Statut (Rectangulaire angles modérés) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-heading text-sm font-black text-edito-navy">
                          {entry.input.nom}
                        </span>
                        {entry.input.estCompteEtalon && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-900 border border-amber-300">
                            Étalon
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-sm px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                            entry.status === "resolved" && "bg-emerald-100 text-emerald-900 border border-emerald-300",
                            entry.status === "ambiguous" && "bg-amber-100 text-amber-900 border border-amber-300",
                            entry.status === "not_found" && "bg-slate-100 text-slate-800 border border-slate-300",
                          )}
                        >
                          {entry.status === "resolved"
                            ? "RÉSOLU"
                            : entry.status === "ambiguous"
                              ? "AMBIGU"
                              : "INTROUVABLE"}
                        </span>

                        <span className="text-edito-muted text-xs transition-transform duration-200">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* LIGNE 2 : Données analytiques (Dense 1 ligne desktop) */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[10px] text-edito-body">
                      <span className="font-bold uppercase tracking-wide text-edito-navy">
                        {COMPETITIVE_MAP_CATEGORY_LABELS[entry.input.categorie]}
                      </span>
                      <span className="text-edito-border">|</span>
                      <span>
                        <strong className="text-edito-muted font-normal">CA</strong>{" "}
                        <span className="font-semibold text-edito-ink">
                          {moneyLabel(entry.input.caMeur)}
                        </span>
                      </span>
                      <span className="text-edito-border">|</span>
                      <span>
                        <strong className="text-edito-muted font-normal">APPÉTENCE</strong>{" "}
                        <span className="font-semibold text-edito-ink">
                          {entry.input.appetenceScore !== null ? `${entry.input.appetenceScore}/35` : "—"}
                        </span>
                      </span>
                      <span className="text-edito-border">|</span>
                      <span>
                        <strong className="text-edito-muted font-normal">ACCESSIBILITÉ</strong>{" "}
                        <span className="font-semibold text-edito-ink">
                          {entry.input.accessibiliteScore !== null ? `${entry.input.accessibiliteScore}/5` : "non renseignée"}
                        </span>
                      </span>
                      <span className="text-edito-border">|</span>
                      <span>
                        <strong className="text-edito-muted font-normal">CONFIANCE</strong>{" "}
                        <span className="font-semibold text-edito-ink">{entry.input.confiance}</span>
                      </span>
                    </div>

                    {/* LIGNE 3 : Rattachement sur la même ligne */}
                    <div className="mt-2 flex items-center justify-between border-t border-edito-border/50 pt-2 text-[10px]">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="font-bold text-edito-navy">Rattachement :</span>
                        <select
                          value={state.mode === "attach" ? state.selectedCandidateId ?? "" : "__create__"}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "__create__") {
                              updateArbitration(entry.index, { mode: "create", selectedCandidateId: null })
                            } else {
                              updateArbitration(entry.index, { mode: "attach", selectedCandidateId: value })
                            }
                          }}
                          className="rounded border border-edito-border bg-edito-chip px-2 py-0.5 font-semibold text-edito-heading outline-none focus:border-edito-navy"
                        >
                          <option value="__create__">
                            Créer un nouveau compte « mapped » — {state.name}
                          </option>
                          {entry.candidates.map((c) => (
                            <option key={c.companyId} value={c.companyId}>
                              Rattacher à « {c.name} » ({Math.round(c.matchScore * 100)}%
                              {c.siren ? `, SIREN ${c.siren}` : ""})
                            </option>
                          ))}
                        </select>
                      </div>

                      <label
                        className="flex items-center gap-1.5 text-[10px] font-medium text-edito-muted hover:text-edito-navy cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={state.skip}
                          onChange={(e) => updateArbitration(entry.index, { skip: e.target.checked })}
                          className="size-3.5 accent-edito-navy"
                        />
                        Exclure de l&apos;import
                      </label>
                    </div>
                  </div>

                  {/* ZONE DÉPLIÉE — 4 RUBRIQUES DENSE HAUT CONTRASTE */}
                  {isExpanded && !state.skip && (
                    <div className="border-t border-edito-border bg-edito-canvas/70 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-edito-brass">
                          Détail analytique du compte
                        </span>
                        <span className="text-[10px] text-edito-muted">
                          Édition directe des informations
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        {/* 1. Activités */}
                        <div className="rounded border border-edito-border bg-white p-3">
                          <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-edito-navy">
                            Activités &amp; Empreinte Métier
                          </div>
                          <p className="leading-snug text-edito-body font-medium">
                            {entry.input.empreinteMetier || "Non renseigné"}
                          </p>
                        </div>

                        {/* 2. Angle d'approche */}
                        <div className="rounded border border-edito-border bg-white p-3">
                          <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-edito-navy">
                            Angle d&apos;approche
                          </div>
                          <textarea
                            value={state.angleEntree}
                            onChange={(e) => updateArbitration(entry.index, { angleEntree: e.target.value })}
                            rows={2}
                            className="w-full resize-none rounded border border-edito-border bg-edito-canvas p-1.5 text-[10px] leading-snug text-edito-ink outline-none focus:border-edito-navy"
                          />
                        </div>

                        {/* 3. Forces */}
                        <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3">
                          <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-emerald-900">
                            Forces
                          </div>
                          <textarea
                            value={state.forces}
                            onChange={(e) => updateArbitration(entry.index, { forces: e.target.value })}
                            rows={2}
                            className="w-full resize-none rounded border border-emerald-300 bg-white p-1.5 text-[10px] leading-snug text-emerald-950 outline-none focus:border-emerald-700"
                          />
                        </div>

                        {/* 4. Faiblesses */}
                        <div className="rounded border border-amber-200 bg-amber-50/50 p-3">
                          <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-amber-900">
                            Faiblesses
                          </div>
                          <textarea
                            value={state.vulnerabilite}
                            onChange={(e) => updateArbitration(entry.index, { vulnerabilite: e.target.value })}
                            rows={2}
                            className="w-full resize-none rounded border border-amber-300 bg-white p-1.5 text-[10px] leading-snug text-amber-950 outline-none focus:border-amber-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {submitError && (
            <p className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-edito-border pt-3">
            <button
              type="button"
              onClick={() => changeStep("upload")}
              className="text-xs font-bold text-edito-muted hover:text-edito-navy"
            >
              ← Retour à la préparation
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={decisionsToSubmit.length === 0 || submitting}
              className="rounded border border-edito-brass bg-edito-brass px-5 py-2 text-xs font-black text-edito-navy transition-colors hover:bg-white disabled:opacity-50"
            >
              {submitting ? "Importation en cours…" : `Confirmer l'import (${decisionsToSubmit.length})`}
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : FINALISER */}
      {step === "confirm" && result && (
        <div className="space-y-4 rounded-lg border border-edito-border bg-white p-5 shadow-sm">
          <div className="border-b border-edito-border pb-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-edito-brass">
              Fiche de clôture d&apos;import
            </span>
            <h2 className="font-heading text-lg font-black text-edito-navy">
              Importation terminée avec succès
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="rounded border border-edito-border bg-edito-canvas p-3">
              <span className="block text-[9px] uppercase font-bold text-edito-muted">Secteur</span>
              <span className="font-bold text-edito-navy">{parsed?.secteur ?? selectedSegment?.name}</span>
            </div>
            <div className="rounded border border-edito-border bg-edito-canvas p-3">
              <span className="block text-[9px] uppercase font-bold text-edito-muted">Date étude</span>
              <span className="font-bold text-edito-navy">{studyDate}</span>
            </div>
            <div className="rounded border border-edito-border bg-edito-canvas p-3">
              <span className="block text-[9px] uppercase font-bold text-edito-muted">Rattachés</span>
              <span className="font-bold text-emerald-700">{result.attached.length} compte(s)</span>
            </div>
            <div className="rounded border border-edito-border bg-edito-canvas p-3">
              <span className="block text-[9px] uppercase font-bold text-edito-muted">Créés (mapped)</span>
              <span className="font-bold text-edito-brass">{result.created.length} compte(s)</span>
            </div>
          </div>

          {result.created.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Comptes créés</h3>
              <ul className="mt-1 space-y-1">
                {result.created.map((c) => (
                  <li key={c.companyId}>
                    <Link
                      href={`/prospection/accounts/${c.companyId}`}
                      className="text-xs font-semibold text-edito-navy hover:underline"
                    >
                      • {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.attached.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Comptes rattachés</h3>
              <ul className="mt-1 space-y-1">
                {result.attached.map((a) => (
                  <li key={a.companyId}>
                    <Link
                      href={`/prospection/accounts/${a.companyId}`}
                      className="text-xs font-semibold text-edito-navy hover:underline"
                    >
                      • Voir la fiche compte
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-600">Erreurs</h3>
              <ul className="mt-1 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11px] text-red-600">
                    {e.name ?? "?"} — {e.code}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.reportError ? (
            <p className="rounded border border-red-300 bg-red-50 p-2.5 text-[11px] text-red-700">
              ⚠️ L&apos;import CRM a réussi, mais le rapport d&apos;archivage n&apos;a pas pu être créé
              ({result.reportError}). Il n&apos;apparaîtra pas dans la bibliothèque « Rapports &amp; Rédaction ».
            </p>
          ) : result.reportDocumentId ? (
            <p className="rounded border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
              ✓ Rapport d&apos;import archivé —{" "}
              <Link href="/reports" className="font-semibold underline">
                le consulter dans Rapports &amp; Rédaction
              </Link>
              .
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-edito-navy bg-edito-navy px-4 py-2 text-xs font-bold text-white hover:bg-edito-heading"
              >
                Fermer et consulter les comptes
              </button>
            ) : (
              <Link
                href="/prospection/accounts"
                className="rounded border border-edito-navy bg-edito-navy px-4 py-2 text-xs font-bold text-white hover:bg-edito-heading"
              >
                Retour à la liste des comptes
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type CompetitiveMapImportHistoryListProps = {
  history: CompetitiveMapImportHistoryItem[]
  loading: boolean
  onSelect: (documentId: string) => void
}

function CompetitiveMapImportHistoryList({ history, loading, onSelect }: CompetitiveMapImportHistoryListProps) {
  if (loading) {
    return <p className="mt-3 text-[10px] leading-relaxed text-white/45">Chargement…</p>
  }

  if (history.length === 0) {
    return <p className="mt-3 text-[10px] leading-relaxed text-white/45">Aucun import archivé pour l’instant.</p>
  }

  return (
    <ul className="mt-2.5 space-y-1">
      {history.slice(0, 5).map((item) => (
        <li key={item.documentId}>
          <button
            type="button"
            onClick={() => onSelect(item.documentId)}
            className="flex min-h-8 w-full items-center justify-between rounded px-2 py-1 text-left transition-colors hover:bg-white/10"
          >
            <span className="shrink-0 font-mono text-[9px] text-white/50">{formatShortDateFR(item.createdAt)}</span>
            <span className="min-w-0 flex-1 truncate pl-2 text-[10px] text-white/80">{item.sectorName}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function CompetitiveMapImportHistoryDetail({
  documentId,
  onBack,
  embedded,
}: {
  documentId: string
  onBack: () => void
  embedded: boolean
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; content: unknown } | { status: "error" }
  >({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    void getCompetitiveMapImportDetail(documentId)
      .then((content) => {
        if (cancelled) return
        setState(content ? { status: "ready", content } : { status: "error" })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [documentId])

  return (
    <div className={cn("mx-auto flex w-full max-w-4xl flex-col gap-5", embedded ? "px-5 py-6 sm:px-8 sm:py-8" : "px-6 py-6")}>
      <button
        type="button"
        onClick={onBack}
        className="self-start text-[10px] font-bold uppercase tracking-wider text-edito-muted hover:text-edito-navy"
      >
        ← Retour
      </button>
      {state.status === "loading" ? (
        <p className="text-xs text-edito-muted">Chargement de l’import…</p>
      ) : state.status === "error" ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          Impossible de charger le détail de cet import.
        </p>
      ) : (
        <CompetitiveMapImportReportContent contentJson={state.content} variant="summary" />
      )}
    </div>
  )
}

type CompetitiveMapImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  segments: CompetitiveMapSegmentOption[]
  initialSegmentSlug?: string | null
  isMobile: boolean
}

type DialogView = { kind: "import" } | { kind: "history-detail"; documentId: string }

export function CompetitiveMapImportDialog({ open, onOpenChange, segments, initialSegmentSlug, isMobile }: CompetitiveMapImportDialogProps) {
  const [step, setStep] = useState<WizardStep>("upload")
  const activeStepIndex = WIZARD_STEPS.findIndex((item) => item.id === step)

  const [view, setView] = useState<DialogView>({ kind: "import" })
  const [history, setHistory] = useState<CompetitiveMapImportHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const refreshHistory = useCallback(() => {
    void getCompetitiveMapImportHistory()
      .then(setHistory)
      .finally(() => setHistoryLoading(false))
  }, [])

  useEffect(() => {
    if (!open) return
    refreshHistory()
  }, [open, refreshHistory])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setView({ kind: "import" })
      onOpenChange(next)
    },
    [onOpenChange],
  )

  {/* TIMELINE VERTICALE CENTRÉE HORIZONTALEMENT */}
  const progress = (
    <div className="flex flex-col items-center text-center">
      <p className="mb-6 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-edito-brass">
        Espace Import
      </p>
      <ol className={cn("relative flex w-full flex-col items-center gap-6")} aria-label="Étapes de l’import">
        {WIZARD_STEPS.map((item, index) => {
          const active = item.id === step
          const complete = index < activeStepIndex
          return (
            <li key={item.id} className="relative flex w-full flex-col items-center">
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-1/2 top-7 h-6 w-px -translate-x-1/2 transition-colors",
                    complete ? "bg-edito-brass/70" : "bg-white/15",
                  )}
                  aria-hidden="true"
                />
              )}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "relative z-10 flex size-7 items-center justify-center rounded-full text-[10px] font-black transition-all duration-200",
                    active &&
                      "border-2 border-edito-brass bg-edito-brass text-edito-navy shadow-[0_0_12px_rgba(216,155,22,0.35)]",
                    complete && "border border-edito-brass/60 bg-edito-brass/20 text-edito-brass",
                    !active && !complete && "border border-white/20 bg-white/5 text-white/40",
                  )}
                >
                  {complete ? "✓" : item.index}
                </span>
                <span
                  className={cn(
                    "mt-1.5 text-[11px] font-bold tracking-tight transition-colors",
                    active ? "text-white" : complete ? "text-white/80" : "text-white/45",
                  )}
                >
                  {item.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={<span className="text-sm font-black text-edito-navy">Importer une cartographie</span>}
      className={cn(
        "border border-edito-border bg-edito-canvas transition-all duration-300",
        isMobile
          ? "!inset-0 !m-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !rounded-none !border-0"
          : "w-full rounded-xl sm:!h-[min(74vh,660px)] sm:!w-[88vw] sm:!max-w-[1020px]",
      )}
      fillHeight
      maxHeightClassName={isMobile ? "max-h-[100dvh]" : undefined}
      dataTheme="edito"
      headerClassName={cn(
        "-mx-4 -mt-4 shrink-0 border-b border-edito-border bg-white px-4 text-edito-navy sm:-mx-6 sm:-mt-6 sm:px-6",
        isMobile
          ? "rounded-none border-b-edito-brass/70 bg-edito-navy pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
          : "rounded-t-xl py-2.5",
      )}
      closeButtonClassName={isMobile ? "-mr-2 size-11 rounded-full text-white/75 hover:bg-white/10 hover:text-white" : "size-10 rounded-md text-edito-muted hover:bg-edito-chip hover:text-edito-navy"}
      bodyClassName="-mx-4 -mb-4 -mt-4 min-h-0 flex-1 overflow-hidden bg-edito-canvas sm:-mx-6 sm:-mb-6 sm:-mt-4"
    >
      <div className={cn("h-full min-h-0", isMobile ? "flex flex-col" : "grid grid-cols-[195px_minmax(0,1fr)]")}>
        <aside className={cn("shrink-0 bg-edito-navy text-white", isMobile ? "px-4 py-2.5" : "flex min-h-0 flex-col overflow-y-auto px-5 py-6")}>
          {progress}
          {!isMobile ? (
            <>
              <div className="my-5 border-t border-white/10" />
              <div className="flex items-center justify-between px-1">
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/50">Historique</p>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-edito-brass">
                  {history.length}
                </span>
              </div>
              <CompetitiveMapImportHistoryList
                history={history}
                loading={historyLoading}
                onSelect={(documentId) => setView({ kind: "history-detail", documentId })}
              />
            </>
          ) : (
            <details className="mt-2.5">
              <summary className="cursor-pointer text-[9px] font-black uppercase tracking-[0.1em] text-white/55">
                Historique ({history.length})
              </summary>
              <CompetitiveMapImportHistoryList
                history={history}
                loading={historyLoading}
                onSelect={(documentId) => setView({ kind: "history-detail", documentId })}
              />
            </details>
          )}
        </aside>
        <main className="min-h-0 min-w-0 overflow-y-auto bg-edito-canvas">
          {view.kind === "history-detail" ? (
            <CompetitiveMapImportHistoryDetail
              documentId={view.documentId}
              onBack={() => setView({ kind: "import" })}
              embedded
            />
          ) : (
            <CompetitiveMapImportWizard
              segments={segments}
              initialSegmentSlug={initialSegmentSlug}
              embedded
              onStepChange={setStep}
              onClose={() => handleOpenChange(false)}
              onImported={refreshHistory}
            />
          )}
        </main>
      </div>
    </AppDialog>
  )
}
