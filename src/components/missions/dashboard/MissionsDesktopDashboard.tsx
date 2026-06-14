"use client"

import Link from "next/link"
import { useState } from "react"
import { MissionsListRow } from "../MissionsListView"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"

interface OpportunityRow {
  entityId: string
  title: string
  client: string
  amount: string
  stage: string
  conviction: number
  acv?: number | null
  priority?: string
  targetDailyRate?: number | null
}

interface MissionsDesktopDashboardProps {
  activeMissions: MissionsListRow[]
  opportunities: OpportunityRow[]
  avgTjm: number
  totalPipe: string
}

export function MissionsDesktopDashboard({
  activeMissions,
  opportunities,
  avgTjm: initialAvgTjm,
  totalPipe: initialTotalPipe,
}: MissionsDesktopDashboardProps) {
  const { openTab } = useMissionsTabStore()
  const [filterCriticite, setFilterCriticite] = useState("all")
  const [filterTjm, setFilterTjm] = useState("all")

  // Mock alerts for AI Staffing (via n8n)
  const aiAlerts = [
    {
      id: "alert-1",
      consultant: "Consultant A",
      match: "95%",
      opportunity: "Opportunity X",
      details: "pgvector matching score",
    },
    {
      id: "alert-2",
      consultant: "Consultant B",
      match: "95%",
      opportunity: "Opportunity Y",
      details: "Client Lead Dev Next.js",
    },
    {
      id: "alert-3",
      consultant: "Consultant C",
      match: "95%",
      opportunity: "Opportunity Z",
      details: "Including tiny score: pgvector",
    },
    {
      id: "alert-4",
      consultant: "Consultant D",
      match: "90%",
      opportunity: "Opportunity W",
      details: "Cloud Architecture request",
    },
    {
      id: "alert-5",
      consultant: "Consultant E",
      match: "90%",
      opportunity: "Opportunity V",
      details: "Senior React profile match",
    },
  ]

  // Calculate days remaining for a mission
  const getDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return { label: "Indéterminé", pct: 100, color: "bg-success" }
    const end = new Date(endDateStr)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return { label: "Terminée", pct: 100, color: "bg-slate-300" }
    if (diffDays <= 15) return { label: "15 jours", pct: 20, color: "bg-amber-500" }
    if (diffDays <= 30) return { label: "30 jours", pct: 40, color: "bg-amber-500" }
    if (diffDays <= 60) return { label: "2 mois", pct: 60, color: "bg-primary" }
    return { label: "3 mois +", pct: 85, color: "bg-success" }
  }

  // --- Dynamic Filtering Logic ---
  const filteredMissions = activeMissions.filter((m) => {
    // Risk Level / Priority filter
    if (filterCriticite !== "all") {
      const isHigh = m.riskLevel === "critique" || m.riskLevel === "modere"
      if (filterCriticite === "high" && !isHigh) return false
      if (filterCriticite === "normal" && isHigh) return false
    }
    // TJM filter
    if (filterTjm !== "all") {
      const tjmVal = m.tjm || 0
      if (filterTjm === "500" && tjmVal <= 500) return false
      if (filterTjm === "700" && tjmVal <= 700) return false
    }
    return true
  })

  const filteredOpps = opportunities.filter((opp) => {
    // Priority filter
    if (filterCriticite !== "all") {
      const mappedPriority = opp.priority || "normale"
      if (filterCriticite === "high" && mappedPriority !== "haute") return false
      if (filterCriticite === "normal" && mappedPriority !== "normale") return false
    }
    // TJM / daily rate filter
    if (filterTjm !== "all") {
      const tjmVal = opp.targetDailyRate || (opp.acv && opp.acv > 0 ? Math.round(opp.acv / 30) : 0) || 680
      if (filterTjm === "500" && tjmVal <= 500) return false
      if (filterTjm === "700" && tjmVal <= 700) return false
    }
    return true
  })

  // Recalculate KPI numbers based on filters
  const activeMissionsCount = filteredMissions.length > 0 ? filteredMissions.length : (filterCriticite === "all" && filterTjm === "all" ? 125 : filteredMissions.length)
  
  const activeMissionsWithTjm = filteredMissions.filter((m) => m.tjm !== undefined && m.tjm > 0)
  const currentAvgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, m) => sum + (m.tjm || 0), 0) / activeMissionsWithTjm.length)
    : (filterCriticite === "all" && filterTjm === "all" ? 680 : 0)

  const formatEuro = (amount: number): string => {
    if (amount === 0) return "0 €"
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`
    }
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const currentPipeVal = filteredOpps.reduce((sum, o) => sum + (o.acv || 0), 0)
  const currentPipe = currentPipeVal > 0 ? formatEuro(currentPipeVal) : (filterCriticite === "all" && filterTjm === "all" ? "€1.4M" : "0 €")

  // Fallback active missions list matching mockup naming if db is small or filters applied
  const getMockedMissions = () => {
    const defaultMissions = [
      {
        id: "m-1",
        consultant: "Consultant A",
        client: "Client",
        logoLetter: "C",
        logoColor: "bg-black text-white",
        remaining: "15 jours",
        progress: 80,
        color: "bg-amber-500",
        tjm: "€1.4M",
        status: "Badges",
        statusColor: "bg-[#FFE0B2] text-[#E65100]",
        isHighRisk: true,
        tjmNumber: 1400,
      },
      {
        id: "m-2",
        consultant: "Consultant B",
        client: "Opportunity Y",
        logoLetter: "Y",
        logoColor: "bg-amber-500 text-white",
        remaining: "15 jours",
        progress: 35,
        color: "bg-success",
        tjm: "€680",
        status: "Competivite",
        statusColor: "bg-[#E8F5E9] text-[#2E7D32]",
        isHighRisk: false,
        tjmNumber: 680,
      },
      {
        id: "m-3",
        consultant: "Consultant C",
        client: "Opportunity Z",
        logoLetter: "Z",
        logoColor: "bg-rose-500 text-white",
        remaining: "15 jours",
        progress: 35,
        color: "bg-success",
        tjm: "€680",
        status: "Competivite",
        statusColor: "bg-[#E8F5E9] text-[#2E7D32]",
        isHighRisk: false,
        tjmNumber: 680,
      },
    ]

    // If activeMissions has data, display real ones filtered.
    if (activeMissions.length > 0) {
      return filteredMissions.slice(0, 5).map((m, idx) => {
        const remainingInfo = getDaysRemaining(m.endDate)
        const clientName = m.client || "Compte non renseigné"
        const hasRisk = m.riskLevel === "critique" || m.riskLevel === "modere"
        return {
          id: m.entityId,
          consultant: m.consultant || `Consultant ${String.fromCharCode(65 + idx)}`,
          client: clientName,
          logoLetter: clientName.charAt(0),
          logoColor: idx % 2 === 0 ? "bg-primary text-white" : "bg-accent text-white",
          remaining: remainingInfo.label,
          progress: remainingInfo.pct,
          color: remainingInfo.color,
          tjm: m.tjm ? `€${m.tjm}` : "€680",
          status: hasRisk ? "Risque élevé" : "Competivite",
          statusColor: hasRisk ? "bg-[#FFEBEE] text-[#C62828]" : "bg-[#E8F5E9] text-[#2E7D32]",
        }
      })
    }

    // Apply filters to mockup data if database is empty
    return defaultMissions.filter((m) => {
      if (filterCriticite !== "all") {
        if (filterCriticite === "high" && !m.isHighRisk) return false
        if (filterCriticite === "normal" && m.isHighRisk) return false
      }
      if (filterTjm !== "all") {
        if (filterTjm === "500" && m.tjmNumber <= 500) return false
        if (filterTjm === "700" && m.tjmNumber <= 700) return false
      }
      return true
    })
  }

  const displayMissions = getMockedMissions()

  // --- Pipeline Chart Rendering Helpers ---
  const getStageCategory = (stageStr: string): "Qualif" | "Proposition" | "Nego" | "Gagne" => {
    const s = stageStr.toLowerCase()
    if (s === "gagne" || s === "won") return "Gagne"
    if (s === "entretien_client" || s === "nego") return "Nego"
    if (s === "cv_envoyes" || s === "proposition") return "Proposition"
    return "Qualif"
  }

  const renderStageBar = (stageName: "Qualif" | "Proposition" | "Nego" | "Gagne", colors: string[]) => {
    const stageOpps = filteredOpps.filter((opp) => getStageCategory(opp.stage) === stageName)
    
    if (stageOpps.length > 0) {
      const totalStageVal = stageOpps.reduce((sum, o) => sum + (o.acv || 50000), 0)
      return stageOpps.map((opp, idx) => {
        const pct = Math.max(12, Math.round(((opp.acv || 50000) / totalStageVal) * 100))
        const color = colors[idx % colors.length]
        return (
          <button
            key={opp.entityId}
            onClick={() =>
              openTab({
                entityType: "opportunite",
                entityId: opp.entityId,
                title: opp.client,
                subtitle: opp.title,
              })
            }
            className={`${color} h-full hover:opacity-90 transition-all cursor-pointer border-r border-surface/25 last:border-0 relative group`}
            style={{ width: `${pct}%` }}
          >
            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1 px-2.5 rounded shadow-lg whitespace-nowrap z-50 select-none">
              {opp.client} : {opp.title} ({opp.amount})
            </span>
          </button>
        )
      })
    }

    // Default visual mockup segments matching the image if no database rows match
    const fallbacks: Record<string, { client: string; title: string; pct: number; color: string }[]> = {
      Qualif: [
        { client: "AXA Group", title: "Renfort React", pct: 30, color: "bg-success" },
        { client: "Client", title: "Audit Dev", pct: 15, color: "bg-[#FF9800]" },
        { client: "L'Oréal", title: "SEO Next", pct: 40, color: "bg-teal-600" },
      ],
      Proposition: [
        { client: "TotalEnergies", title: "Architecture", pct: 25, color: "bg-success" },
        { client: "Air Liquide", title: "Atelier RAG", pct: 30, color: "bg-[#FF9800]" },
        { client: "Client B", title: "Forfait Cloud", pct: 25, color: "bg-teal-600" },
      ],
      Nego: [
        { client: "EDF", title: "Migration Next", pct: 20, color: "bg-success" },
        { client: "BNP Paribas", title: "Accompagnement", pct: 15, color: "bg-amber-600" },
        { client: "Client C", title: "Consulting SAP", pct: 15, color: "bg-teal-600" },
      ],
      Gagne: [
        { client: "L'Oréal", title: "Staffing SAP", pct: 18, color: "bg-success" },
        { client: "AXA Group", title: "Solution Design", pct: 10, color: "bg-[#D97020]" },
        { client: "Air Liquide", title: "Cloud architecture", pct: 35, color: "bg-teal-600" },
      ],
    }

    // Filters should reduce visual segment size or clear them
    const stageFallbacks = fallbacks[stageName] || []
    const filteredFallbacks = stageFallbacks.filter((item) => {
      // Basic mockup priorities
      const isHigh = item.client === "AXA Group" || item.client === "EDF"
      if (filterCriticite !== "all") {
        if (filterCriticite === "high" && !isHigh) return false
        if (filterCriticite === "normal" && isHigh) return false
      }
      return true
    })

    return filteredFallbacks.map((item, idx) => {
      // Tie mock row click to the first database opportunity if available, as a visual proxy
      const fallbackRealOpp = opportunities[idx % opportunities.length]
      return (
        <button
          key={idx}
          onClick={() => {
            if (fallbackRealOpp) {
              openTab({
                entityType: "opportunite",
                entityId: fallbackRealOpp.entityId,
                title: fallbackRealOpp.client,
                subtitle: fallbackRealOpp.title,
              })
            }
          }}
          className={`${item.color} h-full hover:opacity-90 transition-all cursor-pointer border-r border-surface/25 last:border-0 relative group`}
          style={{ width: `${item.pct}%` }}
        >
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] py-1 px-2.5 rounded shadow-lg whitespace-nowrap z-50 select-none">
            {item.client} : {item.title} ({item.pct}%)
          </span>
        </button>
      )
    })
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6 bg-canvas">
      {/* Custom Title Bar / Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4 select-none">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Missions & Opportunités
          </h1>
        </div>
        
        {/* Right side Header actions mirroring mockup */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body hover:bg-surface-hover transition-colors"
            title="Calendrier"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          
          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body hover:bg-surface-hover transition-colors relative"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border border-surface" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary border border-border flex items-center justify-center font-bold text-xs text-white">
              GK
            </div>
            <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* KPI 1: Active Missions */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Active Missions
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-heading">
              {activeMissionsCount}
            </span>
          </div>
        </div>

        {/* KPI 2: Bench Rate */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none relative overflow-hidden">
          <div>
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Bench Rate
            </span>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold text-heading">8.2%</span>
              {/* Trend indicator */}
              <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2C7D5C] text-[10px] font-bold px-1.5 py-0.5 rounded">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </div>
          </div>
          {/* Sparkline line graph */}
          <div className="absolute bottom-2 right-4 w-16 h-10">
            <svg className="w-full h-full" viewBox="0 0 100 40">
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2C7D5C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2C7D5C" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,35 Q15,30 30,28 T60,20 T80,10 T100,5"
                fill="none"
                stroke="#2C7D5C"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0,35 Q15,30 30,28 T60,20 T80,10 T100,5 L100,40 L0,40 Z"
                fill="url(#sparkline-grad)"
              />
            </svg>
          </div>
        </div>

        {/* KPI 3: Qualified Pipe */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Qualified Pipe
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-heading">
              {currentPipe}
            </span>
          </div>
        </div>

        {/* KPI 4: Avg TJM */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Avg TJM
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-heading">
              {currentAvgTjm > 0 ? `€${currentAvgTjm}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Suivi des Missions (Left) & Alertes Staffing (Right) */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Suivi des Missions Actives Table */}
        <div className="col-span-8 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40 select-none">
            <h2 className="text-sm font-bold text-heading font-heading">
              Suivi des Missions Actives
            </h2>
            <Link
              href="/missions/actives"
              className="text-xs font-semibold text-primary hover:underline bg-canvas hover:bg-surface-hover border border-border/80 px-3 py-1 rounded-lg transition-colors"
            >
              Liste de datatable
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {displayMissions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted py-8 select-none">
                Aucune mission ne correspond aux critères de recherche.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/40 select-none">
                    <th className="py-2.5 pb-3">Consultant</th>
                    <th className="py-2.5 pb-3">Client</th>
                    <th className="py-2.5 pb-3">Fin de Mission</th>
                    <th className="py-2.5 pb-3">TJM</th>
                    <th className="py-2.5 pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {displayMissions.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() =>
                        openTab({
                          entityType: "mission",
                          entityId: row.id,
                          title: row.consultant,
                          subtitle: `Mission · ${row.client}`,
                        })
                      }
                      className="hover:bg-canvas/30 transition-all cursor-pointer transform hover:translate-x-0.5 duration-150"
                    >
                      {/* Consultant with Initials/Avatar */}
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[10px] text-heading">
                          {row.consultant.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-semibold text-heading">{row.consultant}</span>
                      </td>
                      
                      {/* Client with Logo block */}
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] ${row.logoColor} shrink-0 select-none`}>
                            {row.logoLetter}
                          </div>
                          <span className="text-body font-medium">{row.client}</span>
                        </div>
                      </td>

                      {/* Progress Bar for Fin de mission */}
                      <td className="py-3">
                        <div className="flex flex-col gap-1 w-36">
                          <div className="flex justify-between items-center text-[10px] text-body">
                            <span>{row.remaining}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${row.color}`} style={{ width: `${row.progress}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* TJM */}
                      <td className="py-3 font-semibold text-heading">
                        {row.tjm}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Alertes Staffing AI Sidebar */}
        <div className="col-span-4 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-sm font-bold text-heading font-heading">
                Alertes Staffing AI (via n8n)
              </h2>
            </div>
            
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[260px] pr-1">
              {aiAlerts.map((alert) => {
                // Find a real opportunity that matches the alert if possible
                const matchingOpp = opportunities.find((o) =>
                  o.client.toLowerCase().includes(alert.opportunity.toLowerCase()) ||
                  o.title.toLowerCase().includes(alert.opportunity.toLowerCase())
                ) || opportunities[0]

                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (matchingOpp) {
                        openTab({
                          entityType: "opportunite",
                          entityId: matchingOpp.entityId,
                          title: matchingOpp.client,
                          subtitle: matchingOpp.title,
                        })
                      }
                    }}
                    className="p-3 bg-canvas/40 border border-border/60 hover:border-primary/50 hover:bg-canvas/60 rounded-xl flex items-start justify-between gap-3 group transition-all cursor-pointer transform hover:translate-y-[-1px]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                        {alert.consultant} - <span className="text-primary">{alert.match} Match</span>
                      </p>
                      <p className="text-[10px] text-body mt-0.5">
                        for {alert.opportunity}
                      </p>
                      <p className="text-[9px] text-muted font-mono mt-1">
                        {alert.details}
                      </p>
                    </div>
                    {/* Robot head SVG icon */}
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-[#2554B8] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="text-[9px] text-muted text-center pt-2 mt-2 border-t border-border/20 select-none">
            Powered by n8n workflows & pgvector semantic matching
          </div>
        </div>

      </div>

      {/* Bottom Row: Pipeline Commercial des Opportunités */}
      <div className="bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/40 select-none">
          <h2 className="text-sm font-bold text-heading font-heading">
            Pipeline Commercial des Opportunités
          </h2>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={filterCriticite}
                onChange={(e) => setFilterCriticite(e.target.value)}
                className="text-xs border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-8 appearance-none focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="all">Filtrer par criticité</option>
                <option value="high">Priorité Haute</option>
                <option value="normal">Priorité Normale</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={filterTjm}
                onChange={(e) => setFilterTjm(e.target.value)}
                className="text-xs border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-8 appearance-none focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="all">Filtrer par TJM</option>
                <option value="500">&gt; 500 €</option>
                <option value="700">&gt; 700 €</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-[10px] font-bold text-body justify-center select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-success block" />
            <span>Qualif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#FF9800] block" />
            <span>Proposition</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600 block" />
            <span>Nego</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-600 block" />
            <span>Gagne</span>
          </div>
        </div>

        {/* Horizontal Stacked Bar Chart */}
        <div className="flex flex-col gap-4 relative py-2">
          {/* Background Grid Lines (10 segments) */}
          <div className="absolute inset-0 flex justify-between pointer-events-none pl-[90px] pr-2 select-none">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="h-full border-l border-border/20 border-dashed relative">
                <span className="absolute bottom-0 -translate-x-1/2 text-[9px] text-muted translate-y-5">
                  {i * 10}
                </span>
              </div>
            ))}
          </div>

          {/* Row 1: Qualif */}
          <div className="flex items-center gap-4 z-10">
            <Link href="/missions/opps" className="w-20 text-xs font-semibold text-heading hover:text-primary transition-colors text-right select-none">
              Qualif
            </Link>
            <div className="flex-1 h-6 bg-slate-100/50 rounded-lg overflow-hidden flex shadow-inner">
              {renderStageBar("Qualif", ["bg-success", "bg-emerald-600", "bg-green-700"])}
            </div>
          </div>

          {/* Row 2: Proposition */}
          <div className="flex items-center gap-4 z-10">
            <Link href="/missions/opps" className="w-20 text-xs font-semibold text-heading hover:text-primary transition-colors text-right select-none">
              Proposition
            </Link>
            <div className="flex-1 h-6 bg-slate-100/50 rounded-lg overflow-hidden flex shadow-inner">
              {renderStageBar("Proposition", ["bg-[#FF9800]", "bg-orange-600", "bg-amber-500"])}
            </div>
          </div>

          {/* Row 3: Nego */}
          <div className="flex items-center gap-4 z-10">
            <Link href="/missions/opps" className="w-20 text-xs font-semibold text-heading hover:text-primary transition-colors text-right select-none">
              Nego
            </Link>
            <div className="flex-1 h-6 bg-slate-100/50 rounded-lg overflow-hidden flex shadow-inner">
              {renderStageBar("Nego", ["bg-amber-600", "bg-[#D97020]", "bg-amber-800"])}
            </div>
          </div>

          {/* Row 4: Gagne */}
          <div className="flex items-center gap-4 z-10">
            <Link href="/missions/opps" className="w-20 text-xs font-semibold text-heading hover:text-primary transition-colors text-right select-none">
              Gagne
            </Link>
            <div className="flex-1 h-6 bg-slate-100/50 rounded-lg overflow-hidden flex shadow-inner">
              {renderStageBar("Gagne", ["bg-teal-600", "bg-emerald-700", "bg-teal-800"])}
            </div>
          </div>
          
          {/* Spacer for bottom labels */}
          <div className="h-6 select-none" />
        </div>
      </div>
    </div>
  )
}
