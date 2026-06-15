"use client"

import Link from "next/link"
import { useState } from "react"
import { MissionsListRow } from "../MissionsListView"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { cn } from "@/lib/utils"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"
import { Trajectory2026Chart } from "./Trajectory2026Chart"
import type { Trajectory2026Data } from "./trajectory-2026-types"

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
  status: string
}

interface MissionsDesktopDashboardProps {
  activeMissions: MissionsListRow[]
  opportunities: OpportunityRow[]
  avgTjm: number
  totalPipe: string
  avgTaci: number
  benchRate: number
  trajectory: Trajectory2026Data
}

export function MissionsDesktopDashboard({
  activeMissions,
  opportunities,
  avgTjm,
  totalPipe: initialTotalPipe,
  avgTaci,
  benchRate,
  trajectory,
}: MissionsDesktopDashboardProps) {
  const { openTab } = useMissionsTabStore()
  const [filterOppsCriticite, setFilterOppsCriticite] = useState("all")
  const [filterTjm, setFilterTjm] = useState("all")
  const [repartitionMode, setRepartitionMode] = useState<"etp" | "ca">("etp")

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

  const filteredOpps = opportunities.filter((opp) => {
    // Priority filter
    if (filterOppsCriticite !== "all") {
      const mappedPriority = opp.priority || "normale"
      if (filterOppsCriticite === "high" && mappedPriority !== "haute") return false
      if (filterOppsCriticite === "normal" && mappedPriority !== "normale") return false
    }
    // TJM / daily rate filter
    if (filterTjm !== "all") {
      const tjmVal = opp.targetDailyRate || (opp.acv && opp.acv > 0 ? Math.round(opp.acv / 30) : 0) || 680
      if (filterTjm === "500" && tjmVal <= 500) return false
      if (filterTjm === "700" && tjmVal <= 700) return false
    }
    return true
  })

  const activeMissionsWithMargin = activeMissions.filter((m) => m.grossMarginPct !== null && m.grossMarginPct !== undefined)
  const currentAvgMargin = activeMissionsWithMargin.length > 0
    ? Math.round(activeMissionsWithMargin.reduce((sum, m) => sum + (m.grossMarginPct || 0), 0) / activeMissionsWithMargin.length)
    : 0

  const activeClientsCount = new Set(activeMissions.map((mission) => mission.client).filter(Boolean)).size

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

  const openOpps = filteredOpps.filter((o) => o.status === "active" || o.status === "pending")
  const openOppyCount = openOpps.length

  const openPipeVal = openOpps.reduce((sum, o) => sum + (o.acv || 0), 0)
  const currentPipe = openPipeVal > 0 ? formatEuro(openPipeVal) : (filterOppsCriticite === "all" && filterTjm === "all" ? initialTotalPipe : "0 €")

  // --- Repartition Card data and logic ---
  const COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#f43f5e", // Rose
    "#06b6d4", // Cyan
    "#6366f1", // Indigo
  ]

  // Calculate practice ETP distribution (number of missions)
  const practiceCounts: Record<string, number> = {}
  activeMissions.forEach((m) => {
    const practice = m.practice || "Autre"
    practiceCounts[practice] = (practiceCounts[practice] || 0) + 1
  })

  const totalMissionsCount = activeMissions.length || 1
  const practiceEtpSegments = Object.entries(practiceCounts)
    .map(([name, count]) => ({
      name,
      value: count,
      percentage: (count / totalMissionsCount) * 100,
    }))
    .sort((a, b) => b.value - a.value)

  // Calculate practice CA distribution (turnover)
  const practiceCACounts: Record<string, number> = {}
  activeMissions.forEach((m) => {
    const practice = m.practice || "Autre"
    const ca = (m.tjm || 680) * 20
    practiceCACounts[practice] = (practiceCACounts[practice] || 0) + ca
  })

  const totalPracticeCAVal = Object.values(practiceCACounts).reduce((sum, ca) => sum + ca, 0) || 1
  const practiceCaSegments = Object.entries(practiceCACounts)
    .map(([name, ca]) => ({
      name,
      value: ca,
      percentage: (ca / totalPracticeCAVal) * 100,
    }))
    .sort((a, b) => b.value - a.value)

  const rawActiveSegments = repartitionMode === "etp" ? practiceEtpSegments : practiceCaSegments
  
  const staticColors: Record<string, string> = {
    "Digital": "#3b82f6",
    "Cloud": "#10b981",
    "Data": "#f59e0b",
    "Design": "#8b5cf6",
    "Product Management": "#ec4899",
    "Project Management": "#14b8a6",
    "Cybersecurity": "#f43f5e",
    "Mobile": "#06b6d4",
    "QA": "#6366f1",
    "Autre": "#94a3b8",
  }

  const activeSegments = rawActiveSegments.map((seg, index) => ({
    ...seg,
    color: staticColors[seg.name] || COLORS[index % COLORS.length],
  }))

  // Calculate start angles for SVG donut sections
  const segmentsWithAngles = activeSegments.reduce<Array<(typeof activeSegments)[number] & { startAngle: number }>>(
    (segments, seg) => {
      const previous = segments[segments.length - 1]
      const startAngle = previous ? previous.startAngle + previous.percentage * 3.6 : -90
      segments.push({
        ...seg,
        startAngle,
      })
      return segments
    },
    []
  )

  const donutRadius = 38
  const donutCircumference = 2 * Math.PI * donutRadius // ~238.76

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
      if (filterOppsCriticite !== "all") {
        if (filterOppsCriticite === "high" && !isHigh) return false
        if (filterOppsCriticite === "normal" && isHigh) return false
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
          <HeaderCalendar />
          
          <HeaderAlerts />

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
        {/* KPI 1: Missions en cours / Clients actifs */}
        <div className="bg-surface rounded-xl p-4 border border-border/80 shadow-sm grid grid-cols-2 divide-x divide-border/40 select-none">
          <div className="pr-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Missions en cours
            </span>
            <span className="text-2xl font-bold text-heading mt-auto">
              {activeMissions.length}
            </span>
          </div>
          <div className="pl-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Clients actifs
            </span>
            <span className="text-2xl font-bold text-heading mt-auto">
              {activeClientsCount}
            </span>
          </div>
        </div>

        {/* KPI 2: TJM Moyen / Marge moyenne */}
        <div className="bg-surface rounded-xl p-4 border border-border/80 shadow-sm grid grid-cols-2 divide-x divide-border/40 select-none">
          <div className="pr-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              TJ Moyen
            </span>
            <span className="text-2xl font-bold text-heading mt-auto">
              {avgTjm > 0 ? `${avgTjm} €` : "—"}
            </span>
          </div>
          <div className="pl-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Marge moyenne
            </span>
            <span className="text-2xl font-bold text-heading mt-auto">
              {currentAvgMargin}%
            </span>
          </div>
        </div>

        {/* KPI 3: Opps ouvertes / Pipe Oppy */}
        <div className="bg-surface rounded-xl p-4 border border-border/80 shadow-sm grid grid-cols-2 divide-x divide-border/40 select-none">
          <div className="pr-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Oppy ouvertes
            </span>
            <span className="text-2xl font-bold text-heading mt-auto">
              {openOppyCount}
            </span>
          </div>
          <div className="pl-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Pipe Oppy
            </span>
            <span className="text-2xl font-bold text-heading mt-auto truncate" title={currentPipe}>
              {currentPipe}
            </span>
          </div>
        </div>

        {/* KPI 4: TACI moyen / Bench */}
        <div className="bg-surface rounded-xl p-4 border border-border/80 shadow-sm grid grid-cols-2 divide-x divide-border/40 select-none relative overflow-hidden">
          <div className="pr-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              TACI moyen
            </span>
            <span className="text-2xl font-bold text-heading mt-auto">
              {avgTaci}%
            </span>
          </div>
          <div className="pl-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Bench
            </span>
            <div className="flex items-center gap-1.5 mt-auto">
              <span className="text-2xl font-bold text-heading">{benchRate}%</span>
              {/* Trend indicator (green because low bench rate is good) */}
              <div className="flex items-center bg-[#E8F5E9] text-[#2C7D5C] text-[9px] font-extrabold px-1 py-0.5 rounded select-none shrink-0">
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m7 7V4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Suivi des Missions (Left) & Alertes Staffing (Right) */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        <div className="col-span-8">
          <Trajectory2026Chart data={trajectory} />
        </div>

        {/* New Répartition Section */}
        <div className="col-span-4 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col justify-between select-none">
          <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-4">
            <h2 className="text-sm font-bold text-heading font-heading">
              Répartition par practice
            </h2>
            <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-border/80">
              <button
                type="button"
                onClick={() => setRepartitionMode("etp")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                  repartitionMode === "etp"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-muted hover:text-body"
                )}
              >
                ETP
              </button>
              <button
                type="button"
                onClick={() => setRepartitionMode("ca")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer",
                  repartitionMode === "ca"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-muted hover:text-body"
                )}
              >
                CA
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-5 flex-1 py-1 w-full">
            {/* Centered & Enlarged Donut Chart */}
            <div className="relative w-48 h-48 flex-shrink-0 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  fill="transparent"
                  stroke="var(--border)"
                  strokeWidth="11"
                  className="opacity-20"
                />
                {segmentsWithAngles.map((seg) => (
                  <circle
                    key={seg.name}
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="11"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={donutCircumference - (seg.percentage / 100) * donutCircumference}
                    transform={`rotate(${seg.startAngle} 50 50)`}
                    className="transition-all duration-500 ease-out hover:stroke-[13px] cursor-pointer"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider leading-none">
                  {repartitionMode === "etp" ? "Missions" : "CA Mensuel"}
                </span>
                <span className="text-xl font-black text-heading mt-1.5 leading-none">
                  {repartitionMode === "etp"
                    ? `${activeMissions.length}`
                    : `${Math.round(totalPracticeCAVal / 1000)}k€`}
                </span>
              </div>
            </div>

            {/* Legends positioned below the chart */}
            <div className="w-full grid grid-cols-2 gap-x-5 gap-y-2 max-h-[130px] overflow-y-auto pr-1">
              {activeSegments.map((seg) => (
                <div key={seg.name} className="flex items-center justify-between text-[11px] gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-body font-medium truncate" title={seg.name}>
                      {seg.name}
                    </span>
                  </div>
                  <span className="font-bold text-heading shrink-0">
                    {repartitionMode === "etp"
                      ? `${seg.value}`
                      : `${Math.round(seg.value / 1000)}k€`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Pipeline Commercial des Opportunités & Alertes Staffing AI */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Shortened Pipeline Commercial des Opportunités (col-span-8) */}
        <div className="col-span-8 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/40 select-none">
            <h2 className="text-sm font-bold text-heading font-heading">
              Pipeline Commercial des Opportunités
            </h2>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterOppsCriticite}
                  onChange={(e) => setFilterOppsCriticite(e.target.value)}
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

        {/* Alertes Staffing AI Sidebar (Moved down here, col-span-4) */}
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
    </div>
  )
}
