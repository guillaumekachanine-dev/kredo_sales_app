"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import type {
  CommunicationBrief,
  CommunicationChannel,
  CommunicationContextSourceId,
  CommunicationLength,
  CommunicationObjective,
  CommunicationPersona,
  CommunicationRecipientType,
  CommunicationRelation,
  CommunicationScenario,
  CommunicationSenderRole,
  CommunicationTone,
} from "@/lib/n8n/types"
import {
  CHANNEL_OPTIONS,
  LENGTH_OPTIONS,
  OBJECTIVE_OPTIONS,
  PERSONA_OPTIONS,
  RECIPIENT_TYPE_OPTIONS,
  RELATION_OPTIONS,
  SENDER_ROLE_OPTIONS,
  TONE_OPTIONS,
  personaFromRelationshipRole,
} from "./communication-brief-options"
import {
  ACTIVITY_CATEGORY_OPTIONS,
  type ActivityCategory,
} from "@/lib/communication/communication-scenario-registry"
import { resolveCommunicationOptions, type CommunicationAdjustment } from "@/lib/communication/communication-options-resolver"
import {
  buildBriefFormModel,
  mergeCommunicationFacts,
  purgeIncompatibleReferences,
} from "@/lib/communication/communication-brief-form-model"
import type {
  CommunicationSourceAvailability,
  LoadedCommunicationFacts,
} from "@/lib/communication/communication-context-mappers"
import { loadCommunicationContextForCurrentUser } from "@/lib/communication/communication-context-actions"
import type { LoadedCommunicationContext } from "@/lib/communication/communication-context-loader"
import { ContactSelector } from "./ContactSelector"
import { EntityRefSelect } from "./EntityRefSelect"
import { OfferPicker } from "./OfferPicker"
import { ScenarioPicker } from "./ScenarioPicker"
import type { SuggestedOffer } from "./get-suggested-offers"
import {
  getAccountCandidates,
  getAccountMissions,
  getAccountOpportunities,
  type EntityRefOption,
} from "./get-account-crm-refs"
import { getWorkspaceCollaborators, type CollaboratorOption } from "./get-collaborator-options"
import { ManagementConsultantFields, type CollaboratorRpcContext } from "./ManagementConsultantFields"

const PRACTICE_OPTIONS = [
  "Quality Engineering & Testing",
  "Cloud Engineering",
  "Project & Agile Delivery",
  "Data & AI",
  "Digital Business Solutions",
  "Legacy Systems & Mainframe",
  "Digital Experience",
  "Cybersecurity"
]

const BRIEF_SECTIONS = [
  { number: "1", title: "Quoi" },
  { number: "2", title: "Qui" },
  { number: "3", title: "Comment" },
  { number: "4", title: "Contexte" },
] as const

const CONTEXT_SOURCE_OPTIONS: {
  id: CommunicationContextSourceId
  label: string
  description: string
}[] = [
  {
    id: "account_profile",
    label: "Compte CRM",
    description: "Identité, statut, secteur et contexte client disponible.",
  },
  {
    id: "crm_contacts",
    label: "Contacts CRM",
    description: "Contacts, fonctions, personas et relations connues.",
  },
  {
    id: "signal_intelligence",
    label: "Signaux et actualités",
    description: "Signal de veille, résumé, source et action recommandée.",
  },
  {
    id: "opportunity_context",
    label: "Opportunités",
    description: "Opportunité associée, besoin, étape et contexte commercial.",
  },
  {
    id: "interaction_history",
    label: "Interactions et rendez-vous",
    description: "Historique d'échanges, réunions, relances et prochaines étapes.",
  },
  {
    id: "mission_context",
    label: "Missions et projets",
    description: "Mission, projet actif, staffing ou contexte delivery.",
  },
  {
    id: "candidate_profile",
    label: "Profil candidat",
    description: "Profil, positionnement, disponibilité et éléments de recrutement.",
  },
  {
    id: "collaborator_context",
    label: "Collaborateur interne",
    description: "Identité, poste, practice, séniorité, statut, disponibilité, manager, profil métier, compétences, activité et absences récentes.",
  },
  {
    id: "offer_catalog",
    label: "Offre catalogue",
    description: "Offre Kredo sélectionnée et practice associée.",
  },
  {
    id: "source_document",
    label: "Document source",
    description: "Document ou contenu existant utilisé comme base.",
  },
  {
    id: "previous_generation",
    label: "Génération précédente",
    description: "Run précédent, message antérieur ou variante à réutiliser.",
  },
]

