"use client"

import { useState, type ReactNode } from "react"
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
import { getScenarioRegistryItem } from "@/lib/communication/communication-scenario-registry"
import type { CommunicationResolution } from "@/lib/communication/communication-options-resolver"
import type {
  CommunicationSourceAvailability,
  LoadedCommunicationFacts,
} from "@/lib/communication/communication-context-mappers"
import { ContactSelector } from "./ContactSelector"
import { OfferPicker } from "./OfferPicker"
import { ScenarioPicker } from "./ScenarioPicker"
import type { SuggestedOffer } from "./get-suggested-offers"

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
    description: "Collaborateur, practice, poste, séniorité et statut interne.",
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
  communicationResolution,
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
  communicationResolution?: CommunicationResolution | null
  availableReferences?: Record<string, unknown>
  sourceAvailability?: CommunicationSourceAvailability
}) {
  const { selectCls, textareaCls } = useFieldClasses(isMobile)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  // ADR-0013 Lot 2 — outputKind remplace isPitchChannel(channel) comme vérité
  // principale (channel et outputKind sont désormais deux dimensions distinctes).
  const isPitch = brief.what.outputKind !== "written_message"
  const requiresOffer = getScenarioRegistryItem(brief.what.scenario)?.requiresOffer ?? false

  function updateWhat(patch: Partial<CommunicationBrief["what"]>) {
    onChange({ ...brief, what: { ...brief.what, ...patch } })
  }

  function updateSender(patch: Partial<CommunicationBrief["who"]["sender"]>) {
    onChange({ ...brief, who: { ...brief.who, sender: { ...brief.who.sender, ...patch } } })
  }

  function updateRecipient(patch: Partial<CommunicationBrief["who"]["recipient"]>) {
    onChange({ ...brief, who: { ...brief.who, recipient: { ...brief.who.recipient, ...patch } } })
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

  const disabledContextSources = brief.context.disabledContextSources ?? []
  const disabledContextSourceSet = new Set(disabledContextSources)
  const activeContextSourceCount = CONTEXT_SOURCE_OPTIONS.length - disabledContextSources.length
  const loadedSourceCount = sourceAvailability
    ? Object.values(sourceAvailability).filter(Boolean).length
    : undefined
  const loadedReferenceCount = availableReferences
    ? Object.values(availableReferences).filter(Boolean).length
    : undefined
  const contextSourcesAriaLabel = loadedSourceCount === undefined
    ? "Sources"
    : `Sources contextuelles (${loadedSourceCount} disponibles, ${loadedReferenceCount ?? 0} références chargées, scope ${communicationFacts?.scope ?? communicationResolution?.normalizedBrief.what.scope ?? brief.what.scope})`

  function toggleContextSource(sourceId: CommunicationContextSourceId) {
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
    updateContext({ disabledContextSources: CONTEXT_SOURCE_OPTIONS.map((source) => source.id) })
  }

  function handleScenarioChange(scenario: CommunicationScenario) {
    const item = getScenarioRegistryItem(scenario)
    onChange({
      ...brief,
      what: {
        ...brief.what,
        scenario,
        channel: item?.defaultChannel ?? brief.what.channel,
        outputKind: item?.defaultOutputKind ?? brief.what.outputKind,
        activityCategory: item?.activityCategory ?? brief.what.activityCategory,
      },
      who: { ...brief.who, objective: item?.defaultObjective ?? brief.who.objective },
    })
  }

  function handleContactChange(contact: ClientIntelligenceContact | null) {
    if (!contact) {
      updateRecipient({ contactId: undefined, displayName: undefined })
      return
    }
    updateRecipient({
      contactId: contact.id,
      displayName: contact.fullName,
      persona: personaFromRelationshipRole(contact.relationshipRole),
    })
  }

  // ── Champs — un bloc par field, réassemblés différemment sur desktop (4
  //    accordéons QUOI/QUI/COMMENT/CONTEXTE) et mobile (3 champs essentiels
  //    + "Plus d'options") ────────────────────────────────────────────────

  // ADR-0013 Lot 1 — la modale catégorie → scénario est filtrée par useCase à
  // partir du canal courant (même proxy que isPitch ci-dessus). Le vrai champ
  // outputKind/mode explicite arrive au Lot 2 ; en attendant, choisir un
  // scénario de l'autre useCase repasse par le changement de canal existant.
  const fieldScenario = (
    <ScenarioPicker
      useCase={isPitch ? "pitch" : "mail"}
      value={brief.what.scenario}
      onChange={handleScenarioChange}
      isMobile={isMobile}
      hideLabel={isMobile}
    />
  )

  const fieldChannel = (
    <Select
      value={brief.what.channel}
      onChange={(e) => updateWhat({ channel: e.target.value as CommunicationChannel })}
      className={selectCls}
    >
      {CHANNEL_OPTIONS.map((o) => (
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
      {LENGTH_OPTIONS.map((o) => (
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
      {OBJECTIVE_OPTIONS.map((o) => (
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

  const fieldRecipientType = (
    <Select
      value={brief.who.recipient.type}
      onChange={(e) => updateRecipient({ type: e.target.value as CommunicationRecipientType })}
      className={selectCls}
    >
      {RECIPIENT_TYPE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )

  const fieldPersona = (
    <Select
      value={brief.who.recipient.persona}
      onChange={(e) => updateRecipient({ persona: e.target.value as CommunicationPersona })}
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
      onChange={(e) => updateRecipient({ relation: e.target.value as CommunicationRelation })}
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
      {TONE_OPTIONS.map((option) => (
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

  const fieldOfferPicker = isPitch ? (
    <OfferPicker
      offers={offers ?? []}
      suggestedPracticeSlugs={suggestedPracticeSlugs ?? []}
      value={brief.context.offerRef}
      onChange={(offerId) => updateContext({ offerRef: offerId })}
      loading={offersLoading}
      required={requiresOffer}
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
          {activeContextSourceCount}/{CONTEXT_SOURCE_OPTIONS.length} actives
        </span>
      </button>

      <AppDialog
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        className="communication-picker-modal sm:max-w-xl"
        headerClassName="communication-picker-modal-header"
        bodyClassName="communication-picker-modal-body"
        title="Paramètres avancés"
        description="Décoche les sources de contexte à exclure de la génération."
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
          {CONTEXT_SOURCE_OPTIONS.map((source) => {
            const checked = !disabledContextSourceSet.has(source.id)
            return (
              <label
                key={source.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  checked
                    ? "border-primary/35 bg-primary/8"
                    : "border-border/35 bg-surface/20 hover:bg-surface/35",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleContextSource(source.id)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold leading-4 text-heading">
                    {source.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                    {source.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </AppDialog>
    </>
  )

  if (isMobile) {
    // Parcours condensé : intention, cible et contrainte d'écriture en premier.
    // Les réglages de sortie restent accessibles mais ne bloquent pas l'action.
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <ParameterRow label="Scénario">{fieldScenario}</ParameterRow>
          <ParameterRow label="Objectif">{fieldObjective}</ParameterRow>
          {fieldOfferPicker ? (
            <ParameterRow label={requiresOffer ? "Offre catalogue" : "Offre recommandée"}>
              {fieldOfferPicker}
            </ParameterRow>
          ) : null}
          <ParameterRow label="Destinataire">{fieldRecipientControl}</ParameterRow>
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
              <ParameterRow label="Statut du compte">{fieldRecipientType}</ParameterRow>
              <ParameterRow label="Fonction">{fieldPersona}</ParameterRow>
              <ParameterRow label="Relation actuelle">{fieldRelation}</ParameterRow>
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
        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="01" title="Quoi" />
          <div className="space-y-2.5 pt-3">
            <ParameterRow label="Scénario">
              <ScenarioPicker
                useCase={isPitch ? "pitch" : "mail"}
                value={brief.what.scenario}
                onChange={handleScenarioChange}
                hideLabel
              />
            </ParameterRow>
            <ParameterRow label="Objectif">{fieldObjective}</ParameterRow>
            <ParameterRow label="Format">{fieldChannel}</ParameterRow>
            {fieldOfferPicker ? (
              <ParameterRow label={requiresOffer ? "Offre catalogue" : "Offre recommandée"}>
                <OfferPicker
                  offers={offers ?? []}
                  suggestedPracticeSlugs={suggestedPracticeSlugs ?? []}
                  value={brief.context.offerRef}
                  onChange={(offerId) => updateContext({ offerRef: offerId })}
                  loading={offersLoading}
                  required={requiresOffer}
                  hideLabel
                />
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
            <ParameterRow label="Destinataire">{fieldRecipientControl}</ParameterRow>
            <ParameterRow label="Fonction">{fieldPersona}</ParameterRow>
            <ParameterRow label="Statut du compte">{fieldRecipientType}</ParameterRow>
            <ParameterRow label="Relation actuelle">{fieldRelation}</ParameterRow>
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
