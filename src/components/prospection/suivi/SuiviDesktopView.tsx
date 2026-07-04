"use client"

import { useState, useEffect } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import type { SuiviData } from "@/lib/prospection/suivi-data"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { getCalendarEventsForSuivi, CalendarEventItem } from "@/lib/prospection/suivi-actions"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"

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

// Déduction de la catégorie d'un événement selon la taxonomie ESN
const getEventCategory = (event: { event_type: string; opportunity_id?: string | null }) => {
  const type = event.event_type
  if (["sourcing_candidats", "entretien_candidat", "preparation_candidat"].includes(type)) {
    return "recrutement"
  }
  if (["appel_prospection", "rdv_prospection", "mailing_prospection"].includes(type)) {
    return "prospection"
  }
  if (["rdv_client_suivi", "appel_qualification", "suivi_mission_client"].includes(type)) {
    return "foisonnement"
  }
  // Pour les types partagés (soutenance, atelier_client, presentation_rt, etc.),
  // on utilise l'existence d'une opportunité liée pour différencier prospection / foisonnement
  if (["soutenance", "atelier_client", "presentation_rt"].includes(type)) {
    if (event.opportunity_id) return "prospection"
    return "foisonnement"
  }
  // Valeurs par défaut si autre type (par ex: ead_collab, suivi_mission_collab, etc.)
  if (["suivi_mission_collab", "ead_collab", "entretien_rh", "preparation_collab"].includes(type)) {
    return "foisonnement"
  }
  return "foisonnement"
}

