import { useState, useEffect, useMemo, useRef } from "react"
import type { ClientIntelligenceData, ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type {
  CommunicationBrief,
  CommunicationOutput,
  CommunicationOutputKind,
  CommunicationQaFlag,
  CommunicationScope,
  N8nEntityType,
  PitchOutput,
} from "@/lib/n8n/types"
import type { AccountSummaryContent, ReportBrief } from "@/app/(app)/reports/_data/reports-types"
import { AccountSummaryReportView } from "@/components/reports/AccountSummaryReportView"
import { saveResultAsDocument } from "./save-as-document"
import {
  CampaignFormState,
} from "./intelligence-action-types"
import {
  buildCampaignPayload,
} from "./intelligence-action-utils"
import { buildDefaultBrief, CHANNEL_OPTIONS, OBJECTIVE_OPTIONS, SCENARIO_OPTIONS } from "./communication-brief-options"
import { getScenarioRegistryItem } from "@/lib/communication/communication-scenario-registry"
import {
  resolveBriefWithLoadedContext,
  type ResolvedCommunicationContextBrief,
} from "@/lib/communication/communication-context-brief"
import {
  applyCommunicationPurposeToBrief,
  getCommunicationPurposeOption,
} from "@/lib/communication/communication-purpose"
import type { LoadedCommunicationContext } from "@/lib/communication/communication-context-loader"
import { CommunicationBriefForm } from "./CommunicationBriefForm"
import { CommunicationResult } from "./CommunicationResult"
import { PitchResult } from "./PitchResult"
import { getSuggestedOffers, type SuggestedOffer } from "./get-suggested-offers"

type RunStatus = "idle" | "loading" | "done" | "error"

function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null

  while (parent) {
    const style = window.getComputedStyle(parent)
    const canScrollY = /(auto|scroll)/.test(style.overflowY)

    if (canScrollY && (parent.scrollTop > 0 || parent.scrollHeight > parent.clientHeight)) {
      return parent
    }

    parent = parent.parentElement
  }

  return null
}

function animateScrollToTop(container: HTMLElement) {
  const start = container.scrollTop
  if (start <= 0) return undefined

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (reduceMotion) {
    container.scrollTop = 0
    return undefined
  }

  const duration = Math.min(1400, Math.max(900, start * 0.9))
  const startedAt = performance.now()
  let frame = 0

  function easeInOutCubic(progress: number) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
  }

  function tick(now: number) {
    const progress = Math.min(1, (now - startedAt) / duration)
    container.scrollTop = start * (1 - easeInOutCubic(progress))

    if (progress < 1) {
      frame = window.requestAnimationFrame(tick)
    }
  }

  frame = window.requestAnimationFrame(tick)
  return () => window.cancelAnimationFrame(frame)
}

function MobileBriefActionSummary({
  documentTypeLabel,
  scenarioLabel,
  objectiveLabel,
}: {
  documentTypeLabel: string
  scenarioLabel: string
  objectiveLabel: string
}) {
  return (
    <div className="min-w-0 border-b border-border/35 pb-3" aria-label="Résumé de génération">
      <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
        {documentTypeLabel} / {scenarioLabel} / {objectiveLabel}
      </p>
    </div>
  )
}

// Contrat minimal — satisfait aussi bien par ClientIntelligenceData (page compte)
// que par AccountIntelligencePanelData (panneau global) : la génération pitch/mail
// n'a jamais eu besoin des analyses/diagnostics complets, seulement du compte et
// des contacts.
// ADR-0013 — `company` devient nul pour les scénarios sans compte pivot (scope
// collaborateur/interne : business review, brief manager, arbitrage interne...).
// `collaborator` porte alors le contexte à la place. Les 5 autres call-sites de
// ce composant (cockpit compte, panneau global, bibliothèque) passent toujours
// un `company` non-nul et n'ont rien à changer.
export type PitchMailAccountContext = {
  company: {
    id: string
    name: string
    lifecycleStatus: string
  } | null
  collaborator?: {
    id: string
    name: string
    practice: string | null
    currentTitle: string | null
  } | null
  contacts: ClientIntelligenceContact[]
  loadedCommunicationContext?: LoadedCommunicationContext | null
  // ADR-0013 Lot 2 — défaut "account" si absent (les 5 call-sites hors Host
  // n'ont pas besoin de le préciser, ils sont toujours account-scope).
  scope?: CommunicationScope
}

