"use client"

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getCompanyIdentity } from "@/app/(app)/prospection/accounts/actions"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { RatingIndicator } from "@/components/ui/RatingIndicator"
import { lifecycleLabel } from "@/components/accounts-contacts/intelligence/intelligence-parts"

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
    ai_score: number | string | null
    tags: string[] | null
    metadata: Record<string, unknown> | null
    last_contact_at: string | null
    next_action_label: string | null
    next_action_at: string | null
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
    target_daily_rate: number | null
    duration_days: number | null
    estimated_gain: number | null
    target_close_date: string | null
    acv: number | null
  }>
  missions: Array<{
    id: string
    title: string
    status: string
    start_date: string | null
    end_date: string | null
    tjm: number
    taci: number
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

function parseHealthScore(health: string | null): number | null {
  if (!health) return null
  const h = health.toLowerCase().trim()
  if (h === "" || h === "non trouvé" || h === "tbd" || h === "-") return null

  // Very strong / excellent / 5
  if (
    h.includes("très forte croissance") ||
    h.includes("forte croissance") ||
    h.includes("croissance active") ||
    h.includes("excellent") ||
    h.includes("exceptionnel")
  ) {
    return 5
  }

  // Good / positive / 4
  if (
    h.includes("croissance durable") ||
    h.includes("croissance soutenue") ||
    h.includes("croissance positive") ||
    h.includes("croissance structurée") ||
    h.includes("dynamique positive") ||
    h.includes("positive") ||
    h.includes("reprise attendue") ||
    h.includes("légère croissance") ||
    h.includes("croissance confirmée") ||
    h.includes("croissance internationale") ||
    h.includes("expansion active")
  ) {
    return 4
  }

  // Stable / neutral / 3
  if (
    h.includes("stable") ||
    h.includes("non applicable") ||
    h.includes("entité publique") ||
    h.includes("institution publique") ||
    h.includes("réseau en évolution")
  ) {
    return 3
  }

  // Mixed / difficult / 2
  if (
    h.includes("mitigée") ||
    h.includes("contrastée") ||
    h.includes("difficile") ||
    h.includes("sous pression") ||
    h.includes("contraction")
  ) {
    return 2
  }

  // Bad / negative / 1
  if (
    h.includes("négative") ||
    h.includes("déficitaire") ||
    h.includes("difficultés financières") ||
    h.includes("redressement") ||
    h.includes("critique") ||
    h.includes("faillite")
  ) {
    return 1
  }

  // Fallback heuristic:
  if (h.includes("croissance")) return 4
  if (h.includes("difficulté") || h.includes("négatif") || h.includes("baisse")) return 2

  return 3
}


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

function formatManagerName(name: string): string {
  if (!name) return ""
  let clean = name.replace(/\s*\(.*?\)/g, "")
  clean = clean.split(",")[0].split(" - ")[0].split(" :")[0]
  return clean.trim()
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
  const [contactFilter, setContactFilter] = useState<"all" | "decideur" | "activity" | "cible" | "other">("all")
  const prevCompanyIdRef = useRef<string | null>(null)

  const loading = transitionPending || (open && !!companyId && !data && !error)

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
    }
  }, [companyId, open])

  // Extract analysis_data from company metadata
  const metadata = data?.company?.metadata || {}
  const analysisData = (metadata.analysis_data || {}) as CompanyAnalysisData
  
  const identite = analysisData.identite || {}
  const positionnement = analysisData.positionnement || {}
  const signaux = analysisData.signaux || {}
  const synthese = analysisData.synthese_consultant || data?.company?.description || "Aucune synthèse disponible."
  const healthScore = data ? parseHealthScore(data.company.health) : null
  const riskScore = healthScore

  const hasMaturite = !!(
    signaux.indices_maturite_digitale &&
    signaux.indices_maturite_digitale.trim() !== "" &&
    signaux.indices_maturite_digitale.trim() !== "-" &&
    !signaux.indices_maturite_digitale.toLowerCase().includes("non renseigné") &&
    !signaux.indices_maturite_digitale.toLowerCase().includes("non renseignée")
  )


  const getHealthLabel = (score: number | null) => {
    switch (score) {
      case 5: return "Très bonne"
      case 4: return "Bonne"
      case 3: return "Stable"
      case 2: return "Fragile"
      case 1: return "Critique"
      default: return "Non renseignée"
    }
  }

  const getRiskLabel = (score: number | null) => {
    switch (score) {
      case 5: return "Très faible"
      case 4: return "Faible"
      case 3: return "Modéré"
      case 2: return "Élevé"
      case 1: return "Très élevé"
      default: return "Non renseigné"
    }
  }

  const getRiskDescription = (score: number | null) => {
    switch (score) {
      case 5: return "Risque très faible. Situation financière saine et stable."
      case 4: return "Risque faible. Bons indicateurs de performance."
      case 3: return "Risque modéré. Pas de signal critique détecté."
      case 2: return "Risque élevé. Indicateurs financiers sous pression."
      case 1: return "Risque très élevé. Difficultés ou restructuration critiques."
      default: return "Risque non évaluable."
    }
  }




  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={data?.company?.name || "Chargement..."}
      subtitle="Fiche d'identité"
      className="max-w-2xl"
      hideMobileBackBtn={true}
    >
      {loading ? (
        <div className="flex flex-col gap-6 p-2">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 bg-border/40 rounded-lg shrink-0" />
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
      ) : data ? (
        <div className="flex flex-col h-full gap-5">
          {/* Company identity card summary */}
          <div className="flex flex-col gap-4 bg-canvas/30 rounded-xl border border-border/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Mobile back arrow button */}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="sm:hidden flex items-center justify-center text-muted hover:text-heading transition-colors cursor-pointer mr-0.5"
                  aria-label="Retour"
                >
                  <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="16,5 7,12 16,19" />
                  </svg>
                </button>

                {data.company.website ? (
                  <a
                    href={data.company.website.startsWith("http") ? data.company.website : `https://${data.company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity shrink-0"
                    title={`Visiter le site de ${data.company.name}`}
                  >
                    <CompanyLogo
                      name={data.company.name}
                      logoPath={(data.company.metadata?.logo_path as string) || null}
                      website={data.company.website}
                      size="md"
                    />
                  </a>
                ) : (
                  <CompanyLogo
                    name={data.company.name}
                    logoPath={(data.company.metadata?.logo_path as string) || null}
                    website={data.company.website}
                    size="md"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-heading leading-tight">{data.company.name}</h3>
                  </div>
                  {(data.company.sector || data.company.segment) && (
                    <span className="text-[11px] text-muted font-medium block mt-0.5">
                      {[data.company.sector, data.company.segment].filter(Boolean).join(" - ")}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Score Badge */}
              <div className="flex shrink-0">
                <span className="inline-flex items-center justify-center text-sm font-extrabold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded shadow-sm">
                  {formatScore(data.company.ai_score)}
                </span>
              </div>
            </div>

            {/* Cockpit CTA Button in Footer */}
            {companyId && (
              <div className="pt-2 border-t border-border/40">
                <Link
                  href={`/prospection/accounts/${companyId}`}
                  className="kredo-cockpit-cta-button relative flex items-center justify-center rounded-lg bg-primary w-full py-2 text-xs font-bold text-primary-fg shadow-sm transition-colors hover:bg-primary/95"
                >
                  <span>Ouvrir le cockpit Intelligence</span>
                  <span
                    className="kredo-ready-action-circle"
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "18px",
                      height: "18px",
                      minWidth: "18px",
                      minHeight: "18px",
                    }}
                  >
                    <svg
                      className="w-2.5 h-2.5 relative z-10 text-white shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                  </span>
                </Link>
              </div>
            )}
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
                    Statut & chiffres clés
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Statut */}
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Statut</span>
                      <span className="text-xs font-bold text-heading">
                        {lifecycleLabel(data.company.lifecycle_status)}
                      </span>
                    </div>
                    {/* Priorité */}
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Priorité</span>
                      <span className={cn(
                        "text-xs font-bold capitalize",
                        data.company.priority === "haute" ? "text-warning" : "text-heading"
                      )}>
                        {data.company.priority}
                      </span>
                    </div>

                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Chiffre d&apos;Affaires</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.revenue || identite.ca_estime || (metadata.revenue_raw as string) || "Non renseigné"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Effectifs</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.employee_count !== null 
                          ? data.company.employee_count
                          : (identite.effectif_estime || (metadata.employee_count_raw as string) || "Non renseigné")}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Siège social</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.hq_location || "Non renseigné"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Dirigeant actuel</span>
                      <span className="text-xs font-bold text-heading truncate" title={identite.dirigeants && identite.dirigeants.length > 0 ? identite.dirigeants.join(", ") : undefined}>
                        {identite.dirigeants && identite.dirigeants.length > 0
                          ? identite.dirigeants.map(formatManagerName).join(", ")
                          : "Non renseigné"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1 col-span-2">
                      <span className="text-[9px] text-muted font-bold uppercase">Dynamique</span>
                      <span className="text-xs font-normal text-heading">
                        {data.company.health || "Aucun indicateur de dynamique renseigné"}
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
                    {healthScore !== null && (
                      <div className="grid grid-cols-2 gap-3 col-span-2">
                        <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                          <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Santé financière</span>
                          <div className="flex items-center mt-0.5">
                            <RatingIndicator value={healthScore} mode="single" size="lg" showLabel={false} />
                          </div>
                        </div>
                        <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                          <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Risque financier</span>
                          <div className="flex items-center mt-0.5">
                            <RatingIndicator value={riskScore} mode="single" size="lg" showLabel={false} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {activeTab === "intelligence" && (
              <div className="space-y-4">
                {/* Consultant Synthesis moved here from Aperçu */}
                <div className="text-xs leading-relaxed text-heading bg-primary/5 border border-primary/10 rounded-lg p-4 font-normal shadow-sm flex flex-col gap-2">
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
                dsi: 0,
                sponsor: 1,
                decideur: 2,
                prescripteur: 3,
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
                if (contactFilter === "activity") {
                  return !!(
                    contact.relationship_level &&
                    contact.relationship_level.trim() !== "" &&
                    contact.relationship_level.toLowerCase() !== "aucun" &&
                    contact.relationship_level.toLowerCase() !== "none"
                  )
                }
                if (contactFilter === "cible") return contact.is_priority === true
                if (contactFilter === "other") {
                  const isDecideur = contact.relationship_role === "decideur"
                  const hasActivity = !!(
                    contact.relationship_level &&
                    contact.relationship_level.trim() !== "" &&
                    contact.relationship_level.toLowerCase() !== "aucun" &&
                    contact.relationship_level.toLowerCase() !== "none"
                  )
                  const isCible = contact.is_priority === true
                  return !isDecideur && !hasActivity && !isCible
                }
                return true
              })

              const countAll = sortedContacts.length
              const countDecideurs = sortedContacts.filter(c => c.relationship_role === "decideur").length
              const countActivity = sortedContacts.filter(c => c.relationship_level && c.relationship_level.trim() !== "" && c.relationship_level.toLowerCase() !== "aucun" && c.relationship_level.toLowerCase() !== "none").length
              const countCibles = sortedContacts.filter(c => c.is_priority === true).length
              const countOthers = sortedContacts.filter(c => {
                const isDec = c.relationship_role === "decideur"
                const hasAct = !!(c.relationship_level && c.relationship_level.trim() !== "" && c.relationship_level.toLowerCase() !== "aucun" && c.relationship_level.toLowerCase() !== "none")
                const isCib = c.is_priority === true
                return !isDec && !hasAct && !isCib
              }).length

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
                        onClick={() => setContactFilter("activity")}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer",
                          contactFilter === "activity"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted hover:text-heading"
                        )}
                      >
                        Activité ({countActivity})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactFilter("cible")}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer",
                          contactFilter === "cible"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted hover:text-heading"
                        )}
                      >
                        Cibles ({countCibles})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactFilter("other")}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer",
                          contactFilter === "other"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface text-muted hover:text-heading"
                        )}
                      >
                        Autres ({countOthers})
                      </button>
                    </div>
                  )}

                  {sortedContacts.length === 0 ? (
                    <div className="text-center py-10 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                      Aucun contact lié à cette entreprise.
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-10 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                      Aucun contact ne correspond à ce filtre.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredContacts.map((contact) => {
                        const person = contact.persons
                        if (!person) return null
                        return (
                          <SurfaceCard key={contact.id} className="px-4 py-2.5 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2.5">
                              <div>
                                <h5 
                                  onClick={() => onOpenContactIdentity?.(contact.id)}
                                  className={cn(
                                    "text-xs font-bold text-heading",
                                    onOpenContactIdentity ? "cursor-pointer hover:text-primary transition-colors hover:underline" : ""
                                  )}
                                >
                                  {person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()}
                                </h5>
                                <p className="text-[10px] text-muted mt-0.5 leading-snug">
                                  {contact.job_title || "Fonction non spécifiée"}
                                </p>
                              </div>
                              {contact.relationship_role && (
                                <span className="rounded bg-primary/5 border border-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider shrink-0">
                                  {contact.relationship_role.replace("_", " ")}
                                </span>
                              )}
                            </div>

                            {/* Contact information details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] border-t border-border/30 pt-2 text-muted">
                              {person.primary_email && (
                                <a
                                  href={`mailto:${person.primary_email}`}
                                  className="flex items-center gap-1.5 hover:text-primary hover:underline truncate"
                                >
                                  <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate">{person.primary_email}</span>
                                </a>
                              )}
                              {person.phone && (
                                <span className="flex items-center gap-1.5 truncate">
                                  <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {person.phone}
                                </span>
                              )}
                              {person.linkedin_url && (
                                <a
                                  href={person.linkedin_url.startsWith("http") ? person.linkedin_url : `https://${person.linkedin_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 hover:text-primary hover:underline sm:col-span-2 text-primary/80"
                                >
                                  <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                  </svg>
                                  <span className="truncate">Profil LinkedIn</span>
                                </a>
                              )}
                            </div>
                          </SurfaceCard>
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
              const openOpps = data.opportunities.filter((o) => !["gagne", "perdu", "abandonne", "win", "lost"].includes(o.stage))
              const priorityContacts = data.contacts.filter((c) => c.is_priority === true)

              // Check if we have a Décideur or Sponsor for addressing strategy
              const hasDecideur = data.contacts.some((c) => c.relationship_role === "decideur")
              const hasSponsor = data.contacts.some((c) => c.relationship_role === "sponsor" || c.relationship_role === "prescripteur")

              if (status === "client_actif") {
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
                              <div key={mission.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2 shadow-xs">
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
                                <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-mono">
                                  <span>Début : <strong className="text-body">{formatDate(mission.start_date)}</strong></span>
                                  <span>TJ client : <strong className="text-heading font-bold">{formatEuro(mission.tjm)}</strong></span>
                                  {mission.gross_margin_pct !== null && (
                                    <span>Marge : <strong className="text-success font-bold">{mission.gross_margin_pct}%</strong></span>
                                  )}
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
                            <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2 shadow-xs">
                              <div className="flex justify-between items-start gap-3">
                                <span className="text-xs font-semibold text-heading truncate">{opp.title}</span>
                                <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary capitalize shrink-0">
                                  {opp.stage.replace("_", " ")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                                <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                                <span>Conviction : <strong className="text-body font-mono">{opp.conviction}%</strong></span>
                                {opp.acv && <span>Valeur : <strong className="text-heading font-mono">{formatCurrency(opp.acv)}</strong></span>}
                              </div>
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
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px] shadow-xs">
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
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px] shadow-xs">
                            <div>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block mb-1">Prochaine action programmée</span>
                              <div className="text-xs">
                                <span className="font-semibold text-heading block">
                                  À faire : {data.company.next_action_label}
                                </span>
                                {data.company.next_action_at && (
                                  <span className="text-[10px] text-muted mt-1 block font-mono">
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
                        <div className="bg-canvas/20 rounded-lg border border-border/40 p-4 space-y-4 shadow-xs">
                          <div className="flex flex-col gap-2.5">
                            {priorityContacts.map((contact) => {
                              const person = contact.persons
                              if (!person) return null
                              const name = person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()
                              return (
                                <div key={contact.id} className="flex justify-between items-center bg-surface border border-border/40 rounded-lg p-2.5 shadow-xs">
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
                            <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2 shadow-xs">
                              <div className="flex justify-between items-start gap-3">
                                <span className="text-xs font-semibold text-heading truncate">{opp.title}</span>
                                <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary capitalize shrink-0">
                                  {opp.stage.replace("_", " ")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                                <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                                <span>Conviction : <strong className="text-body font-mono">{opp.conviction}%</strong></span>
                                {opp.acv && <span>Valeur : <strong className="text-heading font-mono">{formatCurrency(opp.acv)}</strong></span>}
                              </div>
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
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px] shadow-xs">
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
                          <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5 justify-between min-h-[100px] shadow-xs">
                            <div>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block mb-1">Prochaine action programmée</span>
                              <div className="text-xs">
                                <span className="font-semibold text-heading block">
                                  À faire : {data.company.next_action_label}
                                </span>
                                {data.company.next_action_at && (
                                  <span className="text-[10px] text-muted mt-1 block font-mono">
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
                          <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2 shadow-xs">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-xs font-semibold text-heading truncate">{opp.title}</span>
                              <span className="rounded bg-success/10 border border-success/20 px-2 py-0.5 text-[9px] font-bold text-success capitalize shrink-0">
                                {opp.stage.replace("_", " ")}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-medium">
                              <span>Type : <strong className="text-body capitalize">{opp.opportunity_type}</strong></span>
                              <span>Conviction : <strong className="text-body font-mono">{opp.conviction}%</strong></span>
                              {opp.acv && <span>Valeur : <strong className="text-heading font-mono">{formatCurrency(opp.acv)}</strong></span>}
                            </div>
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
                            <div key={mission.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2.5 shadow-xs">
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

                              <div className="flex justify-between items-center text-[10px] text-muted border-t border-border/30 pt-2 font-mono">
                                <span>Début : <strong className="text-body">{formatDate(mission.start_date)}</strong></span>
                                <span>TJ client : <strong className="text-heading font-bold">{formatEuro(mission.tjm)}</strong></span>
                                {mission.gross_margin_pct !== null && (
                                  <span>Marge : <strong className="text-success font-bold">{mission.gross_margin_pct}%</strong></span>
                                )}
                              </div>
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
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Actualité récente
                    </h4>
                    <ul className="space-y-2 bg-canvas/30 rounded-lg border border-border/50 p-4">
                      {signaux.actualites_recentes.map((item: string, idx: number) => (
                        <li key={idx} className="flex gap-2 items-start text-xs text-heading leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
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
    </AppDrawer>
  )
}

function truncateToSentences(text: string, max: number): { short: string; isTruncated: boolean } {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g)
  if (!sentences || sentences.length <= max) return { short: text, isTruncated: false }
  return { short: sentences.slice(0, max).join("").trim(), isTruncated: true }
}

function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
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
