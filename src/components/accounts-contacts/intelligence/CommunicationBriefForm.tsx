"use client"

import type { ReactNode } from "react"
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
    "w-full rounded-lg border border-border/35 bg-surface/20 pl-2.5 pr-5 font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 [&>span]:text-[10px] [&>svg]:mr-[-2px] [&>svg]:size-3",
    isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]"
  )
  const textareaCls =
    "w-full rounded-lg border border-border/35 bg-surface/20 px-2.5 py-1.5 text-[10px] font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 min-h-[44px]"
  const labelCls = "mb-1 block text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted"
  return { selectCls, textareaCls, labelCls }
}

function ParameterRow({
  label,
  children,
  multiline = false,
}: {
  label: string
  children: ReactNode
  multiline?: boolean
}) {
  return (
    <div className={cn("grid grid-cols-[9.5rem_minmax(0,1fr)] gap-3", multiline ? "items-start" : "items-center")}>
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

  const fieldChannelAndLength = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Canal</label>
        {fieldChannel}
      </div>
      <div>
        <label className={labelCls}>Longueur</label>
        {fieldLength}
      </div>
    </div>
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

  const fieldSenderAndPractice = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>J&apos;écris en tant que</label>
        {fieldSenderRole}
      </div>
      <div>
        <label className={labelCls}>Practice (optionnel)</label>
        {fieldPractice}
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

  const fieldRecipientTypeAndPersona = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Type de destinataire</label>
        {fieldRecipientType}
      </div>
      <div>
        <label className={labelCls}>Fonction</label>
        {fieldPersona}
      </div>
    </div>
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

  const fieldFormality = (
    <div>
      <span className={labelCls}>Formalité</span>
      {formalityControl}
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

  if (isMobile) {
    // Parcours condensé : 3 sélections essentielles + instructions, le reste
    // hérite de valeurs par défaut modifiables via "Plus d'options" — § 6.3
    return (
      <div className="space-y-5">
        <div className="space-y-4">
          {fieldScenario}
          <div>
            <label className={labelCls}>Objectif</label>
            {fieldObjective}
          </div>
          {fieldOfferPicker}
          <div>
            <label className={labelCls}>Destinataire</label>
            {fieldRecipient}
          </div>
          <div>
            <label className={labelCls}>Ton</label>
            {fieldTone}
          </div>
          <div>
            <label className={labelCls}>À intégrer impérativement</label>
            {fieldMustInclude}
          </div>
        </div>
        <details className="group rounded-lg border border-border bg-canvas/30 p-3">
          <SectionHeading title="Plus d'options" />
          <div className="pt-3 space-y-4">
            {fieldChannelAndLength}
            {fieldSenderAndPractice}
            {fieldRecipientTypeAndPersona}
            <div>
              <label className={labelCls}>Relation actuelle</label>
              {fieldRelation}
            </div>
            <div>
              <label className={labelCls}>Ton</label>
              {fieldTone}
            </div>
            {fieldFormality}
            <div>
              <label className={labelCls}>Langue</label>
              {fieldLanguage}
            </div>
            <div>
              <label className={labelCls}>À ne pas mentionner</label>
              {fieldMustExclude}
            </div>
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
            <ParameterRow label="Canal">{fieldChannel}</ParameterRow>
            <ParameterRow label="Longueur">{fieldLength}</ParameterRow>
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
            <ParameterRow label="J'écris en tant que">{fieldSenderRole}</ParameterRow>
            <ParameterRow label="Practice">{fieldPractice}</ParameterRow>
            <ParameterRow label="Destinataire">{fieldRecipient}</ParameterRow>
            <ParameterRow label="Type de destinataire">{fieldRecipientType}</ParameterRow>
            <ParameterRow label="Fonction">{fieldPersona}</ParameterRow>
            <ParameterRow label="Relation actuelle">{fieldRelation}</ParameterRow>
          </div>
        </details>

        <details open className="group border-b border-border/30 pb-5">
          <SectionHeading number="03" title="Comment" />
          <div className="space-y-2.5 pt-3">
            <ParameterRow label="Ton">{fieldTone}</ParameterRow>
            <ParameterRow label="Formalité">{formalityControl}</ParameterRow>
            <ParameterRow label="Langue">{fieldLanguage}</ParameterRow>
          </div>
        </details>

        <details open className="group">
          <SectionHeading number="04" title="Contexte" meta={contextMetaLabel} />
          <div className="space-y-2.5 pt-3">
            <ParameterRow label="À intégrer impérativement" multiline>{fieldMustInclude}</ParameterRow>
            <ParameterRow label="À ne pas mentionner" multiline>{fieldMustExclude}</ParameterRow>
          </div>
        </details>
      </div>
    </div>
  )
}