// ADR-0013 Lot 3 — entityType/entityId ne sont plus des props externes :
// aucun call-site ne les surchargeait jamais (vérifié), et les dériver ici
// depuis brief.what.scope évite le bug où un run collaborateur/interne
// partait avec entityType="company" par défaut (mauvaise résolution côté
// n8n Hydrate Context).
function resolveEntityForScope(
  scope: CommunicationScope,
  company: PitchMailAccountContext["company"],
  collaborator: PitchMailAccountContext["collaborator"],
): { entityType: N8nEntityType; entityId: string | undefined } {
  switch (scope) {
    case "collaborator":
      return { entityType: "collaborator", entityId: collaborator?.id }
    case "internal":
      // entityId omis — /api/n8n/trigger résout automatiquement le workspace
      // courant côté serveur quand entityType === "workspace".
      return { entityType: "workspace", entityId: undefined }
    case "account":
    default:
      return { entityType: "company", entityId: company?.id }
  }
}

export function PitchMailDrawerContent({
  data,
  variant = "desktop",
  initialBrief,
  contextMetaLabel = "(résolu automatiquement)",
  selectedOutputKind = "written_message",
  onBriefChange,
}: {
  data: PitchMailAccountContext
  variant?: "desktop" | "mobile"
  initialBrief?: CommunicationBrief
  contextMetaLabel?: string
  selectedOutputKind?: CommunicationOutputKind
  onBriefChange?: (brief: CommunicationBrief) => void
}) {
  const { company, collaborator, contacts } = data
  const isMobile = variant === "mobile"
  const supabase = createClient()
  // ADR-0013 — libellé de contexte affiché quand il n'y a pas de compte (scope
  // collaborateur/interne) : jamais de valeur inventée, "Contexte interne" est
  // factuel plutôt qu'un nom de compte fantôme.
  const contextLabel = company?.name ?? collaborator?.name ?? "Contexte interne"
  const loadedCommunicationContext = data.loadedCommunicationContext ?? null

  const initialResolvedBrief = useMemo<ResolvedCommunicationContextBrief>(() => {
    const resolvedContextBrief = resolveBriefWithLoadedContext(
      initialBrief ?? buildDefaultBrief(data, ""),
      loadedCommunicationContext,
    )
    const purposeResolution = applyCommunicationPurposeToBrief(
      resolvedContextBrief.brief,
      selectedOutputKind,
      loadedCommunicationContext?.facts,
    )
    return {
      brief: purposeResolution.brief,
      resolution: purposeResolution.resolution,
    }
  }, [data, initialBrief, loadedCommunicationContext, selectedOutputKind])

  const [brief, setBrief] = useState<CommunicationBrief>(() => initialResolvedBrief.brief)
  const [purposeAdjustmentNotice, setPurposeAdjustmentNotice] = useState<string | null>(null)

  useEffect(() => {
    onBriefChange?.(brief)
  }, [brief, onBriefChange])

  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [result, setResult] = useState<CommunicationOutput | PitchOutput | null>(null)
  const [qaFlags, setQaFlags] = useState<CommunicationQaFlag[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ADR-0009 — catalogue d'offres pour l'OfferPicker, chargé une fois par compte
  const [offers, setOffers] = useState<SuggestedOffer[]>([])
  const [suggestedPracticeSlugs, setSuggestedPracticeSlugs] = useState<string[]>([])
  const [offersLoading, setOffersLoading] = useState(false)
  const resultTopRef = useRef<HTMLDivElement | null>(null)
  const selectedOutputKindRef = useRef<CommunicationOutputKind>(selectedOutputKind)

  useEffect(() => {
    if (selectedOutputKindRef.current === selectedOutputKind) return

    setBrief((previousBrief) => {
      const result = applyCommunicationPurposeToBrief(
        previousBrief,
        selectedOutputKind,
        loadedCommunicationContext?.facts,
      )
      const changed =
        previousBrief.what.scenario !== result.brief.what.scenario ||
        previousBrief.what.channel !== result.brief.what.channel ||
        previousBrief.what.length !== result.brief.what.length ||
        previousBrief.who.objective !== result.brief.who.objective ||
        previousBrief.how.tone !== result.brief.how.tone

      setPurposeAdjustmentNotice(
        changed
          ? "Paramètres ajustés automatiquement pour rester compatibles avec la finalité choisie."
          : null,
      )
      return result.brief
    })

    selectedOutputKindRef.current = selectedOutputKind
  }, [loadedCommunicationContext?.facts, selectedOutputKind])

  useEffect(() => {
    // ADR-0013 — pas de catalogue d'offres suggérées sans compte pivot (scope
    // collaborateur/interne) : les scénarios requérant une offre y sont de toute
    // façon exclus (requiresOffer piloté par scope, Lot 2). Rien à réinitialiser
    // ici : le Host remonte ce composant (key sur l'identité de l'entité) à
    // chaque changement de contexte, donc les états offers/loading repartent
    // déjà de leur valeur initiale ([]/false) pour un scope sans compte.
    const companyId = company?.id
    if (!companyId) return
    let cancelled = false
    async function loadOffers(id: string) {
      setOffersLoading(true)
      const res = await getSuggestedOffers(id)
      if (!cancelled) {
        setOffers(res.offers)
        setSuggestedPracticeSlugs(res.suggestedPracticeSlugs)
        setOffersLoading(false)
      }
    }
    void loadOffers(companyId)
    return () => { cancelled = true }
  }, [company?.id])

  // Émetteur dérivé du profil connecté — § 4.2, seul le rôle reste modifiable en UI
  useEffect(() => {
    let cancelled = false
    async function loadSender() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", auth.user.id)
        .single()
      if (!cancelled && profile?.full_name) {
        setBrief((b) => ({ ...b, who: { ...b.who, sender: { ...b.who.sender, name: profile.full_name as string } } }))
      }
    }
    void loadSender()
    return () => { cancelled = true }
  }, [supabase])

  // Abonnement Realtime : dès qu'on a un runId, on écoute le résultat
  useEffect(() => {
    if (!runId) return

    const channel = supabase
      .channel(`communication-result-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_intelligence_results",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            status: string
            content_json: CommunicationOutput | PitchOutput
            qa_flags: CommunicationQaFlag[]
          }
          if (row.status === "succeeded") {
            setResultId(row.id)
            setResult(row.content_json)
            setQaFlags(row.qa_flags || [])
            setRunStatus("done")
          } else if (row.status === "failed") {
            // INTEL-020 Lot 11 — surface la raison réelle du rejet (contrôle
            // qualité ou erreur de génération) via les qa_flags échoués, déjà
            // formulés de façon lisible et sans fuite technique côté n8n.
            const failedFlags = (row.qa_flags || []).filter((f) => !f.passed)
            const reason = failedFlags.map((f) => f.detail).filter(Boolean).join(" ")
            setErrorMsg(reason || "La génération n'a pas abouti. Réessaie dans un instant.")
            setRunStatus("error")
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (runStatus !== "done" || !result) return undefined

    let stopAnimation: (() => void) | undefined
    const frame = window.requestAnimationFrame(() => {
      const scrollContainer = findScrollableAncestor(resultTopRef.current)
      if (!scrollContainer) return
      stopAnimation = animateScrollToTop(scrollContainer)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      stopAnimation?.()
    }
  }, [runStatus, result])

  async function handleGenerate() {
    // ADR-0013 Lot 3 — entité effective dérivée de brief.what.scope (jamais figée
    // au montage : reflète le scope réellement en vigueur au moment de générer).
    // Garde-fou factuel plutôt qu'un appel API voué à échouer côté n8n — le scope
    // "internal" n'a par construction aucune entité à résoudre.
    const scope = brief.what.scope
    const { entityType, entityId: effectiveEntityId } = resolveEntityForScope(scope, company, collaborator)
    if (scope !== "internal" && !effectiveEntityId) {
      setErrorMsg("Aucune entité n'a pu être résolue pour cette génération.")
      setRunStatus("error")
      return
    }

    setRunStatus("loading")
    setResult(null)
    setResultId(null)
    setQaFlags([])
    setErrorMsg(null)

    try {
      // Lot 7 — plus d'instruction textuelle "mustExclude" fabriquée à partir des
      // sources décochées (command §5, faux mécanisme) : `context.disabledContextSources`
      // est déjà la structure explicite transmise telle quelle ; le filtrage réel
      // côté n8n reste au Lot 10.
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-020-communication",
          entityType,
          entityId: effectiveEntityId,
          companyId: entityType === "company" ? company?.id : undefined,
          input: brief,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = await res.json() as { runId: string }
      setRunId(newRunId)
      // runStatus reste "loading" → Realtime le passera à "done" ou "error"
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  function handleReset() {
    setRunStatus("idle")
    setRunId(null)
    setResultId(null)
    setResult(null)
    setQaFlags([])
    setErrorMsg(null)
  }

  const channelLabel = CHANNEL_OPTIONS.find((o) => o.value === brief.what.channel)?.label ?? brief.what.channel
  const scenarioLabel = SCENARIO_OPTIONS.find((o) => o.value === brief.what.scenario)?.label ?? brief.what.scenario
  const objectiveLabel = OBJECTIVE_OPTIONS.find((o) => o.value === brief.who.objective)?.label ?? brief.who.objective
  const purposeOption = getCommunicationPurposeOption(brief.what.outputKind)
  const documentTypeLabel = purposeOption.shortLabel
  const requiresOffer = getScenarioRegistryItem(brief.what.scenario)?.requiresOffer ?? false
  const missingOfferRef = requiresOffer && !brief.context.offerRef
  const generateLabel = brief.what.outputKind === "spoken_pitch"
    ? "Générer le pitch"
    : brief.what.outputKind === "structured_briefing"
      ? "Générer le briefing"
      : "Générer le message"

  // ── Résultat généré ──────────────────────────────────────────────────────────
  if (runStatus === "done" && result) {
    if ("kind" in result) {
      return (
        <div ref={resultTopRef}>
          <PitchResult
            result={result}
            qaFlags={qaFlags}
            companyName={contextLabel}
            scenarioLabel={scenarioLabel}
            brief={brief}
            resultId={resultId}
            isMobile={isMobile}
            onReset={handleReset}
          />
        </div>
      )
    }
    return (
      <div ref={resultTopRef}>
        <CommunicationResult
          result={result}
          qaFlags={qaFlags}
          companyId={company?.id}
          companyName={contextLabel}
          channelLabel={channelLabel}
          brief={brief}
          resultId={resultId}
          isMobile={isMobile}
          onReset={handleReset}
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-5", !isMobile && "pb-1")}>
      {!isMobile ? (
        <div className="communication-brief-status-strip" aria-label="Paramètres principaux">
          <strong>{documentTypeLabel}</strong>
          <span aria-hidden="true">•</span>
          <strong>{scenarioLabel}</strong>
          <span aria-hidden="true">•</span>
          <strong>{objectiveLabel}</strong>
        </div>
      ) : (
        <MobileBriefActionSummary
          documentTypeLabel={documentTypeLabel}
          scenarioLabel={scenarioLabel}
          objectiveLabel={objectiveLabel}
        />
      )}

      {purposeAdjustmentNotice ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] leading-normal text-muted">
          {purposeAdjustmentNotice}
        </p>
      ) : null}

      <CommunicationBriefForm
        brief={brief}
        onChange={setBrief}
        contacts={contacts}
        isMobile={isMobile}
        contextMetaLabel={contextMetaLabel}
        offers={offers}
        suggestedPracticeSlugs={suggestedPracticeSlugs}
        offersLoading={offersLoading}
        communicationFacts={loadedCommunicationContext?.facts}
        companyId={company?.id}
        availableReferences={loadedCommunicationContext?.references}
        sourceAvailability={loadedCommunicationContext?.sourceAvailability}
      />

      {/* Erreur */}
      {runStatus === "error" && errorMsg && (
        <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      {/* CTA */}
      <div className="communication-composer-action space-y-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={runStatus === "loading" || missingOfferRef}
          className={cn(
            "kredo-ready-spectrum-button w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-medium)] px-3 text-xs font-bold text-[#151515]",
            isMobile ? "min-h-[44px]" : "min-h-[44px]",
            runStatus === "loading" || missingOfferRef
              ? "cursor-not-allowed opacity-80"
              : ""
          )}
        >
          {runStatus === "loading" ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              Génération en cours…
            </>
          ) : generateLabel}
        </button>
        {runStatus === "loading" && (
          <p className="text-[10px] text-muted text-center leading-normal">
            n8n travaille… le résultat apparaîtra automatiquement.
          </p>
        )}
        {missingOfferRef && (
          <p className="text-[10px] text-[var(--color-status-warning-ink)] text-center leading-normal">
            Sélectionne une offre catalogue pour générer cette finalité.
          </p>
        )}
      </div>
    </div>
  )
}

// Contrat minimal — satisfait aussi bien par ClientIntelligenceData (page compte)
// que par AccountIntelligencePanelData.company (panneau global) : la génération
// de la fiche compte ne nécessite que company.id côté front, tout le reste est
// résolu par la RPC get_account_summary_facts (REPORT-001 Lot 1).
export type AccountSummaryAccountContext = {
  company: { id: string; name: string; lifecycleStatus: string }
}

function buildAccountSummaryBrief(instructions: string): ReportBrief {
  const today = new Date().toISOString().slice(0, 10)
  return {
    reportType: "client_summary",
    period: { startDate: today, endDate: today, asOfDate: today },
    scope: {},
    audience: "self",
    detailLevel: "standard",
    outputFormats: ["web"],
    options: {},
    additionalInstructions: instructions.trim() || undefined,
  }
}

export function SummaryDrawerContent({
  data,
  variant = "desktop",
}: {
  data: AccountSummaryAccountContext
  variant?: "desktop" | "mobile"
}) {
  const { company } = data
  const isMobile = variant === "mobile"
  const supabase = createClient()

  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [content, setContent] = useState<AccountSummaryContent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Abonnement Realtime : dès qu'on a un runId, on écoute le résultat
  useEffect(() => {
    if (!runId) return

    const channel = supabase
      .channel(`account-summary-result-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_intelligence_results",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            status: string
            content_json: AccountSummaryContent
          }
          if (row.status === "succeeded") {
            setResultId(row.id)
            setContent(row.content_json)
            setRunStatus("done")
          } else if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setRunStatus("loading")
    setContent(null)
    setResultId(null)
    setErrorMsg(null)

    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "report-account-summary",
          entityType: "company",
          entityId: company.id,
          input: buildAccountSummaryBrief(additionalInstructions),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = await res.json() as { runId: string }
      setRunId(newRunId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  function handleReset() {
    setRunStatus("idle")
    setRunId(null)
    setResultId(null)
    setContent(null)
    setErrorMsg(null)
    setSaveStatus("idle")
  }

  async function handleSaveAsDocument() {
    if (!resultId) {
      setSaveStatus("error")
      return
    }
    setSaveStatus("saving")
    const res = await saveResultAsDocument({ resultId })
    setSaveStatus(res.error ? "error" : "saved")
  }

  if (runStatus === "done" && content) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold text-heading">Fiche de synthèse compte</h2>
            <p className="text-[11px] text-muted mt-0.5">{company.name}</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body border border-border rounded px-2 py-1"
          >
            Refaire
          </button>
        </div>

        <AccountSummaryReportView content={content} isMobile={isMobile} />

        <div className="pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleSaveAsDocument}
            disabled={!resultId || saveStatus === "saving" || saveStatus === "saved"}
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
            {saveStatus === "saved" && "✓ Enregistré dans la bibliothèque"}
            {saveStatus === "error" && "Échec — réessayer"}
            {saveStatus === "idle" && "Enregistrer dans la bibliothèque"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Fiche de synthèse compte</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Générer une fiche 1 page consolidant identité, potentiel, activité commerciale, signaux et
          conviction sur {company.name}.
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
          Instructions complémentaires
        </label>
        <textarea
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          placeholder="Ex : insiste sur le potentiel de foisonnement, le staffing en cours…"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
        />
      </div>

      <div className="rounded-lg border border-border bg-canvas/30 p-3 text-[11px] text-muted">
        Faits calculés automatiquement (pipe, CA produit, marge, contacts, signaux) — le LLM ne fait
        que rédiger la synthèse et l&apos;approche recommandée à partir de ces faits.
      </div>

      {runStatus === "error" && errorMsg && (
        <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      <div className="pt-4 border-t border-border space-y-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={runStatus === "loading"}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            runStatus === "loading"
              ? "border-primary/20 bg-primary/5 text-primary/50 cursor-wait"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {runStatus === "loading" ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Génération en cours…
            </>
          ) : (
            "Générer la fiche"
          )}
        </button>
        {runStatus === "loading" && (
          <p className="text-[10px] text-muted text-center leading-normal">
            n8n travaille… le résultat apparaîtra automatiquement.
          </p>
        )}
      </div>
    </div>
  )
}

export function CampaignDrawerContent({
  data,
  variant = "desktop",
}: {
  data: ClientIntelligenceData
  variant?: "desktop" | "mobile"
}) {
  const { company } = data

  const [form, setForm] = useState<CampaignFormState>({
    campaignName: `Campagne prospection - ${company.name}`,
    channels: {
      email: true,
      linkedin: true,
      phone: false,
    },
    additionalInstructions: "",
  })

  // Payload préparé pour le branchement n8n
  buildCampaignPayload({ companyId: company.id, form, data })

  const isMobile = variant === "mobile"
  const selectCls = cn(
    "w-full rounded border border-border bg-surface px-3 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50",
    isMobile ? "h-11" : "h-9"
  )
  const textareaCls = "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Créer une campagne</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Configurer une campagne de prospection multi-canal ciblant le compte.
        </p>
      </div>

      {/* Formulaire contrôlé */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nom de la campagne</label>
          <input
            type="text"
            value={form.campaignName}
            onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
            className={selectCls}
          />
        </div>

        <div>
          <span className={labelCls}>Canaux de prospection</span>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.channels.email}
                onChange={(e) => setForm({ ...form, channels: { ...form.channels, email: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Email</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.channels.linkedin}
                onChange={(e) => setForm({ ...form, channels: { ...form.channels, linkedin: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>LinkedIn</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.channels.phone}
                onChange={(e) => setForm({ ...form, channels: { ...form.channels, phone: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Téléphone</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Directives & consignes</label>
          <textarea
            value={form.additionalInstructions}
            onChange={(e) => setForm({ ...form, additionalInstructions: e.target.value })}
            placeholder="Ex : cible les profils achat et DSI, message personnalisé..."
            className={textareaCls}
          />
        </div>
      </div>

      {/* CTA section */}
      <div className="pt-4 border-t border-border space-y-2">
        <button
          type="button"
          disabled
          className={cn(
            "w-full inline-flex items-center justify-center rounded bg-primary/20 border border-primary/10 px-3 text-xs font-bold text-muted cursor-not-allowed opacity-60",
            isMobile ? "min-h-[44px]" : "min-h-[36px]"
          )}
        >
          Campagne IA à connecter
        </button>
        <p className="text-[10px] text-muted text-center leading-normal">
          La création de campagne sera orchestrée par n8n.
        </p>
      </div>
    </div>
  )
}
