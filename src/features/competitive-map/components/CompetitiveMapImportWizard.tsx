"use client"

// ADR-0019 Lot 5 — wizard mono-session d'ingestion d'une cartographie
// concurrentielle : Upload/Coller -> Résolution & Arbitrage -> Confirmation.
//
// Responsive CSS (ADR-0006, écran de saisie/revue) — pas d'adaptive plein.
// Aucune écriture avant l'étape 3 : les étapes 1-2 ne font que du parsing
// local et une résolution en LECTURE SEULE (resolveCompetitiveMapEntries).

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { StatusPill } from "@/components/ui/StatusPill"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
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
import type { CompetitiveMapSegmentOption } from "../data/load-segment-referential"

type WizardStep = "upload" | "arbitrate" | "confirm"

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

export function CompetitiveMapImportWizard({ segments }: { segments: CompetitiveMapSegmentOption[] }) {
  const [step, setStep] = useState<WizardStep>("upload")

  const [rawText, setRawText] = useState("")
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsed, setParsed] = useState<CompetitiveMapOutput | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [segmentSlug, setSegmentSlug] = useState("")
  const [studyDate, setStudyDate] = useState("")

  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [entries, setEntries] = useState<CompetitiveMapEntryPreview[]>([])
  const [arbitration, setArbitration] = useState<Record<number, ArbitrationState>>({})

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ConfirmCompetitiveMapIngestionResult | null>(null)

  const selectedSegment = segments.find((s) => s.slug === segmentSlug) ?? null

  async function handleFile(file: File) {
    const text = await file.text()
    setRawText(text)
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
    setSegmentSlug(suggestSegmentSlug(result.data.segmentLabel, segments))
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
    setStep("arbitrate")
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
          appetenceProvisoire: true,
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
      parsed ? `Import cartographie — ${parsed.secteur}` : undefined,
    )
    setSubmitting(false)

    if (outcome.error) {
      setSubmitError(outcome.error)
      return
    }

    setResult(outcome)
    setStep("confirm")
  }

  const skippedCount = entries.filter((e) => arbitration[e.index]?.skip).length

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
          Importer une cartographie concurrentielle
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          ADR-0019 Lot 5 — chaque compte cité est résolu contre le CRM (rattachement) ou créé en profondeur{" "}
          <code className="rounded bg-canvas px-1 py-0.5 text-[10px]">mapped</code> (citation, sans donnée
          canonique). Les chiffres restent des faits sourcés, jamais écrits dans les colonnes du compte.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className={cn(step === "upload" && "text-heading")}>1. Upload</span>
        <span>→</span>
        <span className={cn(step === "arbitrate" && "text-heading")}>2. Résolution &amp; arbitrage</span>
        <span>→</span>
        <span className={cn(step === "confirm" && "text-heading")}>3. Confirmation</span>
      </div>

      {step === "upload" && (
        <SurfaceCard padding="default" className="space-y-4">
          <div>
            <label className="text-xs font-bold text-heading">Fichier JSON</label>
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
              }}
              className="mt-1 block w-full text-xs text-body"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-heading">…ou coller le JSON</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder='{"meta": {...}, "comptes": [...]}'
              className="mt-1 w-full rounded border border-border bg-surface p-2 font-mono text-[11px] text-body"
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
            className="min-h-9 rounded border border-primary bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={() => setStep("upload")}
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

          <Link
            href="/prospection/accounts"
            className="inline-block min-h-9 rounded border border-border bg-canvas px-4 py-2 text-xs font-bold text-heading transition-colors hover:bg-border/10"
          >
            Retour à la liste des comptes
          </Link>
        </SurfaceCard>
      )}
    </div>
  )
}
