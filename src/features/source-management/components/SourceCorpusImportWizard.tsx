"use client"

// Lot 4 — wizard mono-session d'import de corpus : Préparer -> Arbitrer ->
// Finaliser, calqué sur `CompetitiveMapImportWizard.tsx` (ADR-0019 Lot 5).
//
// Lot 1 ADR-0022 — DEUX formats d'entrée, un seul wizard :
//   · livrable Master Study E3 (`parseSourceRegistryOutput`), rattaché à un segment
//   · liste thématique (`parseThematicSourceList`), sans segment
// Les deux se projettent sur `CorpusImportItemView` / `CorpusImportHeaderView` pour
// l'affichage, et convergent plus bas sur le même résolveur et la même RPC. La
// présentation ne connaît plus aucun des deux contrats.
//
// État interne du shell Source Management (`view.kind === "import"` dans
// `SourceManagementDialogDesktop`/`SourceManagementDrawerMobile`) — jamais de
// modale imbriquée. Domaine, parseur, résolution et view models sont partagés
// entre Desktop et Mobile ; seule la présentation (`variant`) diverge.
//
// Aucune écriture avant l'étape 3 : les étapes 1-2 ne font que du parsing
// local (pur) et une résolution en LECTURE SEULE (`resolveSourceCorpusImport`).

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  buildIngestSourceCorpusPayload,
  parseSourceRegistryOutput,
  type ParsedSourceRegistry,
  type SourceCorpusItemArbitration,
  type SourceCorpusItemPreview,
} from "../domain/source-registry-output"
import {
  buildIngestThematicCorpusPayload,
  isThematicSourceListDocument,
  parseThematicSourceList,
  type ParsedThematicSourceList,
  type ThematicSourceArbitration,
  type ThematicSourceItemPreview,
} from "../domain/thematic-source-list"
import {
  buildE3HeaderView,
  buildE3ItemView,
  buildThematicHeaderView,
  buildThematicItemView,
  type CorpusImportHeaderView,
  type CorpusImportItemView,
} from "../domain/corpus-import-view"
import {
  resolveSourceCorpusImport,
  resolveThematicSourceListImport,
  type SegmentResolution,
} from "../data/resolve-source-corpus-import"
import { ingestSourceCorpusAction, type IngestSourceCorpusResult } from "../actions/ingest-source-corpus"

type WizardStep = "prepare" | "arbitrate" | "finalize"

type ItemDecision = { isEnabled: boolean; exclusionReason: string | null }

const WIZARD_STEPS: { id: WizardStep; index: string; label: string; detail: string }[] = [
  { id: "prepare", index: "01", label: "Préparer", detail: "Fichier, segment et synthèse E3" },
  { id: "arbitrate", index: "02", label: "Arbitrer", detail: "Réutilisation, activation, collecte" },
  { id: "finalize", index: "03", label: "Finaliser", detail: "Bilan avant écriture" },
]

async function computeSha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function DarkSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/60 cursor-pointer",
        checked ? "border-brand-brass bg-brand-brass" : "border-white/20 bg-white/10",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "block size-3.5 rounded-full shadow-sm transition-transform duration-200 motion-reduce:transition-none",
          checked ? "translate-x-[17px] bg-[#0f122c]" : "translate-x-0.5 bg-white",
        )}
      />
    </button>
  )
}

export interface SourceCorpusImportWizardProps {
  variant: "desktop" | "mobile"
  onClose: () => void
}

