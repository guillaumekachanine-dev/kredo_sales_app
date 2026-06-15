"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { FinanceDashboardData } from "@/lib/finance/finance-data"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"

export function FinanceMobileDashboard({ data }: { data: FinanceDashboardData }) {
  const { kpis } = data

  const carouselRef = useRef<HTMLDivElement>(null)

  // Active bottom sheet drawer state
  const [activeSheet, setActiveSheet] = useState<{
    type: "relance" | "details"
    title: string
    description: string
    primaryBtn: string
    targetId: string
  } | null>(null)

  // Interactive late billing alert state
  const [urgentAlert, setUrgentAlert] = useState<{
    id: string
    client: string
    details: string
    retard: string
    risk: string
  } | null>({
    id: "urg-1",
    client: "Thales",
    details: "Client BC N° 22103",
    retard: "Retard 45 Jours",
    risk: "Risque IA Elevé",
  })

  // Mock semantic anomalies
  const [suggestions, setSuggestions] = useState([
    { id: "sug-1", name: "Consultant X", anomaly: "Incohérence TJM pgvector BC vs Supabase", tjm: "680€" },
    { id: "sug-2", name: "Consultant X", anomaly: "Tension de matching sémantique <10%", tjm: "680€" },
  ])

  // Handle Swipe scroll right
  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 150, behavior: "smooth" })
    }
  }

  // Handle CTA buttons click
  const handleRelanceClick = () => {
    if (urgentAlert) {
      setActiveSheet({
        type: "relance",
        title: `Relance Auto-Dunning : ${urgentAlert.client}`,
        description: `Lancer le scénario de recouvrement n8n pour relancer ${urgentAlert.client}. Un email automatique personnalisé de niveau 1 sera envoyé à leur service comptabilité.`,
        primaryBtn: "Envoyer Relance",
        targetId: urgentAlert.id,
      })
    }
  }

  const handleSuggestionClick = (id: string, name: string, anomaly: string) => {
    setActiveSheet({
      type: "details",
      title: `Résoudre Anomalie : ${name}`,
      description: `Rapprocher les temps déclarés pour ce consultant. Détail : "${anomaly}".`,
      primaryBtn: "Régulariser Temps",
      targetId: id,
    })
  }

  // Confirm sheet action and resolve alert
  const confirmSheetAction = (type: string, id: string) => {
    if (type === "relance") {
      setUrgentAlert(null)
    } else {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    }
    setActiveSheet(null)
  }

  return (
    <div className="flex flex-col gap-6 bg-canvas px-4 py-5 pb-24 select-none relative min-h-screen">
      {/* Mobile Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <h1 className="text-lg font-extrabold font-heading text-heading tracking-tight">
          Finance Intel.
        </h1>

        <div className="flex items-center gap-3">
<HeaderCalendar />

<HeaderAlerts />

          {/* User GK Initials Avatar */}
          <div className="w-7 h-7 rounded-full bg-primary border border-border flex items-center justify-center font-extrabold text-[10px] text-white">
            GK
          </div>
        </div>
      </header>

      {/* KPI Scroll Carousel Strip */}
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {kpis.slice(0, 3).map((kpi) => (
            <div
              key={kpi.id}
              className="w-36 shrink-0 bg-surface border border-border/80 shadow-sm rounded-xl p-3.5 snap-start relative overflow-hidden"
            >
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                {kpi.label.replace(" (YTD)", "").replace(" Moy.", "")}
              </span>
              <span className="text-xl font-bold text-heading mt-2 block leading-none">
                {kpi.value}
              </span>
              
              {/* Green indicator tag if matching */}
              {kpi.id === "f-marge-brute" && (
                <span className="inline-flex items-center text-[8px] font-bold text-[#2C7D5C] bg-[#E8F5E9] px-1 py-0.2 rounded mt-1.5">
                  &uarr; 12%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Swipe arrow indicator helper */}
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

      {/* Area Line Chart: Évolution CA & Marge (n8n Tendance) */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <div className="leading-tight">
          <h2 className="text-xs font-bold uppercase tracking-wider text-heading select-none">
            Évolution CA & Marge (n8n Tendance)
          </h2>
          <span className="text-[9px] text-muted block mt-0.5">Dense and decision-focused</span>
        </div>

        {/* Mobile scaled SVG graph */}
        <div className="relative w-full h-[130px]">
          {/* Y Axis Legend labels */}
          <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[8px] font-bold text-muted select-none w-5">
            <span>1200</span>
            <span>1000</span>
            <span>400</span>
            <span>200</span>
            <span>0</span>
          </div>

          <svg className="w-full h-[110px] pl-6" viewBox="0 0 320 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ca-m-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="margin-m-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid line guidelines */}
            <line x1="10" y1="20" x2="310" y2="20" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="50" x2="310" y2="50" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="80" x2="310" y2="80" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="110" x2="310" y2="110" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* CA Line Area */}
            <path
              d="M 10,80 L 70,75 L 130,60 L 190,70 L 250,55 L 310,30 L 310,110 L 10,110 Z"
              fill="url(#ca-m-grad)"
            />
            <path
              d="M 10,80 L 70,75 L 130,60 L 190,70 L 250,55 L 310,30"
              fill="none"
              stroke="#334155"
              strokeWidth="2.5"
            />

            {/* Marge Line Area */}
            <path
              d="M 10,95 L 70,90 L 130,80 L 190,85 L 250,75 L 310,50 L 310,110 L 10,110 Z"
              fill="url(#margin-m-grad)"
            />
            <path
              d="M 10,95 L 70,90 L 130,80 L 190,85 L 250,75 L 310,50"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
            />

            {/* Today indicator vertical line */}
            <line x1="130" y1="10" x2="130" y2="110" stroke="#0F172A" strokeWidth="1.5" />
            <text x="130" y="5" fill="#0F172A" fontSize="7" fontWeight="bold" textAnchor="middle">
              TODAY
            </text>
          </svg>

          {/* Month labels underneath graph */}
          <div className="absolute left-6 inset-x-0 bottom-0 flex justify-between text-[8px] font-bold text-muted select-none">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Relance Facturation Urgente (n8n) Card */}
      {urgentAlert && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Relance Facturation Urgente (n8n)
          </h2>

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-2.5 min-w-0">
              {/* Thales mockup logo initials */}
              <div className="w-9 h-9 rounded bg-slate-900 border border-border text-white flex items-center justify-center font-black text-xs shrink-0">
                T
              </div>

              <div className="min-w-0 flex-1 leading-tight">
                <h4 className="text-xs font-bold text-heading truncate">{urgentAlert.client}</h4>
                <p className="text-[10px] text-body mt-0.5">{urgentAlert.details}</p>
                <p className="text-[10px] text-muted font-semibold mt-1">
                  {urgentAlert.retard}
                </p>
              </div>
            </div>

            <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-[8px] font-extrabold whitespace-nowrap">
              {urgentAlert.risk}
            </span>
          </div>

          {/* Touch target height >= 44px button */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 bg-canvas select-none">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={handleRelanceClick}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Relancer
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Mes Suggestions IA (n8n Sémantique) Card */}
      <SurfaceCard className="p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 select-none">
          Mes Suggestions IA (n8n Sémantique)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-muted font-bold border-b border-border/20 select-none">
                <th className="py-2">Avatar</th>
                <th className="py-2">Name</th>
                <th className="py-2">Anomalie</th>
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
                      <span className="text-[9px] text-muted font-normal block mt-0.5">TJM : {sug.tjm}</span>
                    </td>
                    <td className="py-2 text-[10px] text-body truncate max-w-[100px]" title={sug.anomaly}>
                      {sug.anomaly}
                    </td>
                    <td className="py-2 text-right">
                      {/* Touch target height >= 44px */}
                      <button
                        onClick={() => handleSuggestionClick(sug.id, sug.name, sug.anomaly)}
                        className="h-11 px-3 bg-slate-50 border border-border rounded-lg text-body font-bold text-[10px] transition-colors"
                      >
                        Gérer (&gt; 44px)
                      </button>
                    </td>
                  </tr>
                )
              })}
              {suggestions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-muted select-none">
                    Toutes les suggestions IA ont été traitées !
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
