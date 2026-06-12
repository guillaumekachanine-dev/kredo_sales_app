import { useState } from "react"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import { cn } from "@/lib/utils"
import {
  PitchDraftFormState,
  ClientSummaryFormState,
  CampaignFormState,
  PitchMessageType,
  PitchObjective,
  PitchTone,
  ClientSummaryFormat,
} from "./intelligence-action-types"
import {
  buildPitchDraftPayload,
  buildClientSummaryPayload,
  buildCampaignPayload,
  getAnalysisAvailabilityLabel,
  getSectorAvailabilityLabel,
  getRoadmapAvailabilityLabel,
} from "./intelligence-action-utils"

export function PitchMailDrawerContent({
  data,
  variant = "desktop",
}: {
  data: ClientIntelligenceData
  variant?: "desktop" | "mobile"
}) {
  const { company, client, contacts } = data

  const [form, setForm] = useState<PitchDraftFormState>({
    messageType: "email",
    objective: "first_contact",
    tone: "direct",
    targetContactId: "",
    additionalContext: "",
  })

  // Payload préparé pour le branchement futur n8n
  buildPitchDraftPayload({ companyId: company.id, form, data })

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
        <h2 className="font-heading text-base font-bold text-heading">Construire un pitch/mail</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Préparer un message contextualisé à partir des données disponibles sur le compte.
        </p>
      </div>

      {/* Formulaire contrôlé */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Type de message</label>
          <select
            value={form.messageType}
            onChange={(e) => setForm({ ...form, messageType: e.target.value as PitchMessageType })}
            className={selectCls}
          >
            <option value="email">Email</option>
            <option value="phone_pitch">Pitch téléphonique</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Objectif</label>
          <select
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value as PitchObjective })}
            className={selectCls}
          >
            <option value="first_contact">Prise de contact</option>
            <option value="follow_up">Relance</option>
            <option value="meeting_request">Demande de rendez-vous</option>
            <option value="proposal_intro">Introduction proposition</option>
            <option value="event_invitation">Invitation événement</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Ton</label>
          <select
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value as PitchTone })}
            className={selectCls}
          >
            <option value="direct">Direct</option>
            <option value="expert">Expert</option>
            <option value="pedagogical">Pédagogique</option>
            <option value="executive">Exécutif</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Contact cible</label>
          <select
            value={form.targetContactId || ""}
            onChange={(e) => setForm({ ...form, targetContactId: e.target.value || null })}
            className={selectCls}
          >
            <option value="">Non spécifié</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.fullName} {contact.jobTitle ? `(${contact.jobTitle})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Contexte complémentaire</label>
          <textarea
            value={form.additionalContext}
            onChange={(e) => setForm({ ...form, additionalContext: e.target.value })}
            placeholder="Ajoute un angle, une contrainte ou une information utile…"
            className={textareaCls}
          />
        </div>
      </div>

      {/* Contexte disponible */}
      <div className="rounded-lg border border-border bg-canvas/30 p-3.5 space-y-2">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">
          Contexte disponible
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted block text-[10px]">Compte :</span>
            <span className="font-medium text-heading truncate block">{company.name}</span>
          </div>
          <div>
            <span className="text-muted block text-[10px]">Secteur :</span>
            <span className="font-medium text-heading truncate block">{company.sector || "—"}</span>
          </div>
          <div>
            <span className="text-muted block text-[10px]">Score IA :</span>
            <span className="font-medium text-heading">
              {company.aiScore !== null ? company.aiScore : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted block text-[10px]">Contacts :</span>
            <span className="font-medium text-heading">{contacts.length}</span>
          </div>
          <div>
            <span className="text-muted block text-[10px]">Analyse client :</span>
            <span className="font-medium text-heading">
              {client ? (client.source === "engine" ? "Disponible" : "FOLIO") : "Absente"}
            </span>
          </div>
          <div>
            <span className="text-muted block text-[10px]">Analyse sectorielle :</span>
            <span className="font-medium text-heading">
              {data.sector ? (data.sector.source === "engine" ? "Disponible" : "FOLIO") : "Absente"}
            </span>
          </div>
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
          Génération IA à connecter
        </button>
        <p className="text-[10px] text-muted text-center leading-normal">
          Ce formulaire préparera le payload envoyé à n8n.
        </p>
      </div>
    </div>
  )
}

export function SummaryDrawerContent({
  data,
  variant = "desktop",
}: {
  data: ClientIntelligenceData
  variant?: "desktop" | "mobile"
}) {
  const { company, contacts, pitches, signals } = data

  const [form, setForm] = useState<ClientSummaryFormState>({
    format: "executive_brief",
    includeSectorAnalysis: true,
    includeSignals: true,
    includeContacts: true,
    includePitches: true,
    additionalInstructions: "",
  })

  // Payload préparé pour le branchement futur n8n
  buildClientSummaryPayload({ companyId: company.id, form, data })

  const isMobile = variant === "mobile"
  const selectCls = cn(
    "w-full rounded border border-border bg-surface px-3 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50",
    isMobile ? "h-11" : "h-9"
  )
  const textareaCls = "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  const clientAvailability = getAnalysisAvailabilityLabel(data)
  const sectorAvailability = getSectorAvailabilityLabel(data)
  const roadmapAvailability = getRoadmapAvailabilityLabel(data)

  const clientTone = {
    success: "text-success",
    warning: "text-warning",
    neutral: "text-muted",
  }[clientAvailability.tone]

  const sectorTone = {
    success: "text-success",
    warning: "text-warning",
    neutral: "text-muted",
  }[sectorAvailability.tone]

  const roadmapTone = {
    success: "text-success",
    neutral: "text-muted",
  }[roadmapAvailability.tone]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Synthèse client</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Créer une fiche de synthèse consolidée à partir des analyses, signaux, contacts et éléments commerciaux.
        </p>
      </div>

      {/* Formulaire contrôlé */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Format de sortie</label>
          <select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value as ClientSummaryFormat })}
            className={selectCls}
          >
            <option value="executive_brief">Brief exécutif</option>
            <option value="sales_sheet">Fiche commerciale</option>
            <option value="account_memo">Mémo compte</option>
          </select>
        </div>

        <div>
          <span className={labelCls}>Sources à inclure</span>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeSectorAnalysis}
                onChange={(e) => setForm({ ...form, includeSectorAnalysis: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Analyse sectorielle</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeSignals}
                onChange={(e) => setForm({ ...form, includeSignals: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Signaux récents</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeContacts}
                onChange={(e) => setForm({ ...form, includeContacts: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Contacts clés</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includePitches}
                onChange={(e) => setForm({ ...form, includePitches: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Pitchs existants</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Instructions complémentaires</label>
          <textarea
            value={form.additionalInstructions}
            onChange={(e) => setForm({ ...form, additionalInstructions: e.target.value })}
            placeholder="Ex : insiste sur les enjeux cloud, cybersécurité, staffing…"
            className={textareaCls}
          />
        </div>
      </div>

      {/* Sources détectées */}
      <div className="rounded-lg border border-border bg-canvas/30 p-4 space-y-3">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted border-b border-border/50 pb-1.5">
          Sources détectées
        </span>
        <ul className="space-y-2 text-xs">
          <li className="flex items-center justify-between">
            <span className="text-muted">Analyse client :</span>
            <span className={cn("font-semibold", clientTone)}>{clientAvailability.label}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Analyse sectorielle :</span>
            <span className={cn("font-semibold", sectorTone)}>{sectorAvailability.label}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Signaux :</span>
            <span className="font-semibold text-heading">{signals.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Contacts :</span>
            <span className="font-semibold text-heading">{contacts.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Pitchs :</span>
            <span className="font-semibold text-heading">{pitches.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Roadmap :</span>
            <span className={cn("font-semibold", roadmapTone)}>
              {roadmapAvailability.label}
            </span>
          </li>
        </ul>
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
          Synthèse IA à connecter
        </button>
        <p className="text-[10px] text-muted text-center leading-normal">
          La génération sera exécutée par n8n pour éviter les timeouts Vercel.
        </p>
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
