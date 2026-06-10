"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { getContactIdentity } from "@/app/(app)/prospection/accounts/actions"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

interface ContactIdentityDrawerProps {
  contactId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCompanyIdentity?: (companyId: string) => void
  onOpenContactIdentity?: (contactId: string) => void
  onEditContact?: (contactId: string) => void
}

type ContactIdentityData = {
  contact: {
    id: string
    person_id: string
    company_id: string | null
    job_title: string | null
    relationship_role: string | null
    relationship_level: string | null
    decision_power: string | null
    department: string | null
    notes: string | null
    status: string
    persons: {
      id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
      primary_email: string | null
      phone: string | null
      linkedin_url: string | null
      location: string | null
      notes: string | null
    } | null
    companies: {
      id: string
      name: string
      sector: string | null
      segment: string | null
      website: string | null
      hq_location: string | null
      priority: string
      lifecycle_status: string
      description: string | null
      revenue: string | null
      employee_count: number | null
      size_band: string | null
      health: string | null
      ai_score: number | string | null
      metadata?: any
    } | null
  }
  interactions: Array<{
    id: string
    type: string
    occurred_at: string
    summary: string | null
    sentiment: string | null
    details: any
    next_action: string | null
  }>
  opportunities: Array<{
    id: string
    title: string
    opportunity_type: string
    stage: string
    priority: string
    conviction: number
    target_daily_rate: number | null
    duration_days: number | null
    estimated_gain: number | null
    target_close_date: string | null
    acv: number | null
    contact_role: string | null
  }>
  tasks: Array<{
    id: string
    title: string
    description: string | null
    due_date: string | null
    priority: string
    status: string
    completed_at: string | null
  }>
  manager: { id: string; fullName: string; job_title: string | null } | null
  reports: Array<{ id: string; fullName: string; job_title: string | null }>
}

type TabKey = "apercu" | "activite" | "taches"

function formatScore(score: number | string | null) {
  if (score === null || score === undefined) return "—"
  return `${score}/5`
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Non renseignée"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getInitials(firstName?: string | null, lastName?: string | null, fullName?: string | null) {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase()
  }
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0]?.slice(0, 2).toUpperCase() || "??"
  }
  return "??"
}

function getAvatarBgColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  return `hsl(${h}, 55%, 43%)`
}

