"use client"

import Image from "next/image"
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getCompanyIdentity, toggleCompanyFavorite } from "@/app/(app)/prospection/accounts/actions"
import { CompanyDocumentsModal } from "@/components/accounts-contacts/intelligence/CompanyDocumentsModal"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { getOpportunityStageLabel, isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { getCommunicationEntryPoint, type CommunicationEntryPoint } from "@/components/accounts-contacts/intelligence/communication-brief-options"
import { lifecycleLabel } from "@/components/accounts-contacts/intelligence/intelligence-parts"
import { formatEuro, formatDate } from "@/lib/formatters"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"

interface CompanyIdentityDrawerProps {
  companyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenContactIdentity?: (contactId: string) => void
}

type IdentityData = {
  company: {
    id: string
    name: string
    legal_name: string | null
    lifecycle_status: string
    sector: string | null
    segment: string | null
    revenue: string | null
    employee_count: number | null
    size_band: string | null
    website: string | null
    hq_location: string | null
    description: string | null
    priority: string
    health: string | null
    legacy_folio_score: number | string | null
    tags: string[] | null
    metadata: Record<string, unknown> | null
    last_contact_at: string | null
    next_action_label: string | null
    next_action_at: string | null
    created_at?: string | null
    updated_at?: string | null
  }
  contacts: Array<{
    id: string
    person_id: string
    job_title: string | null
    relationship_role: string | null
    relationship_level: string | null
    status: string
    is_priority?: boolean | null
    persons: {
      id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
      primary_email: string | null
      phone: string | null
      linkedin_url: string | null
    } | null
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
  }>
  missions: Array<{
    id: string
    title: string
    status: string
    start_date: string | null
    end_date: string | null
    tjm: number
    cjm: number
    gross_margin_pct: number | null
    collaborator_id: string
    collaborators: {
      id: string
      persons: {
        id: string
        full_name: string | null
        first_name: string | null
        last_name: string | null
      } | null
    } | null
  }>
  lastInteraction: {
    id: string
    type: string
    occurred_at: string
    summary: string | null
    sentiment: string | null
    next_action: string | null
  } | null
}

interface CompanyAnalysisData {
  identite?: {
    nom_complet?: string
    siege_social?: string
    date_creation?: string
    forme_juridique?: string
    ca_estime?: string
    effectif_estime?: string
    dirigeants?: string[]
    code_naf?: string
  }
  positionnement?: {
    activite_principale?: string
    proposition_valeur?: string
    clients_types?: string
    zone_geographique?: string
  }
  signaux?: {
    actualites_recentes?: string[]
    tendance_croissance?: string
    recrutements_recents?: string
    indices_maturite_digitale?: string
  }
  contexte_sectoriel?: {
    secteur?: string
    concurrents_identifies?: string[]
    tendances_sectorielles?: string
  }
  synthese_consultant?: string
}

type TabKey = "apercu" | "intelligence" | "contacts" | "crm" | "actu"

function formatCategory(sizeBand: string | null) {
  if (!sizeBand) return "Non renseigné"
  const normalized = sizeBand.trim().toLowerCase()
  if (normalized === "cac40") return "CAC40"
  if (normalized === "eti") return "ETI"
  if (normalized === "pme") return "PME"
  if (normalized === "tpe") return "TPE"
  if (normalized.includes("public")) return "Établissement public"
  return sizeBand
}

function formatDynamique(health: string | null, tendency?: string) {
  const value = `${health || ""} ${tendency || ""}`.toLowerCase()
  if (!value.trim()) return "Stagnation"
  if (
    value.includes("croissance") ||
    value.includes("expansion") ||
    value.includes("positive") ||
    value.includes("reprise")
  ) return "Croissance"
  if (
    value.includes("baisse") ||
    value.includes("négative") ||
    value.includes("negative") ||
    value.includes("diffic") ||
    value.includes("pression") ||
    value.includes("contraction") ||
    value.includes("critique") ||
    value.includes("faillite")
  ) return "Mauvaise"
  return "Stagnation"
}

function formatRayonnement(zone?: string) {
  if (!zone || !zone.trim()) return "Régional"
  const normalized = zone.toLowerCase()
  if (normalized.includes("international") || normalized.includes("monde") || normalized.includes("global")) return "International"
  if (normalized.includes("europe") || normalized.includes(" ue") || normalized === "ue") return "UE"
  if (normalized.includes("national") || normalized.includes("france")) return "National"
  return "Régional"
}

function formatOpportunityMeta(opportunity: IdentityData["opportunities"][number]) {
  return [
    opportunity.seniority,
    opportunity.location,
    opportunity.remote_policy ? opportunity.remote_policy.replaceAll("_", " ") : null,
    opportunity.source ? opportunity.source.replaceAll("_", " ") : null,
  ].filter(Boolean).join(" · ")
}

function formatContactLineName(person: NonNullable<IdentityData["contacts"][number]["persons"]>): string {
  const firstName = person.first_name?.trim()
  const lastName = person.last_name?.trim()

  if (firstName || lastName) {
    return [firstName, lastName?.toUpperCase()].filter(Boolean).join(" ")
  }

  return person.full_name?.trim() || "Contact"
}

function isProposalFollowUpStage(stage: string) {
  const normalized = stage.toLowerCase()
  return normalized.includes("proposition") || normalized.includes("cv_envoyes") || normalized.includes("offre")
}

export function CompanyIdentityDrawer({
  companyId,
  open,
  onOpenChange,
  onOpenContactIdentity,
}: CompanyIdentityDrawerProps) {
  const [data, setData] = useState<IdentityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("apercu")
  const [syntheseExpanded, setSyntheseExpanded] = useState(false)
  const [transitionPending, startTransition] = useTransition()
  const [contactFilter, setContactFilter] = useState<"all" | "decideur" | "sponsor">("all")
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [favoritePending, setFavoritePending] = useState(false)
  const prevCompanyIdRef = useRef<string | null>(null)

  const loading = transitionPending || (open && !!companyId && !data && !error)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const syncViewport = () => setIsMobileViewport(media.matches)

    syncViewport()
    media.addEventListener("change", syncViewport)

    return () => {
      media.removeEventListener("change", syncViewport)
    }
  }, [])

  useEffect(() => {
    if (!open || !companyId) {
      return
    }

    startTransition(async () => {
      setError(null)
      // Only reset to default tab when navigating to a different company,
      // not when the same drawer reopens after a contact drawer was closed.
      if (companyId !== prevCompanyIdRef.current) {
        setActiveTab("apercu")
        prevCompanyIdRef.current = companyId
      }
      try {
        const response = await getCompanyIdentity(companyId)
        if (response.error) {
          setError(response.error)
        } else {
          setData(response.data as unknown as IdentityData)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur de chargement")
      }
    })

    return () => {
      setData(null)
      setSyntheseExpanded(false)
      setContactFilter("all")
      setIsDocumentsModalOpen(false)
      setFavoritePending(false)
    }
  }, [companyId, open])

  const handleToggleFavorite = async () => {
    if (!data || favoritePending) return
    const nextPriority = data.company.priority === "haute" ? "normale" : "haute"
    const previousPriority = data.company.priority

    setFavoritePending(true)
    setData((prev) =>
      prev
        ? { ...prev, company: { ...prev.company, priority: nextPriority } }
        : prev
    )

    const result = await toggleCompanyFavorite(data.company.id, nextPriority === "haute")
    if (result.error) {
      setData((prev) =>
        prev
          ? { ...prev, company: { ...prev.company, priority: previousPriority } }
          : prev
      )
    }
    setFavoritePending(false)
  }

  // Extract analysis_data from company metadata
  const metadata = data?.company?.metadata || {}
  const analysisData = (metadata.analysis_data || {}) as CompanyAnalysisData
  
  const identite = analysisData.identite || {}
  const positionnement = analysisData.positionnement || {}
  const signaux = analysisData.signaux || {}
  const synthese = analysisData.synthese_consultant || data?.company?.description || "Aucune synthèse disponible."

  const hasMaturite = !!(
    signaux.indices_maturite_digitale &&
    signaux.indices_maturite_digitale.trim() !== "" &&
    signaux.indices_maturite_digitale.trim() !== "-" &&
    !signaux.indices_maturite_digitale.toLowerCase().includes("non renseigné") &&
    !signaux.indices_maturite_digitale.toLowerCase().includes("non renseignée")
  )





  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={data?.company?.name || "Chargement..."}
      subtitle="Fiche d'identité"
      hideHeaderOnDesktop
      className="max-w-2xl kredo-identity-drawer"
    >
      {loading ? (
        <div className="flex flex-col gap-6 p-2">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 bg-border/40 rounded-[var(--radius-medium)] shrink-0" />
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
      ) : data ? (
        <div className="flex flex-col h-full gap-5">
          {/* Company identity card summary - exact styling match to Contact card with petroleum blue background & top white gradient fade */}
          <div className="relative flex flex-col gap-4 p-4 rounded-[var(--radius-medium)] border transition-all bg-[#257A8E] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15)_0%,transparent_100%)] text-white border-[#257A8E]/20">
            <div className={cn(
              "relative flex items-center gap-4 min-w-0",
              isMobileViewport ? "pr-11" : "pr-10"
            )}>
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Logo de l'entreprise */}
                {data.company.website ? (
                  <a
                    href={data.company.website.startsWith("http") ? data.company.website : `https://${data.company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:scale-105 active:scale-95 transition-transform shrink-0"
                    title={`Visiter le site de ${data.company.name}`}
                  >
                    <CompanyLogo
                      name={data.company.name}
                      logoPath={(data.company.metadata?.logo_path as string) || null}
                      website={data.company.website}
                      size="xl"
                      className="rounded-full w-14 h-14 border-white/20"
                    />
                  </a>
                ) : (
                  <CompanyLogo
                    name={data.company.name}
                    logoPath={(data.company.metadata?.logo_path as string) || null}
                    website={data.company.website}
                    size="xl"
                    className="rounded-full w-14 h-14 border-white/20"
                  />
                )}

                <div className={cn("min-w-0 flex-1", isMobileViewport ? "pr-10" : "pr-2")}>
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-base font-bold leading-tight text-white sm:text-lg">{data.company.name}</h3>
                    {!isMobileViewport && (
                      <button
                        type="button"
                        onClick={() => {
                          const event = new CustomEvent("crm-edit-company", { detail: { companyId: data.company.id } })
                          window.dispatchEvent(event)
                          if (window.location.pathname !== "/prospection/accounts") {
                            window.location.href = `/prospection/accounts?tab=accounts&editCompanyId=${data.company.id}`
                          }
                        }}
                        className="-mr-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-white/70 transition-colors hover:text-white"
                        title="Modifier les informations du compte"
                        aria-label="Modifier les informations du compte"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {(data.company.sector || data.company.segment) && (
                    <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight text-white/80">
                      {[data.company.sector, data.company.segment].filter(Boolean).join(" - ")}
                    </span>
                  )}
                  <span className="mt-1 block truncate text-[10px] font-bold leading-tight text-[#FFB812]">
                    {lifecycleLabel(data.company.lifecycle_status)}
                  </span>
                </div>
              </div>

              <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
                {isMobileViewport ? (
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
                    title="Fermer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={favoritePending}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center text-white/70 transition-colors hover:text-amber-300 disabled:opacity-60",
                      data.company.priority === "haute" && "text-amber-400"
                    )}
                    title={data.company.priority === "haute" ? "Retirer des favoris" : "Marquer comme favori"}
                    aria-label={data.company.priority === "haute" ? "Retirer des favoris" : "Marquer comme favori"}
                    aria-pressed={data.company.priority === "haute"}
                  >
                    <svg className="h-4 w-4" fill={data.company.priority === "haute" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.6.6 0 011.04 0l2.33 4.73a.6.6 0 00.45.33l5.22.76a.6.6 0 01.33 1.02l-3.78 3.69a.6.6 0 00-.17.53l.89 5.2a.6.6 0 01-.87.63l-4.67-2.45a.6.6 0 00-.56 0l-4.67 2.45a.6.6 0 01-.87-.63l.89-5.2a.6.6 0 00-.17-.53l-3.78-3.69a.6.6 0 01.33-1.02l5.22-.76a.6.6 0 00.45-.33L11.48 3.5z" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const event = new CustomEvent("crm-edit-company", { detail: { companyId: data.company.id } })
                    window.dispatchEvent(event)
                    if (window.location.pathname !== "/prospection/accounts") {
                      window.location.href = `/prospection/accounts?tab=accounts&editCompanyId=${data.company.id}`
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-full border border-white/20 bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20",
                    !isMobileViewport && "hidden"
                  )}
                  title="Modifier les informations du compte"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Actions primaires du header */}
            <div className="grid grid-cols-3 gap-2 border-t border-white/12 pt-2.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const entryPoint: CommunicationEntryPoint =
                    data.company.lifecycle_status === "ancien_client" ? "former_client" : "account_row"
                  const preset = getCommunicationEntryPoint(entryPoint)
                  openCommunicationComposer({
                    origin: "account",
                    companyId: data.company.id,
                    companyName: data.company.name,
                    primaryEntity: { type: "company", id: data.company.id },
                    preset: {
                      channel: preset.channel,
                      scenario: preset.scenario,
                      objective: preset.objective,
                      tone: preset.tone,
                      length: preset.length,
                      refs: {
                        angle: [
                          data.company.sector ? `Secteur: ${data.company.sector}` : null,
                          data.company.segment ? `Segment: ${data.company.segment}` : null,
                          data.company.lifecycle_status ? `Cycle de vie: ${data.company.lifecycle_status}` : null,
                        ].filter(Boolean).join(" · ") || undefined,
                      },
                      mustInclude: preset.contextHint || undefined,
                    },
                  })
                }}
                className="flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: "#1E5E99" }}
              >
                <Image
                  src="/icons_set/cockpit_intelligence/redaction_message_ai.png"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 object-contain"
                />
                <span>Rédiger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("actu")}
                className="flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: "#1E5E99" }}
                title="Ouvrir la veille du compte"
              >
                <Image
                  src="/icons_set/cockpit_intelligence/AI_veille.png"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 object-contain"
                />
                <span>Veille</span>
              </button>

              <Link
                href={`/prospection/accounts/${data.company.id}`}
                onClick={() => onOpenChange(false)}
                className="flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: "#1E5E99" }}
                title="Accéder au cockpit intelligence"
              >
                <Image
                  src="/icons_set/cockpit_intelligence/cockpit_intelligence.png"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 object-contain"
                />
                <span>Cockpit</span>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex w-full border-b border-border gap-1 shrink-0">
            {(
              [
                { key: "apercu", label: "Aperçu" },
                { key: "intelligence", label: "Marché" },
                { key: "contacts", label: "Contacts" },
                { key: "crm", label: "Activité" },
                { key: "actu", label: "Actu" },
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
                {/* Core Administrative Identity */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                    Catégorie & chiffres clés
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Catégorie */}
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Catégorie</span>
                      <span className="text-xs font-bold text-heading">
                        {formatCategory(data.company.size_band)}
                      </span>
                    </div>
                    {/* Effectifs */}
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Effectifs</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.employee_count !== null 
                          ? data.company.employee_count
                          : (identite.effectif_estime || (metadata.employee_count_raw as string) || "Non renseigné")}
                      </span>
                    </div>

                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Chiffre d&apos;Affaires</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.revenue || identite.ca_estime || (metadata.revenue_raw as string) || "Non renseigné"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Dynamique</span>
                      <span className="text-xs font-bold text-heading">
                        {formatDynamique(data.company.health, signaux.tendance_croissance)}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Siège social</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.hq_location || "Non renseigné"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Rayonnement</span>
                      <span className="text-xs font-bold text-heading">
                        {formatRayonnement(positionnement.zone_geographique)}
                      </span>
                    </div>
                    {hasMaturite && (
                      <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1 col-span-2">
                        <span className="text-[9px] text-muted font-bold uppercase">Maturité digitale</span>
                        <span className="text-xs font-normal text-heading">
                          {signaux.indices_maturite_digitale}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {activeTab === "intelligence" && (
              <div className="space-y-4">
                {/* Consultant Synthesis moved here from Aperçu */}
                <div className="text-xs leading-relaxed text-heading bg-primary/5 border border-primary/10 rounded-[var(--radius-medium)] p-4 font-normal flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                    Synthèse de l&apos;Intelligence Commerciale
                  </h4>
                  <span>{syntheseExpanded ? synthese : truncateToSentences(synthese, 2).short}</span>
                  {truncateToSentences(synthese, 2).isTruncated && (
                    <button
                      onClick={() => setSyntheseExpanded((v) => !v)}
                      className="self-start text-[10px] font-semibold text-primary hover:underline outline-none"
                    >
                      {syntheseExpanded ? "Voir moins" : "Voir la synthèse complète"}
                    </button>
                  )}
                </div>

                {positionnement.activite_principale && (
                  <div className="flex flex-col gap-1 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-2 h-2 fill-current text-heading shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="6,4 18,12 6,20" />
                      </svg>
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Activité Principale</span>
                    </div>
                    <p className="text-xs text-body leading-relaxed pl-3.5">{positionnement.activite_principale}</p>
                  </div>
                )}
                {positionnement.proposition_valeur && (
                  <div className="flex flex-col gap-1 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-2 h-2 fill-current text-heading shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="6,4 18,12 6,20" />
                      </svg>
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Proposition de Valeur</span>
                    </div>
                    <p className="text-xs text-body leading-relaxed pl-3.5">{positionnement.proposition_valeur}</p>
                  </div>
                )}
                {positionnement.clients_types && (
                  <div className="flex flex-col gap-1 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-2 h-2 fill-current text-heading shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="6,4 18,12 6,20" />
                      </svg>
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Clients Cibles / Typologie</span>
                    </div>
                    <p className="text-xs text-body leading-relaxed pl-3.5">{positionnement.clients_types}</p>
                  </div>
                )}
                {positionnement.zone_geographique && (
                  <div className="flex flex-col gap-1 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-2 h-2 fill-current text-heading shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="6,4 18,12 6,20" />
                      </svg>
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Zone Géographique</span>
                    </div>
                    <p className="text-xs text-body leading-relaxed font-medium pl-3.5">{positionnement.zone_geographique}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "contacts" && (() => {
              // Role hierarchy for sorting (lower index = higher priority)
              const ROLE_ORDER: Record<string, number> = {
                decideur: 0,
                sponsor: 1,
                prescripteur: 2,
                dsi: 3,
                direction_metier: 4,
                manager_technique: 5,
                operationnel: 6,
                utilisateur_final: 7,
              }
              const INTIMACY_ORDER: Record<string, number> = {
                fort: 0,
                moyen: 1,
                faible: 2,
              }

              const sortedContacts = [...data.contacts].sort((a, b) => {
                // 1. Role hierarchy
                const roleA = ROLE_ORDER[a.relationship_role?.toLowerCase() ?? ""] ?? 99
                const roleB = ROLE_ORDER[b.relationship_role?.toLowerCase() ?? ""] ?? 99
                if (roleA !== roleB) return roleA - roleB

                // 2. Priority contacts first
                const prioA = a.is_priority ? 0 : 1
                const prioB = b.is_priority ? 0 : 1
                if (prioA !== prioB) return prioA - prioB

                // 3. Intimacy level
                const intimacyA = INTIMACY_ORDER[a.relationship_level?.toLowerCase() ?? ""] ?? 99
                const intimacyB = INTIMACY_ORDER[b.relationship_level?.toLowerCase() ?? ""] ?? 99
                return intimacyA - intimacyB
              })

              const filteredContacts = sortedContacts.filter((contact) => {
                if (contactFilter === "all") return true
                if (contactFilter === "decideur") return contact.relationship_role === "decideur"
                if (contactFilter === "sponsor") return contact.relationship_role === "sponsor" || contact.relationship_role === "prescripteur"
                return true
              })

              const countAll = sortedContacts.length
              const countDecideurs = sortedContacts.filter(c => c.relationship_role === "decideur").length
              const countSponsors = sortedContacts.filter(c => c.relationship_role === "sponsor" || c.relationship_role === "prescripteur").length

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                      Contacts Rattachés
                    </h4>
                  </div>

                  {/* Ligne de filtres */}
                  {sortedContacts.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/20 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setContactFilter("all")}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer",
                          contactFilter === "all"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted hover:text-heading"
                        )}
                      >
                        Tous ({countAll})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactFilter("decideur")}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer",
                          contactFilter === "decideur"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted hover:text-heading"
                        )}
                      >
                        Décideurs ({countDecideurs})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactFilter("sponsor")}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer",
                          contactFilter === "sponsor"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted hover:text-heading"
                        )}
                      >
                        Sponsors ({countSponsors})
                      </button>
                    </div>
                  )}

                  {sortedContacts.length === 0 ? (
                    <div className="text-center py-10 bg-canvas/20 rounded-[var(--radius-medium)] border border-border/40 text-xs text-muted italic">
                      Aucun contact lié à cette entreprise.
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-10 bg-canvas/20 rounded-[var(--radius-medium)] border border-border/40 text-xs text-muted italic">
                      Aucun contact ne correspond à ce filtre.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredContacts.map((contact) => {
                        const person = contact.persons
                        if (!person) return null
                        const lineName = formatContactLineName(person)
                        const isDecideur = contact.relationship_role === "decideur"
                        const lineParts = [lineName, contact.job_title || null].filter(Boolean)

                        return (
                          <div
                            key={contact.id}
                            onClick={() => onOpenContactIdentity?.(contact.id)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border border-border/40 bg-canvas/20 px-3 py-2 text-[11px] text-body transition-colors",
                              onOpenContactIdentity ? "cursor-pointer hover:border-primary/30 hover:bg-primary/[0.04]" : ""
                            )}
                          >
                            {isDecideur ? (
                              <span className="h-8 w-1 rounded-full bg-[#FFB812] shrink-0" aria-hidden="true" />
                            ) : null}
                            <Image
                              src="/icons_set/cockpit_intelligence/compte_contact.png"
                              alt=""
                              width={18}
                              height={18}
                              className="h-[18px] w-[18px] shrink-0 object-contain"
                            />

                            <span
                              className="min-w-0 flex-1 truncate text-[11px] font-bold leading-none text-heading"
                              title={lineParts.join(" - ")}
                            >
                              {lineParts.join(" - ")}
                            </span>

                            <div className="ml-auto flex shrink-0 items-center gap-2">
                              {person.phone ? (
                                <a
                                  href={`tel:${person.phone}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center justify-center opacity-80 transition-opacity hover:opacity-100"
                                  title={person.phone}
                                >
                                  <Image
                                    src="/icons_set/contact_telephone.png"
                                    alt="Téléphone"
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 object-contain"
                                  />
                                </a>
                              ) : null}

                              {person.primary_email ? (
                                <a
                                  href={`mailto:${person.primary_email}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center justify-center opacity-80 transition-opacity hover:opacity-100"
                                  title={person.primary_email}
                                >
                                  <Image
                                    src="/icons_set/contact_phone.png"
                                    alt="Email"
                                    width={16}
                                    height={16}
                                    className="h-4 w-4 object-contain"
                                  />
                                </a>
                              ) : null}

                              {person.linkedin_url ? (
                                <a
                                  href={person.linkedin_url.startsWith("http") ? person.linkedin_url : `https://${person.linkedin_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center justify-center text-primary/80 opacity-85 transition-opacity hover:opacity-100"
                                  title="Profil LinkedIn"
                                >
                                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                  </svg>
                                </a>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {activeTab === "crm" && (() => {
              const status = data.company.lifecycle_status
              const activeMissions = data.missions.filter((m) => m.status === "active")
              const openOpps = data.opportunities.filter((o) => !isTerminalOpportunityStage(o.stage))
              const priorityContacts = data.contacts.filter((c) => c.is_priority === true)

              // Check if we have a Décideur or Sponsor for addressing strategy
              const hasDecideur = data.contacts.some((c) => c.relationship_role === "decideur")
              const hasSponsor = data.contacts.some((c) => c.relationship_role === "sponsor" || c.relationship_role === "prescripteur")

              if (status === "client" || status === "client_actif") {
                return (
                  <div className="space-y-6">
                    {/* 1. Engagements */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                        Engagements (Prestations en cours)
                      </h4>
                      {activeMissions.length === 0 ? (
                        <p className="text-xs text-muted italic py-1">
                          Aucune prestation active en cours.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {activeMissions.map((mission) => {
                            const collab = mission.collaborators?.persons
                            const collabName = collab
                              ? collab.full_name || `${collab.first_name || ""} ${collab.last_name || ""}`.trim()
                              : "Non assigné"
                            return (
                              <div key={mission.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-3">
                                  <div>
                                    <span className="text-xs font-bold text-heading block">{mission.title}</span>
                                    <span className="text-[10px] text-muted mt-0.5 block">
                                      Consultant : <strong className="text-body font-medium">{collabName}</strong>
                                    </span>
                                  </div>
                                  <span className="rounded bg-success/10 border border-success/20 px-2 py-0.5 text-[9px] font-bold text-success uppercase tracking-wider shrink-0">
                                    En cours
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2">
                                  <span>Début : <strong className="text-body">{formatDate(mission.start_date)}</strong></span>
                                  <span>TJ client : <strong className="text-heading font-bold">{formatEuro(mission.tjm)}</strong></span>
                                  {mission.gross_margin_pct !== null && (
                                    <span>Marge : <strong className="text-success font-bold">{mission.gross_margin_pct}%</strong></span>
                                  )}
                                </div>
                                <div className="flex justify-end border-t border-border/30 pt-2">
                                  <ContextualCommunicationButton
                                    entryPoint="active_mission"
                                    companyId={data.company.id}
                                    companyName={data.company.name}
                                    primaryEntity={{ type: "mission", id: mission.id }}
                                    label="Proposer une extension"
                                    className="h-8 min-h-8 px-2.5 text-[11px]"
                                    aria-label={`Proposer une extension pour la mission ${mission.title}`}
                                    refs={{
                                      missionRef: mission.id,
                                      angle: [
                                        `Mission active: ${mission.title}`,
                                        `Consultant: ${collabName}`,
                                        mission.end_date ? `Fin prévue: ${formatDate(mission.end_date)}` : null,
                                      ].filter(Boolean).join("\n") || undefined,
                                    }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Pipe opportunités */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                        Pipe opportunités
                      </h4>
                      {openOpps.length === 0 ? (
                        <p className="text-xs text-muted italic py-1">
                          Aucune opportunité commerciale en cours.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {openOpps.map((opp) => (
                            <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2">
                              <div className="flex justify-between items-start gap-3">
                                <span className="text-xs font-semibold text-heading truncate">{opp.title}</span>
                                <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary capitalize shrink-0">
                                  {getOpportunityStageLabel(opp.stage)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                                <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                                <span>Conviction : <strong className="text-body">{opp.conviction}%</strong></span>
                                {opp.acv && <span>Valeur : <strong className="text-heading">{formatEuro(opp.acv)}</strong></span>}
                              </div>
                              {formatOpportunityMeta(opp) ? (
                                <div className="text-[10px] text-muted">{formatOpportunityMeta(opp)}</div>
                              ) : null}
                              {opp.requires_staffing ? (
                                <div className="text-[10px] font-medium text-primary">
                                  Staffing : {opp.required_headcount} profil{opp.required_headcount > 1 ? "s" : ""}
                                </div>
                              ) : null}
                              {isProposalFollowUpStage(opp.stage) ? (
                                <div className="flex justify-end border-t border-border/30 pt-2">
                                  <ContextualCommunicationButton
                                    entryPoint="proposal_sent"
                                    companyId={data.company.id}
                                    companyName={data.company.name}
                                    primaryEntity={{ type: "opportunity", id: opp.id }}
                                    label="Relancer la proposition"
                                    className="h-8 min-h-8 px-2.5 text-[11px]"
                                    aria-label={`Relancer la proposition pour ${opp.title}`}
                                    refs={{
                                      opportunityRef: opp.id,
                                      angle: [
                                        `Opportunité: ${opp.title}`,
                                        `Stade: ${getOpportunityStageLabel(opp.stage)}`,
                                        opp.acv ? `Valeur: ${formatEuro(opp.acv)}` : null,
                                      ].filter(Boolean).join("\n") || undefined,
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Actions */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                        Actions
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Dernière Action */}
                        {data.lastInteraction || data.company.last_contact_at ? (
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px]">
                            <div>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block mb-1">Dernière action réalisée</span>
                              {data.lastInteraction ? (
                                <div className="text-xs">
                                  <span className="font-semibold text-heading block">
                                    {data.lastInteraction.type.toUpperCase()} — {formatDate(data.lastInteraction.occurred_at)}
                                  </span>
                                  <p className="text-body font-normal mt-1 leading-normal line-clamp-3">
                                    {data.lastInteraction.summary || "Pas de résumé disponible."}
                                  </p>
                                  <div className="mt-3 flex justify-end border-t border-border/30 pt-2">
                                    <ContextualCommunicationButton
                                      entryPoint="meeting_interaction"
                                      companyId={data.company.id}
                                      companyName={data.company.name}
                                      primaryEntity={{ type: "company", id: data.company.id }}
                                      label="Rédiger le suivi"
                                      className="h-8 min-h-8 px-2.5 text-[11px]"
                                      aria-label={`Rédiger le suivi de la dernière interaction avec ${data.company.name}`}
                                      refs={{
                                        interactionRef: data.lastInteraction.id,
                                        angle: [
                                          `Type interaction: ${data.lastInteraction.type}`,
                                          data.lastInteraction.summary ? `Résumé: ${data.lastInteraction.summary}` : null,
                                          data.lastInteraction.next_action ? `Prochaine étape: ${data.lastInteraction.next_action}` : null,
                                        ].filter(Boolean).join("\n") || undefined,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs">
                                  <span className="font-semibold text-heading block">
                                    Dernier contact : {formatDate(data.company.last_contact_at)}
                                  </span>
                                  <p className="text-muted italic mt-1 font-normal">
                                    Pas de détails d&apos;interaction disponibles.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-muted font-bold uppercase tracking-wider block">Dernière action réalisée</span>
                            <p className="text-xs text-muted italic py-1">Aucune action passée enregistrée.</p>
                          </div>
                        )}

                        {/* Prochaine Action */}
                        {data.company.next_action_label ? (
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px]">
                            <div>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block mb-1">Prochaine action programmée</span>
                              <div className="text-xs">
                                <span className="font-semibold text-heading block">
                                  À faire : {data.company.next_action_label}
                                </span>
                                {data.company.next_action_at && (
                                  <span className="text-[10px] text-muted mt-1 block">
                                    Échéance : {formatDate(data.company.next_action_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-muted font-bold uppercase tracking-wider block">Prochaine action programmée</span>
                            <p className="text-xs text-muted italic py-1">Aucune action programmée.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              if (status === "prospect") {
                return (
                  <div className="space-y-6">
                    {/* 1. Stratégie d'adressage (en premier) */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                        Stratégie d&apos;adressage
                      </h4>
                      {priorityContacts.length === 0 ? (
                        <p className="text-xs text-muted italic py-1">
                          Aucun contact prioritaire lié pour établir la stratégie d&apos;adressage.
                        </p>
                      ) : (
                        <div className="bg-canvas/20 rounded-[var(--radius-medium)] border border-border/40 p-4 space-y-4">
                          <div className="flex flex-col gap-2.5">
                            {priorityContacts.map((contact) => {
                              const person = contact.persons
                              if (!person) return null
                              const name = person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()
                              return (
                                <div key={contact.id} className="flex justify-between items-center bg-surface border border-border/40 rounded-[var(--radius-medium)] p-2.5">
                                  <div>
                                    <span
                                      onClick={() => onOpenContactIdentity?.(contact.id)}
                                      className="text-xs font-bold text-heading hover:text-primary hover:underline cursor-pointer transition-colors"
                                    >
                                      {name}
                                    </span>
                                    <span className="text-[10px] text-muted block mt-0.5">
                                      {contact.job_title || "Fonction non spécifiée"}
                                    </span>
                                  </div>
                                  {contact.relationship_role && (
                                    <span className={cn(
                                      "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0",
                                      contact.relationship_role === "decideur"
                                        ? "bg-success/10 border-success/20 text-success"
                                        : contact.relationship_role === "sponsor" || contact.relationship_role === "prescripteur"
                                        ? "bg-primary/10 border-primary/20 text-primary"
                                        : "bg-muted/10 border-border text-muted"
                                    )}>
                                      {contact.relationship_role.replace("_", " ")}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Pipe opportunités */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                        Pipe opportunités
                      </h4>
                      {openOpps.length === 0 ? (
                        <p className="text-xs text-muted italic py-1">
                          Aucune opportunité commerciale en cours.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {openOpps.map((opp) => (
                            <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2">
                              <div className="flex justify-between items-start gap-3">
                                <span className="text-xs font-semibold text-heading truncate">{opp.title}</span>
                                <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary capitalize shrink-0">
                                  {getOpportunityStageLabel(opp.stage)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                                <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                                <span>Conviction : <strong className="text-body">{opp.conviction}%</strong></span>
                                {opp.acv && <span>Valeur : <strong className="text-heading">{formatEuro(opp.acv)}</strong></span>}
                              </div>
                              {formatOpportunityMeta(opp) ? (
                                <div className="text-[10px] text-muted">{formatOpportunityMeta(opp)}</div>
                              ) : null}
                              {opp.requires_staffing ? (
                                <div className="text-[10px] font-medium text-primary">
                                  Staffing : {opp.required_headcount} profil{opp.required_headcount > 1 ? "s" : ""}
                                </div>
                              ) : null}
                              {isProposalFollowUpStage(opp.stage) ? (
                                <div className="flex justify-end border-t border-border/30 pt-2">
                                  <ContextualCommunicationButton
                                    entryPoint="proposal_sent"
                                    companyId={data.company.id}
                                    companyName={data.company.name}
                                    primaryEntity={{ type: "opportunity", id: opp.id }}
                                    label="Relancer la proposition"
                                    className="h-8 min-h-8 px-2.5 text-[11px]"
                                    aria-label={`Relancer la proposition pour ${opp.title}`}
                                    refs={{
                                      opportunityRef: opp.id,
                                      angle: [
                                        `Opportunité: ${opp.title}`,
                                        `Stade: ${getOpportunityStageLabel(opp.stage)}`,
                                        opp.acv ? `Valeur: ${formatEuro(opp.acv)}` : null,
                                      ].filter(Boolean).join("\n") || undefined,
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Actions */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                        Actions
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Dernière Action */}
                        {data.lastInteraction || data.company.last_contact_at ? (
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px]">
                            <div>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block mb-1">Dernière action réalisée</span>
                              {data.lastInteraction ? (
                                <div className="text-xs">
                                  <span className="font-semibold text-heading block">
                                    {data.lastInteraction.type.toUpperCase()} — {formatDate(data.lastInteraction.occurred_at)}
                                  </span>
                                  <p className="text-body font-normal mt-1 leading-normal line-clamp-3">
                                    {data.lastInteraction.summary || "Pas de résumé disponible."}
                                  </p>
                                  <div className="mt-3 flex justify-end border-t border-border/30 pt-2">
                                    <ContextualCommunicationButton
                                      entryPoint="meeting_interaction"
                                      companyId={data.company.id}
                                      companyName={data.company.name}
                                      primaryEntity={{ type: "company", id: data.company.id }}
                                      label="Rédiger le suivi"
                                      className="h-8 min-h-8 px-2.5 text-[11px]"
                                      aria-label={`Rédiger le suivi de la dernière interaction avec ${data.company.name}`}
                                      refs={{
                                        interactionRef: data.lastInteraction.id,
                                        angle: [
                                          `Type interaction: ${data.lastInteraction.type}`,
                                          data.lastInteraction.summary ? `Résumé: ${data.lastInteraction.summary}` : null,
                                          data.lastInteraction.next_action ? `Prochaine étape: ${data.lastInteraction.next_action}` : null,
                                        ].filter(Boolean).join("\n") || undefined,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs">
                                  <span className="font-semibold text-heading block">
                                    Dernier contact : {formatDate(data.company.last_contact_at)}
                                  </span>
                                  <p className="text-muted italic mt-1 font-normal">
                                    Pas de détails d&apos;interaction disponibles.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-muted font-bold uppercase tracking-wider block">Dernière action réalisée</span>
                            <p className="text-xs text-muted italic py-1">Aucune action passée enregistrée.</p>
                          </div>
                        )}

                        {/* Prochaine Action */}
                        {data.company.next_action_label ? (
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px]">
                            <div>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block mb-1">Prochaine action programmée</span>
                              <div className="text-xs">
                                <span className="font-semibold text-heading block">
                                  À faire : {data.company.next_action_label}
                                </span>
                                {data.company.next_action_at && (
                                  <span className="text-[10px] text-muted mt-1 block">
                                    Échéance : {formatDate(data.company.next_action_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-muted font-bold uppercase tracking-wider block">Prochaine action programmée</span>
                            <p className="text-xs text-muted italic py-1">Aucune action programmée.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // Fallback default generic view for other lifecycle statuses
              return (
                <div className="space-y-6">
                  {/* Pipeline Commercial */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                      Pipeline Commercial ({data.opportunities.length})
                    </h4>
                    {data.opportunities.length === 0 ? (
                      <p className="text-xs text-muted italic py-1">
                        Aucune opportunité commerciale enregistrée.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {data.opportunities.map((opp) => (
                          <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-xs font-semibold text-heading truncate">{opp.title}</span>
                              <span className="rounded bg-success/10 border border-success/20 px-2 py-0.5 text-[9px] font-bold text-success capitalize shrink-0">
                                  {getOpportunityStageLabel(opp.stage)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                              <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                              <span>Conviction : <strong className="text-body">{opp.conviction}%</strong></span>
                              {opp.acv && <span>Valeur : <strong className="text-heading">{formatEuro(opp.acv)}</strong></span>}
                            </div>
                            {formatOpportunityMeta(opp) ? (
                              <div className="text-[10px] text-muted">{formatOpportunityMeta(opp)}</div>
                            ) : null}
                            {opp.requires_staffing ? (
                              <div className="text-[10px] font-medium text-primary">
                                Staffing : {opp.required_headcount} profil{opp.required_headcount > 1 ? "s" : ""}
                              </div>
                            ) : null}
                            {isProposalFollowUpStage(opp.stage) ? (
                              <div className="flex justify-end border-t border-border/30 pt-2">
                                <ContextualCommunicationButton
                                  entryPoint="proposal_sent"
                                  companyId={data.company.id}
                                  companyName={data.company.name}
                                  primaryEntity={{ type: "opportunity", id: opp.id }}
                                  label="Relancer la proposition"
                                  className="h-8 min-h-8 px-2.5 text-[11px]"
                                  aria-label={`Relancer la proposition pour ${opp.title}`}
                                  refs={{
                                    opportunityRef: opp.id,
                                    angle: [
                                      `Opportunité: ${opp.title}`,
                                      `Stade: ${getOpportunityStageLabel(opp.stage)}`,
                                      opp.acv ? `Valeur: ${formatEuro(opp.acv)}` : null,
                                    ].filter(Boolean).join("\n") || undefined,
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contrats Missions */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading">
                      Missions & Contrats ({data.missions.length})
                    </h4>
                    {data.missions.length === 0 ? (
                      <p className="text-xs text-muted italic py-1">
                        Aucune mission active ou passée liée à ce compte.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {data.missions.map((mission) => {
                          const collab = mission.collaborators?.persons
                          const name = collab
                            ? collab.full_name || `${collab.first_name || ""} ${collab.last_name || ""}`.trim()
                            : "Non assigné"
                          return (
                            <div key={mission.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2.5">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <span className="text-xs font-bold text-heading block">{mission.title}</span>
                                  <span className="text-[10px] text-muted mt-0.5 block">
                                    Consultant : <strong className="text-body font-medium">{name}</strong>
                                  </span>
                                </div>
                                <span className={cn(
                                  "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0",
                                  mission.status === "active" 
                                    ? "bg-success/10 border-success/20 text-success" 
                                    : "bg-muted/10 border-border text-muted"
                                )}>
                                  {mission.status === "active" ? "Active" : "Terminée"}
                                </span>
                              </div>

                              <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2">
                                <span>Début : <strong className="text-body">{formatDate(mission.start_date)}</strong></span>
                                <span>TJ client : <strong className="text-heading font-bold">{formatEuro(mission.tjm)}</strong></span>
                                {mission.gross_margin_pct !== null && (
                                  <span>Marge : <strong className="text-success font-bold">{mission.gross_margin_pct}%</strong></span>
                                )}
                              </div>
                              {mission.status === "active" ? (
                                <div className="flex justify-end border-t border-border/30 pt-2">
                                  <ContextualCommunicationButton
                                    entryPoint="active_mission"
                                    companyId={data.company.id}
                                    companyName={data.company.name}
                                    primaryEntity={{ type: "mission", id: mission.id }}
                                    label="Proposer une extension"
                                    className="h-8 min-h-8 px-2.5 text-[11px]"
                                    aria-label={`Proposer une extension pour la mission ${mission.title}`}
                                    refs={{
                                      missionRef: mission.id,
                                      angle: [
                                        `Mission active: ${mission.title}`,
                                        `Consultant: ${name}`,
                                        mission.end_date ? `Fin prévue: ${formatDate(mission.end_date)}` : null,
                                      ].filter(Boolean).join("\n") || undefined,
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {activeTab === "actu" && (
              <div className="space-y-4">
                {/* Recent News list */}
                {signaux.actualites_recentes && signaux.actualites_recentes.length > 0 ? (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3 font-heading">
                      Actualité récente
                    </h4>
                    <div className="bg-canvas/30 rounded-[var(--radius-medium)] border border-border/50 p-4 pl-5">
                      <div className="relative">
                        {signaux.actualites_recentes?.map((item: string, idx: number) => {
                          const isLast = idx === (signaux.actualites_recentes?.length ?? 0) - 1
                          const match = item.match(/^(\d{1,2}\s+[a-zA-Zà-öø-ÿ]+\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s*[:\-–—]\s*(.*)$/i)
                          const dateStr = match
                            ? match[1].trim()
                            : (data.company.updated_at
                                ? new Date(data.company.updated_at).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Récent")
                          const textStr = match ? match[2].trim() : item

                          return (
                            <div key={idx} className="relative flex gap-3.5 pb-4 last:pb-0">
                              {!isLast && (
                                <div
                                  className="absolute left-[7px] top-[20px] w-0.5"
                                  style={{
                                    height: "calc(100% - 12px)",
                                    background: idx === 0
                                      ? "#FF9800"
                                      : "var(--color-border)",
                                  }}
                                />
                              )}

                              <div
                                className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-bold"
                                style={{
                                  borderColor: "#FF9800",
                                  background: idx === 0
                                    ? "#FF9800"
                                    : "var(--color-canvas)",
                                  color: idx === 0 ? "white" : "#FF9800",
                                }}
                              >
                                {idx === 0 && "✓"}
                              </div>

                              <div className="min-w-0 flex-1 pb-3 border-b border-border/20 last:border-b-0 last:pb-0">
                                <p className="text-xs leading-relaxed text-heading">
                                  <span className="text-[10px] font-bold text-muted mr-1.5 uppercase tracking-wider inline-block">
                                    {dateStr} :
                                  </span>
                                  {textStr}
                                </p>
                                <div className="mt-2 flex items-center gap-1.5 justify-start">
                                  <a
                                    href={
                                      item.match(/(https?:\/\/[^\s]+)/)?.[0] ||
                                      `https://www.google.com/search?q=${encodeURIComponent(`${data.company.name} ${item}`)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative overflow-hidden bg-[#FF9800] hover:bg-[#E88900] hover:-translate-y-0.5 active:scale-[0.97] text-white border-none shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(255,152,0,0.24)] transition-all duration-200 rounded-xl h-5.5 min-h-[22px] px-2 text-[8.5px] font-bold select-none cursor-pointer flex items-center gap-1.5 justify-center"
                                    title="Accéder à la source du signal"
                                  >
                                    <span className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-white/15 blur-xl transition-all duration-300 group-hover:scale-110" />
                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:animate-[kredo-action-shine-sweep_0.55s_cubic-bezier(0.4,0,0.2,1)_forwards]" />
                                    <Image
                                      src="/icons_set/cockpit_intelligence/recherche_actualités.png"
                                      alt=""
                                      width={12}
                                      height={12}
                                      className="relative z-10 size-3 object-contain transition-transform duration-200 group-hover:scale-110"
                                    />
                                    <span className="relative z-10">Voir la source</span>
                                  </a>

                                  <ContextualCommunicationButton
                                    entryPoint="signal_card"
                                    companyId={data.company.id}
                                    companyName={data.company.name}
                                    primaryEntity={{ type: "company", id: data.company.id }}
                                    label="Contacter sur ce signal"
                                    className="group relative overflow-hidden bg-[#FF9800] hover:bg-[#E88900] hover:-translate-y-0.5 active:scale-[0.97] text-white border-none shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(255,152,0,0.24)] transition-all duration-200 rounded-xl h-5.5 min-h-[22px] px-2 text-[8.5px] font-bold select-none cursor-pointer flex items-center gap-1.5 justify-center"
                                    aria-label={`Contacter ${data.company.name} sur le signal ${idx + 1}`}
                                    refs={{
                                      signalRef: item,
                                      angle: data.company.sector ? `Angle sectoriel: ${data.company.sector}` : undefined,
                                    }}
                                    leftIcon={
                                      <>
                                        <span className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-white/15 blur-xl transition-all duration-300 group-hover:scale-110" />
                                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:animate-[kredo-action-shine-sweep_0.55s_cubic-bezier(0.4,0,0.2,1)_forwards]" />
                                        <Image
                                          src="/icons_set/cockpit_intelligence/redaction_message_ai.png"
                                          alt=""
                                          width={12}
                                          height={12}
                                          className="relative z-10 size-3 object-contain transition-transform duration-200 group-hover:scale-110"
                                        />
                                      </>
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-canvas/20 rounded-[var(--radius-medium)] border border-border/40 text-xs text-muted italic">
                    Aucune actualité ou signal faible disponible.
                  </div>
                )}

                {/* Recrutements Récents */}
                {signaux.recrutements_recents && (
                  <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                    <span className="text-[9px] text-muted font-bold uppercase">Actualité recrutement</span>
                    <p className="text-xs text-body leading-relaxed font-normal">{signaux.recrutements_recents}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {data ? (
        <CompanyDocumentsModal
          open={isDocumentsModalOpen}
          onClose={() => setIsDocumentsModalOpen(false)}
          companyId={data.company.id}
          companyName={data.company.name}
          isMobile={isMobileViewport}
        />
      ) : null}
    </AppDrawer>
  )
}

function truncateToSentences(text: string, max: number): { short: string; isTruncated: boolean } {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g)
  if (!sentences || sentences.length <= max) return { short: text, isTruncated: false }
  return { short: sentences.slice(0, max).join("").trim(), isTruncated: true }
}


function copyText(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea")
  ta.value = text
  ta.style.cssText = "position:fixed;opacity:0;pointer-events:none"
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand("copy") } catch { /* silent */ }
  document.body.removeChild(ta)
}

function renderJsonValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    // flat string/number array → comma-separated
    if (value.every(i => typeof i === "string" || typeof i === "number")) {
      return <span>{(value as (string | number)[]).join(", ")}</span>
    }
    // complex items → bulleted list, recurse
    return (
      <ul className="space-y-1.5 mt-0.5">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-muted shrink-0 mt-1.5" />
            <span className="flex-1 leading-relaxed">{renderJsonValue(item, depth + 1)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === "object") {
    return (
      <div className={depth > 0 ? "space-y-1" : "space-y-2"}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-[9px] text-muted/70 font-semibold uppercase tracking-wide block mb-0.5">
              {k.replace(/_/g, " ")}
            </span>
            <div className="leading-relaxed">{renderJsonValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    )
  }
  return String(value)
}
