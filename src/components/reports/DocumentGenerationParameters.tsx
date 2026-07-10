"use client"

import React from "react"
import Link from "next/link"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"
import { DOCUMENT_OBJECT_LABELS, getDocumentTypeLabel, getDocumentCategory } from "./document-display"
import {
  CHANNEL_OPTIONS,
  SCENARIO_OPTIONS,
  LENGTH_OPTIONS,
  SENDER_ROLE_OPTIONS,
  RECIPIENT_TYPE_OPTIONS,
  PERSONA_OPTIONS,
  RELATION_OPTIONS,
  OBJECTIVE_OPTIONS,
  TONE_OPTIONS,
} from "@/components/accounts-contacts/intelligence/communication-brief-options"

type DocumentGenerationParametersProps = {
  document: DocumentDetail
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSourceRef(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const label = record.label
    if (typeof label === "string" && label.trim()) return label.trim()
    const name = record.name
    if (typeof name === "string" && name.trim()) return name.trim()
    const title = record.title
    if (typeof title === "string" && title.trim()) return title.trim()
  }
  return JSON.stringify(value) ?? "Source"
}

const getLabel = (options: { value: any; label: string }[], value: any) => {
  return options.find((o) => o.value === value)?.label || value || "—"
}

const getLanguageLabel = (lang: string) => {
  if (lang === "fr") return "Français"
  if (lang === "en") return "Anglais"
  return lang || "—"
}

