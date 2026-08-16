"use client"

// Lot 4 — wizard mono-session d'import d'un corpus E3 : Préparer -> Arbitrer ->
// Finaliser, calqué sur `CompetitiveMapImportWizard.tsx` (ADR-0019 Lot 5).
//
// État interne du shell Source Management (`view.kind === "import"` dans
// `SourceManagementDialogDesktop`/`SourceManagementDrawerMobile`) — jamais de
// modale imbriquée. Domaine, parseur, résolution et view models sont partagés
// entre Desktop et Mobile ; seule la présentation (`variant`) diverge, à
// l'intérieur d'un même composant qui branche avant de rendre — même patron
// que `SourceManagementLauncher`/`SourceBaseList`/`SourceCorpusCard` (Lot 3),
// déjà la convention établie de ce chantier pour cette divergence précise.
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
import { resolveSourceCorpusImport, type SegmentResolution } from "../data/resolve-source-corpus-import"
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

function collectionModeLabel(item: SourceCorpusItemPreview): string {
  return item.mappedCollectionUrl ? "Flux direct" : "Recherche site"
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
  const [documentHash, setDocumentHash] = useState<string | null>(null)

  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsed, setParsed] = useState<ParsedSourceRegistry | null>(null)

  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [segment, setSegment] = useState<SegmentResolution | null>(null)
  const [items, setItems] = useState<SourceCorpusItemPreview[]>([])
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
    setResolveError(null)
    setSegment(null)
    setItems([])
    setDecisions({})

    const parseResult = parseSourceRegistryOutput(rawText)
    if (!parseResult.ok) {
      setParseErrors(parseResult.errors.map((e) => `${e.path || "racine"} — ${e.message}`))
      return
    }

    setParsed(parseResult.data)
    setDocumentHash(await computeSha256Hex(rawText))

    setResolving(true)
    const resolution = await resolveSourceCorpusImport(parseResult.data)
    setResolving(false)

    if (resolution.error) {
      setResolveError(resolution.error)
      return
    }

    setSegment(resolution.segment)
    setItems(resolution.items)
    const initial: Record<string, ItemDecision> = {}
    for (const item of resolution.items) {
      initial[item.srcId] = { isEnabled: item.isEnabledDefault, exclusionReason: item.exclusionReasonDefault }
    }
    setDecisions(initial)
  }

  function toggleItem(srcId: string, enabled: boolean) {
    // §16 — jamais transformer une source static en source de veille récurrente depuis ce wizard.
    const item = items.find((i) => i.srcId === srcId)
    if (item && !item.isCollectable) return
    setDecisions((prev) => ({
      ...prev,
      [srcId]: { isEnabled: enabled, exclusionReason: enabled ? null : (prev[srcId]?.exclusionReason ?? "Exclu par l'utilisateur à l'arbitrage") },
    }))
  }

  const arbitrations = useMemo<SourceCorpusItemArbitration[]>(
    () =>
      items.map((preview) => {
        const decision = decisions[preview.srcId] ?? { isEnabled: preview.isEnabledDefault, exclusionReason: preview.exclusionReasonDefault }
        return { preview, isEnabled: preview.isCollectable ? decision.isEnabled : false, exclusionReason: decision.exclusionReason }
      }),
    [items, decisions],
  )

  const summary = useMemo(() => {
    const reused = items.filter((i) => !i.isNewSource).length
    const staticExcluded = items.filter((i) => !i.isCollectable).length
    return {
      total: items.length,
      reused,
      fresh: items.length - reused,
      active: arbitrations.filter((a) => a.isEnabled).length,
      staticExcluded,
      newsEligible: arbitrations.filter((a) => a.isEnabled && a.preview.newsEligible).length,
      accountWatchEligible: arbitrations.filter((a) => a.isEnabled && a.preview.accountWatchEligible).length,
    }
  }, [items, arbitrations])

  async function handleConfirm() {
    if (!parsed || !segment?.ok) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = buildIngestSourceCorpusPayload(parsed, arbitrations, {
      sourceDocumentPath: fileName,
      sourceDocumentHash: documentHash,
      sourceFileName: fileName,
    })
    const reason = `Import corpus E3 — ${parsed.meta.secteur ?? parsed.meta.segmentSlug} (v${parsed.meta.version}, ${parsed.meta.dateSnapshot})`

    const outcome = await ingestSourceCorpusAction(payload, parsed.meta.segmentSlug, reason)
    setSubmitting(false)

    if (outcome.error) {
      setSubmitError(outcome.error)
      return
    }

    setResult(outcome)
    router.refresh()
  }

  const canContinueFromPrepare = Boolean(parsed) && segment?.ok === true && !resolving
  const canConfirm = items.length > 0 && !submitting

  return (
    <div className="space-y-6">
      {/* ── STEP HEADER BAR ───────────────────────────────────────── */}
      <div className="rounded-xl border border-edito-border bg-edito-navy p-3 text-white shadow-xs">
        <ol className={cn("flex items-center justify-between text-[11px]", isMobile ? "grid grid-cols-3 gap-1.5" : "px-2 flex gap-4")} aria-label="Étapes de l'import">
          {WIZARD_STEPS.map((item, index) => {
            const active = item.id === step
            const complete = WIZARD_STEPS.findIndex((s) => s.id === step) > index
            return (
              <li key={item.id} className={cn("flex items-center gap-2", !isMobile && index > 0 && "before:mr-2 before:content-['→'] before:text-white/30")}>
                <span className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-all",
                  active && "bg-edito-brass text-edito-navy shadow-xs",
                  complete && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
                  !active && !complete && "bg-white/10 text-white/50 border border-white/10"
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
        <div className="space-y-5">
          <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
            <label className="group relative flex flex-col items-center justify-center cursor-pointer rounded-xl border border-dashed border-edito-border bg-white px-5 py-6 text-center shadow-xs transition-all hover:border-edito-brass hover:bg-edito-chip/50">
              <span className="flex size-10 items-center justify-center rounded-full bg-edito-chip text-base font-black text-edito-navy group-hover:bg-edito-brass group-hover:text-edito-navy transition-colors" aria-hidden="true">
                ↑
              </span>
              <span className="mt-2.5 block text-xs font-bold text-edito-navy">Déposer le JSON du registre E3</span>
              <span className="mt-1 block text-[10px] font-medium text-edito-muted">{fileName ?? "ou parcourir les fichiers de cet appareil"}</span>
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
              <label className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-edito-navy" htmlFor="source-corpus-json">
                Ou coller le contenu JSON
              </label>
              <textarea
                id="source-corpus-json"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value)
                  setFileName(null)
                }}
                rows={isMobile ? 5 : 7}
                placeholder='{"meta": {...}, "sources": [...]}'
                className="w-full flex-1 resize-y rounded-xl border border-edito-border bg-white p-3 font-mono text-[11px] leading-relaxed text-edito-navy outline-none shadow-xs focus:border-edito-brass focus:ring-2 focus:ring-edito-brass/20"
              />
            </div>
          </div>

          {/* Signature Action Bar */}
          <div className="rounded-xl border border-edito-border bg-edito-navy p-3.5 flex flex-wrap items-center justify-between gap-3 text-white shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-edito-brass animate-pulse" aria-hidden="true" />
              <p className="text-xs font-bold text-white">Analyse spectrale du registre MASTER-STUDY / E3</p>
            </div>
            <Button variant="brass" size="sm" onClick={handleAnalyze} disabled={!rawText.trim() || resolving}>
              {resolving ? "Analyse en cours…" : "Analyser le fichier"}
            </Button>
          </div>

          {parseErrors.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-rose-300 bg-rose-50 p-4">
              {parseErrors.map((message, index) => (
                <li key={index} className="text-[11px] font-medium leading-relaxed text-rose-800">{message}</li>
              ))}
            </ul>
          )}

          {resolveError && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-[11px] font-medium text-rose-800">{resolveError}</p>
          )}

          {parsed && (
            <div className="rounded-xl border border-edito-border bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-edito-chip pb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-edito-navy">Synthèse de l&apos;analyse E3</h4>
                <Badge variant="neutral" size="sm">Verdict : {parsed.meta.validationStatus}</Badge>
              </div>

              <div className={cn("grid gap-3 text-[11px]", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                <div className="rounded-lg border border-edito-border bg-edito-canvas p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Segment / Secteur</p>
                  <p className="mt-1 font-bold text-edito-navy">{parsed.meta.segmentSlug}</p>
                  <p className="text-[10px] text-edito-muted truncate">{parsed.meta.secteur ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-edito-border bg-edito-canvas p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Snapshot / Version</p>
                  <p className="mt-1 font-bold text-edito-navy">v{parsed.meta.version}</p>
                  <p className="text-[10px] text-edito-muted">{parsed.meta.dateSnapshot}</p>
                </div>
                <div className="rounded-lg border border-edito-border bg-edito-canvas p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Volumétrie Sources</p>
                  <p className="mt-1 font-bold text-edito-navy">{parsed.sources.length} sources</p>
                  <p className="text-[10px] text-edito-muted">{parsed.collectableCount} collectables · {parsed.staticCount} statiques</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-edito-chip pt-3 text-[11px] text-edito-muted">
                <span>Packs : minimal ({parsed.packMinimal.length}) · enrichi ({parsed.packEnrichi.length})</span>
                {segment ? (
                  segment.ok ? (
                    <span className="font-bold text-emerald-700">
                      ✓ Résolu : {segment.macroName ? `${segment.macroName} › ` : ""}{segment.sectorName}
                    </span>
                  ) : (
                    <span className="font-bold text-rose-700">{segment.error}</span>
                  )
                ) : null}
              </div>

              <div className="flex justify-end border-t border-edito-chip pt-3">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-edito-border bg-white px-4 py-2.5 text-[11px] font-medium text-edito-navy shadow-xs">
            <span>
              <strong>{items.length} source(s) résolue(s)</strong> — {summary.reused} réutilisée(s), {summary.fresh} nouvelle(s), {summary.staticExcluded} statique(s)
            </span>
            <Badge variant="neutral" size="sm">{summary.active} actives retenues</Badge>
          </div>

          <div className={cn(isMobile ? "space-y-2.5" : "overflow-hidden rounded-xl border border-edito-border bg-white shadow-xs")}>
            {isMobile ? (
              items.map((item) => <ArbitrationCard key={item.srcId} item={item} decision={decisions[item.srcId]} onToggle={toggleItem} />)
            ) : (
              <table className="w-full min-w-[720px] text-left text-[11px]">
                <thead className="bg-edito-navy text-[9px] font-black uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-3.5 py-3">Source</th>
                    <th className="px-3.5 py-3">Tier / Pack</th>
                    <th className="px-3.5 py-3">Score / Fit</th>
                    <th className="px-3.5 py-3">Temporalité / Usages</th>
                    <th className="px-3.5 py-3">Collecte</th>
                    <th className="px-3.5 py-3">Correspondance</th>
                    <th className="px-3.5 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edito-border/60">
                  {items.map((item) => (
                    <ArbitrationRow key={item.srcId} item={item} decision={decisions[item.srcId]} onToggle={toggleItem} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-edito-border pt-4">
            <button type="button" onClick={() => setStep("prepare")} className="text-[10px] font-bold uppercase tracking-wider text-edito-muted hover:text-edito-navy">
              ← Retour
            </button>
            <Button variant="brass" size="sm" onClick={() => setStep("finalize")}>
              Continuer vers la finalisation →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: FINALISER ─────────────────────────────────────── */}
      {step === "finalize" && parsed && !result && (
        <div className="space-y-5">
          <div className="rounded-xl border border-edito-border bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-edito-chip pb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-edito-navy">Bilan de l&apos;importation de corpus</h4>
              <Badge variant="neutral" size="sm">Création en Brouillon</Badge>
            </div>

            <div className={cn("grid gap-3 text-[11px]", isMobile ? "grid-cols-1" : "grid-cols-2")}>
              <div className="rounded-lg border border-edito-border bg-edito-canvas p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Identifiants</p>
                <p className="text-edito-navy font-semibold">Corpus : <strong>sources-{parsed.meta.segmentSlug}</strong></p>
                <p className="text-edito-navy font-semibold">Segment : <strong>{segment?.ok ? segment.sectorName : parsed.meta.segmentSlug}</strong></p>
                <p className="text-edito-navy font-semibold">Version : <strong>{parsed.meta.version}</strong></p>
              </div>

              <div className="rounded-lg border border-edito-border bg-edito-canvas p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Volumétrie & Arbitrage</p>
                <p className="text-edito-navy">Total sources : <strong>{summary.total}</strong></p>
                <p className="text-edito-navy">Réutilisées : <strong>{summary.reused}</strong> · Nouvelles : <strong>{summary.fresh}</strong></p>
                <p className="text-edito-navy font-bold text-emerald-700">Actives retenues : <strong>{summary.active}</strong></p>
              </div>
            </div>

            <div className="rounded-lg border border-edito-border bg-edito-chip/50 p-3 text-[11px] text-edito-navy flex flex-wrap justify-between gap-2">
              <span>Éligibles actualités : <strong>{summary.newsEligible}</strong></span>
              <span>Éligibles veille comptes : <strong>{summary.accountWatchEligible}</strong></span>
              <span>Statiques exclues : <strong>{summary.staticExcluded}</strong></span>
            </div>

            <p className="text-[10px] text-edito-muted italic">
              Le corpus sera créé en <StatusPill variant="neutral" label="Brouillon" /> — aucune collecte ne démarre avant activation explicite.
            </p>
          </div>

          {submitError && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-[11px] font-medium text-rose-800">{submitError}</p>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-edito-border pt-4">
            <button type="button" onClick={() => setStep("arbitrate")} className="text-[10px] font-bold uppercase tracking-wider text-edito-muted hover:text-edito-navy">
              ← Retour
            </button>
            <Button variant="brass" size="sm" onClick={handleConfirm} loading={submitting} loadingLabel="Import en cours" disabled={!canConfirm}>
              Confirmer l&apos;importation
            </Button>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 space-y-4 text-center">
          <StatusPill variant="success" label={`Corpus importé — ${result.sourcesUpserted} source(s), ${result.itemsUpserted} appartenance(s)`} />
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ArbitrationRow({ item, decision, onToggle }: { item: SourceCorpusItemPreview; decision: ItemDecision | undefined; onToggle: (srcId: string, enabled: boolean) => void }) {
  const enabled = decision?.isEnabled ?? item.isEnabledDefault
  return (
    <tr className="hover:bg-edito-chip/40 transition-colors align-top">
      <td className="px-3.5 py-2.5">
        <p className="font-bold text-edito-navy">{item.mappedPublisher ?? item.srcId}</p>
        <p className="text-[10px] text-edito-muted">{item.srcId} · {item.mappedSearchDomain}</p>
      </td>
      <td className="px-3.5 py-2.5">
        <div className="flex gap-1">
          <Badge variant="neutral" size="sm">T{item.input.tier}</Badge>
          <Badge variant="neutral" size="sm">{item.input.pack}</Badge>
        </div>
      </td>
      <td className="px-3.5 py-2.5 text-edito-navy">{item.input.utilityScore} · {item.input.automationFit.replace("_", " ")}</td>
      <td className="px-3.5 py-2.5 text-edito-navy">
        {item.input.contentTemporality}
        <br />
        <span className="text-[10px] text-edito-muted">{item.input.usageScopes.join(", ") || "—"}</span>
      </td>
      <td className="px-3.5 py-2.5 text-edito-navy">{collectionModeLabel(item)}</td>
      <td className="px-3.5 py-2.5">
        {item.existingMatch ? (
          <StatusPill variant="info" label={item.existingMatch.origin === "system" ? "Socle système" : item.existingMatch.origin === "manual" ? "Source manuelle" : "Déjà en corpus"} />
        ) : (
          <span className="text-[10px] font-medium text-edito-muted">Nouvelle source</span>
        )}
      </td>
      <td className="px-3.5 py-2.5">
        {item.isCollectable ? (
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-edito-navy cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => onToggle(item.srcId, e.target.checked)} className="size-3.5 accent-edito-navy" />
            {enabled ? "Actif" : "Exclu"}
          </label>
        ) : (
          <StatusPill variant="neutral" label="Hors veille récurrente" />
        )}
      </td>
    </tr>
  )
}

function ArbitrationCard({ item, decision, onToggle }: { item: SourceCorpusItemPreview; decision: ItemDecision | undefined; onToggle: (srcId: string, enabled: boolean) => void }) {
  const enabled = decision?.isEnabled ?? item.isEnabledDefault
  return (
    <div className="rounded-xl border border-edito-border bg-white p-3.5 shadow-xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-edito-navy">{item.mappedPublisher ?? item.srcId}</p>
          <p className="text-[10px] text-edito-muted">{item.srcId} · {item.mappedSearchDomain}</p>
        </div>
        {item.isCollectable ? (
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-edito-navy cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => onToggle(item.srcId, e.target.checked)} className="size-4 accent-edito-navy" />
            {enabled ? "Actif" : "Exclu"}
          </label>
        ) : (
          <StatusPill variant="neutral" label="Hors veille" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-edito-muted">
        <Badge variant="neutral" size="sm">T{item.input.tier}</Badge>
        <Badge variant="neutral" size="sm">{item.input.pack}</Badge>
        <span>Score {item.input.utilityScore}</span>
        <span>{item.input.automationFit.replace("_", " ")}</span>
        <span>{item.input.contentTemporality}</span>
        <span>{collectionModeLabel(item)}</span>
      </div>
      {item.existingMatch ? (
        <p className="text-[10px] font-medium text-blue-700">
          Correspondance : {item.existingMatch.origin === "system" ? "socle système (verrouillé)" : item.existingMatch.origin === "manual" ? "source manuelle existante" : "déjà présente dans un corpus"}
        </p>
      ) : null}
    </div>
  )
}
