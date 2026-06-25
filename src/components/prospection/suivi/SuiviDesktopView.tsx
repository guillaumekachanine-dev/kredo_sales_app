"use client"

import { useState, useEffect } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import type { SuiviData } from "@/lib/prospection/suivi-data"
import {
  ImpulsionKpiCard,
  ActionCritiqueCard,
  RelanceIACard,
} from "./suivi-parts"
import { getCalendarEventsForSuivi, CalendarEventItem } from "@/lib/prospection/suivi-actions"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"

// Taxonomie hiérarchisée des événements de l'activité (ESN)
const EVENT_CATEGORIES = [
  {
    id: "foisonnement",
    label: "Foisonnement",
    options: [
      { label: "Appel qualification besoin", dbType: "appel_qualification" },
      { label: "Soutenance", dbType: "soutenance" },
      { label: "Atelier client", dbType: "atelier_client" },
      { label: "Présentation consultant", dbType: "presentation_rt" },
      { label: "RDV suivi client", dbType: "rdv_client_suivi" },
    ]
  },
  {
    id: "prospection",
    label: "Prospection",
    options: [
      { label: "Appel prospection", dbType: "appel_prospection" },
      { label: "RDV prospection", dbType: "rdv_prospection" },
      { label: "Présentation consultant", dbType: "presentation_rt" },
      { label: "Soutenance", dbType: "soutenance" },
      { label: "Atelier client", dbType: "atelier_client" },
      { label: "Mailing prospection", dbType: "mailing_prospection" },
    ]
  },
  {
    id: "recrutement",
    label: "Recrutement",
    options: [
      { label: "Sourcing candidats", dbType: "sourcing_candidats" },
      { label: "Entretien candidat", dbType: "entretien_candidat" },
      { label: "Préparation candidat", dbType: "preparation_candidat" },
    ]
  }
]

// Couleurs des pastilles d'événements associées à l'agenda
const getDotColor = (dbType: string) => {
  switch (dbType) {
    case "rdv_client_suivi": return "bg-primary"
    case "rdv_prospection": return "bg-emerald-500"
    case "soutenance": return "bg-indigo-500"
    case "atelier_client": return "bg-sky-500"
    case "appel_qualification": return "bg-teal-500"
    case "appel_prospection": return "bg-green-500"
    case "mailing_prospection": return "bg-violet-500"
    case "suivi_mission_client": return "bg-emerald-400"
    case "presentation_rt": return "bg-amber-500"
    case "suivi_mission_collab": return "bg-orange-500"
    case "ead_collab": return "bg-orange-400"
    case "entretien_rh": return "bg-rose-500"
    case "preparation_collab": return "bg-amber-400"
    case "entretien_candidat": return "bg-yellow-500"
    case "preparation_candidat": return "bg-yellow-600"
    case "sourcing_candidats": return "bg-yellow-400"
    default: return "bg-muted"
  }
}

