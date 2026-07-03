"use client"

import Image from "next/image"
import { useEffect, useState, useTransition, useCallback } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { getContactIdentity } from "@/app/(app)/prospection/accounts/actions"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { getOpportunityStageLabel } from "@/lib/opportunities/stages"
import { departmentLabel } from "@/lib/accounts-contacts/contact-constants"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { formatEuro, formatDate } from "@/lib/formatters"
import { TaskCreateModal } from "@/components/tasks/TaskCreateModal"
import { toggleTaskStatus, type TaskRow } from "@/lib/tasks/task-actions"
import { RegisterIntelligenceEntity } from "@/components/intelligence/RegisterIntelligenceEntity"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"

interface ContactIdentityDrawerProps {
  contactId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCompanyIdentity?: (companyId: string) => void
  onOpenContactIdentity?: (contactId: string) => void
  onEditContact?: (contactId: string) => void
  device?: "mobile" | "desktop"
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
    status: string
    is_priority: boolean | null
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
      metadata?: Record<string, unknown>
    } | null
  }
  interactions: Array<{
    id: string
    type: string
    occurred_at: string
    summary: string | null
    sentiment: string | null
    details: Record<string, unknown> | null
    next_action: string | null
  }>
  opportunities: Array<{
    id: string
    title: string
    opportunity_type: string
    stage: string
    priority: string
    conviction: number
    source: string | null
    seniority: string | null
    location: string | null
    remote_policy: string | null
    target_daily_rate: number | null
    duration_days: number | null
    estimated_gain: number | null
    target_close_date: string | null
    acv: number | null
    required_headcount: number
    requires_staffing: boolean
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
  manager: { id: string; fullName: string; job_title: string | null; email: string | null; phone: string | null } | null
  reports: Array<{ id: string; fullName: string; job_title: string | null }>
}

type TabKey = "apercu" | "activite" | "taches"

function formatScore(score: number | string | null) {
  if (score === null || score === undefined) return "—"
  return `${score}/5`
}