export function ContactIdentityDrawer({
  contactId,
  open,
  onOpenChange,
  onOpenCompanyIdentity,
  onOpenContactIdentity,
  onEditContact,
}: ContactIdentityDrawerProps) {
  const [data, setData] = useState<ContactIdentityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("apercu")
  const [transitionPending, startTransition] = useTransition()

  const loading = transitionPending || (open && !!contactId && !data && !error)

  useEffect(() => {
    if (!open || !contactId) {
      return
    }

    startTransition(async () => {
      setError(null)
      setActiveTab("apercu")
      try {
        const response = await getContactIdentity(contactId)
        if (response.error) {
          setError(response.error)
        } else {
          setData(response.data as unknown as ContactIdentityData)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur de chargement")
      }
    })

    return () => {
      setData(null)
    }
  }, [contactId, open])

  const personRaw = data?.contact?.persons
  const person = Array.isArray(personRaw) ? personRaw[0] : personRaw
  const company = data?.contact?.companies
  const contact = data?.contact

  const fullName = person
    ? person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()
    : "Chargement..."

  const initials = person ? getInitials(person.first_name, person.last_name, person.full_name) : "??"
  const avatarBg = person ? getAvatarBgColor(fullName) : "var(--color-primary)"

  const relationshipRoleDisplay = contact?.relationship_role 
    ? contact.relationship_role.replace("_", " ") 
    : "Non spécifié"

  const relationshipLevelDisplay = contact?.relationship_level 
    ? contact.relationship_level.replace("_", " ") 
    : "Non spécifié"

  const decisionPowerDisplay = contact?.decision_power 
    ? contact.decision_power.replace("_", " ") 
    : "Non spécifié"

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={fullName}
      subtitle={
        contact
          ? [contact.job_title, company?.name].filter(Boolean).join(" - ") || "Fiche contact"
          : "Fiche contact"
      }
      className="max-w-2xl"
    >
      {loading ? (
        <div className="flex flex-col gap-6 p-2">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 bg-border/40 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-border/40 rounded" />
              <div className="h-3 w-1/2 bg-border/40 rounded" />
            </div>
          </div>

          <hr className="border-border/40" />

          {/* Body Skeleton */}
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-border/20 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-border/20 rounded-lg" />
              <div className="h-16 bg-border/20 rounded-lg" />
            </div>
            <div className="h-36 bg-border/20 rounded-lg" />
          </div>
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <SurfaceCard className="p-6 border-danger/20 bg-danger/5 text-danger flex flex-col gap-2 items-center">
            <svg className="w-8 h-8 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-bold text-sm">Erreur de chargement</span>
            <p className="text-xs opacity-80">{error}</p>
          </SurfaceCard>
        </div>
      ) : data && contact && person ? (
        <div className="flex flex-col h-full gap-5">
          {/* Identity Summary Card */}
          <div className="flex flex-col gap-4 bg-canvas/30 rounded-xl border border-border/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-heading font-extrabold text-lg shadow-inner shrink-0"
                  style={{ backgroundColor: avatarBg }}
                >
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-heading leading-tight">{fullName}</h3>
                  </div>
                  {contact.job_title && (
                    <span className="text-[11px] text-muted font-medium block mt-0.5 leading-tight">
                      {contact.job_title}
                    </span>
                  )}
                </div>
              </div>
                         {/* Edit Button */}
              <div className="flex flex-col items-end shrink-0">
                {onEditContact && (
                  <button
                    onClick={() => onEditContact(contact.id)}
                    className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2 py-0.5 rounded transition-colors"
                    title="Modifier les informations du contact"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Éditer
                  </button>
                )}
              </div>
            </div>

            {/* Quick professional attributes row - Distributed equally */}
            <div className="grid grid-cols-3 gap-2 items-center pt-2.5 border-t border-border/40 text-[10px] w-full text-center">
              <span className="rounded bg-primary-fg border border-border px-2 py-1 font-semibold text-body truncate">
                Rôle : <span className="capitalize font-bold text-primary">{relationshipRoleDisplay}</span>
              </span>
              <span className="rounded bg-primary-fg border border-border px-2 py-1 font-semibold text-body truncate">
                Intimité : <span className="capitalize font-bold text-primary">{relationshipLevelDisplay}</span>
              </span>
              <span className={cn(
                "rounded border px-2 py-1 font-semibold truncate",
                contact.status === "actif" 
                  ? "bg-success/5 border-success/20 text-success" 
                  : "bg-primary-fg border-border text-body"
              )}>
                Statut : <span className={cn("capitalize font-bold", contact.status === "actif" ? "text-success" : "text-primary")}>{contact.status}</span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex w-full border-b border-border gap-1 shrink-0">
            {(
              [
                { key: "apercu", label: "Aperçu" },
                { key: "activite", label: `Activité (${data.interactions.length + data.opportunities.length})` },
                { key: "taches", label: `Tâches (${data.tasks.length})` },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex-1 px-2 py-2 text-xs font-semibold border-b-2 -mb-px transition-all outline-none text-center whitespace-nowrap",
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-heading"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === "apercu" && (
              <div className="space-y-5">
                {/* Contact Coordinates */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                    Coordonnées personnelles
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* E-mail */}
                    {person.primary_email ? (
                      <a
                        href={`mailto:${person.primary_email}`}
                        className="p-3 bg-canvas/30 rounded border border-border/50 flex items-center gap-3 hover:bg-canvas/50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-muted font-bold uppercase block leading-none mb-0.5">E-mail</span>
                          <span className="text-xs font-semibold text-heading truncate block group-hover:text-primary transition-colors">{person.primary_email}</span>
                        </div>
                      </a>
                    ) : (
                      <div className="p-3 bg-canvas/30 rounded border border-border/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-muted">
                          <svg className="w-4 h-4 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-muted font-bold uppercase block leading-none mb-0.5">E-mail</span>
                          <span className="text-xs font-semibold text-muted/60 block">-</span>
                        </div>
                      </div>
                    )}

                    {/* Téléphone */}
                    {person.phone ? (
                      <a
                        href={`tel:${person.phone}`}
                        className="p-3 bg-canvas/30 rounded border border-border/50 flex items-center gap-3 hover:bg-canvas/50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-muted font-bold uppercase block leading-none mb-0.5">Téléphone</span>
                          <span className="text-xs font-semibold text-heading truncate block group-hover:text-primary transition-colors">{person.phone}</span>
                        </div>
                      </a>
                    ) : (
                      <div className="p-3 bg-canvas/30 rounded border border-border/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-muted">
                          <svg className="w-4 h-4 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-muted font-bold uppercase block leading-none mb-0.5">Téléphone</span>
                          <span className="text-xs font-semibold text-muted/60 block">-</span>
                        </div>
                      </div>
                    )}

                    {person.linkedin_url && (
                      <a
                        href={person.linkedin_url.startsWith("http") ? person.linkedin_url : `https://${person.linkedin_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-canvas/30 rounded border border-border/50 flex items-center gap-3 hover:bg-canvas/50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-muted font-bold uppercase block leading-none mb-0.5">LinkedIn</span>
                          <span className="text-xs font-semibold text-heading truncate block group-hover:text-primary transition-colors">Profil public</span>
                        </div>
                      </a>
                    )}

                    {person.location && (
                      <div className="p-3 bg-canvas/30 rounded border border-border/50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] text-muted font-bold uppercase block leading-none mb-0.5">Localisation</span>
                          <span className="text-xs font-semibold text-heading truncate block">{person.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal notes */}
                {(contact.notes || person.notes) && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Notes & Observations
                    </h4>
                    <div className="text-xs leading-relaxed text-heading bg-primary/5 border border-primary/10 rounded-lg p-4 font-normal shadow-sm whitespace-pre-wrap">
                      {contact.notes || person.notes}
                    </div>
                  </div>
                )}

                {/* Associated Company Card */}
                {company && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Compte associé
                    </h4>
                    <div 
                      onClick={() => onOpenCompanyIdentity?.(company.id)}
                      className="group bg-canvas/30 rounded-xl border border-border/50 p-3.5 cursor-pointer hover:border-primary/50 hover:bg-canvas/50 transition-all shadow-sm"
                      title="Consulter la fiche complète de l'entreprise"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Left Side: Name, Sector/Segment, Priority */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-heading group-hover:text-primary transition-colors leading-tight">
                              {company.name}
                            </span>
                            {company.website && (
                              <a
                                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded text-muted hover:text-primary hover:bg-primary/10 transition-colors shrink-0 -mt-0.5"
                                title="Visiter le site internet"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-muted mt-0.5 block leading-tight">
                            {company.sector} {company.segment ? `· ${company.segment}` : ""}
                          </span>
                          
                          <span className={cn(
                            "inline-block rounded px-1.5 py-0.2 text-[8px] font-bold border capitalize tracking-wide mt-1 leading-none",
                            company.priority === "haute" 
                              ? "bg-warning/10 border-warning/20 text-warning" 
                              : "bg-canvas text-body border-border"
                          )}>
                            Priorité {company.priority}
                          </span>
                        </div>

                        {/* Right Side: 3 KPIs - Distributed equally on same line, no outer frame */}
                        <div className="flex items-center gap-2 shrink-0 text-center text-[9px] leading-tight">
                          <div className="flex flex-col justify-center min-w-[32px] px-1">
                            <span className="text-muted block text-[7px] uppercase tracking-tight font-medium">CA</span>
                            <span className="font-bold text-heading mt-0.5 block">{company.revenue || "—"}</span>
                          </div>
                          <div className="border-l border-border/40 h-5 my-auto" />
                          <div className="flex flex-col justify-center min-w-[40px] px-1">
                            <span className="text-muted block text-[7px] uppercase tracking-tight font-medium">Effectifs</span>
                            <span className="font-bold text-heading mt-0.5 block">
                              {company.employee_count !== null ? company.employee_count : "—"}
                            </span>
                          </div>
                          <div className="border-l border-border/40 h-5 my-auto" />
                          <div className="flex flex-col justify-center min-w-[40px] px-1">
                            <span className="text-muted block text-[7px] uppercase tracking-tight font-medium">Score IA</span>
                            <span className="font-bold text-primary mt-0.5 block">{formatScore(company.ai_score)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Organigramme / Hiérarchie */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                    Organigramme & Hiérarchie
                  </h4>
                  <div className="bg-canvas/30 rounded-xl border border-border/50 p-4 flex flex-col items-center">
                    {/* N+1 Manager */}
                    {data.manager ? (
                      <div className="flex flex-col items-center w-full max-w-xs animate-in fade-in slide-in-from-top-1 duration-200">
                        <div 
                          onClick={() => {
                            if (data.manager?.id && onOpenContactIdentity) {
                              onOpenContactIdentity(data.manager.id)
                            }
                          }}
                          className={cn(
                            "bg-canvas/50 border border-border/60 rounded-lg p-2.5 w-full text-center transition-all shadow-sm group",
                            onOpenContactIdentity ? "cursor-pointer hover:border-primary/50 hover:bg-canvas/80" : ""
                          )}
                          title={onOpenContactIdentity ? "Consulter la fiche du manager" : undefined}
                        >
                          <span className="text-[9px] text-muted font-bold uppercase tracking-tight block">N+1 · Manager</span>
                          <span className={cn(
                            "text-xs font-bold text-heading block mt-0.5 transition-colors",
                            onOpenContactIdentity ? "group-hover:text-primary" : ""
                          )}>
                            {data.manager.fullName}
                          </span>
                          <span className="text-[10px] text-muted block mt-0.5 truncate">
                            {data.manager.job_title || "Fonction non spécifiée"}
                          </span>
                        </div>
                        
                        {/* Vertical line connector */}
                        <div className="w-px h-5 bg-border/80 my-1.5" />
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-muted/75 mb-2 italic">
                        Aucun manager (N+1) renseigné.
                      </div>
                    )}

                    {/* Current Contact */}
                    <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 w-full max-w-xs text-center shadow-sm relative">
                      <span className="text-[9px] text-primary font-bold uppercase tracking-tight block truncate">
                        {contact.department ? contact.department : "Aucun département renseigné"}
                      </span>
                      <span className="text-xs font-extrabold text-heading block mt-0.5">
                        {fullName}
                      </span>
                      <span className="text-[10px] text-muted block mt-0.5 truncate">
                        {contact.job_title || "Fonction non spécifiée"}
                      </span>
                    </div>

                    {/* N-1 Direct Reports */}
                    {data.reports && data.reports.length > 0 && (
                      <div className="flex flex-col items-center w-full mt-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
                        {/* Connector line */}
                        <div className="w-px h-5 bg-border/80" />
                        
                        {/* Horizontal connector bar if more than 1 report */}
                        {data.reports.length > 1 && (
                          <div className="h-px bg-border/80 w-[60%] -mt-px mb-1.5" />
                        )}
                        
                        <div className={cn(
                          "grid gap-3 w-full justify-center",
                          data.reports.length === 1 ? "grid-cols-1 max-w-xs" : "grid-cols-2 max-w-md"
                        )}>
                          {data.reports.map((rep) => (
                            <div key={rep.id} className="relative flex flex-col items-center">
                              {/* Small vertical connector down from horizontal bar */}
                              {data.reports.length > 1 && (
                                <div className="w-px h-1.5 bg-border/80 -mt-3.5 mb-1.5" />
                              )}
                              
                              <div
                                onClick={() => {
                                  if (onOpenContactIdentity) {
                                    onOpenContactIdentity(rep.id)
                                  }
                                }}
                                className={cn(
                                  "bg-canvas/40 border border-border/50 rounded-lg p-2 w-full text-center transition-all shadow-sm group",
                                  onOpenContactIdentity ? "cursor-pointer hover:border-primary/50 hover:bg-canvas/75" : ""
                                )}
                                title={onOpenContactIdentity ? "Consulter la fiche du collaborateur" : undefined}
                              >
                                <span className="text-[9px] text-muted font-bold uppercase tracking-tight block">N-1 · Collaborateur</span>
                                <span className={cn(
                                  "text-xs font-bold text-heading block mt-0.5 transition-colors truncate",
                                  onOpenContactIdentity ? "group-hover:text-primary" : ""
                                )}>
                                  {rep.fullName}
                                </span>
                                <span className="text-[10px] text-muted block mt-0.5 truncate">
                                  {rep.job_title || "Sans fonction"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activite" && (
              <div className="space-y-6">
                {/* Opportunities Section */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-3">
                    Opportunités rattachées ({data.opportunities.length})
                  </h4>
                  {data.opportunities.length === 0 ? (
                    <div className="text-center py-6 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                      Ce contact n&apos;est rattaché à aucune opportunité commerciale.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {data.opportunities.map((opp) => (
                        <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className="text-xs font-semibold text-heading truncate block">{opp.title}</span>
                              {opp.contact_role && (
                                <span className="text-[10px] text-primary/80 font-medium block mt-0.5">
                                  Rôle contact : <strong className="font-semibold capitalize">{opp.contact_role.replace("_", " ")}</strong>
                                </span>
                              )}
                            </div>
                            <span className="rounded bg-success/10 border border-success/20 px-2 py-0.5 text-[9px] font-bold text-success capitalize shrink-0">
                              {opp.stage.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                            <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                            <span>Conviction : <strong className="text-body font-mono">{opp.conviction}%</strong></span>
                            {opp.acv && <span>ACV : <strong className="text-heading font-mono">{formatCurrency(opp.acv)}</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactions timeline */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-4">
                    Timeline des interactions ({data.interactions.length})
                  </h4>
                  {data.interactions.length === 0 ? (
                    <div className="text-center py-8 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                      Aucun historique d&apos;interaction avec ce contact.
                    </div>
                  ) : (
                    <div className="relative pl-5 border-l border-border/60 ml-2.5 space-y-5">
                      {data.interactions.map((it) => {
                        let dotColor = "bg-border"
                        if (it.sentiment === "positif") dotColor = "bg-success"
                        if (it.sentiment === "negatif") dotColor = "bg-danger"
                        if (it.sentiment === "neutre") dotColor = "bg-warning"

                        return (
                          <div key={it.id} className="relative">
                            {/* Dot timeline pin */}
                            <span className={cn(
                              "absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-surface shadow-sm",
                              dotColor
                            )} />

                            <div className="bg-canvas/30 border border-border/50 rounded-lg p-3">
                              <div className="flex justify-between items-start gap-2.5">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-heading capitalize">
                                    {it.type.replace("_", " ")}
                                  </span>
                                  <span className="text-[10px] text-muted font-normal block mt-0.5 font-mono">
                                    Le {formatDate(it.occurred_at)}
                                  </span>
                                </div>
                                {it.sentiment && (
                                  <span className={cn(
                                    "text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize font-mono shrink-0",
                                    it.sentiment === "positif" && "bg-success/5 text-success",
                                    it.sentiment === "negatif" && "bg-danger/5 text-danger",
                                    it.sentiment === "neutre" && "bg-warning/5 text-warning"
                                  )}>
                                    {it.sentiment}
                                  </span>
                                )}
                              </div>

                              {it.summary && (
                                <p className="text-[11px] text-body mt-2 leading-relaxed font-normal">
                                  {it.summary}
                                </p>
                              )}

                              {it.next_action && (
                                <div className="mt-2.5 pt-2 border-t border-border/30 text-[10px] text-muted font-normal">
                                  Prochaine étape : <strong className="text-primary font-medium">{it.next_action}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "taches" && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-2">
                  Tâches et Relances ({data.tasks.length})
                </h4>
                {data.tasks.length === 0 ? (
                  <div className="text-center py-10 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                    Aucune relance ou tâche planifiée pour ce contact.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.tasks.map((task) => (
                      <SurfaceCard key={task.id} className="p-3.5 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Simple simulated checkbox for display */}
                            <span className={cn(
                              "w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 text-white font-bold text-[10px]",
                              task.status === "completed" 
                                ? "bg-success border-success" 
                                : "border-border bg-canvas/40"
                            )}>
                              {task.status === "completed" && "✓"}
                            </span>
                            <div className="min-w-0">
                              <h5 className={cn(
                                "text-xs font-bold leading-tight",
                                task.status === "completed" ? "text-muted line-through" : "text-heading"
                              )}>
                                {task.title}
                              </h5>
                              {task.description && (
                                <p className="text-[10px] text-muted mt-1 leading-snug font-normal">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold border capitalize shrink-0 font-mono",
                            task.priority === "haute" && "bg-danger/10 border-danger/20 text-danger",
                            task.priority === "normale" && "bg-canvas border-border text-muted",
                            task.priority === "basse" && "bg-success/5 border-success/15 text-muted"
                          )}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Task metadata footer */}
                        <div className="flex items-center justify-between text-[9px] text-muted/80 font-mono border-t border-border/30 pt-2 mt-0.5">
                          {task.due_date ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Échéance : <strong className={cn(
                                "font-bold",
                                !task.completed_at && new Date(task.due_date) < new Date() ? "text-danger" : "text-body"
                              )}>{formatDate(task.due_date)}</strong>
                            </span>
                          ) : (
                            <span>Sans échéance</span>
                          )}

                          {task.completed_at && (
                            <span className="text-success font-medium">
                              Complétée le {formatDate(task.completed_at)}
                            </span>
                          )}
                        </div>
                      </SurfaceCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AppDrawer>
  )
}
