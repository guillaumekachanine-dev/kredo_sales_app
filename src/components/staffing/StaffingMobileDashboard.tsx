"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { StaffingDashboardData, UpcomingConsultant } from "@/lib/staffing/staffing-data"

export function StaffingMobileDashboard({ data }: { data: StaffingDashboardData }) {
  const { kpis, upcomingConsultants, staffingNeeds } = data

  const carouselRef = useRef<HTMLDivElement>(null)

  // Active bottom sheet drawer state
  const [activeSheet, setActiveSheet] = useState<{
    type: "matching" | "action"
    title: string
    description: string
    primaryBtn: string
    targetId: string
  } | null>(null)

  // Priority action alert state
  const [priorityAlert, setPriorityAlert] = useState<{
    id: string
    name: string
    details: string
    delay: string
  } | null>({
    id: "crit-1",
    name: "Consultant B",
    details: "Client/Mission",
    delay: "Fin Mission dans 10 jours",
  })

  // Mock suggestion list
  const [suggestions, setSuggestions] = useState([
    { id: "sug-1", name: "Sophie Martin", score: "97%", practice: "AI / Next.js" },
    { id: "sug-2", name: "Jean Dupont", score: "92%", practice: "Cloud / DevOps" },
    { id: "sug-3", name: "Marc Colin", score: "88%", practice: "Project Manager" },
  ])

  // Custom euro Millions formatting
  const formatEuroM = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`
    }
    return `€${value}`
  }

  // Handle Swipe/Scroll right
  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 150, behavior: "smooth" })
    }
  }

  // Handle CTA buttons
  const handleMatchingClick = () => {
    if (priorityAlert) {
      setActiveSheet({
        type: "matching",
        title: `Lancer le Matching : ${priorityAlert.name}`,
        description: `Lancer le moteur de recommandation sémantique pgvector pour trouver le meilleur positionnement pour ${priorityAlert.name} avant sa fin de mission (${priorityAlert.delay}).`,
        primaryBtn: "Exécuter Matching",
        targetId: priorityAlert.id,
      })
    }
  }

  const handleSuggestionClick = (id: string, name: string) => {
    setActiveSheet({
      type: "action",
      title: `Affecter : ${name}`,
      description: `Voulez-vous générer la proposition d'affectation pour ${name} et notifier le manager de compte ?`,
      primaryBtn: "Confirmer Affectation",
      targetId: id,
    })
  }

  // Confirm and close sheet
  const confirmSheetAction = (type: string, id: string) => {
    if (type === "matching") {
      setPriorityAlert(null) // remove alert once matched
    } else {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    }
    setActiveSheet(null)
  }

  return (
    <div className="flex flex-col gap-6 bg-canvas px-4 py-5 pb-24 select-none relative min-h-screen">
      {/* Mobile Navigation Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          {/* Hamburger menu trigger */}
          <button type="button" className="text-body p-1" title="Menu">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body"
            title="Calendrier"
          >
            <svg className="w-4 h-4 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body relative"
            title="Notifications"
          >
            <svg className="w-4 h-4 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger border border-surface" />
          </button>

          {/* User GK initials avatar */}
          <div className="w-7 h-7 rounded-full bg-primary border border-border flex items-center justify-center font-extrabold text-[10px] text-white">
            GK
          </div>
        </div>
      </header>

      {/* KPI Carousel Slider */}
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="w-36 shrink-0 bg-surface border border-border/80 shadow-sm rounded-xl p-3.5 snap-start relative overflow-hidden"
            >
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                {kpi.label}
              </span>
              <span className="text-xl font-bold text-heading mt-2 block leading-none">
                {kpi.value}
              </span>
              
              {/* Green indicator tag if matching */}
              {kpi.trend && kpi.status === "success" && (
                <span className="inline-flex items-center text-[8px] font-bold text-[#2C7D5C] bg-[#E8F5E9] px-1 py-0.2 rounded mt-1.5">
                  &uarr; {kpi.trend.label.split(" ")[0]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Swipe right arrow button */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-7 h-7 bg-surface/90 border border-border rounded-full flex items-center justify-center shadow-md text-body focus:outline-none"
          title="Faire défiler"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Disponibilité des Ressources vs Demande Widget */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Disponibilité des Ressources vs Demande
        </h2>

        {/* Compact Mobile Area Graph */}
        <div className="relative w-full h-[140px]">
          {/* Y Axis Legend labels */}
          <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[8px] font-bold text-muted select-none w-5">
            <span>1200</span>
            <span>1000</span>
            <span>400</span>
            <span>200</span>
            <span>0</span>
          </div>

          <svg className="w-full h-[115px] pl-6" viewBox="0 0 320 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="m-avail-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="m-demand-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#475569" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid line guidelines */}
            <line x1="10" y1="20" x2="310" y2="20" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="50" x2="310" y2="50" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="80" x2="310" y2="80" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="110" x2="310" y2="110" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Mobile Availability Graph Area */}
            <path
              d="M 10,80 L 50,75 L 90,60 L 130,70 L 170,55 L 210,35 L 250,45 L 290,40 L 310,30 L 310,110 L 10,110 Z"
              fill="url(#m-avail-grad)"
            />
            <path
              d="M 10,80 L 50,75 L 90,60 L 130,70 L 170,55 L 210,35 L 250,45 L 290,40 L 310,30"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
            />

            {/* Mobile Demand Graph Area */}
            <path
              d="M 10,95 L 50,90 L 90,80 L 130,85 L 170,75 L 210,50 L 250,65 L 290,68 L 310,58 L 310,110 L 10,110 Z"
              fill="url(#m-demand-grad)"
            />
            <path
              d="M 10,95 L 50,90 L 90,80 L 130,85 L 170,75 L 210,50 L 250,65 L 290,68 L 310,58"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
            />

            {/* Today indicator vertical line */}
            <line x1="90" y1="10" x2="90" y2="110" stroke="#0F172A" strokeWidth="1.5" />
            <text x="90" y="5" fill="#0F172A" fontSize="7" fontWeight="bold" textAnchor="middle">
              TODAY
            </text>
          </svg>

          {/* Availability & Demand Legend labels */}
          <div className="absolute left-6 inset-x-0 bottom-0 flex items-center gap-3 text-[8px] font-bold text-body justify-center select-none">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Availability</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
              <span>Market Demand</span>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Affectation Critique (n8n) Widget */}
      {priorityAlert && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Affectation Critique (n8n)
          </h2>

          <div className="flex items-start gap-3 mb-4">
            {/* Consultant Avatar initials */}
            <div className="w-9 h-9 rounded-full bg-slate-200 border border-border flex items-center justify-center font-bold text-xs text-heading shrink-0">
              CB
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <h4 className="text-xs font-bold text-heading truncate">{priorityAlert.name}</h4>
              <p className="text-[10px] text-body mt-0.5">{priorityAlert.details}</p>
              <p className="text-[10px] text-[#BE3E3E] font-extrabold mt-1">
                {priorityAlert.delay}
              </p>
            </div>
          </div>

          {/* Touch Target Action Button (Height >= 44px for accessibility/mockup rules) */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 select-none bg-canvas">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={handleMatchingClick}
              className="flex-1 h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Lancer Matching
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Mes Suggestions IA (n8n Matching) Card */}
      <SurfaceCard className="p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 select-none">
          Mes Suggestions IA (n8n Matching)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-muted font-bold border-b border-border/20 select-none">
                <th className="py-2">Avatar</th>
                <th className="py-2">Name</th>
                <th className="py-2 text-center">Score</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {suggestions.map((sug) => {
                const initials = sug.name.split(" ").map((n) => n[0]).join("");
                return (
                  <tr key={sug.id} className="hover:bg-canvas/30 transition-colors">
                    <td className="py-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[8px] text-body select-none">
                        {initials}
                      </div>
                    </td>
                    <td className="py-2 font-bold text-heading">
                      <div>{sug.name}</div>
                      <span className="text-[9px] text-muted font-normal block mt-0.5">{sug.practice}</span>
                    </td>
                    <td className="py-2 text-center font-bold text-[#2E7D32]">
                      {sug.score}
                    </td>
                    <td className="py-2 text-right">
                      {/* Touch target height >= 44px (using standard padding or h-11 button) */}
                      <button
                        onClick={() => handleSuggestionClick(sug.id, sug.name)}
                        className="h-11 px-3 bg-[#E8F5E9] hover:bg-[#C8E6C9] border border-[#C8E6C9] rounded-lg text-[#2E7D32] font-bold text-[10px] transition-colors"
                        title="Affecter"
                      >
                        Affecter (&gt; 44px)
                      </button>
                    </td>
                  </tr>
                )
              })}
              {suggestions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-muted select-none">
                    Toutes les suggestions ont été traitées !
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      {/* Bottom Sheet Drawer for Mobile Interactions */}
      {activeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-surface border-t border-border rounded-t-2xl shadow-2xl w-full p-6 pb-8 max-w-md animate-in slide-in-from-bottom duration-200">
            {/* Grab handle */}
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-5" />

            <h3 className="text-sm font-bold text-heading mb-2 leading-tight">
              {activeSheet.title}
            </h3>
            <p className="text-xs text-body leading-relaxed mb-6">
              {activeSheet.description}
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => confirmSheetAction(activeSheet.type, activeSheet.targetId)}
                className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                {activeSheet.primaryBtn}
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="w-full h-11 bg-canvas hover:bg-surface-hover border border-border text-body font-semibold text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
