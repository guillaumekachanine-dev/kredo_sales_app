"use client"

import { useEffect, useState, useMemo } from "react"
import { SectionTab } from "@/lib/tabs/tab-types"
import { getMissionDetail } from "@/app/(app)/missions/_data/get-mission-detail"
import { updateMissionRisk } from "@/app/(app)/missions/_actions/update-mission-risk"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AppDialog } from "@/components/ui/AppDialog"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Json } from "@/types/database"

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
  } | null
  collaborator: {
    id: string
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
  const [showDocsDialog, setShowDocsDialog] = useState<boolean>(false)
  const [showAiDialog, setShowAiDialog] = useState<boolean>(false)

  // Risk states
  const [riskLevel, setRiskLevel] = useState<"faible" | "modere" | "critique">("faible")
  const [riskDescription, setRiskDescription] = useState<string>("Aucun risque identifié sur cette mission.")
  const [showRiskDialog, setShowRiskDialog] = useState<boolean>(false)
  const [isEditingRisk, setIsEditingRisk] = useState<boolean>(false)
  const [isUpdatingRisk, setIsUpdatingRisk] = useState<boolean>(false)
  const [riskFormLevel, setRiskFormLevel] = useState<"faible" | "modere" | "critique">("faible")
  const [riskFormDesc, setRiskFormDesc] = useState<string>("")

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

  const nextLeavesStr = (metadata.next_leaves || metadata.leaves || metadata.conges) as string | undefined
  const closingStr = (metadata.client_closing || metadata.fermeture_site) as string | undefined


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
          <SurfaceCard className="p-5 md:p-6 flex flex-col gap-5" accent="primary">
            <div>
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Synthèse mission</h3>
                {company?.sector && (
                  <span className="text-[10px] text-muted font-medium uppercase tracking-wider bg-canvas px-2 py-0.5 rounded">
                    {company.sector}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20 shrink-0 select-none">
                {company ? getInitials(company.name) : "KR"}
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-bold text-heading">{company?.name || "Compte non renseigné"}</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Département : <span className="font-semibold text-body">{mission.practice || "Non spécifié"}</span>
                    {mission.seniority && (
                      <span className="text-muted ml-2">
                        · Séniorité : <span className="font-semibold text-body">{mission.seniority}</span>
                      </span>
                    )}
                  </p>
                </div>

                {/* Présentation client abrégée */}
                <div className="flex flex-col gap-1">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Le Client</h5>
                  <p className="text-xs text-body leading-relaxed">
                    {company?.description 
                      ? (company.description.length > 150 ? `${company.description.slice(0, 150)}...` : company.description) 
                      : "Aucun contexte client disponible."}
                  </p>
                </div>

                {/* Section Poste décrivant précisément les fonctions du collab */}
                <div className="flex flex-col gap-1.5 pt-3 border-t border-border/40">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Poste & Fonctions</h5>
                  <p className="text-xs text-body leading-relaxed bg-canvas/40 p-3 rounded-lg border border-border/40">
                    {(metadata.description as string | undefined) || (mission.role_title ? `Mission en tant que ${mission.role_title}.` : "Descriptif des fonctions du collaborateur non spécifié.")}
                  </p>
                </div>
              </div>
            </div>

            {/* Contacts section (limités à 2 uniquement) */}
            <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Contacts mission (max 2)</h5>
              {contacts.slice(0, 2).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  {contacts.slice(0, 2).map((c) => (
                    <div key={c.id} className="flex flex-col gap-1 p-2.5 bg-canvas/30 rounded border border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-heading truncate">{c.fullName}</span>
                        <span className="text-[9px] font-semibold text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.2 rounded shrink-0">
                          {c.role || "Contact"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[10px] text-muted">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="hover:text-primary hover:underline font-mono truncate">
                            {c.email}
                          </a>
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
          </SurfaceCard>

          {/* Bloc 2: Conditions financières */}
          <SurfaceCard className="p-5 md:p-6 flex flex-col gap-5">
            <div className="border-b border-border/40 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Conditions financières</h3>
            </div>

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
          </SurfaceCard>

        </div>

        {/* RIGHT COLUMN: Activité & Actions rapides */}
        <div className="md:col-span-4 flex flex-col gap-5">
          
          {/* Bloc 3: Activité */}
          <SurfaceCard className="p-5 md:p-6 flex flex-col gap-5">
            <div className="border-b border-border/40 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Activité</h3>
            </div>

            {/* Production */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Production</h4>
              <div className="flex flex-col gap-2.5 bg-canvas/20 p-3 rounded-lg border border-border/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">TACE moyen constaté</span>
                  <span className={cn("font-bold", taceColor)}>
                    {avgActivityRate.toFixed(1)} %
                  </span>
                </div>
                <div className="h-px bg-border/40" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">Congés collaborateur</span>
                  <span className="font-semibold text-body truncate max-w-[180px] text-right">
                    {nextLeavesStr || "—"}
                  </span>
                </div>
                <div className="h-px bg-border/40" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">Fermeture site client</span>
                  <span className="font-semibold text-body truncate max-w-[180px] text-right">
                    {closingStr || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Dernière action */}
            <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Dernière interaction</h4>
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

            {/* Événements à anticiper */}
            <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {isFinProche ? "Planification" : "À anticiper"}
              </h4>
              {eventsToAnticipate.length > 0 ? (
                <div className="flex flex-col gap-2 mt-1">
                  {eventsToAnticipate.map((evt) => {
                    const badgeColors = {
                      warning: "bg-danger/10 border-danger/20 text-danger",
                      success: "bg-success/10 border-success/20 text-success",
                      primary: "bg-primary/10 border-primary/20 text-primary",
                      warning_light: "bg-warning/10 border-warning/20 text-warning",
                    }[evt.type]

                    return (
                      <div key={evt.id} className={cn("flex flex-col gap-1 p-2.5 rounded border text-xs", badgeColors)}>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            evt.type === "warning" ? "bg-danger" : evt.type === "success" ? "bg-success" : evt.type === "primary" ? "bg-primary" : "bg-warning"
                          }`} />
                          <span className="font-bold text-heading">{evt.label}</span>
                        </div>
                        <p className="text-[10px] text-muted pl-3 leading-normal">{evt.desc}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <span className="text-xs text-muted italic">Aucun événement critique identifié à court terme.</span>
              )}
            </div>

          </SurfaceCard>

          {/* Bloc 4: Actions rapides */}
          <SurfaceCard className="p-5 md:p-6 flex flex-col gap-4">
            <div className="border-b border-border/40 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Actions rapides</h3>
            </div>

            <div className="flex flex-col gap-2">
              {/* Contrat documents */}
              <button
                onClick={() => setShowDocsDialog(true)}
                className="w-full text-left text-xs text-body hover:text-heading hover:bg-canvas/50 px-3 py-3 border border-border rounded-md font-medium transition-all flex items-center justify-between min-h-[44px]"
              >
                <span>Consulter les Documents / Contrats</span>
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* Facturation */}
              <Link
                href="/finance"
                className="w-full text-left text-xs text-body hover:text-heading hover:bg-canvas/50 px-3 py-3 border border-border rounded-md font-medium transition-all flex items-center justify-between min-h-[44px]"
              >
                <span>Accéder à la Facturation</span>
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              {/* Fiche collaborateur */}
              {collaborator?.id ? (
                <Link
                  href={`/consultants?q=${encodeURIComponent(collaboratorName)}`}
                  className="w-full text-left text-xs text-body hover:text-heading hover:bg-canvas/50 px-3 py-3 border border-border rounded-md font-medium transition-all flex items-center justify-between min-h-[44px]"
                >
                  <span>Fiche Collaborateur ({collaboratorName})</span>
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full text-left text-xs text-muted/60 bg-canvas/30 px-3 py-3 border border-border/50 rounded-md font-medium cursor-not-allowed flex items-center justify-between min-h-[44px]"
                >
                  <span>Fiche Collaborateur (Non assigné)</span>
                  <svg className="w-4 h-4 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              )}

              {/* Fiche client */}
              {company?.id ? (
                <Link
                  href={`/prospection/accounts?tab=accounts&q=${encodeURIComponent(company.name)}`}
                  className="w-full text-left text-xs text-body hover:text-heading hover:bg-canvas/50 px-3 py-3 border border-border rounded-md font-medium transition-all flex items-center justify-between min-h-[44px]"
                >
                  <span>Fiche Client ({company.name})</span>
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full text-left text-xs text-muted/60 bg-canvas/30 px-3 py-3 border border-border/50 rounded-md font-medium cursor-not-allowed flex items-center justify-between min-h-[44px]"
                >
                  <span>Fiche Client (Non assigné)</span>
                  <svg className="w-4 h-4 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </button>
              )}

              {/* Analyse IA */}
              <button
                onClick={() => setShowAiDialog(true)}
                className="w-full text-left text-xs px-3 py-3 rounded-md font-semibold flex items-center justify-between min-h-[44px] kredo-ai-analysis-button"
              >
                <span className="relative z-10 text-primary font-semibold">Lancer l&apos;Analyse IA Kredo</span>
                <div className="kredo-ready-action-circle">
                  <svg
                    className="w-3.5 h-3.5 relative z-10 text-white shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </div>
              </button>
            </div>
          </SurfaceCard>

        </div>

      </div>

      {/* dialogs */}
      <AppDialog
        open={showDocsDialog}
        onOpenChange={setShowDocsDialog}
        title="Documents de la mission"
        description={`Pièces contractuelles associées à la mission de ${collaboratorName}.`}
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
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        title="Analyse IA Kredo (Copilot)"
        description="Génération du rapport d'analyse financière et opérationnelle de la mission."
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg flex flex-col gap-2">
            <h4 className="font-bold text-heading text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Statut du module IA
            </h4>
            <p className="text-xs text-body leading-relaxed">
              Le moteur d&apos;analyse IA Kredo est en cours d&apos;optimisation sur votre environnement. 
              Une fois actif, il permettra d&apos;évaluer la rentabilité prévisionnelle, d&apos;anticiper les risques d&apos;intercontrat et d&apos;analyser le sentiment du client basé sur les interactions CRM.
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowAiDialog(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 transition-all text-heading"
            >
              Fermer
            </button>
          </div>
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
    </div>
  )
}
