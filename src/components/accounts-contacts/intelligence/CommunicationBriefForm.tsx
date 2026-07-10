"use client"

import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import type {
  CommunicationBrief,
  CommunicationChannel,
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

function useFieldClasses(isMobile: boolean) {
  const selectCls = cn(
    "w-full rounded-lg border border-border/35 bg-surface/20 px-3 font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0",
    isMobile ? "h-11 text-xs" : "h-10 text-sm"
  )
  const textareaCls =
    "w-full rounded-lg border border-border/35 bg-surface/20 px-3 py-2.5 text-sm font-medium text-body transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 min-h-[64px]"
  const labelCls = "block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-1.5"
  return { selectCls, textareaCls, labelCls }
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
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-body">
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
}: {
  brief: CommunicationBrief
  onChange: (brief: CommunicationBrief) => void
  contacts: ClientIntelligenceContact[]
  isMobile?: boolean
  contextMetaLabel?: string
  offers?: SuggestedOffer[]
  suggestedPracticeSlugs?: string[]
  offersLoading?: boolean
}) {
  const { selectCls, textareaCls, labelCls } = useFieldClasses(isMobile)
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
    />
  )

  const fieldChannelAndLength = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Canal</label>
        <Select
          value={brief.what.channel}
          onChange={(e) => updateWhat({ channel: e.target.value as CommunicationChannel })}
          className={selectCls}
        >
          {CHANNEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={labelCls}>Longueur</label>
        <Select
          value={brief.what.length}
          onChange={(e) => updateWhat({ length: e.target.value as CommunicationLength })}
          className={selectCls}
        >
          {LENGTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label} ({o.hint})</option>
          ))}
        </Select>
      </div>
    </div>
  )

  const fieldSenderAndPractice = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>J&apos;écris en tant que</label>
        <Select
          value={brief.who.sender.role}
          onChange={(e) => updateSender({ role: e.target.value as CommunicationSenderRole })}
          className={selectCls}
        >
          {SENDER_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={labelCls}>Practice (optionnel)</label>
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
      </div>
    </div>
  )

  const fieldRecipient = (
    <div>
      <label className={labelCls}>Destinataire</label>
      <ContactSelector
        contacts={contacts}
        value={brief.who.recipient.contactId}
        onChange={handleContactChange}
        isMobile={isMobile}
      />
    </div>
  )

  const fieldRecipientTypeAndPersona = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Type de destinataire</label>
        <Select
          value={brief.who.recipient.type}
          onChange={(e) => updateRecipient({ type: e.target.value as CommunicationRecipientType })}
          className={selectCls}
        >
          {RECIPIENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={labelCls}>Fonction</label>
        <Select
          value={brief.who.recipient.persona}
          onChange={(e) => updateRecipient({ persona: e.target.value as CommunicationPersona })}
          className={selectCls}
        >
          {PERSONA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
    </div>
  )

  const fieldRelationAndObjective = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Relation actuelle</label>
        <Select
          value={brief.who.recipient.relation}
          onChange={(e) => updateRecipient({ relation: e.target.value as CommunicationRelation })}
          className={selectCls}
        >
          {RELATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={labelCls}>Objectif</label>
        <Select
          value={brief.who.objective}
          onChange={(e) => updateObjective(e.target.value as CommunicationObjective)}
          className={selectCls}
        >
          {OBJECTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
    </div>
  )

  const fieldTone = (
    <div>
      <label className={labelCls}>Ton</label>
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
    </div>
  )

  const fieldFormality = (
    <div>
      <div>
        <span className={labelCls}>Formalité</span>
        <div className="grid grid-cols-2 gap-1.5">
          {(["vous", "tu"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => updateHow({ formality: f })}
              className={cn(
                "flex-1 rounded-lg border px-3 text-xs font-semibold transition-all duration-150 cursor-pointer",
                isMobile ? "min-h-[44px]" : "h-9",
                brief.how.formality === f
                  ? "border-primary bg-primary/20 text-primary font-bold shadow-[0_0_12px_rgba(226,147,29,0.05)]"
                  : "border-border/30 bg-surface/20 text-body hover:bg-surface/35"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const fieldLanguage = (
    <div>
      <label className={labelCls}>Langue</label>
      <Select
        value={brief.how.language}
        onChange={(e) => updateHow({ language: e.target.value as "fr" | "en" })}
        className={selectCls}
      >
        <option value="fr">🇫🇷 Français</option>
        <option value="en">🇬🇧 Anglais</option>
      </Select>
    </div>
  )

  const fieldToneFormalityAndLanguage = (
    <div className="grid grid-cols-2 gap-3">
      {fieldTone}
      {fieldFormality}
      <div className="col-span-2">
        {fieldLanguage}
      </div>
    </div>
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
    />
  ) : null

  const fieldMustInclude = (
    <div>
      <label className={labelCls}>À intégrer impérativement</label>
      <textarea
        value={brief.context.mustInclude || ""}
        onChange={(e) => updateContext({ mustInclude: e.target.value })}
        placeholder="Instructions, faits ou arguments que le message doit contenir…"
        className={textareaCls}
      />
    </div>
  )

  const fieldMustExclude = (
    <div>
      <label className={labelCls}>À ne pas mentionner</label>
      <textarea
        value={brief.context.mustExclude || ""}
        onChange={(e) => updateContext({ mustExclude: e.target.value })}
        placeholder="Sujets, noms ou projets à exclure du message…"
        className={textareaCls}
      />
    </div>
  )

  if (isMobile) {
    // Parcours condensé : 3 sélections essentielles + instructions, le reste
    // hérite de valeurs par défaut modifiables via "Plus d'options" — § 6.3
    return (
      <div className="space-y-5">
        <div className="space-y-4">
          {fieldScenario}
          {fieldOfferPicker}
          {fieldRecipient}
          {fieldTone}
          {fieldMustInclude}
        </div>
        <details className="group rounded-lg border border-border bg-canvas/30 p-3">
          <SectionHeading title="Plus d'options" />
          <div className="pt-3 space-y-4">
            {fieldChannelAndLength}
            {fieldSenderAndPractice}
            {fieldRecipientTypeAndPersona}
            {fieldRelationAndObjective}
            {fieldTone}
            {fieldFormality}
            {fieldLanguage}
            {fieldMustExclude}
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
          <div className="space-y-4 pt-4">
            {fieldScenario}
            {fieldChannelAndLength}
            {fieldOfferPicker}
          </div>
        </details>

        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="02" title="Qui" />
          <div className="space-y-4 pt-4">
            {fieldSenderAndPractice}
            {fieldRecipient}
            {fieldRecipientTypeAndPersona}
            {fieldRelationAndObjective}
          </div>
        </details>

        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="03" title="Comment" />
          <div className="space-y-4 pt-4">
            {fieldToneFormalityAndLanguage}
          </div>
        </details>

        <details open className="group">
          <SectionHeading number="04" title="Contexte" meta={contextMetaLabel} />
          <div className="space-y-4 pt-4">
            {fieldMustInclude}
            {fieldMustExclude}
          </div>
        </details>
      </div>
    </div>
  )
}
