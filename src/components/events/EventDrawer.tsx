"use client"

import React, { useEffect, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CommunicationIntentMenu } from "@/components/communication/CommunicationIntentMenu"
import { useEventDrawerStore, type EventDrawerTab } from "@/hooks/use-event-drawer-store"
import { getEventDetailForDrawer, getEventResourceSignedUrl, type EventDrawerDetail, type EventResource } from "@/lib/agenda/event-drawer-actions"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import type { CommunicationEntryIntent } from "@/lib/communication/communication-entry-intents"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

// ── Types & Config ────────────────────────────────────────────────────────────

type CategoryId = "foisonnement" | "prospection" | "recrutement" | "management"

function resolveEventCategory(eventType: string, hasOpportunity: boolean): CategoryId {
  if (["sourcing_candidats", "entretien_candidat", "preparation_candidat"].includes(eventType)) {
    return "recrutement"
  }
  if (["appel_prospection", "rdv_prospection", "mailing_prospection"].includes(eventType)) {
    return "prospection"
  }
  if (["rdv_client_suivi", "appel_qualification", "suivi_mission_client"].includes(eventType)) {
    return "foisonnement"
  }
  if (["soutenance", "atelier_client", "presentation_rt"].includes(eventType)) {
    return hasOpportunity ? "prospection" : "foisonnement"
  }
  if (["suivi_mission_collab", "ead_collab", "entretien_rh", "preparation_collab"].includes(eventType)) {
    return "management"
  }
  return "foisonnement"
}

function resolveAgendaCommunicationIntent(data: EventDrawerDetail): CommunicationEntryIntent {
  if (data.candidate && ["entretien_candidat", "preparation_candidat", "sourcing_candidats"].includes(data.event_type)) {
    return "recruiter_preparation"
  }
  if (data.mission?.collaborator && data.event_type === "ead_collab") {
    return "consultant_annual_review"
  }
  if (data.mission?.collaborator && ["suivi_mission_collab", "preparation_collab"].includes(data.event_type)) {
    return "consultant_one_to_one"
  }
  if (data.mission?.collaborator && data.event_type === "entretien_rh") {
    return "consultant_sensitive_meeting"
  }
  if (data.company && data.opportunity && data.event_type === "soutenance") {
    return "proposal_defense"
  }
  if (data.company) {
    return "discovery_preparation"
  }
  return "agenda_event_preparation"
}