const ADJUSTMENT_FIELD_LABELS: Record<string, string> = {
  scenario: "scénario",
  outputKind: "finalité",
  activityCategory: "catégorie",
  scope: "scope",
  channel: "canal",
  length: "longueur",
  tone: "ton",
  objective: "objectif",
  recipientType: "destinataire",
  offerRef: "offre",
  opportunityRef: "opportunité",
  missionRef: "mission",
  profileRef: "candidat",
}

function describeAdjustments(adjustments: CommunicationAdjustment[]): string | null {
  if (adjustments.length === 0) return null
  const labels = Array.from(new Set(adjustments.map((item) => ADJUSTMENT_FIELD_LABELS[item.field] ?? item.field)))
  return `Ajusté automatiquement pour rester cohérent : ${labels.join(", ")}.`
}

function filterOptions<T extends { value: string }>(all: T[], allowed: string[]): T[] {
  if (allowed.length === 0) return all
  const filtered = all.filter((option) => allowed.includes(option.value))
  return filtered.length > 0 ? filtered : all
}

function useFieldClasses(isMobile: boolean) {
  const selectCls = cn(
    "w-full rounded-lg border border-border/35 bg-surface/20 pl-2.5 pr-5 font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 [&>span]:text-[10px] [&>svg]:mr-[-2px] [&>svg]:size-3",
    isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]"
  )
  const textareaCls =
    "w-full rounded-lg border border-border/35 bg-surface/20 px-2.5 py-1.5 text-[10px] font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 min-h-[44px]"
  return { selectCls, textareaCls }
}

function ParameterRow({
  label,
  children,
  multiline = false,
}: {
  label: ReactNode
  children: ReactNode
  multiline?: boolean
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[7.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]",
        multiline ? "items-start" : "items-center",
      )}
    >
      <span className="block truncate pt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  )
}

function SectionHeading({
  number,
  title,
  meta,
}: {
  number?: string
  title: string
  meta?: string
}) {
  return (
    <summary className="cursor-pointer select-none list-none marker:content-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {number ? (
            <span className="shrink-0 font-heading text-sm font-bold tabular-nums text-primary">
              {number}
            </span>
          ) : (
            <span className="size-1 rounded-full bg-primary" aria-hidden />
          )}
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {title}
          </span>
          <span className="h-px min-w-4 flex-1 bg-border/55" aria-hidden />
          {meta ? <span className="max-w-[8rem] truncate text-[10px] font-medium text-muted">({meta})</span> : null}
        </div>
        <svg
          className="size-4 shrink-0 text-muted/70 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12.5L10 7.5L15 12.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </summary>
  )
}