export function SourceCorpusImportWizard({ variant, onClose }: SourceCorpusImportWizardProps) {
  const isMobile = variant === "mobile"
  const router = useRouter()

  const [step, setStep] = useState<WizardStep>("prepare")
  const [rawText, setRawText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)

  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsed, setParsed] = useState<ParsedSourceRegistry | null>(null)
  const [parsedThematic, setParsedThematic] = useState<ParsedThematicSourceList | null>(null)

  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [segment, setSegment] = useState<SegmentResolution | null>(null)
  const [items, setItems] = useState<SourceCorpusItemPreview[]>([])
  const [thematicItems, setThematicItems] = useState<ThematicSourceItemPreview[]>([])
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>({})

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<IngestSourceCorpusResult | null>(null)

  async function handleFile(file: File) {
    const text = await file.text()
    setRawText(text)
    setFileName(file.name)
  }

  async function handleAnalyze() {
    setParseErrors([])
    setParsed(null)
    setParsedThematic(null)
    setResolveError(null)
    setSegment(null)
    setItems([])
    setThematicItems([])
    setDecisions({})

    // Aiguillage sur la seule clé `format` : un livrable E3 n'en porte pas.
    if (isThematicSourceListDocument(rawText)) {
      const thematicResult = parseThematicSourceList(rawText)
      if (!thematicResult.ok) {
        setParseErrors(thematicResult.errors.map((e) => `${e.path || "racine"} — ${e.message}`))
        return
      }
      setParsedThematic(thematicResult.data)

      setResolving(true)
      try {
        const res = await resolveThematicSourceListImport(thematicResult.data)
        if (res.error) {
          setResolveError(res.error)
          return
        }
        setThematicItems(res.items)
        setDecisions(
          Object.fromEntries(
            res.items.map((item) => [item.srcId, { isEnabled: item.isEnabledDefault, exclusionReason: null }]),
          ),
        )
      } catch (err) {
        setResolveError(err instanceof Error ? err.message : "Erreur de résolution du corpus thématique.")
      } finally {
        setResolving(false)
      }
      return
    }

    const parseResult = parseSourceRegistryOutput(rawText)
    if (!parseResult.ok) {
      setParseErrors(parseResult.errors.map((e) => `${e.path || "racine"} — ${e.message}`))
      return
    }

    setParsed(parseResult.data)

    setResolving(true)
    try {
      const res = await resolveSourceCorpusImport(parseResult.data)
      setSegment(res.segment)
      setItems(res.items)

      const initialDecisions: Record<string, ItemDecision> = {}
      for (const item of res.items) {
        initialDecisions[item.srcId] = {
          isEnabled: item.isEnabledDefault,
          exclusionReason: null,
        }
      }
      setDecisions(initialDecisions)
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : "Erreur de résolution du corpus.")
    } finally {
      setResolving(false)
    }
  }

  const itemViews: CorpusImportItemView[] = useMemo(
    () => (parsedThematic ? thematicItems.map(buildThematicItemView) : items.map(buildE3ItemView)),
    [parsedThematic, thematicItems, items],
  )

  const header: CorpusImportHeaderView | null = useMemo(
    () => (parsedThematic ? buildThematicHeaderView(parsedThematic) : parsed ? buildE3HeaderView(parsed) : null),
    [parsedThematic, parsed],
  )

  function toggleItem(srcId: string, enabled: boolean) {
    const view = itemViews.find((candidate) => candidate.srcId === srcId)
    if (view && !view.isCollectable) return
    setDecisions((prev) => ({
      ...prev,
      [srcId]: {
        isEnabled: enabled,
        exclusionReason: enabled ? null : "Exclus manuellement par l'utilisateur",
      },
    }))
  }

  const summary = useMemo(() => {
    let total = 0
    let reused = 0
    let fresh = 0
    let active = 0
    let excluded = 0

    for (const view of itemViews) {
      total += 1
      if (view.isNewSource) fresh += 1
      else reused += 1

      const decision = decisions[view.srcId]
      const isEnabled = decision ? decision.isEnabled : view.isEnabledDefault

      if (isEnabled && view.isCollectable) active += 1
      else excluded += 1
    }

    return { total, reused, fresh, active, excluded }
  }, [itemViews, decisions])

  async function handleConfirm() {
    if (!parsed && !parsedThematic) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const docHash = await computeSha256Hex(rawText)
      let res: IngestSourceCorpusResult

      if (parsedThematic) {
        const arbitrations: ThematicSourceArbitration[] = thematicItems.map((item) => {
          const decision = decisions[item.srcId]
          return {
            preview: item,
            isEnabled: item.newsEligible ? (decision ? decision.isEnabled : item.isEnabledDefault) : false,
            exclusionReason: decision?.exclusionReason ?? null,
          }
        })
        const payload = buildIngestThematicCorpusPayload(parsedThematic, arbitrations, {
          sourceDocumentPath: fileName,
          sourceDocumentHash: docHash,
          sourceFileName: fileName,
        })
        const reason = `Import corpus thématique — ${parsedThematic.name} (v${parsedThematic.version}, ${parsedThematic.snapshotDate})`
        // Aucun segment : la RPC refuse explicitement un corpus thématique qui en viserait un.
        res = await ingestSourceCorpusAction(payload, null, reason, "thematic")
      } else {
        const arbitrations: SourceCorpusItemArbitration[] = items.map((item) => {
          const decision = decisions[item.srcId]
          return {
            preview: item,
            isEnabled: item.isCollectable ? (decision ? decision.isEnabled : item.isEnabledDefault) : false,
            exclusionReason: decision?.exclusionReason ?? null,
          }
        })
        const payload = buildIngestSourceCorpusPayload(parsed!, arbitrations, {
          sourceDocumentPath: fileName,
          sourceDocumentHash: docHash,
          sourceFileName: fileName,
        })
        const reason = `Import corpus E3 — ${parsed!.meta.secteur ?? parsed!.meta.segmentSlug} (v${parsed!.meta.version}, ${parsed!.meta.dateSnapshot})`
        res = await ingestSourceCorpusAction(payload, parsed!.meta.segmentSlug, reason, "sector")
      }

      if (res.error) {
        setSubmitError(res.error)
      } else {
        setResult(res)
        router.refresh()
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'import du corpus.")
    } finally {
      setSubmitting(false)
    }
  }

  const canContinueFromPrepare =
    (parsedThematic ? thematicItems.length > 0 : Boolean(parsed) && segment?.ok === true) && !resolving
  const canConfirm = itemViews.length > 0 && !submitting

  return (
    <div className="space-y-4">
      {/* ── STEP HEADER BAR ───────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-white">
        <ol className={cn("flex items-center justify-between text-[11px]", isMobile ? "grid grid-cols-3 gap-1.5" : "px-2 flex gap-4")} aria-label="Étapes de l'import">
          {WIZARD_STEPS.map((item, index) => {
            const active = item.id === step
            const complete = WIZARD_STEPS.findIndex((s) => s.id === step) > index
            return (
              <li key={item.id} className={cn("flex items-center gap-2", !isMobile && index > 0 && "before:mr-2 before:content-['→'] before:text-white/30")}>
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black transition-all",
                  active && "bg-brand-brass text-slate-950 shadow-xs",
                  complete && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
                  !active && !complete && "bg-white/10 text-white/50 border border-white/10",
                )}>
                  {complete ? "✓" : item.index}
                </span>
                <div className="min-w-0">
                  <p className={cn("font-bold leading-none", active ? "text-white" : complete ? "text-white/80" : "text-white/40", isMobile && "truncate text-[10px]")}>
                    {item.label}
                  </p>
                  {!isMobile && (
                    <p className="mt-0.5 text-[9px] font-medium text-white/50 truncate max-w-[140px]">{item.detail}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* ── STEP 1: PRÉPARER ──────────────────────────────────────── */}
      {step === "prepare" && (
        <div className="space-y-3.5">
          <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-2")}>
            <label className="group relative flex flex-col items-center justify-center cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3.5 text-center transition-all hover:border-brand-brass hover:bg-white/[0.04]">
              <span className="flex size-7 items-center justify-center rounded-md bg-white/10 text-xs font-black text-white group-hover:bg-brand-brass group-hover:text-slate-950 transition-colors" aria-hidden="true">
                ↑
              </span>
              <span className="mt-1.5 block text-xs font-bold text-white">Déposer le JSON du registre E3</span>
              <span className="mt-0.5 block text-[10px] font-medium text-white/50">{fileName ?? "ou parcourir les fichiers"}</span>
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

            <div className="flex flex-col">
              <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/70" htmlFor="source-corpus-json">
                Ou coller le contenu JSON
              </label>
              <textarea
                id="source-corpus-json"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value)
                  setFileName(null)
                }}
                rows={3}
                placeholder='{"meta": {...}, "sources": [...]}'
                className="w-full flex-1 resize-y rounded-xl border border-white/10 bg-white/[0.04] p-2.5 font-mono text-[10px] leading-relaxed text-white outline-none focus:border-brand-brass/60 focus:ring-1 focus:ring-brand-brass/30"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-sm bg-brand-brass animate-pulse" aria-hidden="true" />
              <p className="text-xs font-bold text-white">Analyse spectrale du registre MASTER-STUDY / E3</p>
            </div>
            <Button variant="brass" size="sm" onClick={handleAnalyze} disabled={!rawText.trim() || resolving}>
              {resolving ? "Analyse en cours…" : "Analyser le fichier"}
            </Button>
          </div>

          {parseErrors.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              {parseErrors.map((message, index) => (
                <li key={index} className="text-[10px] font-medium leading-relaxed text-rose-300">{message}</li>
              ))}
            </ul>
          )}

          {resolveError && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[10px] font-medium text-rose-300">{resolveError}</p>
          )}

          {header && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/70">{header.analysisTitle}</h4>
                <Badge variant="neutral" size="sm" className="!rounded-md">{header.verdictLabel}</Badge>
              </div>

              <div className={cn("grid gap-2 text-[10px]", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{header.targetLabel}</p>
                  <p className="mt-0.5 font-bold text-white">{header.targetValue}</p>
                  <p className="text-[9px] text-white/50 truncate">{header.corpusSlug}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Snapshot / Version</p>
                  <p className="mt-0.5 font-bold text-white">v{header.version}</p>
                  <p className="text-[9px] text-white/50">{header.snapshotDate}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Volumétrie Sources</p>
                  <p className="mt-0.5 font-bold text-white">{header.sourcesCount} sources</p>
                  <p className="text-[9px] text-white/50">{header.collectableCount} collectables · {header.excludedCount} hors veille</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px] text-white/50">
                <span>{header.detailLine}</span>
                {header.scopeKind === "sector" && segment ? (
                  segment.ok ? (
                    <span className="font-bold text-emerald-400">
                      ✓ Résolu : {segment.macroName ? `${segment.macroName} › ` : ""}{segment.sectorName}
                    </span>
                  ) : (
                    <span className="font-bold text-rose-400">{segment.error}</span>
                  )
                ) : header.scopeKind === "thematic" ? (
                  <span className="font-bold text-emerald-400">Corpus thématique — aucun segment visé</span>
                ) : null}
              </div>

              <div className="flex justify-end border-t border-white/5 pt-2">
                <Button variant="brass" size="sm" onClick={() => setStep("arbitrate")} disabled={!canContinueFromPrepare}>
                  Continuer vers l&apos;arbitrage →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: ARBITRER ──────────────────────────────────────── */}
      {step === "arbitrate" && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[11px] font-medium text-white">
            <span>
              <strong>{itemViews.length} source(s) résolue(s)</strong> — {summary.reused} réutilisée(s), {summary.fresh} nouvelle(s), {summary.excluded} hors veille
            </span>
            <Badge variant="neutral" size="sm" className="!rounded-md">{summary.active} actives retenues</Badge>
          </div>

          <div className={cn(isMobile ? "space-y-2" : "overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]")}>
            {isMobile ? (
              itemViews.map((item) => <ArbitrationCard key={item.srcId} item={item} decision={decisions[item.srcId]} onToggle={toggleItem} />)
            ) : (
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-wider text-white/70 border-b border-white/5">
                  <tr>
                    <th className="px-3.5 py-2.5">Source</th>
                    <th className="px-3.5 py-2.5">Qualification</th>
                    <th className="px-3.5 py-2.5">Collecte</th>
                    <th className="px-3.5 py-2.5 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemViews.map((item) => (
                    <ArbitrationRow key={item.srcId} item={item} decision={decisions[item.srcId]} onToggle={toggleItem} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
            <button type="button" onClick={() => setStep("prepare")} className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white cursor-pointer">
              ← Retour
            </button>
            <Button variant="brass" size="sm" onClick={() => setStep("finalize")}>
              Continuer vers la finalisation →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: FINALISER ─────────────────────────────────────── */}
      {step === "finalize" && header && !result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Bilan de l&apos;importation de corpus</h4>
              <Badge variant="neutral" size="sm" className="!rounded-md">Création en Brouillon</Badge>
            </div>

            <div className={cn("grid gap-2.5 text-[11px]", isMobile ? "grid-cols-1" : "grid-cols-2")}>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Identifiants</p>
                <p className="text-white">Corpus : <strong>{header.corpusSlug}</strong></p>
                <p className="text-white">
                  {header.targetLabel} : <strong>{segment?.ok ? segment.sectorName : header.targetValue}</strong>
                </p>
                <p className="text-white">Version : <strong>{header.version}</strong></p>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Volumétrie & Arbitrage</p>
                <p className="text-white">Total sources : <strong>{summary.total}</strong></p>
                <p className="text-white">Réutilisées : <strong>{summary.reused}</strong> · Nouvelles : <strong>{summary.fresh}</strong></p>
                <p className="text-emerald-400 font-bold">Actives retenues : <strong>{summary.active}</strong></p>
              </div>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.04] p-3 text-[11px] text-white/80 flex flex-wrap justify-between gap-2">
              <span>Collectables : <strong>{header.collectableCount}</strong></span>
              <span>Hors veille : <strong>{summary.excluded}</strong></span>
              <span>
                {header.scopeKind === "thematic"
                  ? "Corpus thématique : jamais ouvert à la veille compte"
                  : `Statiques du livrable : ${header.excludedCount}`}
              </span>
            </div>

            <p className="text-[10px] text-white/50 italic">
              Le corpus sera créé en <StatusPill variant="neutral" label="Brouillon" className="!rounded-md" /> — aucune collecte ne démarre avant activation explicite.
            </p>
          </div>

          {submitError && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] font-medium text-rose-300">{submitError}</p>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
            <button type="button" onClick={() => setStep("arbitrate")} className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white cursor-pointer">
              ← Retour
            </button>
            <Button variant="brass" size="sm" onClick={handleConfirm} loading={submitting} loadingLabel="Import en cours" disabled={!canConfirm}>
              Confirmer l&apos;importation
            </Button>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3 text-center">
          <StatusPill variant="success" label={`Corpus importé — ${result.sourcesUpserted} source(s), ${result.itemsUpserted} appartenance(s)`} className="!rounded-md" />
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ArbitrationRow({ item, decision, onToggle }: { item: CorpusImportItemView; decision: ItemDecision | undefined; onToggle: (srcId: string, enabled: boolean) => void }) {
  const enabled = decision?.isEnabled ?? item.isEnabledDefault
  return (
    <tr className="hover:bg-white/[0.04] transition-colors align-middle">
      <td className="px-3.5 py-2">
        <p className="font-bold text-white text-xs">{item.title}</p>
        <p className="text-[10px] text-white/50">{item.subtitle}</p>
      </td>
      <td className="px-3.5 py-2">
        <div className="flex gap-1">
          {item.badges.map((badge) => (
            <Badge key={badge} variant="neutral" size="sm" className="!rounded-md">{badge}</Badge>
          ))}
        </div>
      </td>
      <td className="px-3.5 py-2 text-white/80 text-[11px]">{item.meta}</td>
      <td className="px-3.5 py-2 text-right">
        {item.isCollectable ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-[10px] font-bold text-white">{enabled ? "Actif" : "Exclu"}</span>
            <DarkSwitch label={item.title} checked={enabled} onChange={(checked) => onToggle(item.srcId, checked)} />
          </div>
        ) : (
          <StatusPill variant="neutral" label="Hors veille" className="!rounded-md" />
        )}
      </td>
    </tr>
  )
}

function ArbitrationCard({ item, decision, onToggle }: { item: CorpusImportItemView; decision: ItemDecision | undefined; onToggle: (srcId: string, enabled: boolean) => void }) {
  const enabled = decision?.isEnabled ?? item.isEnabledDefault
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{item.title}</p>
          <p className="text-[10px] text-white/50">{item.subtitle}</p>
        </div>
        {item.isCollectable ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] font-bold text-white">{enabled ? "Actif" : "Exclu"}</span>
            <DarkSwitch label={item.title} checked={enabled} onChange={(checked) => onToggle(item.srcId, checked)} />
          </div>
        ) : (
          <StatusPill variant="neutral" label="Hors veille" className="!rounded-md" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/50">
        {item.badges.map((badge) => (
          <Badge key={badge} variant="neutral" size="sm" className="!rounded-md">{badge}</Badge>
        ))}
        <span className="truncate">{item.meta}</span>
      </div>
    </div>
  )
}
