"use client"

import { useEffect, useState, useMemo } from "react"
import { SectionTab } from "@/lib/tabs/tab-types"
import { getMissionDetail } from "@/app/(app)/missions/_data/get-mission-detail"
import { updateMissionRisk } from "@/app/(app)/missions/_actions/update-mission-risk"
import { updateMission } from "@/app/(app)/missions/_actions/update-mission"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AppDialog } from "@/components/ui/AppDialog"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Json } from "@/types/database"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { ContactIdentityDrawer } from "@/components/accounts-contacts/ContactIdentityDrawer"

interface MissionDetailData {
  mission: {
    id: string
    title: string
    status: string
    start_date: string | null
    end_date: string | null
    role_title: string | null
    practice: string | null
    seniority: string | null
    tjm: number
    taci: number
    gross_margin_pct: number | null
    metadata: Json
    opportunity_id: string | null
    collaborator_id: string
    company_id: string
  }
  company: {
    id: string
    name: string
    description: string | null
    sector: string | null
    segment: string | null
    website: string | null
    employee_count: number | null
    revenue: string | null
    priority: string | null
    metadata: Json
  } | null
  collaborator: {
    id: string
    practice: string | null
    seniority: string | null
    entry_date: string | null
    metadata: Json
    person: {
      id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
      primary_email: string | null
      phone: string | null
    } | null
  } | null
  contacts: Array<{
    id: string
    fullName: string
    role: string | null
    email: string | null
    phone: string | null
  }>
  activityReports: Array<{
    id: string
    billable_days: number
    non_billable_days: number
    period_start: string
    period_end: string
    status: string
  }>
  interactions: Array<{
    id: string
    type: string
    summary: string | null
    details: Json
    occurred_at: string
    next_action: string | null
  }>
  companyContacts: Array<{
    id: string
    fullName: string
    role: string | null
  }>
}

interface MissionDetailPanelProps {
  tab: SectionTab
}

// Helper: Parse Date Only
function parseDateOnly(value: string | null): Date | null {
  if (!value) return null
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

// Helper: Calculate years since a date
function getYearsSince(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = parseDateOnly(dateStr)
  if (!date) return null
  const today = new Date()
  let diff = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    diff--
  }
  return diff > 0 ? `${diff} ${diff > 1 ? "ans" : "an"}` : "Moins d'un an"
}

// Helper: Format Date Fr
function formatDateFr(value: string | Date | null): string {
  const date = typeof value === "string" ? parseDateOnly(value) : value
  if (!date) return "Non renseignée"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(".", "")
}