function SectionRail() {
  return (
    <aside className="communication-brief-rail" aria-label="Progression du formulaire">
      <ol className="flex flex-col items-center gap-8">
        {BRIEF_SECTIONS.map((section, index) => (
          <li key={section.title} className="relative flex flex-col items-center">
            {index > 0 ? (
              <span className="absolute bottom-full mb-1 h-7 w-px bg-border/70" aria-hidden />
            ) : null}
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                index === 0
                  ? "border-primary text-primary"
                  : "border-muted/45 text-muted",
              )}
              aria-hidden
            >
              {section.number}
            </span>
            <span className="sr-only">{section.title}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

function CategorySelector({
  value,
  available,
  onChange,
  isMobile,
}: {
  value: ActivityCategory
  available: ActivityCategory[]
  onChange: (category: ActivityCategory) => void
  isMobile: boolean
}) {
  const options = ACTIVITY_CATEGORY_OPTIONS.filter((option) => available.includes(option.value))

  return (
    <div className={cn("grid gap-1.5", isMobile ? "grid-cols-2" : "grid-cols-4")}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border px-2 text-center text-[9.5px] font-bold uppercase tracking-[0.04em] transition-all duration-150 cursor-pointer leading-tight",
              isMobile ? "min-h-[44px] py-2" : "h-9 py-1",
              active
                ? "border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(226,147,29,0.05)]"
                : "border-border/30 bg-surface/20 text-white hover:bg-surface/35"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function CommunicationBriefForm({
  brief,
  onChange,
  contacts,
  isMobile = false,
  contextMetaLabel,
  offers,
  suggestedPracticeSlugs,
  offersLoading = false,
  communicationFacts,
  companyId,
  availableReferences,
  sourceAvailability,
}: {
  brief: CommunicationBrief
  onChange: (brief: CommunicationBrief) => void
  contacts: ClientIntelligenceContact[]
  isMobile?: boolean
  contextMetaLabel?: string
  offers?: SuggestedOffer[]
  suggestedPracticeSlugs?: string[]
  offersLoading?: boolean
  communicationFacts?: LoadedCommunicationFacts
  // Lot 7 — nécessaire pour hydrater les sélecteurs d'entité pivot
  // (opportunité/mission/candidat), absent tant que le scope n'est pas "account".
  companyId?: string
  availableReferences?: Record<string, unknown>
  sourceAvailability?: CommunicationSourceAvailability
}) {
  const { selectCls, textareaCls } = useFieldClasses(isMobile)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [structuralNotice, setStructuralNotice] = useState<string | null>(null)

  // Lot 8 — contrairement aux entités pivot du Lot 7 (booléens de présence
  // suffisants), le consultant est l'entité PRIMAIRE du scope collaborator :
  // command §2 exige de "charger son contexte via le RPC du Lot 4" à la
  // sélection, pas seulement de dériver des facts client. Ce contexte
  // rafraîchi prend le pas sur les props initiales une fois chargé.
  const [refreshedCollaboratorContext, setRefreshedCollaboratorContext] = useState<LoadedCommunicationContext | null>(null)
  const [collaboratorContextLoading, setCollaboratorContextLoading] = useState(false)

  const effectiveFacts = refreshedCollaboratorContext?.facts ?? communicationFacts
  const effectiveReferences = refreshedCollaboratorContext?.references ?? availableReferences
  const effectiveSourceAvailability = refreshedCollaboratorContext?.sourceAvailability ?? sourceAvailability

  // Lot 7 — le résolveur est ré-exécuté à chaque rendu à partir du brief et
  // des facts réellement connus (dont les refs choisies manuellement dans ce
  // formulaire) : source unique de vérité, pas d'état dupliqué à resynchroniser.
  const mergedFacts = useMemo(() => mergeCommunicationFacts(effectiveFacts, brief), [effectiveFacts, brief])
  const resolution = useMemo(() => resolveCommunicationOptions(mergedFacts, brief), [mergedFacts, brief])
  const model = useMemo(
    () => buildBriefFormModel(brief, resolution, effectiveSourceAvailability),
    [brief, resolution, effectiveSourceAvailability],
  )

  const [opportunityOptions, setOpportunityOptions] = useState<EntityRefOption[]>([])
  const [missionOptions, setMissionOptions] = useState<EntityRefOption[]>([])
  const [candidateOptions, setCandidateOptions] = useState<EntityRefOption[]>([])
  const [refsLoading, setRefsLoading] = useState(false)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [collaboratorOptions, setCollaboratorOptions] = useState<CollaboratorOption[]>([])
  const [collaboratorOptionsLoading, setCollaboratorOptionsLoading] = useState(false)

  useEffect(() => {
    if (!model.showConsultant) return
    let cancelled = false
    async function loadCollaborators() {
      setCollaboratorOptionsLoading(true)
      const result = await getWorkspaceCollaborators()
      if (!cancelled) {
        setCollaboratorOptions(result.options)
        setCollaboratorOptionsLoading(false)
      }
    }
    void loadCollaborators()
    return () => { cancelled = true }
  }, [model.showConsultant])

  useEffect(() => {
    if (!model.showConsultant || !brief.context.collaboratorRef) return
    let cancelled = false
    async function loadCollaboratorContext(collaboratorId: string) {
      setCollaboratorContextLoading(true)
      const result = await loadCommunicationContextForCurrentUser({ scope: "collaborator", collaboratorId })
      if (cancelled) return
      setRefreshedCollaboratorContext(result.context)
      setCollaboratorContextLoading(false)
    }
    void loadCollaboratorContext(brief.context.collaboratorRef)
    return () => { cancelled = true }
  }, [model.showConsultant, brief.context.collaboratorRef])

  // Les listes ne sont pas remises à vide de façon synchrone quand elles
  // deviennent hors-sujet (catégorie/scénario change) — elles sont simplement
  // ignorées au rendu (cf. usages ci-dessous) puisqu'aucun sélecteur ne les
  // affiche plus. Évite un setState synchrone en tête d'effet.
  useEffect(() => {
    if (!companyId || (!model.showOpportunity && !model.showMission)) return
    let cancelled = false
    async function loadRefs(id: string) {
      setRefsLoading(true)
      const [opportunityResult, missionResult] = await Promise.all([
        model.showOpportunity ? getAccountOpportunities(id) : Promise.resolve({ options: [], error: null }),
        model.showMission ? getAccountMissions(id) : Promise.resolve({ options: [], error: null }),
      ])
      if (cancelled) return
      setOpportunityOptions(opportunityResult.options)
      setMissionOptions(missionResult.options)
      setRefsLoading(false)
    }
    void loadRefs(companyId)
    return () => { cancelled = true }
  }, [companyId, model.showOpportunity, model.showMission])

  useEffect(() => {
    if (!companyId || !model.showCandidate) return
    let cancelled = false
    async function loadCandidates(id: string) {
      setCandidatesLoading(true)
      const result = await getAccountCandidates(id)
      if (cancelled) return
      setCandidateOptions(result.options)
      setCandidatesLoading(false)
    }
    void loadCandidates(companyId)
    return () => { cancelled = true }
  }, [companyId, model.showCandidate])

  // ── Cascade centrale (handoff §10.4, command §4) — toute modification
  //    structurante repasse par le résolveur, applique les defaults registry,
  //    purge les références devenues incompatibles et signale l'ajustement. ──
  function applyStructuralChange(patch: (current: CommunicationBrief) => CommunicationBrief) {
    const patched = patch(brief)
    const factsForResolve = mergeCommunicationFacts(effectiveFacts, patched)
    const resolved = resolveCommunicationOptions(factsForResolve, patched)
    const purged = purgeIncompatibleReferences(resolved.normalizedBrief, resolved)
    const allAdjustments = [...resolved.adjustments, ...purged.adjustments]
    setStructuralNotice(describeAdjustments(allAdjustments))
    onChange(purged.brief)
  }

  function updateWhat(patch: Partial<CommunicationBrief["what"]>) {
    onChange({ ...brief, what: { ...brief.what, ...patch } })
  }

  function updateSender(patch: Partial<CommunicationBrief["who"]["sender"]>) {
    onChange({ ...brief, who: { ...brief.who, sender: { ...brief.who.sender, ...patch } } })
  }

  function updateObjective(objective: CommunicationObjective) {
    onChange({ ...brief, who: { ...brief.who, objective } })
  }

  function updateHow(patch: Partial<CommunicationBrief["how"]>) {
    onChange({ ...brief, how: { ...brief.how, ...patch } })
  }

  function updateContext(patch: Partial<CommunicationBrief["context"]>) {
    onChange({ ...brief, context: { ...brief.context, ...patch } })
  }

  function handleCategoryChange(category: ActivityCategory) {
    if (category === brief.what.activityCategory) return
    applyStructuralChange((current) => ({ ...current, what: { ...current.what, activityCategory: category } }))
  }

  function handleScenarioChange(scenario: CommunicationScenario) {
    applyStructuralChange((current) => ({ ...current, what: { ...current.what, scenario } }))
  }

  function handleRecipientTypeChange(type: CommunicationRecipientType) {
    applyStructuralChange((current) => ({
      ...current,
      who: { ...current.who, recipient: { ...current.who.recipient, type } },
    }))
  }

  function handleContactChange(contact: ClientIntelligenceContact | null) {
    applyStructuralChange((current) => ({
      ...current,
      who: {
        ...current.who,
        recipient: {
          ...current.who.recipient,
          contactId: contact?.id,
          displayName: contact?.fullName,
          ...(contact ? { persona: personaFromRelationshipRole(contact.relationshipRole) } : {}),
        },
      },
    }))
  }

  function handleCollaboratorChange(collaborator: CollaboratorOption | null) {
    applyStructuralChange((current) => ({
      ...current,
      // Une mission choisie appartient au consultant précédent — purgée au
      // changement de consultant plutôt que laissée incohérente (command §7).
      context: { ...current.context, collaboratorRef: collaborator?.id, missionRef: undefined },
      who: {
        ...current.who,
        recipient: {
          ...current.who.recipient,
          collaboratorId: collaborator?.id,
          displayName: collaborator?.displayName,
        },
      },
    }))
  }

  function handleOpportunityChange(id: string | undefined) {
    applyStructuralChange((current) => ({ ...current, context: { ...current.context, opportunityRef: id } }))
  }

  function handleMissionChange(id: string | undefined) {
    applyStructuralChange((current) => ({ ...current, context: { ...current.context, missionRef: id } }))
  }

  function handleCandidateChange(id: string | undefined) {
    const option = candidateOptions.find((candidate) => candidate.id === id)
    applyStructuralChange((current) => ({
      ...current,
      context: { ...current.context, profileRef: id },
      who: model.candidateIsRecipient
        ? {
          ...current.who,
          recipient: {
            ...current.who.recipient,
            displayName: option?.label ?? current.who.recipient.displayName,
          },
        }
        : current.who,
    }))
  }

  function handleOfferChange(offerId: string) {
    applyStructuralChange((current) => ({ ...current, context: { ...current.context, offerRef: offerId } }))
  }

  const disabledContextSources = brief.context.disabledContextSources ?? []
  const disabledContextSourceSet = new Set(disabledContextSources)
  const visibleContextSources = model.contextSources
  const activeOptionalCount = visibleContextSources.filter((source) => source.visibility === "optional_on").length
  const optionalSourceCount = visibleContextSources.filter((source) => source.visibility !== "locked_on" && source.visibility !== "unavailable").length
  const loadedReferenceCount = effectiveReferences
    ? Object.values(effectiveReferences).filter(Boolean).length
    : undefined
  const contextSourcesAriaLabel = `Sources contextuelles (${activeOptionalCount}/${optionalSourceCount} optionnelles actives, ${loadedReferenceCount ?? 0} références chargées)`

  function toggleContextSource(sourceId: CommunicationContextSourceId, visibility: string) {
    if (visibility === "locked_on" || visibility === "unavailable") return
    const nextDisabled = disabledContextSourceSet.has(sourceId)
      ? disabledContextSources.filter((id) => id !== sourceId)
      : [...disabledContextSources, sourceId]

    updateContext({
      disabledContextSources: nextDisabled.length > 0 ? nextDisabled : undefined,
    })
  }

  function enableAllContextSources() {
    updateContext({ disabledContextSources: undefined })
  }

  function disableAllContextSources() {
    const toggleable = visibleContextSources
      .filter((source) => source.visibility === "optional_on" || source.visibility === "optional_off")
      .map((source) => source.id)
    updateContext({ disabledContextSources: toggleable.length > 0 ? toggleable : undefined })
  }

  // ── Champs — un bloc par field, réassemblés différemment sur desktop (4
  //    accordéons QUOI/QUI/COMMENT/CONTEXTE) et mobile (3 champs essentiels
  //    + "Plus d'options") ────────────────────────────────────────────────

  const fieldCategory = model.showCategorySelector ? (
    <CategorySelector
      value={brief.what.activityCategory as ActivityCategory}
      available={model.availableCategories}
      onChange={handleCategoryChange}
      isMobile={isMobile}
    />
  ) : null

  const fieldScenario = (
    <ScenarioPicker
      outputKind={brief.what.outputKind}
      value={brief.what.scenario}
      onChange={handleScenarioChange}
      isMobile={isMobile}
      hideLabel={isMobile}
      allowedCategories={model.showCategorySelector ? [brief.what.activityCategory as ActivityCategory] : undefined}
    />
  )

  const fieldChannel = (
    <Select
      value={brief.what.channel}
      onChange={(e) => updateWhat({ channel: e.target.value as CommunicationChannel })}
      className={selectCls}
    >
      {filterOptions(CHANNEL_OPTIONS, model.channels).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )

  const fieldLength = (
    <Select
      value={brief.what.length}
      onChange={(e) => updateWhat({ length: e.target.value as CommunicationLength })}
      className={selectCls}
    >
      {filterOptions(LENGTH_OPTIONS, model.lengths).map((o) => (
        <option key={o.value} value={o.value}>{o.label} ({o.hint})</option>
      ))}
    </Select>
  )

  const fieldObjective = (
    <Select
      value={brief.who.objective}
      onChange={(e) => updateObjective(e.target.value as CommunicationObjective)}
      className={selectCls}
    >
      {filterOptions(OBJECTIVE_OPTIONS, model.objectives).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )

  const fieldSenderRole = (
    <Select
      value={brief.who.sender.role}
      onChange={(e) => updateSender({ role: e.target.value as CommunicationSenderRole })}
      className={selectCls}
    >
      {SENDER_ROLE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )

  const fieldPractice = (
    <Select
      value={brief.who.sender.practice || ""}
      onChange={(e) => updateSender({ practice: e.target.value || undefined })}
      className={selectCls}
    >
      <option value="">Non spécifié</option>
      {PRACTICE_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </Select>
  )

  const fieldRecipientControl = (
    <ContactSelector
      contacts={contacts}
      value={brief.who.recipient.contactId}
      onChange={handleContactChange}
      isMobile={isMobile}
    />
  )

  const fieldOpportunity = model.showOpportunity ? (
    <EntityRefSelect
      options={opportunityOptions}
      value={brief.context.opportunityRef}
      onChange={handleOpportunityChange}
      placeholder="Aucune opportunité liée"
      loading={refsLoading}
      isMobile={isMobile}
    />
  ) : null

  // Lot 8 — en scope collaborator, la mission est sélectionnée depuis le
  // contexte RPC du consultant (ManagementConsultantFields), pas depuis la
  // liste "missions du compte" du Lot 7 (sans objet ici, aucun companyId).
  const fieldMission = model.showMission && !model.showConsultant ? (
    <EntityRefSelect
      options={missionOptions}
      value={brief.context.missionRef}
      onChange={handleMissionChange}
      placeholder="Aucune mission liée"
      loading={refsLoading}
      isMobile={isMobile}
    />
  ) : null

  const fieldCandidate = model.showCandidate ? (
    <EntityRefSelect
      options={candidateOptions}
      value={brief.context.profileRef}
      onChange={handleCandidateChange}
      placeholder="Choisir un candidat…"
      loading={candidatesLoading}
      isMobile={isMobile}
    />
  ) : null

  const fieldConsultant = model.showConsultant ? (
    <ManagementConsultantFields
      collaboratorOptions={collaboratorOptions}
      collaboratorOptionsLoading={collaboratorOptionsLoading}
      collaboratorId={brief.context.collaboratorRef}
      onCollaboratorChange={handleCollaboratorChange}
      missionRef={brief.context.missionRef}
      onMissionChange={handleMissionChange}
      showMission={model.showMission}
      collaboratorContext={effectiveReferences?.collaboratorContext as CollaboratorRpcContext | undefined}
      collaboratorContextLoading={collaboratorContextLoading}
      isMobile={isMobile}
    />
  ) : null

  const fieldRecipientType = model.recipientTypeOptions.length > 1 ? (
    <Select
      value={brief.who.recipient.type}
      onChange={(e) => handleRecipientTypeChange(e.target.value as CommunicationRecipientType)}
      className={selectCls}
    >
      {RECIPIENT_TYPE_OPTIONS.filter((o) => model.recipientTypeOptions.includes(o.value)).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  ) : (
    <span className={cn(
      "flex items-center rounded-lg border border-border/25 bg-surface/10 px-2.5 text-[10px] font-semibold text-muted",
      isMobile ? "h-9" : "h-7",
    )}>
      {RECIPIENT_TYPE_OPTIONS.find((o) => o.value === brief.who.recipient.type)?.label ?? brief.who.recipient.type}
    </span>
  )

  const fieldPersona = (
    <Select
      value={brief.who.recipient.persona}
      onChange={(e) => onChange({ ...brief, who: { ...brief.who, recipient: { ...brief.who.recipient, persona: e.target.value as CommunicationPersona } } })}
      className={selectCls}
    >
      {PERSONA_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )

  const fieldRelation = (
    <Select
      value={brief.who.recipient.relation}
      onChange={(e) => onChange({ ...brief, who: { ...brief.who, recipient: { ...brief.who.recipient, relation: e.target.value as CommunicationRelation } } })}
      className={selectCls}
    >
      {RELATION_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )

  const fieldTone = (
    <Select
      value={brief.how.tone}
      onChange={(e) => updateHow({ tone: e.target.value as CommunicationTone })}
      className={selectCls}
    >
      {filterOptions(TONE_OPTIONS, model.tones).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  )

  const formalityControl = (
    <div className="grid grid-cols-2 gap-1.5">
      {(["vous", "tu"] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => updateHow({ formality: f })}
          className={cn(
            "flex-1 rounded-lg border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-150 cursor-pointer",
            isMobile ? "min-h-[38px]" : "h-[28px]",
            brief.how.formality === f
              ? "border-primary bg-primary/20 text-primary font-bold shadow-[0_0_12px_rgba(226,147,29,0.05)]"
              : "border-border/30 bg-surface/20 text-white hover:bg-surface/35"
          )}
        >
          {f}
        </button>
      ))}
    </div>
  )

  const fieldLanguage = (
    <Select
      value={brief.how.language}
      onChange={(e) => updateHow({ language: e.target.value as "fr" | "en" })}
      className={selectCls}
    >
      <option value="fr">🇫🇷 Français</option>
      <option value="en">🇬🇧 Anglais</option>
    </Select>
  )

  const fieldOfferPicker = model.showOffer ? (
    <OfferPicker
      offers={offers ?? []}
      suggestedPracticeSlugs={suggestedPracticeSlugs ?? []}
      value={brief.context.offerRef}
      onChange={handleOfferChange}
      loading={offersLoading}
      required={model.offerRequired}
      isMobile={isMobile}
      hideLabel={isMobile}
    />
  ) : null

  const fieldMustInclude = (
    <textarea
      value={brief.context.mustInclude || ""}
      onChange={(e) => updateContext({ mustInclude: e.target.value })}
      placeholder="Instructions, faits ou arguments que le message doit contenir…"
      className={textareaCls}
    />
  )

  const fieldMustExclude = (
    <textarea
      value={brief.context.mustExclude || ""}
      onChange={(e) => updateContext({ mustExclude: e.target.value })}
      placeholder="Sujets, noms ou projets à exclure du message…"
      className={textareaCls}
    />
  )

  const fieldAdvancedContextSources = (
    <>
      <button
        type="button"
        onClick={() => setAdvancedOpen(true)}
        aria-label={contextSourcesAriaLabel}
        className={cn(
          "inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border/35 bg-surface/20 px-2.5 text-left text-[10px] font-semibold text-white transition-colors hover:bg-surface/35 focus:border-primary/60 focus:outline-none",
          isMobile ? "h-9" : "h-7",
        )}
      >
        <span className="min-w-0 truncate">Sources</span>
        <span className="shrink-0 text-[9px] font-medium text-primary">
          {activeOptionalCount}/{optionalSourceCount} optionnelles actives
        </span>
      </button>

      <AppDialog
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        className="communication-picker-modal sm:max-w-xl"
        headerClassName="communication-picker-modal-header"
        bodyClassName="communication-picker-modal-body"
        title="Paramètres avancés"
        description="Décoche les sources de contexte optionnelles à exclure de la génération."
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={enableAllContextSources}
              className="rounded-lg border border-border/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-body transition-colors hover:bg-surface-hover/40"
            >
              Tout activer
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={disableAllContextSources}
                className="rounded-lg border border-border/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:bg-surface-hover/40"
              >
                Tout désactiver
              </button>
              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                className="rounded-lg bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg transition-opacity hover:opacity-90"
              >
                Valider
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          {visibleContextSources.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-muted">
              Aucune source contextuelle n&apos;est pertinente pour ce scénario.
            </p>
          ) : null}
          {visibleContextSources.map((sourceState) => {
            const option = CONTEXT_SOURCE_OPTIONS.find((candidate) => candidate.id === sourceState.id)
            if (!option) return null
            const locked = sourceState.visibility === "locked_on"
            const unavailable = sourceState.visibility === "unavailable"
            const checked = sourceState.visibility === "locked_on" || sourceState.visibility === "optional_on"

            return (
              <label
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  unavailable
                    ? "cursor-not-allowed border-border/20 bg-surface/10 opacity-60"
                    : "cursor-pointer",
                  !unavailable && checked
                    ? "border-primary/35 bg-primary/8"
                    : !unavailable
                      ? "border-border/35 bg-surface/20 hover:bg-surface/35"
                      : "",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked || unavailable}
                  onChange={() => toggleContextSource(sourceState.id, sourceState.visibility)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold leading-4 text-heading">
                    {option.label}
                    {locked ? <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-primary">Obligatoire</span> : null}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                    {unavailable ? "Non disponible pour ce contexte." : option.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </AppDialog>
    </>
  )

  const structuralNoticeBlock = structuralNotice ? (
    <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] leading-normal text-muted">
      {structuralNotice}
    </p>
  ) : null

  if (isMobile) {
    // Parcours condensé : intention, cible et contrainte d'écriture en premier.
    // Les réglages de sortie restent accessibles mais ne bloquent pas l'action.
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          {structuralNoticeBlock}
          {/* Lot 8 command §8 — mobile : consultant en premier, avant même le
              scénario, pour les briefs collaborator. */}
          {fieldConsultant ? <ParameterRow label="Consultant">{fieldConsultant}</ParameterRow> : null}
          {fieldCategory ? <ParameterRow label="Catégorie">{fieldCategory}</ParameterRow> : null}
          {fieldOpportunity ? <ParameterRow label="Opportunité">{fieldOpportunity}</ParameterRow> : null}
          {fieldMission ? <ParameterRow label="Mission">{fieldMission}</ParameterRow> : null}
          {fieldCandidate ? (
            <ParameterRow label={model.candidateIsRecipient ? "Candidat destinataire" : "Candidat présenté"}>
              {fieldCandidate}
            </ParameterRow>
          ) : null}
          <ParameterRow label="Scénario">{fieldScenario}</ParameterRow>
          <ParameterRow label="Objectif">{fieldObjective}</ParameterRow>
          {fieldOfferPicker ? (
            <ParameterRow label="Offre catalogue">
              {fieldOfferPicker}
            </ParameterRow>
          ) : null}
          {model.showContact ? (
            <ParameterRow label="Destinataire">{fieldRecipientControl}</ParameterRow>
          ) : null}
          <ParameterRow label="À intégrer impérativement" multiline>{fieldMustInclude}</ParameterRow>
        </div>
        <details className="group rounded-lg border border-border bg-canvas/30 p-3">
          <SectionHeading title="Plus d'options" />
          <div className="pt-4 space-y-5">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Sortie
              </h3>
              <ParameterRow label="Format">{fieldChannel}</ParameterRow>
              <ParameterRow label="Ton">{fieldTone}</ParameterRow>
              <ParameterRow label="Longueur">{fieldLength}</ParameterRow>
              <ParameterRow label="Formalité">{formalityControl}</ParameterRow>
              <ParameterRow label="Langue">{fieldLanguage}</ParameterRow>
            </section>

            <section className="space-y-3 border-t border-border/30 pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Interlocuteur
              </h3>
              <ParameterRow label="Émetteur">{fieldSenderRole}</ParameterRow>
              <ParameterRow
                label={(
                  <>
                    Practice <span className="text-[7px] tracking-[0.06em] text-muted/75">(optionnel)</span>
                  </>
                )}
              >
                {fieldPractice}
              </ParameterRow>
              <ParameterRow label="Statut du destinataire">{fieldRecipientType}</ParameterRow>
              {model.showPersonaRelation ? (
                <>
                  <ParameterRow label="Fonction">{fieldPersona}</ParameterRow>
                  <ParameterRow label="Relation actuelle">{fieldRelation}</ParameterRow>
                </>
              ) : null}
            </section>

            <section className="space-y-3 border-t border-border/30 pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Contexte utilisé
              </h3>
              <ParameterRow label="À ne pas mentionner" multiline>{fieldMustExclude}</ParameterRow>
              <ParameterRow label="Sources de contexte">{fieldAdvancedContextSources}</ParameterRow>
            </section>
          </div>
        </details>
      </div>
    )
  }

  return (
    <div className="communication-brief-premium grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
      <SectionRail />

      <div className="min-w-0 space-y-5">
        {structuralNoticeBlock}
        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="01" title="Quoi" />
          <div className="space-y-2.5 pt-3">
            {fieldCategory ? <ParameterRow label="Catégorie">{fieldCategory}</ParameterRow> : null}
            <ParameterRow label="Scénario">{fieldScenario}</ParameterRow>
            <ParameterRow label="Objectif">{fieldObjective}</ParameterRow>
            <ParameterRow label="Format">{fieldChannel}</ParameterRow>
            {fieldOfferPicker ? (
              <ParameterRow label="Offre catalogue (obligatoire)">
                {fieldOfferPicker}
              </ParameterRow>
            ) : null}
          </div>
        </details>

        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="02" title="Qui" />
          <div className="space-y-2.5 pt-3">
            <ParameterRow label="Émetteur">{fieldSenderRole}</ParameterRow>
            <ParameterRow
              label={(
                <>
                  Practice <span className="text-[7px] tracking-[0.06em] text-muted/75">(optionnel)</span>
                </>
              )}
            >
              {fieldPractice}
            </ParameterRow>
            {fieldConsultant ? (
              <ParameterRow label="Consultant">{fieldConsultant}</ParameterRow>
            ) : (
              <>
                {fieldOpportunity ? <ParameterRow label="Opportunité">{fieldOpportunity}</ParameterRow> : null}
                {fieldMission ? <ParameterRow label="Mission">{fieldMission}</ParameterRow> : null}
                {fieldCandidate ? (
                  <ParameterRow label={model.candidateIsRecipient ? "Candidat destinataire" : "Candidat présenté"}>
                    {fieldCandidate}
                  </ParameterRow>
                ) : null}
                {model.showContact ? (
                  <ParameterRow label="Destinataire">{fieldRecipientControl}</ParameterRow>
                ) : null}
              </>
            )}
            <ParameterRow label="Statut du destinataire">{fieldRecipientType}</ParameterRow>
            {model.showPersonaRelation ? (
              <>
                <ParameterRow label="Fonction">{fieldPersona}</ParameterRow>
                <ParameterRow label="Relation actuelle">{fieldRelation}</ParameterRow>
              </>
            ) : null}
          </div>
        </details>

        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="03" title="Comment" />
          <div className="space-y-2.5 pt-3">
            <ParameterRow label="Ton">{fieldTone}</ParameterRow>
            <ParameterRow label="Longueur">{fieldLength}</ParameterRow>
            <ParameterRow label="Formalité">{formalityControl}</ParameterRow>
            <ParameterRow label="Langue">{fieldLanguage}</ParameterRow>
          </div>
        </details>

        <details open className="group">
          <SectionHeading number="04" title="Contexte" meta={contextMetaLabel} />
          <div className="space-y-2.5 pt-3">
            <ParameterRow label="À intégrer impérativement" multiline>{fieldMustInclude}</ParameterRow>
            <ParameterRow label="À ne pas mentionner" multiline>{fieldMustExclude}</ParameterRow>
            <ParameterRow label="Paramètres avancés">{fieldAdvancedContextSources}</ParameterRow>
          </div>
        </details>
      </div>
    </div>
  )
}
