"use client"

// ADR-0019 Lot 5 — wizard mono-session d'ingestion d'une cartographie
// concurrentielle : Upload/Coller -> Résolution & Arbitrage -> Confirmation.
//
// Responsive CSS (ADR-0006, écran de saisie/revue) — pas d'adaptive plein.
// Aucune écriture avant l'étape 3 : les étapes 1-2 ne font que du parsing
// local et une résolution en LECTURE SEULE (resolveCompetitiveMapEntries).

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
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

const WIZARD_STEPS: { id: WizardStep; index: string; label: string; detail: string }[] = [
  { id: "upload", index: "01", label: "Préparer", detail: "Fichier, segment et date" },
  { id: "arbitrate", index: "02", label: "Arbitrer", detail: "Résolution des comptes" },
  { id: "confirm", index: "03", label: "Finaliser", detail: "Bilan de l’import" },
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
  /** Appelé une fois l'import CRM confirmé avec succès (indépendamment du succès de l'archivage) — sert à rafraîchir la section « Historique » du dialogue. */
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
          // ADR-0019 D-4 : le score reste provisoire tant que l'accessibilité
          // n'a pas été auditée compte par compte. Une accessibilité livrée
          // par l'étude n'est pas un audit — le drapeau ne tombe pas ici.
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
    <div className={cn("mx-auto flex w-full max-w-4xl flex-col gap-5", embedded ? "px-5 py-6 sm:px-8 sm:py-8" : "px-6 py-6")}>
      {embedded && (
        <header className="border-b border-edito-border pb-5">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-edito-brass">Étape {WIZARD_STEPS.findIndex((item) => item.id === step) + 1} sur 3</p>
          <h2 className="mt-1 font-heading text-xl font-black tracking-tight text-edito-navy">
            {step === "upload" ? "Préparer le fichier" : step === "arbitrate" ? "Résoudre les comptes" : "Import terminé"}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-edito-muted">
            {step === "upload"
              ? "Chargez l’export JSON, puis vérifiez son segment de rattachement et sa date de référence."
              : step === "arbitrate"
                ? "Validez les rapprochements proposés, créez les citations absentes ou excluez une ligne."
                : "La cartographie est désormais reliée aux comptes concernés dans le CRM."}
          </p>
        </header>
      )}

      {!embedded && <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
          Importer une cartographie concurrentielle
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          ADR-0019 Lot 5 — chaque compte cité est résolu contre le CRM (rattachement) ou créé en profondeur{" "}
          <code className="rounded bg-canvas px-1 py-0.5 text-[10px]">mapped</code> (citation, sans donnée
          canonique). Les chiffres restent des faits sourcés, jamais écrits dans les colonnes du compte.
        </p>
      </div>}

      {!embedded && <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className={cn(step === "upload" && "text-heading")}>1. Upload</span>
        <span>→</span>
        <span className={cn(step === "arbitrate" && "text-heading")}>2. Résolution &amp; arbitrage</span>
        <span>→</span>
        <span className={cn(step === "confirm" && "text-heading")}>3. Confirmation</span>
      </div>}

      {step === "upload" && (
        <SurfaceCard padding="default" className="space-y-5 border-edito-border bg-white shadow-none">
          <label className="group block cursor-pointer rounded-xl border border-dashed border-edito-border bg-edito-canvas px-6 py-7 text-center transition-colors hover:border-edito-brass hover:bg-edito-chip/35">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-edito-navy/10 text-lg font-bold text-edito-navy transition-transform group-hover:-translate-y-0.5" aria-hidden="true">↑</span>
            <span className="mt-3 block text-sm font-black text-edito-navy">Déposer un export JSON</span>
            <span className="mt-1 block text-[10px] text-edito-muted">ou parcourir les fichiers de cet appareil</span>
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

          <div>
            <div className="flex items-center gap-3"><span className="h-px flex-1 bg-edito-border" /><label className="text-[9px] font-black uppercase tracking-wider text-edito-muted" htmlFor="competitive-map-json">ou coller le contenu</label><span className="h-px flex-1 bg-edito-border" /></div>
            <textarea
              id="competitive-map-json"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder='{"meta": {...}, "comptes": [...]}'
              className="mt-4 w-full resize-y rounded-lg border border-edito-border bg-white p-3 font-mono text-[11px] leading-relaxed text-edito-body outline-none transition-shadow focus:border-edito-navy focus:ring-2 focus:ring-edito-navy/10"
            />
          </div>

          {parseErrors.length > 0 && (
            <ul className="space-y-1 rounded border border-danger/30 bg-danger/5 px-3 py-2">
              {parseErrors.map((message, index) => (
                <li key={index} className="text-[11px] leading-relaxed text-danger">
                  {message}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="min-h-10 rounded-md border border-edito-brass bg-edito-navy px-5 text-xs font-bold text-white transition-colors hover:bg-edito-heading disabled:cursor-not-allowed disabled:border-edito-border disabled:bg-edito-border disabled:text-edito-muted"
          >
            Analyser le fichier
          </button>

          {parsed && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-body">
                <span>
                  Secteur : <strong className="text-heading">{parsed.secteur}</strong>
                </span>
                <span>
                  {parsed.comptes.length} compte(s) cité(s)
                </span>
                {parsed.compteEtalon && <span>Compte étalon : {parsed.compteEtalon}</span>}
              </div>

              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-muted">
                  {w}
                </p>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-heading">
                    Segment cible <span className="text-danger">*</span>
                  </label>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                    Libellé brut de l&apos;étude : « {parsed.segmentLabel} ». Un segment ne se crée jamais à la
                    volée (§9 REFERENTIEL) — choisir le plus proche dans le référentiel existant.
                  </p>
                  <select
                    value={segmentSlug}
                    onChange={(e) => setSegmentSlug(e.target.value)}
                    className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
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
                  <label className="text-xs font-bold text-heading">
                    Date de la cartographie <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={studyDate}
                    onChange={(e) => setStudyDate(e.target.value)}
                    className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
                  />
                </div>
              </div>

              {resolveError && (
                <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">
                  {resolveError}
                </p>
              )}

              <button
                type="button"
                onClick={handleStartResolution}
                disabled={!segmentSlug || !studyDate || resolving}
                className="min-h-9 rounded border border-primary bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resolving ? "Résolution en cours…" : "Continuer vers la résolution"}
              </button>
            </div>
          )}
        </SurfaceCard>
      )}

      {step === "arbitrate" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-body">
            <span>
              {entries.length} compte(s) — {entries.filter((e) => e.status === "resolved").length} résolu(s),{" "}
              {entries.filter((e) => e.status === "ambiguous").length} ambigu(s),{" "}
              {entries.filter((e) => e.status === "not_found").length} introuvable(s)
              {skippedCount > 0 ? `, ${skippedCount} exclu(s)` : ""}
            </span>
            {selectedSegment && <StatusPill variant="info" label={selectedSegment.name} />}
          </div>

          <div className="space-y-3">
            {entries.map((entry) => {
              const state = arbitration[entry.index]
              if (!state) return null
              return (
                <SurfaceCard key={entry.index} padding="default" className={cn(state.skip && "opacity-50")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-heading">{entry.input.nom}</span>
                        {entry.input.estCompteEtalon && <StatusPill variant="info" label="Compte étalon" />}
                        <StatusPill
                          variant={
                            entry.status === "resolved"
                              ? "success"
                              : entry.status === "ambiguous"
                                ? "warning"
                                : "neutral"
                          }
                          label={
                            entry.status === "resolved"
                              ? "Résolu"
                              : entry.status === "ambiguous"
                                ? "Ambigu"
                                : "Introuvable"
                          }
                        />
                        <span className="text-[10px] text-muted">
                          {COMPETITIVE_MAP_CATEGORY_LABELS[entry.input.categorie]}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
                        <span>CA {moneyLabel(entry.input.caMeur)}</span>
                        {entry.input.effectifFrance !== null && (
                          <span>{entry.input.effectifFrance.toLocaleString("fr-FR")} pers. France</span>
                        )}
                        {entry.input.appetenceScore !== null && (
                          <span>Appétence {entry.input.appetenceScore}/35</span>
                        )}
                        {/* Absente = « Non positionné » sur la matrice, jamais une valeur substituée (§7.2). */}
                        <span>
                          Accessibilité{" "}
                          {entry.input.accessibiliteScore !== null
                            ? `${entry.input.accessibiliteScore}/5`
                            : "non renseignée"}
                        </span>
                        <span>Confiance {entry.input.confiance}</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                      <input
                        type="checkbox"
                        checked={state.skip}
                        onChange={(e) => updateArbitration(entry.index, { skip: e.target.checked })}
                        className="size-3.5 accent-primary"
                      />
                      Exclure de l&apos;import
                    </label>
                  </div>

                  {!state.skip && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          Rattachement
                        </label>
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
                          className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
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

                      {state.mode === "create" && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Nom du compte à créer
                          </label>
                          <input
                            type="text"
                            value={state.name}
                            onChange={(e) => updateArbitration(entry.index, { name: e.target.value })}
                            className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
                          />
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Positionnement
                          </label>
                          <textarea
                            value={state.positioning}
                            onChange={(e) => updateArbitration(entry.index, { positioning: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Angle d&apos;entrée
                          </label>
                          <textarea
                            value={state.angleEntree}
                            onChange={(e) => updateArbitration(entry.index, { angleEntree: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Forces
                          </label>
                          <textarea
                            value={state.forces}
                            onChange={(e) => updateArbitration(entry.index, { forces: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Vulnérabilité
                          </label>
                          <textarea
                            value={state.vulnerabilite}
                            onChange={(e) => updateArbitration(entry.index, { vulnerabilite: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-xs text-body"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </SurfaceCard>
              )
            })}
          </div>

          {submitError && (
            <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">
              {submitError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => changeStep("upload")}
              className="text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={decisionsToSubmit.length === 0 || submitting}
              className="min-h-9 rounded border border-primary bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Import en cours…" : `Confirmer l'import (${decisionsToSubmit.length})`}
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && result && (
        <SurfaceCard padding="default" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill variant="success" label={`${result.created.length} créé(s)`} />
            <StatusPill variant="info" label={`${result.attached.length} rattaché(s)`} />
            {result.errors.length > 0 && (
              <StatusPill variant="danger" label={`${result.errors.length} en erreur`} />
            )}
          </div>

          {result.reportError && (
            <p className="rounded border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
              Import terminé, mais le rapport d&apos;archive n&apos;a pas pu être créé.
            </p>
          )}

          {result.created.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Comptes créés</h3>
              <ul className="mt-1 space-y-1">
                {result.created.map((c) => (
                  <li key={c.companyId}>
                    <Link
                      href={`/prospection/accounts/${c.companyId}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.attached.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">Comptes rattachés</h3>
              <ul className="mt-1 space-y-1">
                {result.attached.map((a) => (
                  <li key={a.companyId}>
                    <Link
                      href={`/prospection/accounts/${a.companyId}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Voir la fiche
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-danger">Erreurs</h3>
              <ul className="mt-1 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11px] text-danger">
                    {e.name ?? "?"} — {e.code}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-block min-h-9 rounded border border-border bg-canvas px-4 py-2 text-xs font-bold text-heading transition-colors hover:bg-border/10"
            >
              Fermer et revenir aux comptes
            </button>
          ) : (
            <Link
              href="/prospection/accounts"
              className="inline-block min-h-9 rounded border border-border bg-canvas px-4 py-2 text-xs font-bold text-heading transition-colors hover:bg-border/10"
            >
              Retour à la liste des comptes
            </Link>
          )}
        </SurfaceCard>
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
    <ul className="mt-3 space-y-1">
      {history.map((item) => (
        <li key={item.documentId}>
          <button
            type="button"
            onClick={() => onSelect(item.documentId)}
            className="flex min-h-9 w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-white/10"
          >
            <span className="shrink-0 font-mono text-[9px] text-white/50">{formatShortDateFR(item.createdAt)}</span>
            <span className="min-w-0 flex-1 truncate text-[10px] text-white/80">{item.sectorName}</span>
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
        className="self-start text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body"
      >
        ← Retour
      </button>
      {state.status === "loading" ? (
        <p className="text-xs text-muted">Chargement de l’import…</p>
      ) : state.status === "error" ? (
        <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">
          Impossible de charger le détail de cet import.
        </p>
      ) : (
        <CompetitiveMapImportReportContent contentJson={state.content} />
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
  // `true` dès le montage : le premier chargement affiche "Chargement…" sans
  // setState synchrone dans l'effet d'ouverture (react-hooks/set-state-in-effect).
  // Un refresh ultérieur (post-import) laisse la liste précédente visible
  // jusqu'à la résolution — même doctrine que DocumentMobileDetail.
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

  // Repart sur l'étape d'upload à la prochaine ouverture — réinitialisé à la
  // fermeture (geste utilisateur) plutôt que dans l'effet d'ouverture, pour
  // ne jamais faire de setState synchrone en tête d'effet.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setView({ kind: "import" })
      onOpenChange(next)
    },
    [onOpenChange],
  )

  const progress = (
    <ol className={cn(isMobile ? "grid grid-cols-3 gap-1" : "space-y-5")} aria-label="Étapes de l’import">
      {WIZARD_STEPS.map((item, index) => {
        const active = item.id === step
        const complete = index < activeStepIndex
        return (
          <li key={item.id} className="relative">
            {!isMobile && index < WIZARD_STEPS.length - 1 ? (
              <span className="absolute left-[13px] top-8 h-8 w-px bg-white/15" aria-hidden="true" />
            ) : null}
            <div className={cn("flex", isMobile ? "justify-center" : "items-start gap-3")}>
              <span className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-black transition-colors",
                active && "border-edito-brass bg-edito-brass text-edito-navy",
                complete && "border-white/35 bg-white/10 text-white",
                !active && !complete && "border-white/20 text-white/50",
              )}>
                {complete ? "✓" : item.index}
              </span>
              {!isMobile ? (
                <span className="min-w-0">
                  <span className={cn("block text-[11px] font-black", active || complete ? "text-white" : "text-white/55")}>{item.label}</span>
                  <span className="mt-0.5 block text-[9px] leading-snug text-white/45">{item.detail}</span>
                </span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={<span className="text-sm font-black">Importer une cartographie</span>}
      className={cn(
        "border border-edito-border bg-edito-canvas transition-all duration-300",
        isMobile
          ? "!inset-0 !m-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !rounded-none !border-0"
          : "w-full rounded-xl sm:!h-[min(86vh,800px)] sm:!w-[92vw] sm:!max-w-[1240px]",
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
      <div className={cn("h-full min-h-0", isMobile ? "flex flex-col" : "grid grid-cols-[220px_minmax(0,1fr)]")}>
        <aside className={cn("shrink-0 bg-edito-navy text-white", isMobile ? "px-4 py-2.5" : "flex min-h-0 flex-col overflow-y-auto px-6 py-7")}>
          {progress}
          {!isMobile ? (
            <>
              <div className="my-6 border-t border-white/10" />
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/55">Historique</p>
              <CompetitiveMapImportHistoryList
                history={history}
                loading={historyLoading}
                onSelect={(documentId) => setView({ kind: "history-detail", documentId })}
              />
              <div className="mt-auto border-t border-white/10 pt-5">
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/55">Format attendu</p>
                <p className="mt-2 text-[10px] leading-relaxed text-white/65">Export JSON produit par le processus de cartographie sectorielle KREDO.</p>
              </div>
            </>
          ) : (
            <details className="mt-2.5">
              <summary className="cursor-pointer text-[9px] font-black uppercase tracking-[0.1em] text-white/55">
                Historique
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
