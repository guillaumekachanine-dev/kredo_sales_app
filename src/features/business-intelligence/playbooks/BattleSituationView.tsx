"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Playbooks · Lot 3 / L4.1 — configurateur « Situation »
//
// Point de montage livré par le Lot 1 : `BattleWorkspace` rend ce composant, et
// lui seul. La signature `BattleSituationViewProps` est le contrat gelé — ce lot
// ne touche ni `SectorPlaybooksModal.tsx`, ni `BattleWorkspace.tsx`, ni aucun
// autre composant du L1/L2.
//
// Ce que fait ce lot :
//   • charger le contexte du COMPTE ACTIF SEUL (contacts CRM, `account_issues`,
//     offres) — jamais celui de tous les comptes du segment ;
//   • proposer 4 dimensions obligatoires (interlocuteur, enjeu, angle, offre) et
//     4 facultatives (timing, objection, ROI, contexte Knowledge) ;
//   • construire un `CommunicationBrief` canonique (`battle-situation-brief.ts`).
//
// Le CTA « Générer le pitch » transmet ce brief au workflow INTEL-020 et suit
// son run. La restitution complète du résultat reste hors périmètre (Lot 5).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useRunTracker } from "@/lib/n8n/use-run-tracker"
import { createClient } from "@/lib/supabase/client"
import { getSuggestedOffers } from "@/components/accounts-contacts/intelligence/get-suggested-offers"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import type { SectorKnowledgeReadModel } from "@/features/master-study/data/get-sector-knowledge-read-model"
import {
  BATTLE_SITUATION_REQUIRED_LABELS,
  buildAngleOptions,
  buildIssueOptions,
  buildObjectionOptions,
  buildOfferOptions,
  buildPersonaOptions,
  buildRoiOptions,
  buildSituationSummary,
  buildTimingOptions,
  createEmptyBattleSituationDraft,
  findUnsatisfiableRequirements,
  pruneDraftAgainstOptions,
  validateBattleSituationDraft,
  type BattleAccountIssue,
  type BattleOfferInput,
  type BattleSituationContact,
  type BattleSituationDraft,
  type BattleSituationOptions,
} from "./battle-situation-options"
import { buildBattleSituationBrief } from "./battle-situation-brief"
import { BattlePitchResult } from "./BattlePitchResult"
import { BattleSituationSecondaryOptions } from "./BattleSituationSecondaryOptions"
import {
  EVIDENCE_LEVEL_LABELS,
  EvidenceHint,
  NoOptionState,
  OptionCard,
  OptionGrid,
  RESOLVED_LEVEL_LABELS,
  SituationBlock,
  SourceBadge,
} from "./BattleSituationPickers"

export type BattleSituationViewProps = {
  /** Acteur sélectionné dans le rail. Porte `id`, `companyId` et `details`. */
  actor: CompetitiveMapActor
  /** Connaissance sectorielle résolue du segment actif (maille segment). */
  knowledge: SectorKnowledgeReadModel
  isMobile: boolean
  /** Rend la main à l'onglet Révision sans quitter le mode Battle. */
  onBackToRevision: () => void
}

// ─── Chargement du contexte compte ──────────────────────────────────────────

type AccountContext = {
  status: "loading" | "ready" | "error"
  contacts: BattleSituationContact[]
  issues: BattleAccountIssue[]
  offers: BattleOfferInput[]
  suggestedPracticeSlugs: string[]
  error: string | null
}

const EMPTY_ACCOUNT_CONTEXT: AccountContext = {
  status: "loading",
  contacts: [],
  issues: [],
  offers: [],
  suggestedPracticeSlugs: [],
  error: null,
}

type PersonRow = { full_name: string | null; first_name: string | null; last_name: string | null }

type ContactRow = {
  id: string
  job_title: string | null
  relationship_role: string | null
  is_priority: boolean | null
  persons: PersonRow | PersonRow[] | null
}

function mapContacts(rows: ContactRow[]): BattleSituationContact[] {
  return rows.map((row) => {
    const person = Array.isArray(row.persons) ? row.persons[0] : row.persons
    const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
    return {
      id: row.id,
      fullName: person?.full_name || fallbackName || "Contact sans nom",
      jobTitle: row.job_title,
      relationshipRole: row.relationship_role,
      isPriority: row.is_priority,
    }
  })
}

