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
  SCENARIO_OPTIONS,
  SENDER_ROLE_OPTIONS,
  TONE_OPTIONS,
  isPitchChannel,
  personaFromRelationshipRole,
} from "./communication-brief-options"
import { ContactSelector } from "./ContactSelector"
import { OfferPicker } from "./OfferPicker"
import type { SuggestedOffer } from "./get-suggested-offers"

function useFieldClasses(isMobile: boolean) {
  const selectCls = cn(
    "w-full rounded border border-border bg-surface px-3 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50",
    isMobile ? "h-11" : "h-9"
  )
  const textareaCls =
    "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[64px]"
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"
  return { selectCls, textareaCls, labelCls }
}

function SectionHeading({
  title,
  meta,
}: {
  title: string
  meta?: string
}) {
  return (
    <summary className="cursor-pointer select-none list-none marker:content-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex min-h-7 items-center rounded-full border border-primary/20 bg-primary/12 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary"
          >
            {title}
          </span>
          {meta ? <span className="truncate text-[11px] text-muted">{meta}</span> : null}
        </div>
        <span className="text-muted/60 transition-transform group-open:rotate-180">▾</span>
      </div>
    </summary>
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
  const isPitch = isPitchChannel(brief.what.channel)

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

  function handleScenarioChange(scenario: string) {
    const preset = SCENARIO_OPTIONS.find((s) => s.value === scenario)
    onChange({
      ...brief,
      what: { ...brief.what, scenario: scenario as CommunicationScenario, channel: preset?.defaultChannel ?? brief.what.channel },
      who: { ...brief.who, objective: preset?.defaultObjective ?? brief.who.objective },
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

  const fieldScenario = (
    <div>
      <label className={labelCls}>Scénario</label>
      <Select
        value={brief.what.scenario}
        onChange={(e) => handleScenarioChange(e.target.value)}
        className={selectCls}
      >
        {SCENARIO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
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
        <input
          type="text"
          value={brief.who.sender.practice || ""}
          onChange={(e) => updateSender({ practice: e.target.value || undefined })}
          placeholder="Data/IA, Cloud…"
          className={selectCls}
        />
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
                "flex-1 rounded border px-3 text-xs font-semibold transition-colors",
                isMobile ? "min-h-[44px]" : "h-9",
                brief.how.formality === f
                  ? "border-primary bg-primary text-[#151515]"
                  : "border-border bg-surface text-body hover:bg-canvas"
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
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
      {fieldTone}
      {fieldFormality}
      <div>
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
    <div className="space-y-3">
      <details open className="group rounded-xl border border-white/10 bg-[#2450AE] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <SectionHeading title="Quoi" />
        <div className="pt-3 space-y-4">
          {fieldScenario}
          {fieldChannelAndLength}
          {fieldOfferPicker}
        </div>
      </details>

      <details open className="group rounded-xl border border-white/10 bg-[#2450AE] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <SectionHeading title="Qui" />
        <div className="pt-3 space-y-4">
          {fieldSenderAndPractice}
          {fieldRecipient}
          {fieldRecipientTypeAndPersona}
          {fieldRelationAndObjective}
        </div>
      </details>

      <details open className="group rounded-xl border border-white/10 bg-[#2450AE] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <SectionHeading title="Comment" />
        <div className="pt-3 space-y-4">
          {fieldToneFormalityAndLanguage}
        </div>
      </details>

      <details open className="group rounded-xl border border-white/10 bg-[#2450AE] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <SectionHeading title="Contexte" meta={contextMetaLabel} />
        <div className="pt-3 space-y-4">
          {fieldMustInclude}
          {fieldMustExclude}
        </div>
      </details>
    </div>
  )
}
