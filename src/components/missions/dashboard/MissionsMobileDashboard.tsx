"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
}

interface MissionsMobileDashboardProps {
  activeMissions: MissionsListRow[]
  opportunities: OpportunityRow[]
  totalPipe: string
}

export function MissionsMobileDashboard({
  activeMissions,
  opportunities,
  totalPipe,
}: MissionsMobileDashboardProps) {
  const router = useRouter()
  const { openTab } = useMissionsTabStore()
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Carousel items representing KPIs
  const kpis = [
    { label: "Missions", value: activeMissions.length > 0 ? activeMissions.length : 125 },
    { label: "Pipe", value: totalPipe !== "0 €" ? totalPipe : "€1.4M" },
    { label: "TJM Moyen", value: "€680" },
    { label: "Bench Rate", value: "8.2%" },
  ]

  const nextKpi = () => {
    setCarouselIndex((prev) => (prev + 1) % kpis.length)
  }

  // Get active missions formatted for mobile cards
  const getMockedMissions = () => {
    const defaultMissions = [
      {
        id: "m-1",
        consultantName: "Consultant A",
        clientName: "Client",
        clientLogoLetter: "C",
        clientLogoBg: "bg-black text-white",
        daysRemaining: "15 jours",
        pctRemaining: 80,
        desc: "Zero Library",
      },
      {
        id: "m-2",
        consultantName: "Consultant B",
        clientName: "Opportunity Y",
        clientLogoLetter: "Y",
        clientLogoBg: "bg-orange-500 text-white",
        daysRemaining: "15 jours",
        pctRemaining: 35,
        desc: "Zero Library",
      },
    ]

    if (activeMissions.length === 0) return defaultMissions

    return activeMissions.slice(0, 5).map((m, idx) => {
      // Logic for dates
      const days = idx % 2 === 0 ? "15 jours" : "45 jours"
      const pct = idx % 2 === 0 ? 80 : 45
      const clientName = m.client || "Compte non renseigné"
      return {
        id: m.entityId,
        consultantName: m.consultant || `Consultant ${String.fromCharCode(65 + idx)}`,
        clientName: clientName,
        clientLogoLetter: clientName.charAt(0),
        clientLogoBg: idx % 2 === 0 ? "bg-primary text-white" : "bg-[#D97020] text-white",
        daysRemaining: days,
        pctRemaining: pct,
        desc: m.tag || "Zero Library",
      }
    })
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

  const displayMissions = getMockedMissions()
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
          <div className="flex-1 bg-surface border border-border/70 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              {kpis[carouselIndex].label}
            </span>
            <span className="text-2xl font-bold text-heading mt-1">
              {kpis[carouselIndex].value}
            </span>
          </div>

          {/* Next Card (Partial View) */}
          <div className="w-1/3 bg-surface border border-border/70 rounded-xl p-4 shadow-sm opacity-50 flex flex-col justify-between truncate">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider truncate">
              {kpis[(carouselIndex + 1) % kpis.length].label}
            </span>
            <span className="text-lg font-bold text-heading mt-1 truncate">
              {kpis[(carouselIndex + 1) % kpis.length].value}
            </span>
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

      {/* Missions Actives Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Missions Actives
        </h2>

        <div className="flex flex-col gap-3">
          {displayMissions.map((mission) => (
            <div
              key={mission.id}
              onClick={() =>
                openTab({
                  entityType: "mission",
                  entityId: mission.id,
                  title: mission.consultantName,
                  subtitle: `Mission · ${mission.clientName}`,
                })
              }
              className="bg-surface border border-border/70 rounded-xl p-4 shadow-sm flex flex-col gap-3 cursor-pointer hover:bg-surface-hover/30 active:scale-[0.99] transition-all"
            >
              {/* Consultant Avatar + Client Logo */}
              <div className="flex items-center gap-2">
                {/* Consultant Avatar */}
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[10px] text-heading">
                  {mission.consultantName.split(" ").map((n) => n[0]).join("")}
                </div>
                
                <span className="text-muted text-xs font-bold">+</span>

                {/* Client Logo */}
                <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] ${mission.clientLogoBg}`}>
                  {mission.clientLogoLetter}
                </div>

                <div className="ml-1 min-w-0">
                  <h3 className="text-xs font-bold text-heading truncate">{mission.consultantName}</h3>
                  <p className="text-[10px] text-body truncate">chez {mission.clientName}</p>
                </div>
              </div>

              {/* Fin de mission & Progress Bar */}
              <div className="flex flex-col gap-1 w-full">
                <div className="text-[11px] text-body">
                  Fin de Mission: <span className="font-semibold text-heading">{mission.daysRemaining}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${mission.pctRemaining}%` }} />
                </div>
              </div>

              {/* Tag/Description */}
              <div className="text-[10px] text-muted font-medium select-none">
                {mission.desc}
              </div>

              {/* Touch Target CTA (Min 44px height) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = `mailto:consultants@kredo.dev?subject=Contact concernant la mission chez ${encodeURIComponent(mission.clientName)}`
                }}
                className="w-full h-11 min-h-[44px] rounded-lg border border-border bg-surface text-body hover:bg-surface-hover hover:text-primary hover:border-primary/50 text-xs font-bold flex items-center justify-center transition-all select-none active:scale-95 cursor-pointer"
              >
                Contacter
              </button>
            </div>
          ))}
        </div>
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
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-body font-bold border border-border/30">
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
