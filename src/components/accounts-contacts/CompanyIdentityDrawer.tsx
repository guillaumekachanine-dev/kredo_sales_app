"use client"

import { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getCompanyIdentity } from "@/app/(app)/prospection/accounts/actions"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

interface CompanyIdentityDrawerProps {
  companyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
  }
  contacts: Array<{
    id: string
    person_id: string
    job_title: string | null
    relationship_role: string | null
    status: string
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

type TabKey = "apercu" | "intelligence" | "contacts" | "crm"

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

export function CompanyIdentityDrawer({
  companyId,
  open,
  onOpenChange,
}: CompanyIdentityDrawerProps) {
  const [data, setData] = useState<IdentityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("apercu")
  const [transitionPending, startTransition] = useTransition()

  const loading = transitionPending || (open && !!companyId && !data && !error)

  useEffect(() => {
    if (!open || !companyId) {
      return
    }

    startTransition(async () => {
      setError(null)
      setActiveTab("apercu")
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
    }
  }, [companyId, open])

  // Extract analysis_data from company metadata
  const metadata = data?.company?.metadata || {}
  const analysisData = (metadata.analysis_data || {}) as CompanyAnalysisData
  
  const identite = analysisData.identite || {}
  const positionnement = analysisData.positionnement || {}
  const signaux = analysisData.signaux || {}
  const contexteSectoriel = analysisData.contexte_sectoriel || {}
  const synthese = analysisData.synthese_consultant || data?.company?.description || "Aucune synthèse disponible."



  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={data?.company?.name || "Chargement..."}
      subtitle={
        data?.company
          ? [data.company.sector, data.company.segment].filter(Boolean).join(" - ") || "Fiche d'identité"
          : "Fiche d'identité"
      }
      className="max-w-2xl"
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  name={data.company.name}
                  logoPath={(data.company.metadata?.logo_path as string) || null}
                  website={data.company.website}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-heading leading-tight">{data.company.name}</h3>
                    {data.company.legal_name && data.company.legal_name !== data.company.name && (
                      <span className="text-[10px] text-muted font-normal font-mono">({data.company.legal_name})</span>
                    )}
                  </div>
                  {data.company.website && (
                    <a
                      href={data.company.website.startsWith("http") ? data.company.website : `https://${data.company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary font-semibold hover:underline block mt-0.5"
                    >
                      {data.company.website}
                    </a>
                  )}
                </div>
              </div>

              {/* AI Score Badge */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Score IA</span>
                <span className="text-sm font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded shadow-sm">
                  {formatScore(data.company.ai_score)}
                </span>
              </div>
            </div>

            {/* Tags / Badges row */}
            <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-border/40 text-[10px]">
              <span className="rounded bg-primary-fg border border-border px-2 py-0.5 font-semibold text-body capitalize">
                {data.company.lifecycle_status.replace("_", " ")}
              </span>
              <span className={cn(
                "rounded px-2 py-0.5 font-bold border",
                data.company.priority === "haute" 
                  ? "bg-warning/10 border-warning/20 text-warning" 
                  : "bg-canvas text-body border-border"
              )}>
                Priorité {data.company.priority}
              </span>
              {data.company.hq_location && (
                <span className="text-muted flex items-center gap-1 ml-auto font-medium">
                  <svg className="w-3 h-3 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {data.company.hq_location}
                </span>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-1 shrink-0">
            {(
              [
                { key: "apercu", label: "Aperçu" },
                { key: "intelligence", label: "Marché" },
                { key: "contacts", label: `Contacts (${data.contacts.length})` },
                { key: "crm", label: `Activité (${data.opportunities.length + data.missions.length})` },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-all outline-none whitespace-nowrap",
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
                {/* Consultant Synthesis */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                    Synthèse de l&apos;Intelligence Commerciale
                  </h4>
                  <div className="text-xs leading-relaxed text-heading bg-primary/5 border border-primary/10 rounded-lg p-4 font-normal shadow-sm">
                    {synthese}
                  </div>
                </div>

                {/* Core Administrative Identity */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                    Fiche Administrative & Chiffres Clés
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          ? `${data.company.employee_count} ${data.company.size_band ? `(${data.company.size_band})` : ""}`.trim()
                          : (identite.effectif_estime || (metadata.employee_count_raw as string) || "Non renseigné")}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Siège social / Adresse</span>
                      <span className="text-xs font-bold text-heading">
                        {identite.siege_social || data.company.hq_location || "Non renseigné"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">Date de création</span>
                      <span className="text-xs font-bold text-heading">
                        {identite.date_creation || "Non renseignée"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1 sm:col-span-2">
                      <span className="text-[9px] text-muted font-bold uppercase">Dynamique</span>
                      <span className="text-xs font-bold text-heading">
                        {data.company.health || "Aucun indicateur de dynamique renseigné"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "intelligence" && (
              <div className="space-y-5">
                {/* Brand Positioning */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                    Positionnement & Proposition de Valeur
                  </h4>
                  <div className="space-y-3 bg-canvas/20 rounded-lg border border-border/40 p-4">
                    {positionnement.activite_principale && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-muted font-bold uppercase">Activité Principale</span>
                        <p className="text-xs text-body leading-relaxed">{positionnement.activite_principale}</p>
                      </div>
                    )}
                    {positionnement.proposition_valeur && (
                      <div className="flex flex-col gap-0.5 pt-2.5 border-t border-border/40">
                        <span className="text-[9px] text-muted font-bold uppercase">Proposition de Valeur</span>
                        <p className="text-xs text-body leading-relaxed">{positionnement.proposition_valeur}</p>
                      </div>
                    )}
                    {positionnement.clients_types && (
                      <div className="flex flex-col gap-0.5 pt-2.5 border-t border-border/40">
                        <span className="text-[9px] text-muted font-bold uppercase">Clients Cibles / Typologie</span>
                        <p className="text-xs text-body leading-relaxed">{positionnement.clients_types}</p>
                      </div>
                    )}
                    {positionnement.zone_geographique && (
                      <div className="flex flex-col gap-0.5 pt-2.5 border-t border-border/40">
                        <span className="text-[9px] text-muted font-bold uppercase">Zone Géographique</span>
                        <p className="text-xs text-body leading-relaxed font-medium">{positionnement.zone_geographique}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Market & Weak Signals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                    <span className="text-[9px] text-muted font-bold uppercase">Tendance de croissance</span>
                    <p className="text-xs text-body leading-relaxed">{signaux.tendance_croissance || "Non renseignée"}</p>
                  </div>
                  <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
                    <span className="text-[9px] text-muted font-bold uppercase">Maturité Digitale</span>
                    <p className="text-xs text-body leading-relaxed">{signaux.indices_maturite_digitale || "Non renseignée"}</p>
                  </div>
                  {signaux.recrutements_recents && (
                    <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1 sm:col-span-2">
                      <span className="text-[9px] text-muted font-bold uppercase">Recrutements Récents</span>
                      <p className="text-xs text-body leading-relaxed">{signaux.recrutements_recents}</p>
                    </div>
                  )}
                </div>

                {/* Sector Context & Competitors */}
                {(contexteSectoriel.secteur || contexteSectoriel.tendances_sectorielles || (contexteSectoriel.concurrents_identifies && contexteSectoriel.concurrents_identifies.length > 0)) && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Contexte Sectoriel & Concurrence
                    </h4>
                    <div className="space-y-3 bg-canvas/20 rounded-lg border border-border/40 p-4">
                      {contexteSectoriel.secteur && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-muted font-bold uppercase">Secteur</span>
                          <p className="text-xs text-body leading-relaxed font-semibold">{contexteSectoriel.secteur}</p>
                        </div>
                      )}
                      {contexteSectoriel.tendances_sectorielles && (
                        <div className="flex flex-col gap-0.5 pt-2.5 border-t border-border/40">
                          <span className="text-[9px] text-muted font-bold uppercase">Tendances du Marché</span>
                          <p className="text-xs text-body leading-relaxed">{contexteSectoriel.tendances_sectorielles}</p>
                        </div>
                      )}
                      {contexteSectoriel.concurrents_identifies && contexteSectoriel.concurrents_identifies.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border/40">
                          <span className="text-[9px] text-muted font-bold uppercase">Concurrents Identifiés</span>
                          <div className="flex flex-wrap gap-1">
                            {contexteSectoriel.concurrents_identifies.map((comp: string, idx: number) => (
                              <span key={idx} className="inline-flex rounded bg-surface border border-border px-2 py-0.5 text-xs text-body font-medium">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent News list */}
                {signaux.actualites_recentes && signaux.actualites_recentes.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
                      Actualités Récentes & Signaux Faibles
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
                )}
              </div>
            )}

            {activeTab === "contacts" && (
              <div className="space-y-4">
                {identite.dirigeants && identite.dirigeants.length > 0 && (
                  <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1.5">
                    <span className="text-[9px] text-muted font-bold uppercase">Dirigeants & Fondateurs</span>
                    <div className="flex flex-wrap gap-1">
                      {identite.dirigeants.map((leader: string, idx: number) => (
                        <span key={idx} className="inline-flex rounded bg-surface border border-border px-2 py-0.5 text-xs text-heading font-medium">
                          {leader}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-2">
                  Contacts Rattachés ({data.contacts.length})
                </h4>
                {data.contacts.length === 0 ? (
                  <div className="text-center py-10 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                    Aucun contact lié à cette entreprise.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.contacts.map((contact) => {
                      const person = contact.persons
                      if (!person) return null
                      return (
                        <SurfaceCard key={contact.id} className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-bold text-heading">
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-t border-border/30 pt-3 font-mono text-muted">
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
            )}

            {activeTab === "crm" && (
              <div className="space-y-6">
                {/* Pipeline Opportunités */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-2">
                    Pipeline Commercial ({data.opportunities.length})
                  </h4>
                  {data.opportunities.length === 0 ? (
                    <div className="text-center py-6 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                      Aucune opportunité commerciale enregistrée.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {data.opportunities.map((opp) => (
                        <div key={opp.id} className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-2">
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
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted font-heading mb-2">
                    Missions & Contrats ({data.missions.length})
                  </h4>
                  {data.missions.length === 0 ? (
                    <div className="text-center py-6 bg-canvas/20 rounded-lg border border-border/40 text-xs text-muted italic">
                      Aucune mission active ou passée liée à ce compte.
                    </div>
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
            )}
          </div>
        </div>
      ) : null}
    </AppDrawer>
  )
}

function formatEuro(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}
