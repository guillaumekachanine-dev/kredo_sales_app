"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MissionsListRow } from "../MissionsListView"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
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
  status: string
}

interface MissionsMobileDashboardProps {
  activeMissions: MissionsListRow[]
  opportunities: OpportunityRow[]
  totalPipe: string
  avgTaci: number
  benchRate: number
  trajectory: Trajectory2026Data
}

export function MissionsMobileDashboard({
  activeMissions,
  opportunities,
  totalPipe,
  avgTaci,
  benchRate,
  trajectory,
}: MissionsMobileDashboardProps) {
  const router = useRouter()
  const { openTab } = useMissionsTabStore()
  const [carouselIndex, setCarouselIndex] = useState(0)

  const activeMissionsCount = activeMissions.length > 0 ? activeMissions.length : 16
  const activeClientsCount = new Set(activeMissions.map((m) => m.client).filter(Boolean)).size || 10

  const activeMissionsWithTjm = activeMissions.filter((m) => m.tjm !== undefined && m.tjm > 0)
  const avgTjm = activeMissionsWithTjm.length > 0
    ? Math.round(activeMissionsWithTjm.reduce((sum, m) => sum + (m.tjm || 0), 0) / activeMissionsWithTjm.length)
    : 680

  const activeMissionsWithMargin = activeMissions.filter((m) => m.grossMarginPct !== null && m.grossMarginPct !== undefined)
  const avgMargin = activeMissionsWithMargin.length > 0
    ? Math.round(activeMissionsWithMargin.reduce((sum, m) => sum + (m.grossMarginPct || 0), 0) / activeMissionsWithMargin.length)
    : 36

  const openOpps = opportunities.filter((o) => o.status === "active" || o.status === "pending")
  const openOppyCount = openOpps.length > 0 ? openOpps.length : 9

  // Carousel items representing KPIs
  const kpis = [
    {
      left: { label: "Missions en cours", value: activeMissionsCount },
      right: { label: "Clients actifs", value: activeClientsCount }
    },
    {
      left: { label: "TJ Moyen", value: `${avgTjm} €` },
      right: { label: "Marge moyenne", value: `${avgMargin}%` }
    },
    {
      left: { label: "Oppy ouvertes", value: openOppyCount },
      right: { label: "Pipe Oppy", value: totalPipe }
    },
    {
      left: { label: "TACI moyen", value: `${avgTaci}%` },
      right: { label: "Bench", value: `${benchRate}%` }
    }
  ]

  const nextKpi = () => {
    setCarouselIndex((prev) => (prev + 1) % kpis.length)
  }

  const getMockedOpportunities = () => {
    const defaultOpps = [
      {
        id: "o-1",
        clientName: "Client",
        title: "Title",
        value: "Value €",
        stage: "Stage",
        aiMatch: "AI Match: 92%",
        conviction: 92,
      },
      {
        id: "o-2",
        clientName: "AXA Group",
        title: "Renfort Next.js",
        value: "75 000 €",
        stage: "Qualif",
        aiMatch: "AI Match: 95%",
        conviction: 95,
      },
    ]

    if (opportunities.length === 0) return defaultOpps

    return opportunities.slice(0, 5).map((o) => {
      return {
        id: o.entityId,
        clientName: o.client,
        title: o.title,
        value: o.amount,
        stage: o.stage.charAt(0).toUpperCase() + o.stage.slice(1),
        aiMatch: `AI Match: ${o.conviction}%`,
        conviction: o.conviction,
      }
    })
  }

  const displayOpps = getMockedOpportunities()

  return (
    <div className="w-full px-4 py-4 flex flex-col gap-5 bg-canvas select-none">
      {/* Mobile Title */}
      <div>
        <h1 className="text-xl font-bold font-heading text-heading">
          Missions & Opps
        </h1>
      </div>

      {/* KPI Carousel */}
      <div className="flex items-center gap-3 w-full">
        {/* KPI Carousel Track */}
        <div className="flex-1 flex gap-3 overflow-hidden">
          {/* Active Card */}
          <div className="flex-1 bg-surface border border-border/70 rounded-xl p-4 shadow-sm grid grid-cols-2 divide-x divide-border/40 select-none">
            <div className="pr-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                {kpis[carouselIndex].left.label}
              </span>
              <span className="text-xl font-bold text-heading mt-auto truncate">
                {kpis[carouselIndex].left.value}
              </span>
            </div>
            <div className="pl-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                {kpis[carouselIndex].right.label}
              </span>
              <span className="text-xl font-bold text-heading mt-auto truncate">
                {kpis[carouselIndex].right.value}
              </span>
            </div>
          </div>

          {/* Next Card (Partial View) */}
          <div className="w-1/3 bg-surface border border-border/70 rounded-xl p-3 shadow-sm opacity-40 grid grid-cols-2 divide-x divide-border/30 select-none overflow-hidden truncate">
            <div className="pr-1.5 flex flex-col justify-between min-w-0">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block truncate">
                {kpis[(carouselIndex + 1) % kpis.length].left.label}
              </span>
              <span className="text-sm font-bold text-heading mt-auto truncate">
                {kpis[(carouselIndex + 1) % kpis.length].left.value}
              </span>
            </div>
            <div className="pl-1.5 flex flex-col justify-between min-w-0">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block truncate">
                {kpis[(carouselIndex + 1) % kpis.length].right.label}
              </span>
              <span className="text-sm font-bold text-heading mt-auto truncate">
                {kpis[(carouselIndex + 1) % kpis.length].right.value}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Slide Next Button */}
        <button
          onClick={nextKpi}
          className="w-10 h-10 rounded-full border border-border bg-surface flex items-center justify-center shadow-sm text-primary active:scale-95 transition-all shrink-0"
          aria-label="KPI suivant"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Trajectoire 2026 */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Trajectoire 2026
        </h2>
        <Trajectory2026Chart data={trajectory} />
      </div>

      {/* Opportunités Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Opportunités
        </h2>

        <div className="flex flex-col gap-3">
          {displayOpps.map((opp) => (
            <div
              key={opp.id}
              onClick={() =>
                openTab({
                  entityType: "opportunite",
                  entityId: opp.id,
                  title: opp.clientName,
                  subtitle: opp.title,
                })
              }
              className="bg-surface border border-border/70 rounded-xl p-4 shadow-sm flex flex-col gap-3 cursor-pointer hover:bg-surface-hover/30 active:scale-[0.99] transition-all"
            >
              {/* Top block: Client details + value */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {opp.clientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-heading truncate">{opp.clientName}</h3>
                    <p className="text-[10px] text-body truncate mt-0.5">{opp.title}</p>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-muted block select-none">Valeur</span>
                  <span className="text-xs font-semibold text-heading">{opp.value}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-1 select-none">
                <span className="px-2 py-0.5 rounded bg-surface-hover text-[10px] text-body font-bold border border-border/30">
                  {opp.stage}
                </span>
                
                {/* AI Match Badge */}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                  {opp.aiMatch}
                </span>
              </div>

              {/* Changer d'étape Button (Min 44px height) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/missions/opps/${opp.id}/edit`)
                }}
                className="w-full h-11 min-h-[44px] rounded-lg bg-[#1A2540] text-white hover:bg-primary text-xs font-bold flex items-center justify-center transition-all select-none active:scale-95 cursor-pointer"
              >
                Changer d&apos;étape
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