/**
 * Contexte du compte actif. Requêtes client (RLS workspace) pour les contacts
 * et les enjeux — il n'existe aucun helper exporté pour les contacts, et
 * extraire celui de `CommunicationComposerHost` reviendrait à écrire dans une
 * zone non possédée par ce lot. Les offres passent par la Server Action
 * existante `getSuggestedOffers`.
 *
 * `loadCommunicationContextForCurrentUser` n'est volontairement PAS appelée
 * (recommandation du Lot 0 §8.2) : elle produit des faits de résolution que la
 * Battle Card possède déjà — un aller-retour serveur pour rien.
 */
function useAccountSituationContext(companyId: string): AccountContext {
  // L'état porte le compte qu'il décrit : quand `companyId` change, le contexte
  // du compte précédent est écarté PENDANT LE RENDU (valeur dérivée) au lieu
  // d'être remis à zéro par un `setState` synchrone dans l'effet, qui
  // provoquerait un rendu en cascade.
  const [state, setState] = useState<AccountContext & { companyId: string }>({
    ...EMPTY_ACCOUNT_CONTEXT,
    companyId,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const [contactsResult, issuesResult, offersResult] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, job_title, relationship_role, is_priority, persons(full_name, first_name, last_name)")
          .eq("company_id", companyId)
          .order("is_priority", { ascending: false })
          .limit(100),
        supabase
          .from("account_issues")
          .select("id, title, problem_statement, evidence_level, provenance")
          .eq("company_id", companyId)
          .eq("status", "open")
          .order("criticality", { ascending: false })
          .limit(50),
        getSuggestedOffers(companyId),
      ])

      if (cancelled) return

      const error = contactsResult.error?.message ?? issuesResult.error?.message ?? offersResult.error

      setState({
        companyId,
        status: error ? "error" : "ready",
        contacts: mapContacts((contactsResult.data ?? []) as unknown as ContactRow[]),
        issues: (issuesResult.data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          problemStatement: row.problem_statement,
          evidenceLevel: row.evidence_level,
          provenance: row.provenance,
        })),
        offers: offersResult.offers,
        suggestedPracticeSlugs: offersResult.suggestedPracticeSlugs,
        error: error ?? null,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [companyId])

  return state.companyId === companyId ? state : EMPTY_ACCOUNT_CONTEXT
}

/** Émetteur du pitch — `profiles.full_name`, même lecture que le composeur. */
function useSenderName(): string {
  const [senderName, setSenderName] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", auth.user.id)
        .single()
      if (!cancelled && profile?.full_name) setSenderName(profile.full_name)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return senderName
}

// ─── Vue ────────────────────────────────────────────────────────────────────

export function BattleSituationView({ actor, knowledge, isMobile, onBackToRevision }: BattleSituationViewProps) {
  const context = useAccountSituationContext(actor.companyId)
  const senderName = useSenderName()

  // `key` sur le compte : changer de Battle Card repart d'une situation vierge,
  // sans effet de synchronisation ni état résiduel d'un autre compte.
  return (
    <BattleSituationConfigurator
      key={actor.id}
      actor={actor}
      knowledge={knowledge}
      context={context}
      senderName={senderName}
      isMobile={isMobile}
      onBackToRevision={onBackToRevision}
    />
  )
}

type ConfiguratorProps = {
  actor: CompetitiveMapActor
  knowledge: SectorKnowledgeReadModel
  context: AccountContext
  senderName: string
  isMobile: boolean
  onBackToRevision: () => void
}

type GenerationStatus = "idle" | "submitting" | "running" | "succeeded" | "failed"

type GeneratedPitch = {
  resultId: string
  contentJson: unknown
}