const CATEGORY_DETAILS: Record<CategoryId, {
  label: string
  bgBadge: string
  dot: string
  border: string
  text: string
}> = {
  foisonnement: {
    label: "Foisonnement",
    bgBadge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
    border: "border-indigo-500",
    text: "text-indigo-500",
  },
  prospection: {
    label: "Prospection",
    bgBadge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-500",
  },
  recrutement: {
    label: "Recrutement",
    bgBadge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-500",
  },
  management: {
    label: "Management",
    bgBadge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    border: "border-sky-500",
    text: "text-sky-500",
  },
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBuilding() {
  return (
    <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconSparkles() {
  return (
    <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconTask() {
  return (
    <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconVideo() {
  return (
    <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function IconFilePdf() {
  return (
    <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h1.5M9 13h6m-6 4h6" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

function IconFileGeneric() {
  return (
    <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function TimelineIcon({ type }: { type: string }) {
  switch (type) {
    case "rdv_client_suivi":
    case "rdv_prospection":
    case "suivi_mission_client":
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case "appel_qualification":
    case "appel_prospection":
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    case "sourcing_candidats":
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    case "entretien_candidat":
    case "entretien_rh":
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    case "soutenance":
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      )
    case "atelier_client":
    case "presentation_rt":
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    default:
      return (
        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

// ── Shared UI Parts ──────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center bg-canvas/30 rounded-xl border border-dashed border-border/80">
      <svg className="w-8 h-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
      <p className="text-xs text-muted font-medium">{message}</p>
    </div>
  )
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2">
      {label}
    </h3>
  )
}

// ── Tab 1: Details ────────────────────────────────────────────────────────────

interface TabDetailsProps {
  data: EventDrawerDetail
}

function TabDetails({ data }: TabDetailsProps) {
  const categoryId = resolveEventCategory(data.event_type, !!data.opportunity)
  const cat = CATEGORY_DETAILS[categoryId]
  const typeLabel = AGENDA_EVENT_TYPES[data.event_type]?.label || data.event_type

  const formattedStart = formatDateTime(data.starts_at)
  const formattedEnd = formatDateTime(data.ends_at)

  return (
    <div className="space-y-5">
      {/* Category Card */}
      <div
        className="rounded-xl border px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ background: "var(--color-canvas)", borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
            Catégorie d&apos;activité
          </span>
          <span className="text-xs font-bold text-heading">
            {cat.label}
          </span>
        </div>
        <span className={cn("text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border border-current shadow-sm", cat.bgBadge)}>
          {typeLabel}
        </span>
      </div>

      {/* Nature / Date & Hour */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Date Début */}
        <div className="border rounded-xl p-3 bg-surface border-border flex flex-col gap-0.5 shadow-sm">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Date de début</span>
          <span className="text-xs font-bold text-heading">{formattedStart}</span>
        </div>
        {/* Date Fin */}
        <div className="border rounded-xl p-3 bg-surface border-border flex flex-col gap-0.5 shadow-sm">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Date de fin</span>
          <span className="text-xs font-bold text-heading">{formattedEnd}</span>
        </div>
      </div>

      {/* Location / Meeting URL */}
      {(data.location || data.meeting_url) && (
        <div className="flex flex-col gap-2.5">
          <SectionTitle label="Lieu & Liens" />
          <div className="grid grid-cols-1 gap-2">
            {data.location && (
              <div className="flex items-center gap-2.5 p-3 bg-canvas/30 rounded-xl border border-border/60">
                <IconLocation />
                <span className="text-xs font-medium text-heading truncate">{data.location}</span>
              </div>
            )}
            {data.meeting_url && (
              <a
                href={data.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 bg-canvas/30 rounded-xl border border-border/60 hover:bg-canvas/50 transition-colors group cursor-pointer"
              >
                <IconVideo />
                <span className="text-xs font-bold text-primary group-hover:underline truncate">{data.meeting_url}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Relations CRM (Only display non-null entities) */}
      {(data.company || data.contact || data.opportunity || data.candidate) && (
        <div className="flex flex-col gap-2.5">
          <SectionTitle label="Entités Liées" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.company && (
              <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-3 shadow-sm">
                <span className="p-2 rounded bg-canvas text-muted">
                  <IconBuilding />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold uppercase block text-muted mb-0.5">Compte</span>
                  <span className="text-xs font-bold text-heading truncate block">{data.company.name}</span>
                </div>
              </div>
            )}
            {data.contact && (
              <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-3 shadow-sm">
                <span className="p-2 rounded bg-canvas text-muted">
                  <IconUser />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold uppercase block text-muted mb-0.5">Contact</span>
                  <span className="text-xs font-bold text-heading truncate block">
                    {data.contact.full_name}
                  </span>
                  {data.contact.job_title && (
                    <span className="text-[9px] text-muted block truncate mt-0.5">
                      {data.contact.job_title}
                    </span>
                  )}
                </div>
              </div>
            )}
            {data.opportunity && (
              <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-3 shadow-sm sm:col-span-2 md:col-span-1">
                <span className="p-2 rounded bg-canvas text-muted">
                  <IconSparkles />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold uppercase block text-muted mb-0.5">Opportunité</span>
                  <span className="text-xs font-bold text-heading truncate block">{data.opportunity.title}</span>
                </div>
              </div>
            )}
            {data.candidate && (
              <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-3 shadow-sm sm:col-span-2 md:col-span-1">
                <span className="p-2 rounded bg-canvas text-muted">
                  <IconBriefcase />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold uppercase block text-muted mb-0.5">Candidat</span>
                  <span className="text-xs font-bold text-heading truncate block">{data.candidate.full_name}</span>
                  {data.candidate.status && (
                    <span className="text-[9px] text-muted block truncate mt-0.5">
                      Statut : {data.candidate.status}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preparatory Task (Only display if exists) */}
      {data.preparatory_task && (
        <div className="flex flex-col gap-2.5">
          <SectionTitle label="Tâche Préparatoire" />
          <div className="p-3 bg-surface rounded-xl border border-border flex flex-col gap-2 shadow-sm border-l-3 border-l-amber-500">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-canvas text-amber-500">
                  <IconTask />
                </span>
                <span className="text-xs font-bold text-heading">{data.preparatory_task.title}</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded shadow-sm shrink-0">
                {data.preparatory_task.status === "completed" ? "Fait" : "En cours"}
              </span>
            </div>
            {data.preparatory_task.due_date && (
              <div className="text-[10px] text-muted font-medium flex items-center gap-1.5 mt-1 border-t border-border/30 pt-1.5 pl-1">
                <span>Échéance :</span>
                <span>{formatDateTime(data.preparatory_task.due_date)}</span>
                <span className="text-muted/30">|</span>
                <span className="capitalize">Priorité : {data.preparatory_task.priority}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Output ─────────────────────────────────────────────────────────────

interface TabOutputProps {
  data: EventDrawerDetail
}

function isEventResource(value: unknown): value is EventResource {
  if (!value || typeof value !== "object") return false

  const resource = value as Partial<EventResource>
  return typeof resource.name === "string" && typeof resource.type === "string"
}

function getEventResources(metadata: unknown): EventResource[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return []

  const resources = (metadata as { resources?: unknown }).resources
  return Array.isArray(resources) ? resources.filter(isEventResource) : []
}

function TabOutput({ data }: TabOutputProps) {
  const [downloadingName, setDownloadingName] = useState<string | null>(null)

  // Parse resources from metadata
  const resources = getEventResources(data.metadata)

  const handleResourceClick = async (res: EventResource) => {
    if (res.type === "link" && res.url) {
      window.open(res.url, "_blank")
      return
    }

    if (res.storage_path && res.bucket) {
      setDownloadingName(res.name)
      try {
        const url = await getEventResourceSignedUrl(res.bucket, res.storage_path)
        if (url) {
          window.open(url, "_blank")
        } else {
          alert("Impossible de générer le lien sécurisé pour ce document.")
        }
      } catch (err) {
        console.error("Download error:", err)
        alert("Erreur lors de la récupération du fichier.")
      } finally {
        setDownloadingName(null)
      }
    }
  }

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return ""
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Notes Section */}
      <div className="flex flex-col gap-2.5">
        <SectionTitle label="Compte Rendu / Notes" />
        {data.description ? (
          <div
            className="text-xs leading-relaxed border rounded-xl p-4 bg-surface text-body whitespace-pre-wrap shadow-sm leading-6"
            style={{ borderColor: "var(--color-border)" }}
          >
            {data.description}
          </div>
        ) : (
          <EmptyState message="Aucune note rédigée pour cet événement" />
        )}
      </div>

      {/* Resources Section */}
      <div className="flex flex-col gap-2.5">
        <SectionTitle label="Documents & Ressources" />
        {resources.length > 0 ? (
          <div className="space-y-2">
            {resources.map((res, index) => {
              const isPdf = res.type === "pdf"
              const isLink = res.type === "link"
              const isDownloading = downloadingName === res.name

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleResourceClick(res)}
                  disabled={isDownloading}
                  className="w-full p-3 bg-surface hover:bg-canvas/30 rounded-xl border border-border flex items-center justify-between transition-colors text-left group shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="p-1 rounded bg-canvas">
                      {isPdf ? <IconFilePdf /> : isLink ? <IconLink /> : <IconFileGeneric />}
                    </span>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-heading group-hover:text-primary group-hover:underline truncate block">
                        {res.name}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-1.5">
                        <span className="uppercase">{res.type}</span>
                        {res.size !== undefined && (
                          <>
                            <span>·</span>
                            <span>{formatBytes(res.size)}</span>
                          </>
                        )}
                        {res.created_at && (
                          <>
                            <span>·</span>
                            <span>{new Date(res.created_at).toLocaleDateString("fr-FR")}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                    {isDownloading ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Chargement…
                      </span>
                    ) : isLink ? (
                      "Ouvrir ↗"
                    ) : (
                      "Télécharger 📥"
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyState message="Aucune ressource rattachée à cet événement" />
        )}
      </div>
    </div>
  )
}

// ── Tab 3: Timeline ───────────────────────────────────────────────────────────

interface TabTimelineProps {
  data: EventDrawerDetail
  onEventClick: (id: string) => void
}

function TabTimeline({ data, onEventClick }: TabTimelineProps) {
  const currentEventId = data.id
  const timelineEvents = data.timeline

  if (timelineEvents.length === 0) {
    return <EmptyState message="Aucun événement lié dans cet historique" />
  }

  // Couleurs des icônes du type d'étape
  const getIconColorClasses = (eventType: string, opportunityLinked: boolean) => {
    const category = resolveEventCategory(eventType, opportunityLinked)
    switch (category) {
      case "foisonnement":
        return "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400"
      case "prospection":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
      case "recrutement":
        return "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
      case "management":
        return "bg-sky-500/10 border-sky-500/20 text-sky-500 dark:text-sky-400"
      default:
        return "bg-canvas text-muted border-border"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
          Contexte : {data.timelineContext.name}
        </span>
        <span className="text-[10px] text-muted italic font-medium">
          {timelineEvents.length} étape{timelineEvents.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative pl-5 border-l border-border/60 flex flex-col gap-4 py-2 ml-2">
        {timelineEvents.map((evt) => {
          const isActive = evt.id === currentEventId
          const label = AGENDA_EVENT_TYPES[evt.event_type]?.label || evt.event_type
          const iconClasses = getIconColorClasses(evt.event_type, !!data.opportunity)

          return (
            <button
              key={evt.id}
              type="button"
              onClick={() => onEventClick(evt.id)}
              className={cn(
                "w-full text-left relative group flex items-start gap-3.5 p-3 bg-canvas/10 rounded-xl border transition-all cursor-pointer",
                isActive
                  ? "border-primary/40 bg-primary/[0.03] shadow-sm"
                  : "border-transparent hover:border-border/60 hover:bg-canvas/30"
              )}
            >
              {/* Timeline outer circle dot on the vertical line */}
              <div
                className={cn(
                  "absolute -left-[27px] top-5 w-[14px] h-[14px] rounded-full bg-canvas border flex items-center justify-center transition-all",
                  isActive
                    ? "border-primary scale-110 shadow-sm"
                    : "border-border/60 group-hover:border-primary/50"
                )}
              >
                <div
                  className={cn(
                    "w-[6px] h-[6px] rounded-full transition-all",
                    isActive
                      ? "bg-primary"
                      : "bg-muted/40 group-hover:bg-primary/50"
                  )}
                />
              </div>

              {/* Icon Badge */}
              <div className={cn("w-7 h-7 rounded-md border flex items-center justify-center shrink-0 shadow-sm mt-0.5", iconClasses)}>
                <TimelineIcon type={evt.event_type} />
              </div>

              {/* Text Context */}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-xs font-bold leading-snug transition-colors", isActive ? "text-primary" : "text-heading group-hover:text-primary")}>
                    {label}
                  </span>
                  <span className="text-[9px] font-mono text-muted shrink-0 mt-0.5 font-medium">
                    {formatDateTime(evt.starts_at)}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-heading line-clamp-1 mt-0.5">
                  {evt.title}
                </span>

                {evt.description && (
                  <p className="text-[10px] text-body line-clamp-2 mt-1 leading-relaxed bg-canvas/20 px-2 py-1.5 rounded border border-border/30 max-w-full">
                    {evt.description}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main EventDrawer Component ───────────────────────────────────────────────

export function EventDrawer() {
  const { isOpen, eventId, activeTab, closeEventDrawer, setActiveTab, openEventDrawer } =
    useEventDrawerStore()

  const [data, setData] = useState<EventDrawerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false

    async function loadEventDetail() {
      await Promise.resolve()
      if (cancelled) return

      if (!isOpen || !eventId) {
        setData(null)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const detail = await getEventDetailForDrawer(eventId)
        if (cancelled) return

        if (!detail) {
          setError("Événement introuvable ou accès refusé.")
          setData(null)
        } else {
          setData(detail)
        }
      } catch (err) {
        if (cancelled) return
        console.error("Error loading event drawer details:", err)
        setError("Erreur lors de la récupération des données.")
        setData(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadEventDetail()

    return () => {
      cancelled = true
    }
  }, [isOpen, eventId])

  const handleNavigateEvent = (id: string) => {
    // Dynamically change event in same drawer
    openEventDrawer(id, activeTab)
  }

  const handleRetry = () => {
    if (eventId) {
      openEventDrawer(eventId, activeTab)
    }
  }

  const titleText = data ? data.title : "Consultation d'événement"
  const natureText = data
    ? AGENDA_EVENT_TYPES[data.event_type]?.label || data.event_type
    : "Détails"
  const agendaIntent = data ? resolveAgendaCommunicationIntent(data) : null
  const eventParticipants = data
    ? [
        data.contact?.full_name,
        data.candidate?.full_name,
        data.mission?.collaborator?.full_name,
      ].filter((name): name is string => Boolean(name))
    : []

  const TABS: Array<{ id: EventDrawerTab; label: string }> = [
    { id: "details", label: "Détails" },
    { id: "output", label: "Output" },
    { id: "timeline", label: "Timeline" },
  ]

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeEventDrawer()
      }}
      title={titleText}
      subtitle={data ? `Nature : ${natureText}` : undefined}
      loading={loading}
      error={
        error
          ? {
              title: "Impossible de charger l'événement",
              description: error,
              action: (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-danger text-danger-fg hover:bg-danger/90 cursor-pointer"
                >
                  Réessayer
                </button>
              ),
            }
          : null
      }
      className="max-w-[480px]"
    >
      {data && (
        <div className="flex flex-col h-full w-full">
          {agendaIntent && (
            <div className="-mt-2 mb-4 flex justify-end">
              <CommunicationIntentMenu
                label="Préparer avec l’IA"
                origin="calendar_event"
                scope={agendaIntent.startsWith("consultant_") ? "collaborator" : agendaIntent === "agenda_event_preparation" ? "internal" : "account"}
                companyId={data.company?.id ?? null}
                companyName={data.company?.name ?? null}
                contactId={data.contact?.id ?? null}
                contactName={data.contact?.full_name ?? null}
                opportunityId={data.opportunity?.id ?? null}
                opportunityTitle={data.opportunity?.title ?? null}
                missionId={data.mission?.id ?? null}
                missionTitle={data.mission?.title ?? null}
                candidateId={data.candidate?.id ?? null}
                candidateName={data.candidate?.full_name ?? null}
                collaboratorId={data.mission?.collaborator?.id ?? null}
                collaboratorName={data.mission?.collaborator?.full_name ?? null}
                eventId={data.id}
                eventTitle={data.title}
                eventType={data.event_type}
                eventStartsAt={data.starts_at}
                eventLocation={data.location}
                eventMeetingUrl={data.meeting_url}
                eventParticipants={eventParticipants}
                eventDescription={data.description}
                primaryEntity={{ type: "calendar_event", id: data.id }}
                internalDomain="operations"
                mustInclude={[
                  "[AGENDA_CONTEXT]",
                  `Titre : ${data.title}`,
                  `Type : ${data.event_type}`,
                  `Début : ${formatDateTime(data.starts_at)}`,
                  data.location ? `Lieu : ${data.location}` : null,
                  data.meeting_url ? `Lien réunion : ${data.meeting_url}` : null,
                  data.description ? `Description : ${data.description}` : null,
                ].filter(Boolean).join("\n")}
                refs={{
                  ...(data.company?.id ? { companyRef: data.company.id } : {}),
                  ...(data.opportunity?.id ? { opportunityRef: data.opportunity.id } : {}),
                  ...(data.mission?.id ? { missionRef: data.mission.id } : {}),
                  ...(data.candidate?.id ? { profileRef: data.candidate.id } : {}),
                  ...(data.mission?.collaborator?.id ? { collaboratorRef: data.mission.collaborator.id } : {}),
                }}
                items={[{ intent: agendaIntent }]}
              />
            </div>
          )}
          {/* Tab Selection Row */}
          <div
            className="-mt-4 mb-4 flex gap-1 border-b"
            style={{ borderColor: "var(--color-border)" }}
            role="tablist"
          >
            {TABS.map(({ id, label }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(id)}
                  className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer"
                  style={{
                    color: isActive ? "var(--color-primary)" : "var(--color-muted)",
                    borderBottom: isActive
                      ? "2px solid var(--color-primary)"
                      : "2px solid transparent",
                    marginBottom: "-1px",
                    background: "transparent",
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Active Tab View */}
          <div role="tabpanel" className="flex-1 min-h-0 pb-6">
            {activeTab === "details" && <TabDetails data={data} />}
            {activeTab === "output" && <TabOutput data={data} />}
            {activeTab === "timeline" && (
              <TabTimeline data={data} onEventClick={handleNavigateEvent} />
            )}
          </div>
        </div>
      )}
    </AppDrawer>
  )
}