export function DocumentGenerationParameters({ document }: DocumentGenerationParametersProps) {
  const latestVersion = document.versions[0] ?? null
  const appliedBrief = latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson ?? null

  const isComm = getDocumentCategory(document.documentType) === "communication"

  // Linked entities
  const linkedCompanies = document.links.filter((l) => l.entityType === "company")
  const linkedContacts = document.links.filter((l) => l.entityType === "contact")
  const linkedOpportunities = document.links.filter((l) => l.entityType === "opportunity")

  const hasLinkedEntities =
    linkedCompanies.length > 0 || linkedContacts.length > 0 || linkedOpportunities.length > 0

  if (isComm && appliedBrief && typeof appliedBrief === "object") {
    const brief = appliedBrief as Record<string, any>
    const what = brief.what || {}
    const who = brief.who || {}
    const sender = who.sender || {}
    const recipient = who.recipient || {}
    const how = brief.how || {}
    const context = brief.context || {}

    return (
      <div className="space-y-5">
        {/* Section 2 : Entité liée */}
        {hasLinkedEntities && (
          <div className="space-y-1.5 pb-3 border-b border-border/10">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
              Entités liées
            </span>
            <div className="space-y-1 text-[10px]">
              {linkedCompanies.map((link, idx) => (
                <div key={`comp-${idx}`} className="flex items-center justify-between gap-2">
                  <span className="text-muted shrink-0">Compte</span>
                  <Link
                    href={`/prospection/accounts/${link.entityId}`}
                    className="font-semibold text-body hover:text-primary transition-colors truncate text-right"
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
              {linkedContacts.map((link, idx) => (
                <div key={`cont-${idx}`} className="flex items-center justify-between gap-2">
                  <span className="text-muted shrink-0">Contact</span>
                  <span className="text-body font-semibold text-right truncate">{link.label}</span>
                </div>
              ))}
              {linkedOpportunities.map((link, idx) => (
                <div key={`opp-${idx}`} className="flex items-center justify-between gap-2">
                  <span className="text-muted shrink-0">Opportunité</span>
                  <span className="text-body font-semibold text-right truncate">{link.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 : QUOI */}
        <div className="space-y-1.5 pb-3 border-b border-border/10">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
            QUOI
          </span>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Scénario</span>
              <span className="text-body font-semibold text-right">{getLabel(SCENARIO_OPTIONS, what.scenario)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Objectif</span>
              <span className="text-body font-semibold text-right">{getLabel(OBJECTIVE_OPTIONS, who.objective)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Canal</span>
              <span className="text-body font-semibold text-right">{getLabel(CHANNEL_OPTIONS, what.channel)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Longueur</span>
              <span className="text-body font-semibold text-right">{getLabel(LENGTH_OPTIONS, what.length)}</span>
            </div>
          </div>
        </div>

        {/* Section 4 : QUI */}
        <div className="space-y-1.5 pb-3 border-b border-border/10">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
            QUI
          </span>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Posture</span>
              <span className="text-body font-semibold text-right">{getLabel(SENDER_ROLE_OPTIONS, sender.role)}</span>
            </div>
            {sender.practice && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted shrink-0">Practice</span>
                <span className="text-body font-semibold text-right">{sender.practice}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Destinataire</span>
              <span className="text-body font-semibold text-right truncate">
                {recipient.displayName || recipient.companyName || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Fonction</span>
              <span className="text-body font-semibold text-right">{getLabel(PERSONA_OPTIONS, recipient.persona)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Statut</span>
              <span className="text-body font-semibold text-right">{getLabel(RECIPIENT_TYPE_OPTIONS, recipient.type)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Relation</span>
              <span className="text-body font-semibold text-right">{getLabel(RELATION_OPTIONS, recipient.relation)}</span>
            </div>
          </div>
        </div>

        {/* Section 5 : COMMENT */}
        <div className="space-y-1.5 pb-3 border-b border-border/10">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
            COMMENT
          </span>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Ton</span>
              <span className="text-body font-semibold text-right">{getLabel(TONE_OPTIONS, how.tone)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Formalité</span>
              <span className="text-body font-semibold text-right">{how.formality || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted shrink-0">Langue</span>
              <span className="text-body font-semibold text-right">{getLanguageLabel(how.language)}</span>
            </div>
          </div>
        </div>

        {/* Section 6 : CONTEXTE */}
        <div className="space-y-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-primary">
            CONTEXTE
          </span>
          {context.mustInclude && (
            <div>
              <span className="font-semibold text-muted block text-[9px] uppercase tracking-[0.05em]">À intégrer</span>
              <p className="text-xs text-body bg-canvas/30 p-2 rounded border border-border/10 whitespace-pre-wrap">
                {context.mustInclude}
              </p>
            </div>
          )}
          {context.mustExclude && (
            <div>
              <span className="font-semibold text-muted block text-[9px] uppercase tracking-[0.05em]">À ne pas mentionner</span>
              <p className="text-xs text-body bg-canvas/30 p-2 rounded border border-border/10 whitespace-pre-wrap">
                {context.mustExclude}
              </p>
            </div>
          )}
          <div>
            <span className="font-semibold text-muted block text-[9px] uppercase tracking-[0.05em] mb-1">
              Sources utilisées
            </span>
            {latestVersion && latestVersion.sourceRefs && latestVersion.sourceRefs.length > 0 ? (
              <ul className="text-xs space-y-1 pl-3 list-disc text-body">
                {latestVersion.sourceRefs.map((ref, idx) => (
                  <li key={idx} className="truncate" title={formatSourceRef(ref)}>
                    {formatSourceRef(ref)}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-muted">Aucune source explicite</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Extract Tone, Format, Objective if available (for standard reports)
  let tone: string | null = null
  let format: string | null = null
  let objective: string | null = null
  let model: string | null = null

  if (appliedBrief && typeof appliedBrief === "object") {
    const brief = appliedBrief as Record<string, any>
    if (brief.preset && typeof brief.preset === "object") {
      tone = brief.preset.tone || null
      objective = brief.preset.objective || null
    } else {
      tone = brief.tone || null
      objective = brief.objective || null
    }
    format = brief.format || brief.outputFormats?.join(", ") || null
    model = brief.model || brief.modelName || null
  }

  return (
    <div className="space-y-4">
      {/* Type de document */}
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Type de document
        </span>
        <span className="text-xs font-semibold text-heading">
          {DOCUMENT_OBJECT_LABELS[document.documentType]} ({getDocumentTypeLabel(document.documentType)})
        </span>
      </div>

      {/* Date de génération */}
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Généré le
        </span>
        <span className="text-xs text-body">
          {formatDate(latestVersion?.createdAt || document.createdAt)}
        </span>
      </div>

      {/* Contexte / Sources */}
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
          Sources utilisées
        </span>
        {latestVersion && latestVersion.sourceRefs && latestVersion.sourceRefs.length > 0 ? (
          <ul className="text-xs space-y-1 pl-3 list-disc text-body">
            {latestVersion.sourceRefs.map((ref, idx) => (
              <li key={idx} className="truncate" title={formatSourceRef(ref)}>
                {formatSourceRef(ref)}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted">Aucune source explicite</span>
        )}
      </div>

      {/* Entités liées (Comptes, Contacts, Opportunités) */}
      {hasLinkedEntities && (
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Entités liées
          </span>
          <div className="space-y-1 text-xs">
            {linkedCompanies.map((link, idx) => (
              <div key={`comp-${idx}`} className="flex items-center gap-1">
                <span className="text-muted">Compte :</span>
                <Link
                  href={`/prospection/accounts/${link.entityId}`}
                  className="font-semibold text-body hover:text-primary transition-colors truncate"
                >
                  {link.label}
                </Link>
              </div>
            ))}
            {linkedContacts.map((link, idx) => (
              <div key={`cont-${idx}`} className="flex items-center gap-1">
                <span className="text-muted">Contact :</span>
                <span className="text-body font-semibold">{link.label}</span>
              </div>
            ))}
            {linkedOpportunities.map((link, idx) => (
              <div key={`opp-${idx}`} className="flex items-center gap-1">
                <span className="text-muted">Opportunité :</span>
                <span className="text-body font-semibold">{link.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ton / Format / Objectif */}
      {(tone || format || objective) && (
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
            Ton & Format appliqué
          </span>
          <div className="grid grid-cols-2 gap-2 text-xxs text-body">
            {tone && (
              <div>
                <span className="font-semibold text-muted block uppercase tracking-[0.05em]">Ton</span>
                <span className="text-body font-semibold">{tone}</span>
              </div>
            )}
            {format && (
              <div>
                <span className="font-semibold text-muted block uppercase tracking-[0.05em]">Format</span>
                <span className="text-body font-semibold">{format}</span>
              </div>
            )}
            {objective && (
              <div className="col-span-2">
                <span className="font-semibold text-muted block uppercase tracking-[0.05em]">Objectif</span>
                <span className="text-body font-semibold">{objective}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