// ── Suivi des Actions — Vue Desktop ──────────────────────────────────────────
export function SuiviDesktopView({ data }: { data: SuiviData }) {
  const { impulsionKpis, actionsCritiques, relancesIA } = data

  const [filterCollab, setFilterCollab] = useState("all")
  const [filterSecteur, setFilterSecteur] = useState("all")

  // Filtres d'en-tête (période & événements)
  const [selectedPeriod, setSelectedPeriod] = useState<"semaine" | "mois" | "trimestre" | "année">("mois")
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false)
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false)

  // Sélection fine des événements (tous cochés par défaut)
  const initialSelected = new Set(
    EVENT_CATEGORIES.flatMap(cat => cat.options.map(opt => `${cat.id}-${opt.dbType}`))
  )
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(initialSelected)

  // Chargement des données Supabase (calendar_events)
  const [dbEvents, setDbEvents] = useState<CalendarEventItem[]>([])
  const [dbEventsLoading, setDbEventsLoading] = useState(false)

  // Calcul dynamique des types Supabase actifs
  const getActiveDbTypes = (selected: Set<string>) => {
    const types = new Set<string>()
    EVENT_CATEGORIES.forEach(cat => {
      cat.options.forEach(opt => {
        const key = `${cat.id}-${opt.dbType}`
        if (selected.has(key)) {
          types.add(opt.dbType)
        }
      })
    })
    return Array.from(types)
  }

  // Toggles de catégories
  const toggleCategory = (categoryId: string) => {
    const cat = EVENT_CATEGORIES.find(c => c.id === categoryId)
    if (!cat) return

    const subKeys = cat.options.map(opt => `${cat.id}-${opt.dbType}`)
    const allSelected = subKeys.every(key => selectedOptions.has(key))

    const newSelected = new Set(selectedOptions)
    if (allSelected) {
      subKeys.forEach(key => newSelected.delete(key))
    } else {
      subKeys.forEach(key => newSelected.add(key))
    }
    setSelectedOptions(newSelected)
  }

  const toggleOption = (key: string) => {
    const newSelected = new Set(selectedOptions)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedOptions(newSelected)
  }

  // Effet de chargement de la base de données table "calendar_events"
  useEffect(() => {
    let active = true
    const activeDbTypes = getActiveDbTypes(selectedOptions)

    async function loadData() {
      setDbEventsLoading(true)
      try {
        const res = await getCalendarEventsForSuivi(selectedPeriod, activeDbTypes)
        if (active) {
          setDbEvents(res)
        }
      } catch (err) {
        console.error("Error loading events:", err)
      } finally {
        if (active) {
          setDbEventsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [selectedPeriod, selectedOptions])

  // Modale nouveau rapport
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportTitle, setReportTitle] = useState("Rapport d'activité commerciale")
  const [reportPeriod, setReportPeriod] = useState("mois")
  const [reportCollab, setReportCollab] = useState("all")
  const [includeR1, setIncludeR1] = useState(true)
  const [includeNeeds, setIncludeNeeds] = useState(true)
  const [includeProposals, setIncludeProposals] = useState(true)
  const [includeInterviews, setIncludeInterviews] = useState(true)
  const [includePlacements, setIncludePlacements] = useState(true)
  const [includeIntercontracts, setIncludeIntercontracts] = useState(true)
  const [includeAiSummary, setIncludeAiSummary] = useState(true)
  const [reportFormat, setReportFormat] = useState("pdf")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationSuccess, setGenerationSuccess] = useState(false)

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      setGenerationSuccess(true)
    }, 1200)
  }

  const periodLabels = {
    semaine: "Semaine",
    mois: "Mois",
    trimestre: "Trimestre",
    année: "Année"
  }

  // Formatage de la date en français
  const formatEventDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return isoString
    }
  }

  // Filtres dynamiques (seront branchés sur des vraies valeurs en Lot 2)
  const filteredCritiques = actionsCritiques.filter((a) => {
    if (filterCollab === "all") return true
    return a.consultantName.toLowerCase().includes(filterCollab.toLowerCase())
  })

  const filteredRelances = relancesIA.filter((r) => {
    if (filterSecteur === "all") return true
    return r.sector.toLowerCase().includes(filterSecteur.toLowerCase())
  })

  // Unique collaborateurs pour le filtre
  const collabs = Array.from(new Set(actionsCritiques.map((a) => a.consultantName)))
  const secteurs = Array.from(new Set(relancesIA.map((r) => r.sector)))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-0 bg-canvas">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b border-border/60 px-6 py-4 select-none">
        <div className="flex flex-col gap-2.5">
          <div>
            <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
              Tableau de bord activité
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton Période */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface text-body px-3 py-1.5 text-xs font-semibold hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Période : {periodLabels[selectedPeriod]}</span>
                <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isPeriodDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsPeriodDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-40 rounded-lg border border-border bg-surface shadow-lg py-1 z-20">
                    {(["semaine", "mois", "trimestre", "année"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setSelectedPeriod(p)
                          setIsPeriodDropdownOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors cursor-pointer",
                          selectedPeriod === p ? "text-primary font-semibold bg-primary/5" : "text-body"
                        )}
                      >
                        {periodLabels[p]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bouton Événements */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEventsDropdownOpen(!isEventsDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface text-body px-3 py-1.5 text-xs font-semibold hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Événements ({getActiveDbTypes(selectedOptions).length})</span>
                <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isEventsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsEventsDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-[320px] rounded-lg border border-border bg-surface shadow-xl p-4 z-20 text-xs text-heading max-h-[450px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                      <span className="font-bold text-heading text-sm">Filtres événements</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allKeys = EVENT_CATEGORIES.flatMap(cat => cat.options.map(opt => `${cat.id}-${opt.dbType}`))
                          const allSelected = selectedOptions.size === allKeys.length
                          if (allSelected) {
                            setSelectedOptions(new Set())
                          } else {
                            setSelectedOptions(new Set(allKeys))
                          }
                        }}
                        className="text-[10px] text-primary font-semibold hover:underline cursor-pointer"
                      >
                        {selectedOptions.size === EVENT_CATEGORIES.flatMap(cat => cat.options.map(opt => `${cat.id}-${opt.dbType}`)).length ? "Tout désélectionner" : "Tout sélectionner"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {EVENT_CATEGORIES.map((cat) => {
                        const subKeys = cat.options.map(opt => `${cat.id}-${opt.dbType}`)
                        const selectedCount = subKeys.filter(key => selectedOptions.has(key)).length
                        const isAllSelected = selectedCount === subKeys.length
                        const isSomeSelected = selectedCount > 0 && !isAllSelected

                        return (
                          <div key={cat.id} className="flex flex-col gap-1.5">
                            {/* Catégorie Header */}
                            <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-heading py-1 hover:bg-canvas/30 rounded px-1 -mx-1">
                              <input
                                type="checkbox"
                                ref={el => {
                                  if (el) el.indeterminate = isSomeSelected
                                }}
                                checked={isAllSelected}
                                onChange={() => toggleCategory(cat.id)}
                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="text-[11px] uppercase tracking-wider">{cat.label}</span>
                              <span className="ml-auto text-[10px] text-muted font-normal">
                                {selectedCount}/{cat.options.length}
                              </span>
                            </label>

                            {/* Sub-options */}
                            <div className="flex flex-col gap-1 pl-4 border-l border-border/40 ml-1.5">
                              {cat.options.map((opt) => {
                                const key = `${cat.id}-${opt.dbType}`
                                const isChecked = selectedOptions.has(key)
                                return (
                                  <label
                                    key={key}
                                    className="flex items-center gap-2 py-0.5 cursor-pointer select-none text-[11px] text-body hover:text-heading"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleOption(key)}
                                      className="rounded border-border text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                                    />
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getDotColor(opt.dbType))} />
                                    <span className="truncate">{opt.label}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            className="bg-primary hover:bg-primary-deep text-white cursor-pointer font-semibold"
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            nouveau rapport
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 py-5">

        {/* ── Section : Impulsion Globale ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-heading">Impulsion Globale</h2>
            {/* Filtre global placeholder */}
            <div className="relative">
              <select
                className="appearance-none text-xs border border-border bg-surface text-body rounded-lg py-1 px-3 pr-7 focus:outline-none focus:border-primary cursor-pointer font-medium"
                defaultValue="all"
              >
                <option value="all">Filtres filtres</option>
                <option value="urgent">Urgents uniquement</option>
                <option value="week">Cette semaine</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {impulsionKpis.map((kpi) => (
              <SurfaceCard key={kpi.id} className="p-4 min-h-[110px] flex flex-col">
                <ImpulsionKpiCard kpi={kpi} />
              </SurfaceCard>
            ))}
          </div>
        </section>

        {/* ── Zone principale 2 colonnes ────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5 items-start">

          {/* ── Gauche : Actions Critiques / Retard ──────────────────────── */}
          <div className="col-span-7 flex flex-col gap-3">
            <SurfaceCard className="p-0 overflow-hidden">
              {/* En-tête section */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                <h2 className="text-sm font-bold text-heading">Actions Critiques / Retard</h2>
                <div className="relative">
                  <select
                    value={filterCollab}
                    onChange={(e) => setFilterCollab(e.target.value)}
                    className="appearance-none text-xs border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="all">Collaborateur</option>
                    {collabs.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Liste des actions critiques */}
              <div className="flex flex-col gap-3 p-4">
                {filteredCritiques.length === 0 ? (
                  <EmptyActions message="Aucune action critique pour ce collaborateur." />
                ) : (
                  filteredCritiques.map((action) => (
                    <ActionCritiqueCard
                      key={action.id}
                      action={action}
                      onConsigner={(id) => {
                        // TODO Lot 2 : ouvrir le drawer de consignation
                        console.info("Consigner action", id)
                      }}
                    />
                  ))
                )}
              </div>
            </SurfaceCard>
          </div>

          {/* ── Droite : Relances Recommandées (IA) ──────────────────────── */}
          <div className="col-span-5 flex flex-col gap-3">
            <SurfaceCard className="p-0 overflow-hidden" accent="primary">
              {/* En-tête section */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/[0.08]">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </span>
                  <h2 className="text-sm font-bold text-heading">Relances Recommandées (IA)</h2>
                </div>
                <div className="relative">
                  <select
                    value={filterSecteur}
                    onChange={(e) => setFilterSecteur(e.target.value)}
                    className="appearance-none text-xs border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="all">Secteur</option>
                    {secteurs.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Liste des relances IA */}
              <div className="flex flex-col gap-3 p-4">
                {filteredRelances.length === 0 ? (
                  <EmptyActions message="Aucune relance IA pour ce secteur." />
                ) : (
                  filteredRelances.map((relance) => (
                    <RelanceIACard
                      key={relance.id}
                      relance={relance}
                      onPlanifier={(id) => {
                        // TODO Lot 2 : ouvrir le drawer de planification
                        console.info("Planifier relance", id)
                      }}
                    />
                  ))
                )}
              </div>

              {/* Footer IA */}
              <div className="px-5 py-2.5 border-t border-border/40 bg-canvas/40">
                <p className="text-[9px] text-muted text-center">
                  Recommandations générées par le moteur IA n8n · pgvector semantic matching
                </p>
              </div>
            </SurfaceCard>
          </div>

        </div>
      </div>

      <AppDialog
        open={isReportModalOpen}
        onOpenChange={(open) => {
          setIsReportModalOpen(open)
          if (!open) {
            setGenerationSuccess(false)
            setIsGenerating(false)
          }
        }}
        title="Créer un nouveau rapport d'activité"
        description="Configurez les paramètres pour générer un rapport d'activité commerciale adapté aux ESN."
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsReportModalOpen(false)
                setGenerationSuccess(false)
                setIsGenerating(false)
              }}
            >
              Annuler
            </Button>
            {!generationSuccess && (
              <Button
                variant="primary"
                size="sm"
                loading={isGenerating}
                onClick={handleGenerateReport}
              >
                Générer le rapport
              </Button>
            )}
          </div>
        }
      >
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-semibold text-heading animate-pulse">Analyse des données d&apos;activité...</p>
            <p className="text-xs text-muted max-w-[280px]">Calcul des KPIs (R1, opportunités, staffing) et compilation par l&apos;IA</p>
          </div>
        ) : generationSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center text-success">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-heading">Rapport généré avec succès !</h3>
            <p className="text-xs text-muted max-w-[320px]">
              Le rapport d&apos;activité de l&apos;ESN a été structuré et exporté au format {reportFormat.toUpperCase()}.
            </p>
            <div className="mt-4 flex gap-2 w-full max-w-[280px]">
              <Button
                variant="brass"
                size="sm"
                fullWidth
                onClick={() => {
                  setIsReportModalOpen(false)
                  setGenerationSuccess(false)
                }}
              >
                Télécharger le rapport
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Titre du rapport */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-title" className="text-xs font-semibold text-heading">
                Titre du rapport
              </label>
              <Input
                id="report-title"
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                fullWidth
                placeholder="Ex: Activité Commerciale - Q2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Période */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-period" className="text-xs font-semibold text-heading">
                  Période du rapport
                </label>
                <Select
                  id="report-period"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  fullWidth
                >
                  <option value="semaine">Cette semaine</option>
                  <option value="mois">Ce mois-ci</option>
                  <option value="trimestre">Ce trimestre (Q)</option>
                  <option value="annee">Cette année</option>
                  <option value="custom">Période personnalisée</option>
                </Select>
              </div>

              {/* Commercial */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-collab" className="text-xs font-semibold text-heading">
                  Périmètre / Commercial
                </label>
                <Select
                  id="report-collab"
                  value={reportCollab}
                  onChange={(e) => setReportCollab(e.target.value)}
                  fullWidth
                >
                  <option value="all">Tous les commerciaux</option>
                  <option value="guillaume">Guillaume Kachanine</option>
                  <option value="alexandre">Alexandre Martin</option>
                  <option value="marie">Marie Dubois</option>
                </Select>
              </div>
            </div>

            {/* Custom dates if selected */}
            {reportPeriod === "custom" && (
              <div className="grid grid-cols-2 gap-3 border-l-2 border-primary/20 pl-3 py-1">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="report-start" className="text-[10px] font-semibold text-muted">
                    Date de début
                  </label>
                  <Input id="report-start" type="date" fullWidth />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="report-end" className="text-[10px] font-semibold text-muted">
                    Date de fin
                  </label>
                  <Input id="report-end" type="date" fullWidth />
                </div>
              </div>
            )}

            {/* Indicateurs clés ESN */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-heading">Indicateurs clés ESN à inclure</span>
              
              <div className="grid grid-cols-2 gap-2 bg-canvas/40 p-3 rounded-lg border border-border/60">
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeR1}
                    onChange={(e) => setIncludeR1(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Rendez-vous R1 Qualifiés</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeNeeds}
                    onChange={(e) => setIncludeNeeds(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Besoins reçus / Appels d&apos;offres</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeProposals}
                    onChange={(e) => setIncludeProposals(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>CVs envoyés / Propositions</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeInterviews}
                    onChange={(e) => setIncludeInterviews(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Entretiens clients planifiés</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includePlacements}
                    onChange={(e) => setIncludePlacements(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Démarrages & Placements</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeIntercontracts}
                    onChange={(e) => setIncludeIntercontracts(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Gestion intercontrats</span>
                </label>
              </div>
            </div>

            {/* Format d'export & options */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-format" className="text-xs font-semibold text-heading">
                  Format d&apos;export
                </label>
                <Select
                  id="report-format"
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  fullWidth
                >
                  <option value="pdf">📄 PDF interactif</option>
                  <option value="excel">📊 Fichier Excel (CSV)</option>
                  <option value="ppt">📉 Présentation PowerPoint</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none font-medium">
                  <input
                    type="checkbox"
                    checked={includeAiSummary}
                    onChange={(e) => setIncludeAiSummary(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>Synthèse d&apos;analyse IA (n8n)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </AppDialog>

      {/* ── Section : Événements Réels de la Base de Données ───────────────── */}
      <section className="mt-2 px-6 pb-6">
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div>
              <h2 className="text-sm font-bold text-heading">Événements de l&apos;activité (Base de Données)</h2>
              <p className="text-[10px] text-muted mt-0.5">
                Visualisation en temps réel des actions de l&apos;agenda filtrées ({dbEvents.length} événements trouvés)
              </p>
            </div>
            {dbEventsLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <svg className="animate-spin h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Mise à jour...</span>
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col gap-2 min-h-[120px]">
            {dbEventsLoading && dbEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="animate-spin h-6 w-6 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xs text-muted">Chargement des données Supabase...</p>
              </div>
            ) : dbEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-canvas/30 rounded-lg border border-dashed border-border/80">
                <svg className="w-8 h-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <p className="text-xs font-semibold text-heading">Aucun événement trouvé</p>
                <p className="text-[11px] text-muted max-w-sm mt-1">
                  Aucun événement dans la table <code className="text-primary font-mono text-[10px]">calendar_events</code> ne correspond aux filtres actifs (Période : {periodLabels[selectedPeriod]}).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dbEvents.map((event) => {
                  const typeLabel =
                    AGENDA_EVENT_TYPES[event.event_type]?.label || event.event_type
                  const typeConfig = AGENDA_EVENT_TYPES[event.event_type]
                  
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border bg-surface flex flex-col justify-between gap-2 shadow-sm transition-all hover:shadow-md",
                        typeConfig ? typeConfig.colorClasses : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-heading truncate">{event.title}</span>
                          <span className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getDotColor(event.event_type))} />
                            {typeLabel}
                          </span>
                        </div>
                        <span className="text-[9px] bg-canvas/60 px-2 py-0.5 rounded font-mono text-muted uppercase tracking-wider">
                          {event.status === "completed" ? "Fait" : event.status === "cancelled" ? "Annulé" : "Prévu"}
                        </span>
                      </div>

                      {event.description && (
                        <p className="text-[10px] text-body line-clamp-2 leading-relaxed bg-canvas/20 p-1.5 rounded border border-border/20">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-border/30 pt-1.5 mt-1 text-[9px] text-muted">
                        <span className="font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatEventDate(event.starts_at)}
                        </span>
                        
                        {(event.companies || event.opportunities || event.candidates) && (
                          <span className="truncate max-w-[150px] font-medium bg-canvas/40 px-1.5 py-0.5 rounded border border-border/20">
                            {event.companies?.name || event.opportunities?.title || event.candidates?.persons?.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  )
}

// ── Composant interne : état vide ─────────────────────────────────────────────

function EmptyActions({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg className="w-8 h-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p className="text-xs text-muted">{message}</p>
    </div>
  )
}