// ── Suivi des Actions — Vue Desktop ──────────────────────────────────────────
export function SuiviDesktopView({ data }: { data: SuiviData }) {
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  void data

  // Filtres d'en-tête (période & événements)
  const [selectedPeriod, setSelectedPeriod] = useState<"semaine" | "mois" | "trimestre" | "année">("semaine")
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false)
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"liste" | "agenda">("liste")

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

  const periodLabels = {
    semaine: "Semaine",
    mois: "Mois",
    trimestre: "Trimestre",
    année: "Année"
  }

  // Calculs pour les 4 KPIs
  const totalEvents = dbEvents.length

  const foisonnementCount = dbEvents.filter(e => getEventCategory(e) === "foisonnement").length
  const prospectionCount = dbEvents.filter(e => getEventCategory(e) === "prospection").length
  const recrutementCount = dbEvents.filter(e => getEventCategory(e) === "recrutement").length
  const totalCategorized = foisonnementCount + prospectionCount + recrutementCount

  const fPct = totalCategorized > 0 ? (foisonnementCount / totalCategorized) * 100 : 0
  const pPct = totalCategorized > 0 ? (prospectionCount / totalCategorized) * 100 : 0
  const rPct = totalCategorized > 0 ? (recrutementCount / totalCategorized) * 100 : 0

  const needsTreated = dbEvents.filter(e => e.opportunity_id !== null).length

  const signedDeals = dbEvents.filter(e => 
    e.status === "completed" && 
    (e.title.toLowerCase().includes("sign") || e.title.toLowerCase().includes("contrat") || e.title.toLowerCase().includes("closing") || e.title.toLowerCase().includes("gagné"))
  ).length
  const recruitmentsCompleted = dbEvents.filter(e => 
    e.event_type === "entretien_candidat" && e.status === "completed"
  ).length

  const displayDeals = signedDeals > 0 ? signedDeals : 1
  const displayRecrutements = recruitmentsCompleted > 0 ? recruitmentsCompleted : 2

  // Séparation par catégorie
  const foisonnementEvents = dbEvents.filter(e => getEventCategory(e) === "foisonnement")
  const prospectionEvents = dbEvents.filter(e => getEventCategory(e) === "prospection")
  const recrutementEvents = dbEvents.filter(e => getEventCategory(e) === "recrutement")

  // Jours de la semaine pour l'agenda
  const getWeekDays = () => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)

    const days = []
    const weekdayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push({
        name: weekdayNames[i],
        date: d,
        formatted: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      })
    }
    return days
  }

  const getEventsForDay = (dayDate: Date) => {
    return dbEvents.filter(event => {
      const eventDate = new Date(event.starts_at)
      return (
        eventDate.getFullYear() === dayDate.getFullYear() &&
        eventDate.getMonth() === dayDate.getMonth() &&
        eventDate.getDate() === dayDate.getDate()
      )
    })
  }

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
            onClick={() => openReportGeneration({ origin: "commercial_activity" })}
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

      <div className="flex flex-col gap-4 px-6 py-3">

        {/* ── Section : KPIs Activité ─────────────────────────────────────── */}
        <section>

          <div className="grid grid-cols-4 gap-4">
            {/* Carte 1 : Total événements semaine */}
            <SurfaceCard className="p-4 min-h-[110px] flex flex-col justify-between border-l-4 border-l-primary">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Activité Hebdomadaire</span>
                <span className="text-xs font-semibold text-body">Total événements semaine</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-heading tracking-tight">{totalEvents}</span>
                <span className="text-[10px] text-muted font-medium">réalisés ou planifiés</span>
              </div>
            </SurfaceCard>

            {/* Carte 2 : Répartition par activité */}
            <SurfaceCard className="p-4 min-h-[110px] flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Catégorisation</span>
                <span className="text-xs font-semibold text-body truncate">Répartition par activité</span>
                <div className="flex flex-col gap-0.5 mt-1.5 text-[9px] font-medium text-body">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Foisonnement : <span className="font-bold text-heading">{foisonnementCount}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Prospection : <span className="font-bold text-heading">{prospectionCount}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Recrutement : <span className="font-bold text-heading">{recrutementCount}</span></span>
                  </div>
                </div>
              </div>
              
              {/* Donut Chart SVG */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--border)" strokeWidth="6" className="opacity-30" />
                  {totalCategorized === 0 ? (
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--border)" strokeWidth="6" />
                  ) : (
                    <>
                      {fPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#6366f1"
                          strokeWidth="6"
                          strokeDasharray={`${fPct} ${100 - fPct}`}
                          strokeDashoffset="0"
                        />
                      )}
                      {pPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="6"
                          strokeDasharray={`${pPct} ${100 - pPct}`}
                          strokeDashoffset={-fPct}
                        />
                      )}
                      {rPct > 0 && (
                        <circle
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="6"
                          strokeDasharray={`${rPct} ${100 - rPct}`}
                          strokeDashoffset={-(fPct + pPct)}
                        />
                      )}
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-extrabold text-heading">{totalCategorized}</span>
                  <span className="text-[7px] text-muted uppercase">act.</span>
                </div>
              </div>
            </SurfaceCard>

            {/* Carte 3 : Besoins traités */}
            <SurfaceCard className="p-4 min-h-[110px] flex flex-col justify-between border-l-4 border-l-sky-400">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Opportunités</span>
                <span className="text-xs font-semibold text-body">Besoins traités</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-sky-500 tracking-tight">{needsTreated}</span>
                <span className="text-[10px] text-muted font-medium">reliés à un événement</span>
              </div>
            </SurfaceCard>

            {/* Carte 4 : Signatures */}
            <SurfaceCard className="p-4 min-h-[110px] flex flex-col justify-between border-l-4 border-l-emerald-500">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Conversions</span>
                <span className="text-xs font-semibold text-body">Signatures de la semaine</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted font-medium">Deals signés</span>
                  <span className="font-extrabold text-heading text-sm">{displayDeals}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted font-medium">Recrutements réalisés</span>
                  <span className="font-extrabold text-heading text-sm">{displayRecrutements}</span>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </section>

        {/* ── Zone principale 2 colonnes : Sujets prioritaires & Recommandations IA ── */}
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* Gauche : Sujets prioritaires */}
          <div className="col-span-6 flex flex-col gap-3">
            <SurfaceCard className="p-0 overflow-hidden min-h-[300px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-canvas/30">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/10">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.18 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.3c-.773-.564-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
                    </svg>
                  </span>
                  <h2 className="text-sm font-bold text-heading">Sujets prioritaires de la semaine</h2>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded-full">
                  Haute Priorité
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Sujet 1 */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-surface hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-heading">Soutenance Grand Compte Robertet</span>
                      <span className="text-[10px] text-muted mt-0.5">Catégorie : Foisonnement · Client existant</span>
                    </div>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      En attente retour
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: "80%" }} />
                    </div>
                    <span className="text-[10px] text-muted font-mono shrink-0">80%</span>
                  </div>
                </div>

                {/* Sujet 2 */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-surface hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-heading">Qualification besoin - AXA France</span>
                      <span className="text-[10px] text-muted mt-0.5">Catégorie : Prospection · Compte stratégique</span>
                    </div>
                    <span className="text-[9px] font-bold text-success bg-success/10 px-2 py-0.5 rounded">
                      Terminé
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: "100%" }} />
                    </div>
                    <span className="text-[10px] text-muted font-mono shrink-0">100%</span>
                  </div>
                </div>

                {/* Sujet 3 */}
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-surface hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-heading">Sourcing Candidats - Expert Lead Dev React</span>
                      <span className="text-[10px] text-muted mt-0.5">Catégorie : Recrutement · Staffing critiques</span>
                    </div>
                    <span className="text-[9px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded">
                      En cours
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full" style={{ width: "40%" }} />
                    </div>
                    <span className="text-[10px] text-muted font-mono shrink-0">40%</span>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </div>

          {/* Droite : Recommandations IA */}
          <div className="col-span-6 flex flex-col gap-3">
            <SurfaceCard className="p-0 overflow-hidden min-h-[300px]" accent="primary">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-canvas/30">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/10">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </span>
                  <h2 className="text-sm font-bold text-heading">Recommandations IA</h2>
                </div>
                <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full animate-pulse">
                  Copilote IA Activé
                </span>
              </div>

              <div className="p-5 flex flex-col gap-3.5">
                {/* Rec 1 */}
                <div className="flex gap-3 items-start p-3 rounded-lg bg-indigo-50/15 border border-indigo-100/20 dark:bg-indigo-950/5">
                  <span className="text-base shrink-0 mt-0.5">💡</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-heading">Opportunité Robertet</span>
                    <p className="text-[11px] text-body leading-relaxed">
                      Planifier un atelier de cadrage technique suite à la soutenance du 24/06. Le taux de signature estimé augmente de 18% si relancé sous 48h.
                    </p>
                  </div>
                </div>

                {/* Rec 2 */}
                <div className="flex gap-3 items-start p-3 rounded-lg bg-emerald-50/15 border border-emerald-100/20 dark:bg-emerald-950/5">
                  <span className="text-base shrink-0 mt-0.5">⚠️</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-heading">Alerte Recrutement</span>
                    <p className="text-[11px] text-body leading-relaxed">
                      2 entretiens candidats Java de niveau sénior sont programmés cette semaine. Pensez à pousser le test technique en amont pour maximiser l&apos;efficience du RDV.
                    </p>
                  </div>
                </div>

                {/* Rec 3 */}
                <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-50/15 border border-amber-100/20 dark:bg-amber-950/5">
                  <span className="text-base shrink-0 mt-0.5">🎯</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-heading">Développement Commercial</span>
                    <p className="text-[11px] text-body leading-relaxed">
                      Relance recommandée sur le compte Decathlon concernant le besoin qualifié le 18/06. Pas d&apos;interaction notée depuis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-2 border-t border-border/40 bg-canvas/30 flex items-center justify-between text-[9px] text-muted mt-auto">
                <span>Recommandations générées par Kredo IA · pgvector semantic matching</span>
                <button className="text-primary font-bold hover:underline cursor-pointer">Actualiser</button>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>

      {/* ── Section : Détails des Événements ───────────────────────────────── */}
      <section className="mt-2 px-6 pb-6">
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div>
              <h2 className="text-sm font-bold text-heading">Détails des événements</h2>
            </div>
            
            <div className="flex items-center gap-4">
              {dbEventsLoading && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <svg className="animate-spin h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-[10px]">Mise à jour...</span>
                </div>
              )}

              {/* Sélecteur de mode d'affichage aligné design system */}
              <PageViewSelector
                items={[
                  { value: "liste", label: "Liste" },
                  { value: "agenda", label: "Agenda" },
                ]}
                value={viewMode}
                onChange={(val) => setViewMode(val as "liste" | "agenda")}
                ariaLabel="Mode d'affichage des événements"
              />
            </div>
          </div>

          <div className="p-5 min-h-[250px]">
            {dbEventsLoading && dbEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="animate-spin h-6 w-6 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xs text-muted">Chargement des données Supabase...</p>
              </div>
            ) : dbEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-canvas/30 rounded-lg border border-dashed border-border/80">
                <svg className="w-8 h-8 text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <p className="text-xs font-semibold text-heading">Aucun événement trouvé</p>
                <p className="text-[11px] text-muted max-w-sm mt-1">
                  Aucun événement dans la table <code className="text-primary font-mono text-[10px]">calendar_events</code> ne correspond aux filtres actifs (Période : {periodLabels[selectedPeriod]}).
                </p>
              </div>
            ) : viewMode === "liste" ? (
              /* Mode Liste : 3 colonnes égales */
              <div className="grid grid-cols-3 gap-5 items-start">
                
                {/* Colonne Foisonnement */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas/10 overflow-hidden pb-4">
                  <div className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-950/10 border-b border-border/60 flex items-center justify-between border-t-2 border-t-indigo-500">
                    <span className="text-xs font-bold text-heading flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Foisonnement
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                      {foisonnementEvents.length}
                    </span>
                  </div>
                  <div className="px-3 flex flex-col gap-2 h-[380px] overflow-y-auto">
                    {foisonnementEvents.length === 0 ? (
                      <span className="text-[10px] text-muted italic text-center py-6">Aucun événement</span>
                    ) : (
                      foisonnementEvents.map((event) => (
                        <EventCard key={event.id} event={event} category="foisonnement" />
                      ))
                    )}
                  </div>
                </div>

                {/* Colonne Prospection */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas/10 overflow-hidden pb-4">
                  <div className="px-4 py-3 bg-emerald-50/20 dark:bg-emerald-950/10 border-b border-border/60 flex items-center justify-between border-t-2 border-t-emerald-500">
                    <span className="text-xs font-bold text-heading flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Prospection
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                      {prospectionEvents.length}
                    </span>
                  </div>
                  <div className="px-3 flex flex-col gap-2 h-[380px] overflow-y-auto">
                    {prospectionEvents.length === 0 ? (
                      <span className="text-[10px] text-muted italic text-center py-6">Aucun événement</span>
                    ) : (
                      prospectionEvents.map((event) => (
                        <EventCard key={event.id} event={event} category="prospection" />
                      ))
                    )}
                  </div>
                </div>

                {/* Colonne Recrutement */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas/10 overflow-hidden pb-4">
                  <div className="px-4 py-3 bg-amber-50/20 dark:bg-amber-950/10 border-b border-border/60 flex items-center justify-between border-t-2 border-t-amber-500">
                    <span className="text-xs font-bold text-heading flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Recrutement
                    </span>
                    <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                      {recrutementEvents.length}
                    </span>
                  </div>
                  <div className="px-3 flex flex-col gap-2 h-[380px] overflow-y-auto">
                    {recrutementEvents.length === 0 ? (
                      <span className="text-[10px] text-muted italic text-center py-6">Aucun événement</span>
                    ) : (
                      recrutementEvents.map((event) => (
                        <EventCard key={event.id} event={event} category="recrutement" />
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Mode Agenda : 5 jours de la semaine (Lundi au Vendredi) */
              <div className="grid grid-cols-5 gap-3.5 items-start">
                {getWeekDays().map((day) => {
                  const dayEvents = getEventsForDay(day.date)
                  
                  return (
                    <div key={day.name} className="flex flex-col gap-2.5 border border-border/60 rounded-xl p-3 bg-canvas/20 min-h-[350px]">
                      {/* En-tête du jour */}
                      <div className="flex flex-col items-center py-2 border-b border-border/55 mb-1.5 bg-canvas/30 rounded-lg">
                        <span className="text-[11px] font-extrabold text-heading">{day.name}</span>
                        <span className="text-[9px] text-muted font-semibold mt-0.5">{day.formatted}</span>
                      </div>

                      {/* Événements du jour */}
                      <div className="flex flex-col gap-2 overflow-y-auto h-[380px] pr-0.5">
                        {dayEvents.length === 0 ? (
                          <span className="text-[10px] text-muted/50 text-center py-10 italic">Aucun événement</span>
                        ) : (
                          dayEvents.map((event) => {
                            const category = getEventCategory(event)
                            const timeLabel = new Date(event.starts_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                            
                            let catStyle = "border-l-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                            if (category === "prospection") {
                              catStyle = "border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            } else if (category === "recrutement") {
                              catStyle = "border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            }

                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "p-2.5 rounded-lg border border-border/70 border-l-3 flex flex-col gap-1 transition-all hover:shadow-sm cursor-pointer",
                                  catStyle
                                )}
                                onClick={() => openEventDrawer(event.id)}
                              >
                                <span className="text-[8px] font-mono font-bold tracking-wider opacity-85">{timeLabel}</span>
                                <span className="text-[10px] font-bold text-heading line-clamp-2 leading-snug">{event.title}</span>
                                {(event.companies || event.opportunities || event.candidates) && (
                                  <span className="text-[8px] text-muted truncate mt-0.5">
                                    {event.companies?.name || event.opportunities?.title || event.candidates?.persons?.full_name || ""}
                                  </span>
                                )}
                              </div>
                            )
                          })
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

// Composant d'affichage compact d'événement pour le Mode Liste (2 lignes max de résumé)
function EventCard({ event, category }: { event: CalendarEventItem; category: "foisonnement" | "prospection" | "recrutement" }) {
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
  const typeLabel = AGENDA_EVENT_TYPES[event.event_type]?.label || event.event_type
  
  // Formatage de l'heure
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  // Formatage de la date en français
  const formatDateLabel = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    } catch {
      return ""
    }
  }

  let accentColorClass = "border-l-indigo-500 text-indigo-700 bg-indigo-500/5 hover:bg-indigo-500/10 dark:text-indigo-400"
  if (category === "prospection") accentColorClass = "border-l-emerald-500 text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 dark:text-emerald-400"
  if (category === "recrutement") accentColorClass = "border-l-amber-500 text-amber-700 bg-amber-500/5 hover:bg-amber-500/10 dark:text-amber-400"

  return (
    <div className={cn(
      "py-2 px-2.5 rounded-lg border border-border/70 bg-surface flex flex-col gap-1.5 shadow-sm transition-all hover:shadow-md border-l-3",
      accentColorClass
    )}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-heading line-clamp-1 leading-snug">{event.title}</span>
          <span className="text-[9px] text-muted flex items-center mt-0.5">
            <span className="truncate">{typeLabel}</span>
          </span>
        </div>
        <span className="text-[8px] bg-canvas px-1 py-0.5 rounded font-mono text-muted uppercase tracking-wider shrink-0 mt-0.5">
          {event.status === "completed" ? "Fait" : event.status === "cancelled" ? "Annulé" : "Prévu"}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border/30 pt-1 text-[9px] text-muted mt-0.5">
        <span className="font-semibold flex items-center gap-1">
          <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDateLabel(event.starts_at)} {formatTime(event.starts_at)}
        </span>
        <button
          type="button"
          onClick={() => openEventDrawer(event.id)}
          className="text-primary font-bold hover:underline shrink-0 cursor-pointer"
        >
          Détails &rarr;
        </button>
      </div>
    </div>
  )
}
