"use client"

import React from "react"
import Link from "next/link"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"
import { DOCUMENT_OBJECT_LABELS, getDocumentTypeLabel } from "./document-display"

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

export function DocumentGenerationParameters({ document }: DocumentGenerationParametersProps) {
  const latestVersion = document.versions[0] ?? null
  const appliedBrief = latestVersion?.sourceRunInputSnapshot ?? latestVersion?.briefJson ?? null

  // Extract Tone, Format, Objective if available
  let tone: string | null = null
  let format: string | null = null
  let objective: string | null = null
  let model: string | null = null

  if (appliedBrief && typeof appliedBrief === "object") {
    const brief = appliedBrief as Record<string, any>
    // Communication briefs
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

  // Quality flags & warnings
  const qaFlags = latestVersion?.qaFlags || []
  const failedFlags = qaFlags.filter((flag: any) => flag && typeof flag === "object" && !flag.passed)
  const qualityStatus = qaFlags.length > 0 ? (failedFlags.length === 0 ? "Qualité OK" : "À vérifier") : null

  // Linked entities
  const linkedCompanies = document.links.filter(l => l.entityType === "company")
  const linkedContacts = document.links.filter(l => l.entityType === "contact")
  const linkedOpportunities = document.links.filter(l => l.entityType === "opportunity")

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

      {/* Modèle / Workflow / Run */}
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Moteur & Run
        </span>
        <div className="text-xs space-y-0.5">
          <p className="text-body font-mono">
            Modèle: <span className="text-heading font-semibold">{model || "KREDO-GPT-4o"}</span>
          </p>
          {latestVersion?.sourceRunId && (
            <p className="text-xxs text-muted font-mono truncate" title={latestVersion.sourceRunId}>
              Run: {latestVersion.sourceRunId}
            </p>
          )}
        </div>
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
      {(linkedCompanies.length > 0 || linkedContacts.length > 0 || linkedOpportunities.length > 0) && (
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

      {/* Qualité & Warnings */}
      {qualityStatus && (
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
            Statut Qualité
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-body font-semibold">
              <span className={`size-1.5 rounded-full ${failedFlags.length === 0 ? "bg-success" : "bg-warning"}`} />
              <span>{qualityStatus}</span>
            </div>

            {failedFlags.length > 0 && (
              <ul className="text-[10px] text-muted/80 space-y-1 list-disc pl-3 leading-snug">
                {failedFlags.map((flag: any, idx: number) => (
                  <li key={idx}>
                    {flag.detail || flag.check || "Erreur non spécifiée"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