// Helper: Format Euro
function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper: Calculate Working Days
function getWorkingDaysCount(startStr: string | null, endStr: string | null): number | null {
  if (!startStr || !endStr) return null
  const start = parseDateOnly(startStr)
  const end = parseDateOnly(endStr)
  if (!start || !end) return null
  if (end < start) return 0
  
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

// Helper: Get Period Label for CRA
function getPeriodLabel(startStr: string): string {
  const date = parseDateOnly(startStr)
  if (!date) return "Période inconnue"
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Helper: Get Initials for Company Monogram
function getInitials(fullName: string): string {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  return initials.slice(0, 2) || "KR"
}

export function MissionDetailPanel({ tab }: MissionDetailPanelProps) {
  const [data, setData] = useState<MissionDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Synchroniser l'état de chargement lors du changement de prop/id au rendu
  const [prevId, setPrevId] = useState<string>(tab.entityId)
  if (tab.entityId !== prevId) {
    setPrevId(tab.entityId)
    setLoading(true)
    setError(null)
  }
  
  // Dialog visibility states
  const [showContratDialog, setShowContratDialog] = useState<boolean>(false)
  const [showOrdreMissionDialog, setShowOrdreMissionDialog] = useState<boolean>(false)
  const [showCraDialog, setShowCraDialog] = useState<boolean>(false)

  // Risk states
  const [riskLevel, setRiskLevel] = useState<"faible" | "modere" | "critique">("faible")
  const [riskDescription, setRiskDescription] = useState<string>("Aucun risque identifié sur cette mission.")
  const [showRiskDialog, setShowRiskDialog] = useState<boolean>(false)
  const [isEditingRisk, setIsEditingRisk] = useState<boolean>(false)
  const [isUpdatingRisk, setIsUpdatingRisk] = useState<boolean>(false)
  const [riskFormLevel, setRiskFormLevel] = useState<"faible" | "modere" | "critique">("faible")
  const [riskFormDesc, setRiskFormDesc] = useState<string>("")

  // Edit modals visibility states
  const [showEditSynthese, setShowEditSynthese] = useState<boolean>(false)
  const [showEditFinance, setShowEditFinance] = useState<boolean>(false)
  const [showEditActivite, setShowEditActivite] = useState<boolean>(false)

  // Form field states
  // Synthèse
  const [editTitle, setEditTitle] = useState<string>("")
  const [editPractice, setEditPractice] = useState<string>("")
  const [editProject, setEditProject] = useState<string>("")
  const [editDescription, setEditDescription] = useState<string>("")
  const [editContactIds, setEditContactIds] = useState<string[]>([])
  const [isSavingSynthese, setIsSavingSynthese] = useState<boolean>(false)
  const [editSeniority, setEditSeniority] = useState<string>("")
  const [editCollabTenure, setEditCollabTenure] = useState<string>("")
  const [editCollabMissionsCount, setEditCollabMissionsCount] = useState<string>("")

  // Drawer states
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [showContactDrawer, setShowContactDrawer] = useState<boolean>(false)

  // Finances
  const [editTjm, setEditTjm] = useState<string>("")
  const [editGrossMarginPct, setEditGrossMarginPct] = useState<string>("")
  const [editStartDate, setEditStartDate] = useState<string>("")
  const [editEndDate, setEditEndDate] = useState<string>("")
  const [editPaymentTerms, setEditPaymentTerms] = useState<string>("")
  const [editNextInvoiceDate, setEditNextInvoiceDate] = useState<string>("")
  const [isSavingFinance, setIsSavingFinance] = useState<boolean>(false)

  // Activité commerciale
  const [editNextTask, setEditNextTask] = useState<string>("")
  const [editToAnticipate, setEditToAnticipate] = useState<string>("")
  const [isSavingActivite, setIsSavingActivite] = useState<boolean>(false)

  // Handlers to open editing modals and initialize fields
  const openEditSynthese = () => {
    if (!data) return
    setEditTitle(data.mission.title || "")
    setEditPractice(data.mission.practice || data.collaborator?.practice || "")
    setEditSeniority(data.mission.seniority || data.collaborator?.seniority || "")
    const meta = (data.mission.metadata || {}) as Record<string, unknown>
    setEditProject((meta.project || meta.projet || "") as string)
    setEditDescription((meta.description as string) || "")
    
    // Ancienneté
    const entryDateStr = data.collaborator?.entry_date || null
    const calculatedTenure = getYearsSince(entryDateStr) || ""
    setEditCollabTenure((meta.collab_tenure || calculatedTenure) as string)

    // Missions count
    const defaultMissionsCount = String((data.collaborator?.metadata as any)?.missions_count || "0")
    setEditCollabMissionsCount((meta.collab_missions_count || defaultMissionsCount) as string)

    const linkedContactIds = data.contacts.map((c) => c.id)
    setEditContactIds(linkedContactIds)
    setShowEditSynthese(true)
  }

  const openEditFinance = () => {
    if (!data) return
    setEditTjm(data.mission.tjm ? String(data.mission.tjm) : "0")
    setEditGrossMarginPct(stats ? String(stats.computedMarginPct) : "")
    setEditStartDate(data.mission.start_date || "")
    setEditEndDate(data.mission.end_date || "")
    const meta = (data.mission.metadata || {}) as Record<string, unknown>
    setEditPaymentTerms((meta.payment_terms as string) || "Facturation mensuelle à terme échu")
    setEditNextInvoiceDate((meta.next_invoice_date as string) || "Fin de mois en cours")
    setShowEditFinance(true)
  }

  const openEditActivite = () => {
    if (!data) return
    const meta = (data.mission.metadata || {}) as Record<string, unknown>
    setEditNextTask((meta.next_task as string) || "")
    setEditToAnticipate((meta.to_anticipate as string) || "")
    setShowEditActivite(true)
  }

  // Helper for silent updates
  const refreshDetails = async () => {
    try {
      const result = await getMissionDetail(tab.entityId)
      if (result.data) {
        setData(result.data)
      }
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des données de mission:", err)
    }
  }

  const handleSaveSynthese = async () => {
    if (!data) return
    setIsSavingSynthese(true)
    const res = await updateMission({
      id: data.mission.id,
      title: editTitle,
      practice: editPractice,
      seniority: editSeniority,
      metadata: {
        description: editDescription,
        project: editProject,
        contact_ids: editContactIds,
        collab_tenure: editCollabTenure,
        collab_missions_count: editCollabMissionsCount
      }
    })
    setIsSavingSynthese(false)
    if (res.error) {
      alert(res.error)
    } else {
      setShowEditSynthese(false)
      await refreshDetails()
    }
  }

  const handleSaveFinance = async () => {
    if (!data) return
    setIsSavingFinance(true)
    const parsedTjm = parseFloat(editTjm) || 0
    const parsedMargin = editGrossMarginPct ? parseFloat(editGrossMarginPct) : null
    const res = await updateMission({
      id: data.mission.id,
      tjm: parsedTjm,
      gross_margin_pct: parsedMargin,
      start_date: editStartDate || null,
      end_date: editEndDate || null,
      metadata: {
        payment_terms: editPaymentTerms,
        next_invoice_date: editNextInvoiceDate
      }
    })
    setIsSavingFinance(false)
    if (res.error) {
      alert(res.error)
    } else {
      setShowEditFinance(false)
      await refreshDetails()
    }
  }

  const handleSaveActivite = async () => {
    if (!data) return
    setIsSavingActivite(true)
    const res = await updateMission({
      id: data.mission.id,
      metadata: {
        next_task: editNextTask,
        to_anticipate: editToAnticipate
      }
    })
    setIsSavingActivite(false)
    if (res.error) {
      alert(res.error)
    } else {
      setShowEditActivite(false)
      await refreshDetails()
    }
  }

  // Synchroniser le risque lors du chargement des données au rendu
  const [prevDataId, setPrevDataId] = useState<string | null>(null)
  if (data && data.mission.id !== prevDataId) {
    setPrevDataId(data.mission.id)
    const meta = (data.mission.metadata || {}) as Record<string, unknown>
    setRiskLevel((meta.risk_level as "faible" | "modere" | "critique") || "faible")
    setRiskDescription((meta.risk_description as string) || "Aucun risque identifié sur cette mission.")
  }

  useEffect(() => {
    let active = true

    getMissionDetail(tab.entityId)
      .then((result) => {
        if (!active) return
        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        } else {
          setError("Données de mission invalides.")
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Erreur lors du chargement de la mission.")
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tab.entityId])

  // Compute stats and indicators
  const stats = useMemo(() => {
    if (!data) return null
    const { start_date, end_date, tjm, taci, gross_margin_pct } = data.mission

    // Margins
    const computedMarginPct = gross_margin_pct ?? (tjm > 0 ? Math.round(((tjm - taci) / tjm) * 100 * 100) / 100 : 0)

    // Jours de production estimés
    const workingDays = getWorkingDaysCount(start_date, end_date)

    // ACV
    const acv = workingDays !== null && tjm ? workingDays * tjm : null

    // Average Activity Rate (TACE) from CRA
    let totalBillable = 0
    let totalNonBillable = 0
    data.activityReports.forEach((r) => {
      totalBillable += r.billable_days || 0
      totalNonBillable += r.non_billable_days || 0
    })
    const avgActivityRate = (totalBillable + totalNonBillable) > 0 
      ? (totalBillable / (totalBillable + totalNonBillable)) * 100 
      : null

    return {
      computedMarginPct,
      workingDays,
      acv,
      avgActivityRate,
    }
  }, [data])

  // Extract events to anticipate
  const eventsToAnticipate = useMemo(() => {
    if (!data) return []
    const events: Array<{ id: string; label: string; desc: string; type: "warning" | "success" | "primary" | "warning_light" }> = []
    
    const metadata = (data.mission.metadata || {}) as Record<string, unknown>

    // 1. Renouvellement
    const renewalDateStr = (metadata.renewal_date || metadata.renew_date || metadata.renewalDate) as string | undefined
    if (renewalDateStr) {
      events.push({
        id: "renewal",
        label: "Échéance renouvellement",
        desc: `Date cible pour renégociation : ${formatDateFr(renewalDateStr)}.`,
        type: "primary",
      })
    }

    // 2. Prochain point client
    const nextMeetingStr = (metadata.next_meeting || metadata.next_point || metadata.next_client_meeting) as string | undefined
    if (nextMeetingStr) {
      events.push({
        id: "next-meeting",
        label: "Prochain point client",
        desc: `Point de suivi planifié le ${formatDateFr(nextMeetingStr)}.`,
        type: "success",
      })
    } else {
      // Check from next_action in latest interaction
      const latestWithNextAction = data.interactions.find(i => i.next_action)
      if (latestWithNextAction && latestWithNextAction.next_action) {
        events.push({
          id: "interaction-next",
          label: "Action suivante client",
          desc: latestWithNextAction.next_action,
          type: "primary",
        })
      }
    }

    return events
  }, [data])

  const isFinProche = useMemo(() => {
    if (!data?.mission?.end_date) return false
    const end = parseDateOnly(data.mission.end_date)
    if (!end) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 30
  }, [data])

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
          <div className="flex flex-col gap-2 w-full animate-pulse">
            <div className="h-4 w-20 bg-border/40 rounded" />
            <div className="h-8 w-80 bg-border/50 rounded" />
          </div>
        </div>
        
        {/* Skeleton grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8 flex flex-col gap-5">
            <div className="h-48 bg-border/20 rounded-lg animate-pulse" />
            <div className="h-56 bg-border/20 rounded-lg animate-pulse" />
          </div>
          <div className="md:col-span-4 flex flex-col gap-5">
            <div className="h-64 bg-border/20 rounded-lg animate-pulse" />
            <div className="h-44 bg-border/20 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-8">
        <SurfaceCard className="p-6 border-danger/20 bg-danger/5 flex flex-col gap-3 items-center text-center">
          <span className="text-sm font-semibold text-danger">Erreur de chargement</span>
          <p className="text-xs text-muted">{error}</p>
        </SurfaceCard>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-8">
        <SurfaceCard className="p-6 flex flex-col gap-3 items-center text-center">
          <span className="text-sm font-semibold text-heading">Mission introuvable</span>
          <p className="text-xs text-muted">Cette mission n&apos;a pas pu être trouvée.</p>
        </SurfaceCard>
      </div>
    )
  }

  const { mission, company, collaborator, contacts, interactions } = data
  const metadata = (mission.metadata || {}) as Record<string, unknown>

  const collaboratorName = collaborator?.person
    ? collaborator.person.full_name || `${collaborator.person.first_name || ""} ${collaborator.person.last_name || ""}`.trim()
    : "Consultant non renseigné"

  const billingTerms = (metadata.payment_terms || "Facturation mensuelle à terme échu") as string
  const nextInvoice = (metadata.next_invoice_date || "Fin de mois en cours") as string

  const nextTaskText = (metadata.next_task as string) || ""
  const toAnticipateText = (metadata.to_anticipate as string) || ""


  const avgActivityRate = stats && stats.avgActivityRate !== null ? stats.avgActivityRate : 100
  const taceColor = avgActivityRate >= 90 
    ? "text-success" 
    : avgActivityRate >= 70 
    ? "text-warning" 
    : "text-danger"

  // Main layout render
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
      {/* Header Fiche Mission */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-border px-2 py-0.5 rounded bg-surface">
              Mission
            </span>
            {collaboratorName && (
              <span className="text-xs text-muted font-medium">{collaboratorName}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
            {mission.title} — {company?.name || "Compte non renseigné"}
          </h1>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 self-start md:self-auto">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
            mission.status === "active" 
              ? "bg-success/10 border-success/20 text-success" 
              : "bg-muted/10 border-border text-muted"
          }`}>
            {mission.status === "active" ? "En cours" : mission.status === "ended" ? "Terminée" : mission.status}
          </span>

          {isFinProche ? (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border border-danger/20 bg-danger/10 text-danger flex items-center gap-1.5 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              <span>À anticiper : Fin de mission proche</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setRiskFormLevel(riskLevel)
                setRiskFormDesc(riskDescription)
                setIsEditingRisk(false)
                setShowRiskDialog(true)
              }}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border flex items-center gap-1 transition-all ${
                riskLevel === "critique"
                  ? "bg-danger/10 border-danger/20 text-danger hover:bg-danger/20"
                  : riskLevel === "modere"
                  ? "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20"
                  : "bg-success/10 border-success/20 text-success hover:bg-success/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                riskLevel === "critique" ? "bg-danger" : riskLevel === "modere" ? "bg-warning" : "bg-success"
              }`} />
              <span>Risque {riskLevel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 8 cols left / 4 cols right on Desktop, stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Synthèse & Finances */}
        <div className="md:col-span-8 flex flex-col gap-5">
          
          {/* Bloc 1: Synthèse */}
          <div className="bg-surface border-0 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-5 relative bg-gradient-to-r from-primary/[0.03] to-transparent">
            <div className="flex flex-col select-none mb-1">
              <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Synthèse mission
              </h3>
              <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
            </div>

            {/* Pencil button */}
            <button
              onClick={openEditSynthese}
              className="absolute top-4 right-4 p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
              title="Modifier cette section"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              {company ? (
                <CompanyLogo
                  name={company.name}
                  logoPath={(company.metadata as any)?.logo_path || null}
                  website={company.website}
                  size="lg"
                  className="w-12 h-12 rounded-full border border-border shrink-0 select-none"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0 select-none">
                  KR
                </div>
              )}
              
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-bold text-heading">{company?.name || "Compte non renseigné"}</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Département : <span className="font-semibold text-body">{mission.practice || "Non spécifié"}</span>
                    {!!(metadata.project || metadata.projet) && (
                      <span className="text-muted ml-2">
                        · Projet : <span className="font-semibold text-body">{(metadata.project || metadata.projet) as string}</span>
                      </span>
                    )}
                  </p>
                </div>

                {/* Section Poste décrivant précisément les fonctions du collab */}
                <div className="flex flex-col gap-1.5">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Poste & Fonctions</h5>
                  <p className="text-xs text-body leading-relaxed">
                    {(metadata.description as string | undefined) || (mission.role_title ? `Mission en tant que ${mission.role_title}.` : "Descriptif des fonctions du collaborateur non spécifié.")}
                  </p>
                </div>

                {/* Présentation client (abréger en Client) */}
                <div className="flex flex-col gap-1 pt-3 border-t border-border/40">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Client</h5>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 text-xs text-body font-medium select-none">
                    {company?.sector && (
                      <div className="flex items-center gap-1" title="Secteur d'activité">
                        <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{company.sector}</span>
                      </div>
                    )}
                    {company?.segment && (
                      <div className="flex items-center gap-1" title="Segment métier">
                        <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{company.segment}</span>
                      </div>
                    )}
                    {company?.revenue && (
                      <div className="flex items-center gap-1" title="Chiffre d'affaires">
                        <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{company.revenue}</span>
                      </div>
                    )}
                    {company?.employee_count && (
                      <div className="flex items-center gap-1" title="Nombre d'employés">
                        <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{company.employee_count} {company.employee_count > 1 ? "employés" : "employé"}</span>
                      </div>
                    )}
                    {company?.priority && (
                      <div className="flex items-center gap-1" title="Priorité du compte">
                        <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        <span className="text-muted">
                          {company.priority === "haute" ? "Priorité Haute" : company.priority === "basse" ? "Priorité Basse" : "Priorité Normale"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collaborateur (KPIs avec icônes) */}
                <div className="flex flex-col gap-1 pt-3 border-t border-border/40">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Collaborateur</h5>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 text-xs text-body font-medium select-none">
                    <div className="flex items-center gap-1" title="Practice de rattachement">
                      <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>Practice : {mission.practice || collaborator?.practice || "Non spécifiée"}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Séniorité du consultant">
                      <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                      <span>Séniorité : {mission.seniority || collaborator?.seniority || "Non spécifiée"}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Ancienneté dans l'entreprise">
                      <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Ancienneté : {metadata.collab_tenure as string || getYearsSince(collaborator?.entry_date || null) || "Non renseignée"}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Missions réalisées">
                      <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span>Missions : {metadata.collab_missions_count as string || (collaborator?.metadata as any)?.missions_count || "0"}</span>
                    </div>
                  </div>
                </div>

                {/* Contacts section (alignés et complets) */}
                <div className="flex flex-col gap-2 pt-3 border-t border-border/40">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Contacts mission</h5>
                  {contacts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {contacts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedContactId(c.id)
                            setShowContactDrawer(true)
                          }}
                          className="flex flex-col gap-0.5 p-2 bg-canvas/30 rounded border border-border/50 hover:bg-canvas/50 hover:border-primary/30 cursor-pointer transition-all select-none"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-heading truncate">{c.fullName}</span>
                            <span className="text-[8px] font-bold text-primary bg-primary/5 border border-primary/10 px-1 py-0.2 rounded shrink-0 uppercase tracking-wider">
                              {c.role || "Contact"}
                            </span>
                          </div>
                          <div className="flex flex-col text-[9px] text-muted">
                            {c.email && (
                              <span className="font-mono truncate" title={c.email}>
                                {c.email}
                              </span>
                            )}
                            {c.phone && <span className="font-mono">{c.phone}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted italic">Aucun contact client lié à cette mission.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bloc 2: Conditions financières */}
          <div className="bg-surface border-0 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-5 relative">
            <div className="flex flex-col select-none mb-1">
              <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Conditions financières
              </h3>
              <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
            </div>

            {/* Pencil button */}
            <button
              onClick={openEditFinance}
              className="absolute top-4 right-4 p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
              title="Modifier cette section"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* 3 mini KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Card 1: TJ & Marges */}
              <div className="p-3 bg-canvas/40 rounded-lg border border-border/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Tarifs & Marge</span>
                <div>
                  <div className="flex items-baseline gap-1 text-heading">
                    <span className="text-base font-bold">{formatEuro(mission.tjm)}</span>
                    <span className="text-[10px] text-muted">TJ client</span>
                  </div>
                  <div className="flex items-baseline gap-1 text-body mt-0.5">
                    <span className="text-xs font-medium">{formatEuro(mission.taci)}</span>
                    <span className="text-[10px] text-muted">TJM coût</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted">Marge</span>
                  <span className="font-bold text-success">
                    {stats ? `${stats.computedMarginPct.toFixed(1)} %` : "—"}
                  </span>
                </div>
              </div>

              {/* Card 2: Dates & Jours */}
              <div className="p-3 bg-canvas/40 rounded-lg border border-border/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Dates & Production</span>
                <div>
                  <div className="text-xs text-heading flex flex-col gap-0.5">
                    <div>
                      <span className="text-[10px] text-muted">Début :</span> <span className="font-semibold">{formatDateFr(mission.start_date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted">Fin :</span> <span className="font-semibold">{mission.end_date ? formatDateFr(mission.end_date) : "Indéterminée"}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted">Jours ouvrés</span>
                  <span className="font-bold text-heading">
                    {stats && stats.workingDays !== null ? `${stats.workingDays} j` : "—"}
                  </span>
                </div>
              </div>

              {/* Card 3: ACV */}
              <div className="p-3 bg-canvas/40 rounded-lg border border-border/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Valeur Contractuelle (ACV)</span>
                <div>
                  <div className="text-lg font-extrabold text-heading tracking-tight mt-1">
                    {stats && stats.acv ? formatEuro(stats.acv) : "—"}
                  </div>
                  <p className="text-[9px] text-muted mt-1 leading-normal">
                    Estimée sur la base des jours ouvrés et du TJ client.
                  </p>
                </div>
              </div>

            </div>

            {/* Facturation details row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs">
              <div>
                <span className="text-muted">Facturation :</span>{" "}
                <span className="font-semibold text-heading">{billingTerms}</span>
              </div>
              <div>
                <span className="text-muted">Prochaine facture :</span>{" "}
                <span className="font-semibold text-heading">{nextInvoice}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Activité & Actions rapides */}
        <div className="md:col-span-4 flex flex-col gap-5">
          
          {/* Bloc 3: Activité commerciale */}
          <div className="bg-surface border-0 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-5 relative">
            <div className="flex flex-col select-none mb-1">
              <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Activité commerciale
              </h3>
              <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
            </div>

            {/* Pencil button */}
            <button
              onClick={openEditActivite}
              className="absolute top-4 right-4 p-1.5 text-muted hover:text-heading hover:bg-canvas rounded-md transition-all border border-transparent hover:border-border"
              title="Modifier cette section"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* À venir */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">À venir</h4>
              {nextTaskText ? (
                <div className="p-2.5 bg-primary/5 border border-primary/10 rounded-lg text-xs text-body leading-relaxed flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{nextTaskText}</span>
                </div>
              ) : (
                <span className="text-xs text-muted italic">Aucune action ou tâche planifiée.</span>
              )}
            </div>

            {/* Activité récente */}
            <div className="flex flex-col gap-2.5 border-t border-border/40 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Activité récente</h4>
              {interactions.length > 0 ? (
                <div className="p-2.5 bg-canvas/30 rounded border border-border/40 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-heading uppercase bg-border/50 px-1.5 py-0.2 rounded shrink-0">
                      {interactions[0].type}
                    </span>
                    <span className="text-muted font-mono">{formatDateFr(interactions[0].occurred_at)}</span>
                  </div>
                  <p className="text-xs text-body line-clamp-2 italic leading-relaxed mt-1">
                    &ldquo;{interactions[0].summary || "Aucune description écrite"}&rdquo;
                  </p>
                </div>
              ) : (
                <span className="text-xs text-muted italic">Aucun historique récent.</span>
              )}
            </div>

            {/* À anticiper */}
            <div className="flex flex-col gap-2.5 border-t border-border/40 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">À anticiper</h4>
              {toAnticipateText ? (
                <div className="p-2.5 bg-warning/5 rounded border border-warning/20 text-xs text-body leading-relaxed flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{toAnticipateText}</span>
                </div>
              ) : (
                <span className="text-xs text-muted italic">Aucun motif d&apos;attention particulier.</span>
              )}
            </div>
          </div>

          {/* Bloc 4: Liens utiles */}
          <div className="bg-surface border-0 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-4 relative">
            <div className="flex flex-col select-none mb-1">
              <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Liens utiles
              </h3>
              <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-1">
              {/* Contrat */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setShowContratDialog(true)}
                  className="w-10 h-10 flex items-center justify-center border border-border rounded-lg bg-surface hover:bg-canvas/50 hover:text-heading transition-all cursor-pointer"
                  title="Consulter le contrat"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <span className="text-[10px] text-muted text-center truncate w-full select-none font-medium">contrat</span>
              </div>

              {/* ODM */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setShowOrdreMissionDialog(true)}
                  className="w-10 h-10 flex items-center justify-center border border-border rounded-lg bg-surface hover:bg-canvas/50 hover:text-heading transition-all cursor-pointer"
                  title="Consulter l'ordre de mission"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </button>
                <span className="text-[10px] text-muted text-center truncate w-full select-none font-medium">ODM</span>
              </div>

              {/* Facturation */}
              <div className="flex flex-col items-center gap-1.5">
                <Link
                  href="/finance"
                  className="w-10 h-10 flex items-center justify-center border border-border rounded-lg bg-surface hover:bg-canvas/50 hover:text-heading transition-all cursor-pointer"
                  title="Consulter la facturation"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
                <span className="text-[10px] text-muted text-center truncate w-full select-none font-medium">facturation</span>
              </div>

              {/* CRA */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setShowCraDialog(true)}
                  className="w-10 h-10 flex items-center justify-center border border-border rounded-lg bg-surface hover:bg-canvas/50 hover:text-heading transition-all cursor-pointer"
                  title="Consulter les CRA"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <span className="text-[10px] text-muted text-center truncate w-full select-none font-medium">CRA</span>
              </div>
            </div>
          </div>

          {/* Bloc 5: Actions rapides */}
          <div className="bg-surface border-0 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-4 relative">
            <div className="flex flex-col select-none mb-1">
              <h3 className="text-[#9ca3af] dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Actions rapides
              </h3>
              <div className="w-8 h-0.5 bg-primary mt-1.5 rounded-full" />
            </div>

            <div className="flex flex-col gap-2">
              {/* Synthèse financière */}
              <Link
                href="/finance"
                className="w-full text-left text-xs text-body hover:text-heading hover:bg-canvas/50 px-3 py-3 border border-border rounded-md font-medium transition-all flex items-center justify-between min-h-[44px]"
              >
                <span>Synthèse financière</span>
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              {/* Synthèse des suivis missions */}
              <Link
                href="/missions"
                className="w-full text-left text-xs text-body hover:text-heading hover:bg-canvas/50 px-3 py-3 border border-border rounded-md font-medium transition-all flex items-center justify-between min-h-[44px]"
              >
                <span>Synthèse des suivis missions</span>
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* dialogs */}
      <AppDialog
        open={showContratDialog}
        onOpenChange={setShowContratDialog}
        title="Contrat de la mission"
        description={`Contrat de prestation associé à la mission de ${collaboratorName}.`}
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="p-3 bg-canvas rounded border border-border/80 flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="font-semibold text-heading text-xs">Contrat_Prestation_Signe.pdf</div>
                <div className="text-[10px] text-muted">Contrat cadre · Signé le 15/01/2026</div>
              </div>
            </div>
            <button className="text-xs text-primary font-semibold hover:underline">Télécharger</button>
          </div>

          <p className="text-[10px] text-muted italic text-center mt-2">
            Module complet de signature électronique et de gestion de documents (Kredo Docs) à venir.
          </p>
        </div>
      </AppDialog>

      <AppDialog
        open={showOrdreMissionDialog}
        onOpenChange={setShowOrdreMissionDialog}
        title="Ordre de mission"
        description={`Pièce d'ordre de mission associée à la mission de ${collaboratorName}.`}
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="p-3 bg-canvas rounded border border-border/80 flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="font-semibold text-heading text-xs">Bon_de_Commande_BC8890.pdf</div>
                <div className="text-[10px] text-muted">Bon de commande · Validé le 18/01/2026</div>
              </div>
            </div>
            <button className="text-xs text-primary font-semibold hover:underline">Télécharger</button>
          </div>

          <p className="text-[10px] text-muted italic text-center mt-2">
            Module complet de signature électronique et de gestion de documents (Kredo Docs) à venir.
          </p>
        </div>
      </AppDialog>

      <AppDialog
        open={showCraDialog}
        onOpenChange={setShowCraDialog}
        title="Comptes Rendus d'Activité (CRA)"
        description={`Liste des rapports d'activité pour la mission de ${collaboratorName}.`}
      >
        <div className="flex flex-col gap-3 mt-2 max-h-[350px] overflow-y-auto pr-1">
          {(!data?.activityReports || data.activityReports.length === 0) ? (
            <p className="text-xs text-muted italic text-center py-4">
              Aucun compte rendu d'activité enregistré pour cette mission.
            </p>
          ) : (
            data.activityReports.map((report) => {
              const statusLower = report.status?.toLowerCase()
              const isApproved = statusLower === "approved" || statusLower === "validated" || statusLower === "validé" || statusLower === "valide"
              const isPending = statusLower === "pending" || statusLower === "en attente" || statusLower === "soumis"
              
              let statusLabel = report.status
              let statusClass = "bg-muted/10 border-border text-muted"
              
              if (isApproved) {
                statusLabel = "Validé"
                statusClass = "bg-success/10 border-success/20 text-success"
              } else if (isPending) {
                statusLabel = "En attente"
                statusClass = "bg-warning/10 border-warning/20 text-warning"
              } else if (statusLower === "draft" || statusLower === "brouillon") {
                statusLabel = "Brouillon"
                statusClass = "bg-muted/10 border-border text-muted"
              }

              return (
                <div key={report.id} className="p-3 bg-canvas rounded border border-border/80 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-heading text-xs">
                      {getPeriodLabel(report.period_start)}
                    </div>
                    <div className="text-[10px] text-muted flex items-center gap-2">
                      <span>Jours travaillés : <strong>{report.billable_days}</strong></span>
                      {report.non_billable_days > 0 && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-border" />
                          <span>Absences : <strong>{report.non_billable_days}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </AppDialog>

      {/* Modale de suivi des risques */}
      <AppDialog
        open={showRiskDialog}
        onOpenChange={setShowRiskDialog}
        title="Suivi du Risque de la Mission"
        description="Niveau de risque opérationnel et financier sur cette prestation."
      >
        <div className="flex flex-col gap-4 mt-2">
          {!isEditingRisk ? (
            /* Mode Lecture/Visualisation */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Statut de risque :</span>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  riskLevel === "critique"
                    ? "bg-danger/10 border-danger/20 text-danger"
                    : riskLevel === "modere"
                    ? "bg-warning/10 border-warning/20 text-warning"
                    : "bg-success/10 border-success/20 text-success"
                }`}>
                  Risque {riskLevel}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Commentaire d&apos;évaluation</span>
                <p className="text-xs text-body leading-relaxed bg-canvas p-3 rounded-lg border border-border/60">
                  {riskDescription}
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowRiskDialog(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRiskFormLevel(riskLevel)
                    setRiskFormDesc(riskDescription)
                    setIsEditingRisk(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-primary/30 text-primary hover:bg-primary/5 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Modifier</span>
                </button>
              </div>
            </div>
          ) : (
            /* Mode Édition */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Niveau de risque</label>
                <div className="flex gap-2">
                  {(["faible", "modere", "critique"] as const).map((lvl) => {
                    const active = riskFormLevel === lvl
                    const colorClass = {
                      faible: active ? "bg-success text-white border-success" : "text-success border-success/30 hover:bg-success/5 bg-transparent",
                      modere: active ? "bg-warning text-white border-warning" : "text-warning border-warning/30 hover:bg-warning/5 bg-transparent",
                      critique: active ? "bg-danger text-white border-danger" : "text-danger border-danger/30 hover:bg-danger/5 bg-transparent",
                    }[lvl]

                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setRiskFormLevel(lvl)}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border transition-all ${colorClass}`}
                      >
                        {lvl}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Description du risque / Statut</label>
                <textarea
                  value={riskFormDesc}
                  onChange={(e) => setRiskFormDesc(e.target.value)}
                  className="w-full min-h-[100px] p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 leading-relaxed"
                  placeholder="Expliquez ici les motifs de l'évaluation ou les alertes..."
                />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
                <button
                  type="button"
                  disabled={isUpdatingRisk}
                  onClick={() => setIsEditingRisk(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isUpdatingRisk}
                  onClick={async () => {
                    setIsUpdatingRisk(true)
                    const res = await updateMissionRisk(mission.id, riskFormLevel, riskFormDesc)
                    setIsUpdatingRisk(false)
                    if (res.error) {
                      alert(res.error)
                    } else {
                      setRiskLevel(riskFormLevel)
                      setRiskDescription(riskFormDesc)
                      setIsEditingRisk(false)
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
                >
                  {isUpdatingRisk ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </div>
          )}
        </div>
      </AppDialog>

      {/* Modale d'édition Synthèse */}
      <AppDialog
        open={showEditSynthese}
        onOpenChange={setShowEditSynthese}
        title="Modifier la Synthèse de la Mission"
        description="Mettez à jour les informations générales et le descriptif du poste."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Intitulé de la mission</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="Ex. Consultant Senior Fullstack Java/React"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Département / Practice</label>
              <input
                type="text"
                value={editPractice}
                onChange={(e) => setEditPractice(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. Technology & Engineering"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Projet</label>
              <input
                type="text"
                value={editProject}
                onChange={(e) => setEditProject(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. Migration Cloud"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Poste & Fonctions (Descriptif)</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full min-h-[120px] p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 leading-relaxed"
              placeholder="Décrivez ici le contexte de la mission et les fonctions du collaborateur..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-border/40 pt-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Séniorité Collab.</label>
              <input
                type="text"
                value={editSeniority}
                onChange={(e) => setEditSeniority(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. Senior"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Ancienneté Collab.</label>
              <input
                type="text"
                value={editCollabTenure}
                onChange={(e) => setEditCollabTenure(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. 3 ans"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Missions Collab.</label>
              <input
                type="text"
                value={editCollabMissionsCount}
                onChange={(e) => setEditCollabMissionsCount(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. 5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Contacts de la mission</label>
            {data.companyContacts.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto border border-border rounded-md p-2 bg-canvas/30">
                {data.companyContacts.map((c) => {
                  const isChecked = editContactIds.includes(c.id)
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-heading cursor-pointer hover:bg-canvas/50 p-1 rounded transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditContactIds([...editContactIds, c.id])
                          } else {
                            setEditContactIds(editContactIds.filter((id) => id !== c.id))
                          }
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="flex-1 truncate">{c.fullName}</span>
                      {c.role && (
                        <span className="text-[9px] font-semibold text-muted bg-canvas px-1.5 py-0.5 rounded border border-border shrink-0">
                          {c.role}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            ) : (
              <span className="text-xs text-muted italic">Aucun contact disponible pour ce client.</span>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSavingSynthese}
              onClick={() => setShowEditSynthese(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingSynthese}
              onClick={handleSaveSynthese}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isSavingSynthese ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </AppDialog>

      {/* Modale d'édition Finances */}
      <AppDialog
        open={showEditFinance}
        onOpenChange={setShowEditFinance}
        title="Modifier les Conditions Financières"
        description="Mettez à jour les tarifs, la marge brute attendue et le calendrier."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Tarif Client (TJM €)</label>
              <input
                type="number"
                value={editTjm}
                onChange={(e) => setEditTjm(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. 650"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Taux de Marge Brute (%)</label>
              <input
                type="number"
                step="0.1"
                value={editGrossMarginPct}
                onChange={(e) => setEditGrossMarginPct(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. 25"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Date de Début</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Date de Fin</label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Conditions de Facturation</label>
              <input
                type="text"
                value={editPaymentTerms}
                onChange={(e) => setEditPaymentTerms(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. Facturation fin de mois"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Prochaine Facture</label>
              <input
                type="text"
                value={editNextInvoiceDate}
                onChange={(e) => setEditNextInvoiceDate(e.target.value)}
                className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Ex. Fin de mois en cours"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSavingFinance}
              onClick={() => setShowEditFinance(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingFinance}
              onClick={handleSaveFinance}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isSavingFinance ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </AppDialog>

      {/* Modale d'édition Activité commerciale */}
      <AppDialog
        open={showEditActivite}
        onOpenChange={setShowEditActivite}
        title="Modifier l'Activité Commerciale de la Mission"
        description="Mettez à jour la prochaine tâche planifiée et le motif d'attention à anticiper."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Prochaine tâche prévue (À venir)</label>
            <input
              type="text"
              value={editNextTask}
              onChange={(e) => setEditNextTask(e.target.value)}
              className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
              placeholder="Ex. Échange de cadrage technique le 15/07"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Motif d'attention (À anticiper)</label>
            <textarea
              value={editToAnticipate}
              onChange={(e) => setEditToAnticipate(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 resize-none"
              placeholder="Ex. Risque de renouvellement / baisse de TJM demandée par le client"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSavingActivite}
              onClick={() => setShowEditActivite(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingActivite}
              onClick={handleSaveActivite}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
            >
              {isSavingActivite ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </AppDialog>

      <ContactIdentityDrawer
        contactId={selectedContactId}
        open={showContactDrawer}
        onOpenChange={setShowContactDrawer}
      />
    </div>
  )
}