function BattleSituationConfigurator({
  actor,
  knowledge,
  context,
  senderName,
  isMobile,
  onBackToRevision,
}: ConfiguratorProps) {
  const [rawDraft, setRawDraft] = useState<BattleSituationDraft>(createEmptyBattleSituationDraft)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle")
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generatedPitch, setGeneratedPitch] = useState<GeneratedPitch | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const triggerInFlightRef = useRef(false)

  const options: BattleSituationOptions = useMemo(() => {
    const personas = buildPersonaOptions(context.contacts, knowledge.playbook)
    return {
      personas: personas.options,
      personaFallbackToPlaybook: personas.fallbackToPlaybook,
      issues: buildIssueOptions(context.issues, knowledge.painPoints),
      angles: buildAngleOptions(actor, knowledge.playbook),
      timings: buildTimingOptions(actor, knowledge.regulatory, knowledge.events),
      objections: buildObjectionOptions(knowledge.playbook),
      roiArguments: buildRoiOptions(knowledge.playbook),
      offers: buildOfferOptions(context.offers, context.suggestedPracticeSlugs),
    }
  }, [actor, context.contacts, context.issues, context.offers, context.suggestedPracticeSlugs, knowledge])

  // Valeur dérivée pendant le rendu : une sélection devenue orpheline (données
  // arrivées après coup, segment changé) disparaît immédiatement.
  const draft = useMemo(() => pruneDraftAgainstOptions(rawDraft, options), [rawDraft, options])

  const validation = useMemo(() => validateBattleSituationDraft(draft), [draft])
  const unsatisfiable = useMemo(() => findUnsatisfiableRequirements(options), [options])
  const summary = useMemo(() => buildSituationSummary(draft), [draft])

  const update = useCallback((patch: Partial<BattleSituationDraft>) => {
    if (!triggerInFlightRef.current) {
      setGenerationStatus("idle")
      setGenerationError(null)
      setGeneratedPitch(null)
      setRunId(null)
    }
    setRawDraft((current) => ({ ...current, ...patch }))
  }, [])

  const briefResult = useMemo(() => {
    if (!validation.isComplete) return null
    return buildBattleSituationBrief({
      actor: {
        id: actor.id,
        companyId: actor.companyId,
        name: actor.name,
        lifecycleStatus: actor.lifecycleStatus ?? null,
      },
      segmentId: knowledge.segmentId,
      senderName,
      draft,
    })
  }, [actor, draft, knowledge.segmentId, senderName, validation.isComplete])

  useRunTracker({
    runId,
    resultType: "commercial_pitch",
    onRunning: () => setGenerationStatus("running"),
    onSucceeded: (result) => {
      triggerInFlightRef.current = false
      if (!result) {
        setGenerationStatus("failed")
        setGenerationError("Le pitch a été généré, mais son résultat est indisponible.")
        return
      }
      setGeneratedPitch({ resultId: result.id, contentJson: result.contentJson })
      setGenerationError(null)
      setGenerationStatus("succeeded")
    },
    onFailed: (message) => {
      triggerInFlightRef.current = false
      setGenerationStatus("failed")
      setGenerationError(message)
    },
    onTimeout: () => {
      triggerInFlightRef.current = false
      setGenerationStatus("failed")
      setGenerationError(
        "Le traitement dépasse le délai habituel. Il continue côté serveur : réessaie dans quelques minutes.",
      )
    },
  })

  const isBlocked = unsatisfiable.length > 0
  const isGenerationInFlight = generationStatus === "submitting" || generationStatus === "running"
  const canGenerate =
    validation.isComplete &&
    !isBlocked &&
    context.status === "ready" &&
    briefResult?.ok === true &&
    !isGenerationInFlight &&
    generationStatus !== "succeeded"

  const handleGenerate = useCallback(async () => {
    if (triggerInFlightRef.current || !canGenerate || !briefResult?.ok) return

    triggerInFlightRef.current = true
    setGenerationStatus("submitting")
    setGenerationError(null)
    setGeneratedPitch(null)
    setRunId(null)

    try {
      const response = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-020-communication",
          entityType: "company",
          entityId: actor.companyId,
          companyId: actor.companyId,
          input: briefResult.brief,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { runId?: string; error?: string }

      if (!response.ok || !payload.runId) {
        throw new Error(payload.error ?? "Le déclenchement du pitch a échoué.")
      }

      setRunId(payload.runId)
      setGenerationStatus("running")
    } catch (error) {
      triggerInFlightRef.current = false
      setGenerationStatus("failed")
      setGenerationError(error instanceof Error ? error.message : "Le déclenchement du pitch a échoué.")
    }
  }, [actor.companyId, briefResult, canGenerate])

  if (generationStatus === "succeeded" && generatedPitch) {
    return (
      <BattlePitchResult
        actor={actor}
        resultId={generatedPitch.resultId}
        contentJson={generatedPitch.contentJson}
        draft={draft}
        onReset={() => {
          setGenerationStatus("idle")
          setGeneratedPitch(null)
          setRunId(null)
          triggerInFlightRef.current = false
        }}
        onBackToRevision={onBackToRevision}
        isMobile={isMobile}
      />
    )
  }

  if (context.status === "loading") {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-xs text-white/45">
        Chargement du contexte de {actor.name}…
      </p>
    )
  }

  if (context.status === "error") {
    return (
      <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-6">
        <p className="text-xs font-semibold text-rose-200">Contexte du compte indisponible</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-rose-200/70">{context.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white">
      <header className="border-b border-white/10 pb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
          Situation commerciale
        </span>
        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/50">
          Quatre décisions suffisent — interlocuteur, enjeu, angle, offre. Timing, objection, ROI et
          contexte Knowledge affinent le discours sans jamais être exigés.
        </p>
      </header>

      {isBlocked ? (
        <NoOptionState tone="blocking">
          Génération impossible pour ce compte :{" "}
          {unsatisfiable.map((field) => BATTLE_SITUATION_REQUIRED_LABELS[field].toLowerCase()).join(", ")}{" "}
          — aucune matière disponible, ni côté compte, ni côté secteur. Rien n’est inventé ici.
        </NoOptionState>
      ) : null}

      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {/* 1 · Interlocuteur */}
        <SituationBlock
          step={1}
          label="Interlocuteur"
          requirement="required"
          hint={
            options.personaFallbackToPlaybook && options.personas.length > 0
              ? "Aucun contact CRM sur ce compte : personas du playbook sectoriel."
              : null
          }
        >
          {options.personas.length === 0 ? (
            <NoOptionState tone="blocking">
              Ni contact CRM, ni persona dans le playbook du segment.
            </NoOptionState>
          ) : (
            <OptionGrid isMobile={isMobile}>
              {options.personas.map((persona) => (
                <OptionCard
                  key={persona.key}
                  isMobile={isMobile}
                  isSelected={draft.persona?.key === persona.key}
                  onSelect={() => update({ persona })}
                  title={persona.label}
                  detail={persona.sublabel}
                  badges={persona.kind === "playbook" ? <SourceBadge source="sector" /> : null}
                />
              ))}
            </OptionGrid>
          )}
        </SituationBlock>

        {/* 2 · Enjeu */}
        <SituationBlock step={2} label="Enjeu" requirement="required">
          {options.issues.length === 0 ? (
            <NoOptionState tone="blocking">
              Aucun enjeu ouvert sur le compte et aucun point de douleur sectoriel sur ce segment.
            </NoOptionState>
          ) : (
            <OptionGrid isMobile={isMobile}>
              {options.issues.map((issue) => (
                <OptionCard
                  key={issue.key}
                  isMobile={isMobile}
                  isSelected={draft.issue?.key === issue.key}
                  onSelect={() => update({ issue })}
                  title={issue.label}
                  detail={issue.detail}
                  badges={
                    <>
                      <SourceBadge source={issue.source} />
                      {issue.evidenceLevel ? (
                        <EvidenceHint>
                          {EVIDENCE_LEVEL_LABELS[issue.evidenceLevel] ?? issue.evidenceLevel}
                        </EvidenceHint>
                      ) : null}
                      {issue.resolvedLevel ? (
                        <EvidenceHint>{RESOLVED_LEVEL_LABELS[issue.resolvedLevel]}</EvidenceHint>
                      ) : null}
                    </>
                  }
                />
              ))}
            </OptionGrid>
          )}
        </SituationBlock>

        {/* 3 · Angle */}
        <SituationBlock step={3} label="Angle d’approche" requirement="required">
          {options.angles.length === 0 ? (
            <NoOptionState tone="blocking">
              Aucun angle d’entrée sur la Battle Card ni dans le playbook du segment.
            </NoOptionState>
          ) : (
            <OptionGrid isMobile={isMobile}>
              {options.angles.map((angle) => (
                <OptionCard
                  key={angle.key}
                  isMobile={isMobile}
                  isSelected={draft.angle?.key === angle.key}
                  onSelect={() => update({ angle })}
                  title={angle.label}
                  detail={angle.detail}
                  badges={<SourceBadge source={angle.source} />}
                />
              ))}
            </OptionGrid>
          )}
        </SituationBlock>

        {/* 4 · Offre */}
        <SituationBlock
          step={4}
          label="Offre"
          requirement="required"
          hint={
            options.offers.some((offer) => offer.isSuggested)
              ? "Les offres des practices suggérées pour ce compte sont en tête."
              : null
          }
        >
          {options.offers.length === 0 ? (
            <NoOptionState tone="blocking">Catalogue d’offres indisponible.</NoOptionState>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {options.offers.map((offer) => (
                <OptionCard
                  key={offer.key}
                  isMobile={isMobile}
                  isSelected={draft.offer?.key === offer.key}
                  onSelect={() => update({ offer })}
                  title={offer.name}
                  detail={offer.practiceName || null}
                  badges={
                    offer.isSuggested ? (
                      <span className="shrink-0 rounded border border-brand-brass/30 bg-brand-brass/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-brand-brass">
                        Suggérée
                      </span>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </SituationBlock>

        {isMobile ? null : (
          <BattleSituationSecondaryOptions
            options={options}
            draft={draft}
            update={update}
            isMobile={false}
          />
        )}
      </div>

      {isMobile ? (
        <details className="group rounded-xl border border-white/10 bg-slate-950/35">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-bold text-white/75 outline-none focus-visible:ring-2 focus-visible:ring-brand-brass [&::-webkit-details-marker]:hidden">
            Options secondaires
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-white/40">Timing · Objection · ROI · Knowledge</span>
              <span aria-hidden="true" className="text-brand-brass transition-transform group-open:rotate-180 motion-reduce:transition-none">⌄</span>
            </span>
          </summary>
          <div className="space-y-6 border-t border-white/10 p-3">
            <BattleSituationSecondaryOptions
              options={options}
              draft={draft}
              update={update}
              isMobile
            />
          </div>
        </details>
      ) : null}

      {/* Résumé vivant + CTA */}
      <div
        className={cn(
          "space-y-3 rounded-xl border border-white/10 bg-slate-950/50 p-4",
          isMobile && "sticky bottom-0 z-10 -mx-1 space-y-2 bg-slate-950/95 p-3 shadow-[0_-8px_24px_color-mix(in_srgb,var(--color-cockpit-cobalt-deep)_28%,transparent)]",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
            Situation
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="battle-situation-length" className="text-[10px] uppercase tracking-wider text-white/35">
              Longueur
            </label>
            <select
              id="battle-situation-length"
              value={draft.length}
              onChange={(event) =>
                update({ length: event.target.value === "standard" ? "standard" : "concise" })
              }
              className={cn(
                "rounded-lg border border-white/10 bg-slate-950/60 px-2 text-[11px] text-white",
                "focus:outline-none focus:ring-2 focus:ring-brand-brass",
                isMobile ? "min-h-11" : "min-h-8",
              )}
            >
              <option value="concise">Concis</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>

        {summary.length > 0 || !isMobile ? (
          <p className={cn("text-sm font-semibold leading-relaxed text-white", isMobile && "line-clamp-2")}>
            {summary.length > 0 ? summary : <span className="text-white/35">Aucun paramètre choisi pour l’instant.</span>}
          </p>
        ) : null}

        {!validation.isComplete && !isBlocked ? (
          <p className="text-[11px] text-white/45">
            Manque :{" "}
            {validation.missing.map((field) => BATTLE_SITUATION_REQUIRED_LABELS[field]).join(" · ")}
          </p>
        ) : null}

        {isGenerationInFlight ? (
          <div className="rounded-lg border border-brand-brass/30 bg-brand-brass/[0.06] p-3">
            <p className="text-[11px] font-semibold text-brand-brass" aria-live="polite">
              Génération en cours…
            </p>
          </div>
        ) : null}

        {generationStatus === "succeeded" && generatedPitch ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3" aria-live="polite">
            <p className="text-[11px] font-semibold text-emerald-200">Pitch généré</p>
          </div>
        ) : null}

        {generationStatus === "failed" && generationError ? (
          <div className="rounded-lg border border-rose-500/25 bg-rose-950/20 p-3" role="alert">
            <p className="text-[11px] font-semibold text-rose-200">Échec de la génération</p>
            <p className="mt-1 text-[11px] leading-relaxed text-rose-200/70">{generationError}</p>
          </div>
        ) : null}

        <div className={cn("flex flex-row gap-2", !isMobile && "justify-end")}>
          <button
            type="button"
            onClick={onBackToRevision}
            className={cn(
              "rounded-lg border border-white/10 bg-slate-900/40 px-3 text-[11px] font-semibold text-white/70",
              "outline-none transition-colors hover:bg-white/[0.06] hover:text-white",
              "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
              isMobile ? "min-h-11 w-full" : "min-h-9",
            )}
          >
            Revenir à la révision
          </button>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
            className={cn(
              "rounded-lg px-4 text-xs font-bold outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none",
              isMobile ? "min-h-11 w-full" : "min-h-9",
              canGenerate
                ? "bg-brand-brass text-slate-950 hover:bg-brand-brass/90"
                : "cursor-not-allowed bg-white/5 text-white/30",
            )}
          >
            {isGenerationInFlight
              ? "Génération en cours…"
              : generationStatus === "failed"
                ? "Relancer la génération"
                : generationStatus === "succeeded"
                  ? "Pitch généré"
                  : "Générer le pitch"}
          </button>
        </div>
      </div>
    </div>
  )
}