function formatOpportunityMeta(opportunity: ContactIdentityData["opportunities"][number]) {
  return [
    opportunity.seniority,
    opportunity.location,
    opportunity.remote_policy ? opportunity.remote_policy.replaceAll("_", " ") : null,
    opportunity.source ? opportunity.source.replaceAll("_", " ") : null,
  ].filter(Boolean).join(" · ")
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

function CompanyMiniModal({
  company,
  onClose,
  onOpenCompany,
}: {
  company: NonNullable<ContactIdentityData["contact"]["companies"]>
  onClose: () => void
  onOpenCompany?: (companyId: string) => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px]">
        <SurfaceCard
          className="w-full p-5 border border-border/80 animate-in zoom-in-95 duration-200 flex flex-col gap-3.5 relative bg-surface"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted hover:text-heading transition-colors"
            title="Fermer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="text-sm font-bold text-heading font-heading pr-6 leading-tight border-b border-border/40 pb-2.5">
            {company.name}
          </h3>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-canvas/40 border border-border/30 rounded p-2 flex flex-col gap-0.5 min-w-0">
              <span className="text-muted font-medium text-[8px] uppercase tracking-wider">Secteur</span>
              <span className="font-bold text-heading truncate" title={company.sector || "—"}>{company.sector || "—"}</span>
            </div>
            <div className="bg-canvas/40 border border-border/30 rounded p-2 flex flex-col gap-0.5 min-w-0">
              <span className="text-muted font-medium text-[8px] uppercase tracking-wider">Segment</span>
              <span className="font-bold text-heading truncate" title={company.segment || "—"}>{company.segment || "—"}</span>
            </div>
            <div className="bg-canvas/40 border border-border/30 rounded p-2 flex flex-col gap-0.5 min-w-0">
              <span className="text-muted font-medium text-[8px] uppercase tracking-wider">Chiffre d&apos;affaires</span>
              <span className="font-bold text-heading truncate" title={company.revenue || "—"}>{company.revenue || "—"}</span>
            </div>
            <div className="bg-canvas/40 border border-border/30 rounded p-2 flex flex-col gap-0.5 min-w-0">
              <span className="text-muted font-medium text-[8px] uppercase tracking-wider">Employés</span>
              <span className="font-bold text-heading">
                {company.employee_count !== null ? company.employee_count.toLocaleString("fr-FR") : "—"}
              </span>
            </div>
            <div className="bg-canvas/40 border border-border/30 rounded p-2 flex flex-col gap-0.5 min-w-0">
              <span className="text-muted font-medium text-[8px] uppercase tracking-wider">Priorité</span>
              <span className="font-bold text-heading capitalize truncate" title={company.priority || "—"}>{company.priority || "—"}</span>
            </div>
            <div className="bg-canvas/40 border border-border/30 rounded p-2 flex flex-col gap-0.5 min-w-0">
              <span className="text-muted font-medium text-[8px] uppercase tracking-wider">Score IA</span>
              <span className="font-bold text-primary">{formatScore(company.ai_score)}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40 mt-1">
            <button
              onClick={() => {
                if (onOpenCompany) {
                  onOpenCompany(company.id)
                }
                onClose()
              }}
              className="text-[9px] font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 shrink-0"
              title="Consulter la fiche complète de l'entreprise"
            >
              Consulter la fiche
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

function ManagerMiniModal({
  manager,
  onClose,
  onOpenContact,
}: {
  manager: NonNullable<ContactIdentityData["manager"]>
  onClose: () => void
  onOpenContact?: (contactId: string) => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px]">
        <SurfaceCard
          className="w-full p-5 border border-border/80 animate-in zoom-in-95 duration-200 flex flex-col gap-3.5 relative bg-surface"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted hover:text-heading transition-colors"
            title="Fermer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="text-sm font-bold text-heading font-heading pr-6 leading-tight border-b border-border/40 pb-2.5">
            {manager.fullName}
          </h3>

          <div className="flex flex-col gap-2.5 text-[11px]">
            <div className="flex justify-between items-center py-1 border-b border-border/20">
              <span className="text-muted font-medium">Fonction :</span>
              <span className="font-bold text-heading text-right truncate max-w-[170px]" title={manager.job_title || "—"}>
                {manager.job_title || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/20">
              <span className="text-muted font-medium">Téléphone :</span>
              <span className="font-bold text-heading text-right">{manager.phone || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted font-medium">E-mail :</span>
              <span className="font-bold text-heading text-right truncate max-w-[170px]" title={manager.email || "—"}>
                {manager.email || "—"}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40 mt-1">
            <button
              onClick={() => {
                if (onOpenContact) {
                  onOpenContact(manager.id)
                }
                onClose()
              }}
              className="text-[9px] font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 shrink-0"
              title="Consulter la fiche complète du contact"
            >
              Consulter la fiche
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

export function ContactIdentityDrawer({
  contactId,
  open,
  onOpenChange,
  onOpenCompanyIdentity,
  onOpenContactIdentity,
  onEditContact,
  device,
}: ContactIdentityDrawerProps) {
  const [data, setData] = useState<ContactIdentityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("apercu")
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [transitionPending, startTransition] = useTransition()

  const handleTaskCreated = useCallback((task: TaskRow) => {
    setData((prev) =>
      prev ? { ...prev, tasks: [...prev.tasks, task] } : prev
    )
  }, [])

  const handleToggleTask = useCallback(async (taskId: string, currentStatus: string) => {
    const isDone = currentStatus !== "done"
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: isDone ? "done" : "open",
                completed_at: isDone ? new Date().toISOString() : null,
              }
            : t
        ),
      }
    })
    await toggleTaskStatus(taskId, isDone)
  }, [])

  const loading = transitionPending || (open && !!contactId && !data && !error)

  useEffect(() => {
    if (!open || !contactId) {
      return
    }

    startTransition(async () => {
      setError(null)
      setActiveTab("apercu")
      setIsCompanyModalOpen(false)
      setIsManagerModalOpen(false)
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
      title={
        company ? (
          <span className="flex items-center gap-2 min-w-0">
            <CompanyLogo
              name={company.name}
              logoPath={(company.metadata?.logo_path as string) || null}
              website={company.website}
              size="sm"
              className="shrink-0 rounded"
            />
            <span className="truncate font-bold">{company.name}</span>
          </span>
        ) : (
          <span>{fullName || "Fiche contact"}</span>
        )
      }
      subtitle={contact ? fullName : undefined}
      hideHeaderOnDesktop
      className="max-w-2xl kredo-identity-drawer"
    >
      {open && contactId && person && (
        <RegisterIntelligenceEntity entityType="contact" entityId={contactId} label={fullName} />
      )}
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
            <div className="h-24 bg-border/20 rounded-[var(--radius-medium)]" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-border/20 rounded-[var(--radius-medium)]" />
              <div className="h-16 bg-border/20 rounded-[var(--radius-medium)]" />
            </div>
            <div className="h-36 bg-border/20 rounded-[var(--radius-medium)]" />
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
          {company && isCompanyModalOpen && (
            <CompanyMiniModal
              company={company}
              onClose={() => setIsCompanyModalOpen(false)}
              onOpenCompany={onOpenCompanyIdentity}
            />
          )}

          {data.manager && isManagerModalOpen && (
            <ManagerMiniModal
              manager={data.manager}
              onClose={() => setIsManagerModalOpen(false)}
              onOpenContact={onOpenContactIdentity}
            />
          )}

          {/* Identity Summary Card — bleu sur toutes les surfaces */}
          <div className={cn(
            "flex flex-col gap-4 p-4 rounded-[var(--radius-medium)] border transition-all",
            "bg-primary text-white border-primary/20",
            contact.relationship_role === "decideur" && "border-l-[4px] border-l-[#FFB812]"
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Logo du compte (ou avatar initiales) */}
                {company ? (
                  <div
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0"
                    title="Voir les détails du compte"
                  >
                    <CompanyLogo
                      name={company.name}
                      logoPath={(company.metadata?.logo_path as string) || null}
                      website={company.website}
                      size="xl"
                      className="rounded-full w-14 h-14 border-white/20"
                    />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-heading font-extrabold text-lg shrink-0"
                    style={{ backgroundColor: avatarBg }}
                  >
                    {initials}
                  </div>
                )}

                <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white leading-tight truncate">{fullName}</h3>
                    {contact.job_title && (
                      <span className="text-[11px] text-white/80 font-medium block mt-0.5 leading-tight truncate">
                        {contact.job_title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {company && (
                      <ContextualCommunicationButton
                        entryPoint="contact_drawer"
                        companyId={company.id}
                        companyName={company.name}
                        contactId={contact.id}
                        primaryEntity={{ type: "contact", id: contact.id }}
                        label="Rédiger un email"
                        variant="secondary"
                        className="h-8 min-h-8 border-white/20 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/20"
                        aria-label={`Rédiger un email pour ${fullName}`}
                        refs={{
                          angle: [
                            contact.job_title ? `Fonction: ${contact.job_title}` : null,
                            contact.relationship_role ? `Rôle relationnel: ${contact.relationship_role}` : null,
                            contact.relationship_level ? `Niveau de relation: ${contact.relationship_level}` : null,
                          ].filter(Boolean).join(" · ") || undefined,
                        }}
                      />
                    )}
                    {onEditContact && (
                      <button
                        onClick={() => onEditContact(contact.id)}
                        className="rounded-full p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center justify-center shrink-0"
                        title="Modifier les informations du contact"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onOpenChange(false)}
                      className="rounded-full p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center justify-center shrink-0"
                      title="Fermer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pastilles : Rôle / Intimité / Statut */}
            <div className="grid grid-cols-3 gap-2 items-center pt-2.5 text-[10px] w-full text-center border-t border-white/12">
              {contact.relationship_role ? (
                <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-bold truncate capitalize text-[#FFB812]">
                  {relationshipRoleDisplay}
                </span>
              ) : (
                <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-semibold truncate text-white/35">
                  Rôle
                </span>
              )}
              {contact.relationship_level ? (
                <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-bold truncate capitalize text-white">
                  {relationshipLevelDisplay}
                </span>
              ) : (
                <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-semibold truncate text-white/35">
                  Intimité
                </span>
              )}
              {company?.lifecycle_status === "prospect" ? (
                contact.is_priority !== null && contact.is_priority !== undefined ? (
                  <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-bold truncate text-white">
                    {contact.is_priority ? "Oui" : "Non"}
                  </span>
                ) : (
                  <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-semibold truncate text-white/35">
                    Prioritaire
                  </span>
                )
              ) : (
                <span className="rounded border bg-white/10 border-white/10 px-2 py-1 font-bold truncate capitalize text-white">
                  {contact.status}
                </span>
              )}
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
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading flex items-center gap-1.5">
                    <Image src="/icons_set/contact.png" alt="" aria-hidden="true" width={28} height={28} className="object-contain opacity-60 shrink-0" />
                    Coordonnées personnelles
                  </h4>
                  <div className={cn("grid gap-3", device === "mobile" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
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
                {person.notes && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Notes & Observations
                    </h4>
                    <div className="text-xs leading-relaxed text-heading bg-primary/5 border border-primary/10 rounded-[var(--radius-medium)] p-4 font-normal whitespace-pre-wrap">
                      {person.notes}
                    </div>
                  </div>
                )}

                {/* Associated Company Card */}
                {company && device !== "mobile" && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Compte associé
                    </h4>
                    <div 
                      onClick={() => onOpenCompanyIdentity?.(company.id)}
                      className="kredo-hover-reference group rounded-[var(--radius-medium)] border border-border/50 bg-canvas/30 p-3.5 hover:border-primary/50"
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
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading flex items-center gap-1.5">
                    <Image src="/icons_set/organigramme.png" alt="" aria-hidden="true" width={28} height={28} className="object-contain opacity-60 shrink-0" />
                    {device === "mobile" ? "Département & hiérarchie" : "Organigramme & Hiérarchie"}
                  </h4>
                  <div className="bg-canvas/30 rounded-[var(--radius-medium)] border border-border/50 p-4 flex flex-col items-center">
                    {/* N+1 Manager */}
                    {data.manager ? (
                      <div className="flex flex-col items-center w-full max-w-xs animate-in fade-in slide-in-from-top-1 duration-200">
                        <div 
                          onClick={() => {
                            if (device === "mobile") {
                              setIsManagerModalOpen(true)
                            } else if (data.manager?.id && onOpenContactIdentity) {
                              onOpenContactIdentity(data.manager.id)
                            }
                          }}
                          className={cn(
                            "rounded-[var(--radius-medium)] border border-border/60 bg-canvas/50 p-2.5 w-full text-center group",
                            device === "mobile" || onOpenContactIdentity ? "kredo-hover-reference hover:border-primary/50" : ""
                          )}
                          title={device === "mobile" ? "Voir les coordonnées du manager" : (onOpenContactIdentity ? "Consulter la fiche du manager" : undefined)}
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
                    <div className="bg-primary/5 border border-primary/30 rounded-[var(--radius-medium)] p-3 w-full max-w-xs text-center relative">
                      <span className="text-[9px] text-primary font-bold uppercase tracking-tight block truncate">
                        {contact.department ? departmentLabel(contact.department) : "Aucun département renseigné"}
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
                                  "rounded-[var(--radius-medium)] border border-border/50 bg-canvas/40 p-2 w-full text-center group",
                                  onOpenContactIdentity ? "kredo-hover-reference hover:border-primary/50" : ""
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
                  {data.opportunities.length === 0 ? null : (
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
                              {getOpportunityStageLabel(opp.stage)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                            <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                            <span>Conviction : <strong className="text-body">{opp.conviction}%</strong></span>
                            {opp.acv && <span>ACV : <strong className="text-heading">{formatEuro(opp.acv)}</strong></span>}
                          </div>
                          {formatOpportunityMeta(opp) ? (
                            <div className="text-[10px] text-muted">{formatOpportunityMeta(opp)}</div>
                          ) : null}
                          {opp.requires_staffing ? (
                            <div className="text-[10px] font-medium text-primary">
                              Staffing : {opp.required_headcount} profil{opp.required_headcount > 1 ? "s" : ""}
                            </div>
                          ) : null}
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
                  {data.interactions.length === 0 ? null : (
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
                              "absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-surface",
                              dotColor
                            )} />

                            <div className="bg-canvas/30 border border-border/50 rounded-[var(--radius-medium)] p-3">
                              <div className="flex justify-between items-start gap-2.5">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-heading capitalize">
                                    {it.type.replace("_", " ")}
                                  </span>
                                  <span className="text-[10px] text-muted font-normal block mt-0.5">
                                    Le {formatDate(it.occurred_at)}
                                  </span>
                                </div>
                                {it.sentiment && (
                                  <span className={cn(
                                    "text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize shrink-0",
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

                              {company && (
                                <div className="mt-3 flex justify-end border-t border-border/30 pt-2.5">
                                  <ContextualCommunicationButton
                                    entryPoint="meeting_interaction"
                                    companyId={company.id}
                                    companyName={company.name}
                                    contactId={contact.id}
                                    primaryEntity={{ type: "contact", id: contact.id }}
                                    label="Rédiger le suivi"
                                    className="h-8 min-h-8 px-2.5 text-[11px]"
                                    aria-label={`Rédiger le suivi de l'interaction du ${formatDate(it.occurred_at)} avec ${fullName}`}
                                    refs={{
                                      interactionRef: it.id,
                                      angle: [
                                        `Type interaction: ${it.type}`,
                                        it.summary ? `Résumé: ${it.summary}` : null,
                                        it.next_action ? `Prochaine étape: ${it.next_action}` : null,
                                      ].filter(Boolean).join("\n") || undefined,
                                    }}
                                  />
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
                {contact && (
                  <TaskCreateModal
                    open={isTaskModalOpen}
                    onOpenChange={setIsTaskModalOpen}
                    entityType="contact"
                    entityId={contact.id}
                    onCreated={handleTaskCreated}
                  />
                )}

                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-2 flex items-center gap-1.5">
                  <Image src="/icons_set/date.png" alt="" aria-hidden="true" width={28} height={28} className="object-contain opacity-60 shrink-0" />
                  Tâches et Relances ({data.tasks.length})
                </h4>

                {data.tasks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted/70 italic">
                    Aucune tâche pour ce contact.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.tasks.map((task) => {
                      const isDone = task.status === "done"
                      const isOverdue =
                        !isDone &&
                        !!task.due_date &&
                        new Date(task.due_date) < new Date()

                      const priorityStyle = {
                        low: "bg-canvas border-border text-muted",
                        normal: "bg-canvas border-border text-muted",
                        high: "bg-warning/10 border-warning/20 text-warning",
                        urgent: "bg-danger/10 border-danger/20 text-danger",
                      }[task.priority] ?? "bg-canvas border-border text-muted"

                      const priorityLabel = {
                        low: "Basse",
                        normal: "Normale",
                        high: "Haute",
                        urgent: "Urgente",
                      }[task.priority] ?? task.priority

                      return (
                        <SurfaceCard key={task.id} className="p-3.5 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTask(task.id, task.status)}
                                className={cn(
                                  "w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 text-white font-bold text-[10px] transition-colors cursor-pointer hover:opacity-80",
                                  isDone
                                    ? "bg-success border-success"
                                    : "border-border bg-canvas/40 hover:border-success/60"
                                )}
                                title={isDone ? "Marquer comme ouverte" : "Marquer comme terminée"}
                                aria-label={isDone ? "Rouvrir la tâche" : "Terminer la tâche"}
                              >
                                {isDone && (
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div className="min-w-0">
                                <h5 className={cn(
                                  "text-xs font-bold leading-tight",
                                  isDone ? "text-muted line-through" : "text-heading"
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
                              "rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0",
                              priorityStyle
                            )}>
                              {priorityLabel}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-muted/80 border-t border-border/30 pt-2 mt-0.5">
                            {task.due_date ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Échéance :{" "}
                                <strong className={cn("font-bold", isOverdue ? "text-danger" : "text-body")}>
                                  {formatDate(task.due_date)}
                                </strong>
                              </span>
                            ) : (
                              <span>Sans échéance</span>
                            )}

                            {task.completed_at && (
                              <span className="text-success font-medium">
                                Terminée le {formatDate(task.completed_at)}
                              </span>
                            )}
                          </div>
                        </SurfaceCard>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-[var(--radius-medium)] bg-primary hover:bg-primary/90 text-primary-fg px-4 py-2 text-xs font-bold transition-all active:scale-95 hover:shadow"
                    title="Ajouter une nouvelle tâche"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Ajouter une tâche
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AppDrawer>
  )
}
