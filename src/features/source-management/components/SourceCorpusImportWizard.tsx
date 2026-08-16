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
    <div className="space-y-5">
      <ol className={cn("flex gap-2 text-[10px] font-bold uppercase tracking-wider text-muted", isMobile && "grid grid-cols-3 gap-1.5")} aria-label="Étapes de l'import">
        {WIZARD_STEPS.map((item, index) => {
          const active = item.id === step
          const complete = WIZARD_STEPS.findIndex((s) => s.id === step) > index
          return (
            <li key={item.id} className={cn("flex items-center gap-1.5", !isMobile && index > 0 && "before:mr-1.5 before:content-['→']")}>
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px]", active && "border-primary bg-primary text-primary-fg", complete && "border-primary/40 bg-primary/10 text-primary", !active && !complete && "border-border text-muted")}>
                {complete ? "✓" : item.index}
              </span>
              <span className={cn(active ? "text-heading" : "text-muted", isMobile && "truncate")}>{item.label}</span>
            </li>
          )
        })}
      </ol>

      {step === "prepare" && (
        <div className="space-y-4">
          <label className="group block cursor-pointer rounded-lg border border-dashed border-border bg-canvas px-5 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-hidden="true">↑</span>
            <span className="mt-2 block text-xs font-bold text-heading">Déposer le JSON du registre E3</span>
            <span className="mt-0.5 block text-[10px] text-muted">{fileName ?? "ou parcourir les fichiers de cet appareil"}</span>
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
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted" htmlFor="source-corpus-json">ou coller le contenu</label>
              <span className="h-px flex-1 bg-border" />
            </div>
            <textarea
              id="source-corpus-json"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value)
                setFileName(null)
              }}
              rows={isMobile ? 6 : 8}
              placeholder='{"meta": {...}, "sources": [...]}'
              className="mt-3 w-full resize-y rounded-md border border-border bg-surface p-3 font-mono text-[11px] leading-relaxed text-body outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <Button variant="secondary" size="sm" onClick={handleAnalyze} disabled={!rawText.trim() || resolving}>
            {resolving ? "Analyse en cours…" : "Analyser le fichier"}
          </Button>

          {parseErrors.length > 0 && (
            <ul className="space-y-1 rounded border border-danger/30 bg-danger/5 px-3 py-2">
              {parseErrors.map((message, index) => (
                <li key={index} className="text-[11px] leading-relaxed text-danger">{message}</li>
              ))}
            </ul>
          )}

          {resolveError && (
            <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">{resolveError}</p>
          )}

          {parsed && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className={cn("grid gap-x-6 gap-y-1.5 text-[11px] text-body", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                <span>Segment : <strong className="text-heading">{parsed.meta.segmentSlug}</strong></span>
                <span>Secteur : <strong className="text-heading">{parsed.meta.secteur ?? "—"}</strong></span>
                <span>Snapshot : <strong className="text-heading">{parsed.meta.dateSnapshot}</strong></span>
                <span>Version : <strong className="text-heading">{parsed.meta.version}</strong></span>
                <span>{parsed.sources.length} sources — {parsed.collectableCount} collectables, {parsed.staticCount} hors veille récurrente</span>
                <span>Pack minimal {parsed.packMinimal.length} · Pack enrichi {parsed.packEnrichi.length}</span>
                <span>Verdict E3 : <Badge variant="neutral" size="sm">{parsed.meta.validationStatus}</Badge></span>
              </div>

              {segment ? (
                segment.ok ? (
                  <p className="text-[11px] text-success">
                    Résolu : {segment.macroName ? `${segment.macroName} › ` : ""}{segment.sectorName}
                  </p>
                ) : (
                  <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">{segment.error}</p>
                )
              ) : null}

              <Button variant="brass" size="sm" onClick={() => setStep("arbitrate")} disabled={!canContinueFromPrepare}>
                Continuer vers l&apos;arbitrage
              </Button>
            </div>
          )}
        </div>
      )}

      {step === "arbitrate" && (
        <div className="space-y-4">
          <p className="text-[11px] text-body">
            {items.length} source(s) — {summary.reused} réutilisée(s), {summary.fresh} nouvelle(s), {summary.staticExcluded} statique(s) hors veille récurrente
          </p>

          <div className={cn(isMobile ? "space-y-2" : "overflow-x-auto rounded border border-border")}>
            {isMobile ? (
              items.map((item) => <ArbitrationCard key={item.srcId} item={item} decision={decisions[item.srcId]} onToggle={toggleItem} />)
            ) : (
              <table className="w-full min-w-[720px] text-left text-[11px]">
                <thead className="bg-canvas text-[9px] font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Tier / Pack</th>
                    <th className="px-3 py-2">Score / Fit</th>
                    <th className="px-3 py-2">Temporalité / Usages</th>
                    <th className="px-3 py-2">Collecte</th>
                    <th className="px-3 py-2">Correspondance</th>
                    <th className="px-3 py-2">État</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <ArbitrationRow key={item.srcId} item={item} decision={decisions[item.srcId]} onToggle={toggleItem} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <button type="button" onClick={() => setStep("prepare")} className="text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body">
              Retour
            </button>
            <Button variant="brass" size="sm" onClick={() => setStep("finalize")}>
              Continuer vers la finalisation
            </Button>
          </div>
        </div>
      )}

      {step === "finalize" && parsed && !result && (
        <div className="space-y-4">
          <div className={cn("grid gap-x-6 gap-y-1.5 text-[11px] text-body", isMobile ? "grid-cols-1" : "grid-cols-2")}>
            <span>Corpus : <strong className="text-heading">sources-{parsed.meta.segmentSlug}</strong></span>
            <span>Segment : <strong className="text-heading">{segment?.ok ? segment.sectorName : parsed.meta.segmentSlug}</strong></span>
            <span>Version : <strong className="text-heading">{parsed.meta.version}</strong></span>
            <span>Total sources : <strong className="text-heading">{summary.total}</strong></span>
            <span>Réutilisées : <strong className="text-heading">{summary.reused}</strong></span>
            <span>Nouvelles : <strong className="text-heading">{summary.fresh}</strong></span>
            <span>Actives : <strong className="text-heading">{summary.active}</strong></span>
            <span>Statiques exclues : <strong className="text-heading">{summary.staticExcluded}</strong></span>
            <span>Éligibles actualités : <strong className="text-heading">{summary.newsEligible}</strong></span>
            <span>Éligibles veille comptes : <strong className="text-heading">{summary.accountWatchEligible}</strong></span>
          </div>

          <p className="text-[10px] text-muted">
            Le corpus sera créé en <StatusPill variant="neutral" label="Brouillon" /> — aucune collecte ne démarre avant activation explicite (Lot 3).
          </p>

          {submitError && (
            <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">{submitError}</p>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <button type="button" onClick={() => setStep("arbitrate")} className="text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body">
              Retour
            </button>
            <Button variant="brass" size="sm" onClick={handleConfirm} loading={submitting} loadingLabel="Import en cours" disabled={!canConfirm}>
              Confirmer l&apos;import
            </Button>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-4">
          <StatusPill variant="success" label={`Corpus importé — ${result.sourcesUpserted} source(s), ${result.itemsUpserted} appartenance(s)`} />
          <Button variant="secondary" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      )}
    </div>
  )
}

function ArbitrationRow({ item, decision, onToggle }: { item: SourceCorpusItemPreview; decision: ItemDecision | undefined; onToggle: (srcId: string, enabled: boolean) => void }) {
  const enabled = decision?.isEnabled ?? item.isEnabledDefault
  return (
    <tr className="border-t border-border/60 align-top">
      <td className="px-3 py-2">
        <p className="font-semibold text-heading">{item.mappedPublisher ?? item.srcId}</p>
        <p className="text-[10px] text-muted">{item.srcId} · {item.mappedSearchDomain}</p>
      </td>
      <td className="px-3 py-2"><Badge variant="neutral" size="sm">T{item.input.tier}</Badge> <Badge variant="neutral" size="sm">{item.input.pack}</Badge></td>
      <td className="px-3 py-2">{item.input.utilityScore} · {item.input.automationFit.replace("_", " ")}</td>
      <td className="px-3 py-2">
        {item.input.contentTemporality}
        <br />
        <span className="text-[10px] text-muted">{item.input.usageScopes.join(", ") || "—"}</span>
      </td>
      <td className="px-3 py-2">{collectionModeLabel(item)}</td>
      <td className="px-3 py-2">
        {item.existingMatch ? (
          <StatusPill variant="info" label={item.existingMatch.origin === "system" ? "Socle système" : item.existingMatch.origin === "manual" ? "Source manuelle" : "Déjà en corpus"} />
        ) : (
          <span className="text-[10px] text-muted">Nouvelle source</span>
        )}
      </td>
      <td className="px-3 py-2">
        {item.isCollectable ? (
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-heading">
            <input type="checkbox" checked={enabled} onChange={(e) => onToggle(item.srcId, e.target.checked)} className="size-3.5 accent-primary" />
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
    <div className="rounded border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-heading">{item.mappedPublisher ?? item.srcId}</p>
          <p className="text-[10px] text-muted">{item.srcId} · {item.mappedSearchDomain}</p>
        </div>
        {item.isCollectable ? (
          <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-heading">
            <input type="checkbox" checked={enabled} onChange={(e) => onToggle(item.srcId, e.target.checked)} className="size-4 accent-primary" />
            {enabled ? "Actif" : "Exclu"}
          </label>
        ) : (
          <StatusPill variant="neutral" label="Hors veille" />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <Badge variant="neutral" size="sm">T{item.input.tier}</Badge>
        <Badge variant="neutral" size="sm">{item.input.pack}</Badge>
        <span>Score {item.input.utilityScore}</span>
        <span>{item.input.automationFit.replace("_", " ")}</span>
        <span>{item.input.contentTemporality}</span>
        <span>{collectionModeLabel(item)}</span>
      </div>
      {item.existingMatch ? (
        <p className="mt-1.5 text-[10px] text-info">
          Correspondance : {item.existingMatch.origin === "system" ? "socle système (verrouillé)" : item.existingMatch.origin === "manual" ? "source manuelle existante" : "déjà présente dans un corpus"}
        </p>
      ) : null}
    </div>
  )
}
