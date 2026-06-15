"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import { practiceBadgeStyle } from "@/lib/config/practices"
import type { StaffingDashboardData, UpcomingConsultant } from "@/lib/staffing/staffing-data"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"

export function StaffingDesktopDashboard({ data }: { data: StaffingDashboardData }) {
  const { kpis, timeline, upcomingConsultants, staffingNeeds } = data

  // Active interactive modal state
  const [activeModal, setActiveModal] = useState<{
    type: "affecter" | "former" | "matching" | "filters"
    title: string
    content: string
    consultantName?: string
    needRole?: string
  } | null>(null)

  // Filters state
  const [selectedPractice, setSelectedPractice] = useState<string>("all")
  const [actionList, setActionList] = useState<UpcomingConsultant[]>(upcomingConsultants)

  // Handle Action click
  const handleActionClick = (consultant: UpcomingConsultant) => {
    if (consultant.status === "affecter") {
      setActiveModal({
        type: "affecter",
        title: `Affectation Mission : ${consultant.name}`,
        content: `Ce consultant est disponible sous 15 jours. Le moteur n8n recommande de l'affecter sur le besoin "Rôle" chez Client A (92% de match sémantique). Souhaitez-vous valider cette affectation et générer l'avenant de contrat ?`,
        consultantName: consultant.name,
      })
    } else {
      setActiveModal({
        type: "former",
        title: `Plan de Formation : ${consultant.name}`,
        content: `Pour aligner les compétences de ${consultant.name} avec la demande du marché (React, Next.js, pgvector), nous suggérons une certification Cloud Practitioner de 5 jours. Souhaitez-vous débloquer le budget de formation ?`,
        consultantName: consultant.name,
      })
    }
  }

  // Confirm allocation update state
  const confirmAllocation = (name?: string) => {
    if (name) {
      setActionList((prev) => prev.filter((c) => c.name !== name))
    }
    setActiveModal(null)
  }

  // Filter list by practice
  const filteredConsultants = actionList.filter((c) => {
    if (selectedPractice !== "all" && c.practice !== selectedPractice) return false
    return true
  })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-6 select-none relative">
      {/* Premium Title Bar / Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Synthèse Staffing - Tour de Contrôle
          </h1>
        </div>

        {/* Right Header actions */}
        <div className="flex items-center gap-4">
<HeaderCalendar />

<HeaderAlerts />

          {/* User initials GK */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary border border-border flex items-center justify-center font-bold text-xs text-white">
              GK
            </div>
            <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </header>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none relative overflow-hidden"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {kpi.label}
              </span>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-bold text-heading">{kpi.value}</span>
                {kpi.trend && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded",
                      kpi.status === "success"
                        ? "bg-[#E8F5E9] text-[#2C7D5C]"
                        : "bg-red-50 text-red-600"
                    )}
                  >
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      {kpi.trend.direction === "up" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      )}
                    </svg>
                    <span>{kpi.trend.label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sparkline graphics */}
            <div className="absolute bottom-2 right-4 w-16 h-10">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <defs>
                  <linearGradient id={`kpi-grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={kpi.status === "success" ? "#2C7D5C" : "#E53E3E"}
                      stopOpacity="0.25"
                    />
                    <stop
                      offset="100%"
                      stopColor={kpi.status === "success" ? "#2C7D5C" : "#E53E3E"}
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path
                  d={
                    kpi.trend?.direction === "up"
                      ? "M0,35 Q15,30 30,32 T60,20 T80,15 T100,5"
                      : "M0,5 Q15,12 30,10 T60,22 T80,25 T100,35"
                  }
                  fill="none"
                  stroke={kpi.status === "success" ? "#2C7D5C" : "#E53E3E"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d={
                    kpi.trend?.direction === "up"
                      ? "M0,35 Q15,30 30,32 T60,20 T80,15 T100,5 L100,40 L0,40 Z"
                      : "M0,5 Q15,12 30,10 T60,22 T80,25 T100,35 L100,40 L0,40 Z"
                  }
                  fill={`url(#kpi-grad-${kpi.id})`}
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charge Availability Graph Card */}
      <SurfaceCard className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Disponibilité des Ressources (TO par Mois) vs. Demande
          </h2>

          <div className="relative">
            <select
              value={selectedPractice}
              onChange={(e) => setSelectedPractice(e.target.value)}
              className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
            >
              <option value="all">Filteres tilts</option>
              <option value="Practice A">Practice A</option>
              <option value="Practice 2">Practice 2</option>
              <option value="Practice 3">Practice 3</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Custom SVG Area Graph */}
        <div className="relative w-full h-[220px]">
          {/* Legend indicator */}
          <div className="flex items-center gap-4 mb-3 text-[10px] font-bold text-body">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#10B981] opacity-90" />
              <span>Availability</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#475569] opacity-90" />
              <span>Market Demand</span>
            </div>
          </div>

          <svg className="w-full h-[180px]" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="avail-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="demand-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#475569" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            <line x1="20" y1="20" x2="780" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="60" x2="780" y2="60" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="100" x2="780" y2="100" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="140" x2="780" y2="140" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="180" x2="780" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Area under Availability (emerald Green) */}
            <path
              d="M 20,121 L 110,113 L 200,94.6 L 290,105.3 L 380,89.3 L 470,57.3 L 560,78.6 L 650,81.3 L 740,68 L 780,72 L 780,180 L 20,180 Z"
              fill="url(#avail-gradient)"
            />
            <path
              d="M 20,121 L 110,113 L 200,94.6 L 290,105.3 L 380,89.3 L 470,57.3 L 560,78.6 L 650,81.3 L 740,68 L 780,72"
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Area under Market Demand (slate) */}
            <path
              d="M 20,140 L 110,134.6 L 200,124 L 290,132 L 380,116 L 470,84 L 560,105.3 L 650,108 L 740,94.6 L 780,98 L 780,180 L 20,180 Z"
              fill="url(#demand-gradient)"
            />
            <path
              d="M 20,140 L 110,134.6 L 200,124 L 290,132 L 380,116 L 470,84 L 560,105.3 L 650,108 L 740,94.6 L 780,98"
              fill="none"
              stroke="#475569"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* TODAY Vertical Marker at month of March (X=200) */}
            <line x1="200" y1="10" x2="200" y2="180" stroke="#0F172A" strokeWidth="2" />
            <circle cx="200" cy="94.6" r="4" fill="#0F172A" />
            <text x="200" y="5" fill="#0F172A" fontSize="9" fontWeight="bold" textAnchor="middle">
              TODAY
            </text>
          </svg>

          {/* Month labels underneath graph */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-bold text-muted px-2.5">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>Mai</span>
            <span>Jun</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Bottom section grid */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Left Bottom Card: Disponibilités Prochaines (<30 jours) (col-span-6) */}
        <SurfaceCard className="col-span-6 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Disponibilités Prochaines (&lt;30 jours)
              </h2>

              <div className="relative">
                <select
                  value={selectedPractice}
                  onChange={(e) => setSelectedPractice(e.target.value)}
                  className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option value="all">Filter tilts</option>
                  <option value="Practice A">Practice A</option>
                  <option value="Practice 2">Practice 2</option>
                  <option value="Practice 3">Practice 3</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/20 select-none">
                    <th className="py-2">Consultant</th>
                    <th className="py-2">Practice</th>
                    <th className="py-2">Fin Mission</th>
                    <th className="py-2 text-right">Current TO</th>
                    <th className="py-2 text-center w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredConsultants.map((c) => {
                    const initials = c.name.split(" ").map((n) => n[0]).join("");
                    return (
                      <tr key={c.id} className="hover:bg-canvas/30 transition-colors">
                        <td className="py-2.5 font-bold text-heading flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[9px] text-body select-none">
                            {initials}
                          </div>
                          <span>{c.name}</span>
                        </td>
                        <td className="py-2.5">
                          {c.practice ? (
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                              style={practiceBadgeStyle(c.practice)}
                            >
                              {c.practice}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 text-muted font-medium">{c.finMission}</td>
                        <td className="py-2.5 text-right font-semibold text-heading font-mono">
                          {c.currentTo}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleActionClick(c)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded border transition-colors",
                              c.status === "affecter"
                                ? "bg-primary text-white border-primary hover:bg-primary-hover"
                                : "bg-surface text-body border-border hover:bg-surface-hover"
                            )}
                          >
                            {c.status === "affecter" ? "Affecter" : "Former"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/20 text-[10px] text-muted select-none">
            Avenants et fin de missions gérés en direct.
          </div>
        </SurfaceCard>

        {/* Right Bottom Card: Besoins de Staffing & Suggestions IA (col-span-6) */}
        <SurfaceCard className="col-span-6 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Besoins de Staffing & Suggestions IA
              </h2>

              <div className="relative">
                <select
                  value={selectedPractice}
                  onChange={(e) => setSelectedPractice(e.target.value)}
                  className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option value="all">Filter tilts</option>
                  <option value="Practice A">Practice A</option>
                  <option value="Practice 2">Practice 2</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/20 select-none">
                    <th className="py-2">Client</th>
                    <th className="py-2">Rôle</th>
                    <th className="py-2">Pratique</th>
                    <th className="py-2">Urgency</th>
                    <th className="py-2 text-right">Suggested (AI Match %)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {staffingNeeds.map((need) => (
                    <tr key={need.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-2.5 font-bold text-heading flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-black text-white font-black text-[9px] flex items-center justify-center select-none">
                          {need.logoLetter}
                        </div>
                        <span>{need.clientName}</span>
                      </td>
                      <td className="py-2.5 text-body">{need.role}</td>
                      <td className="py-2.5">
                        {need.practice ? (
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={practiceBadgeStyle(need.practice)}
                          >
                            {need.practice}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5">
                        <span className="bg-[#FFE0B2] text-[#E65100] px-2 py-0.5 rounded text-[9px] font-bold">
                          {need.urgency}
                        </span>
                      </td>
                      <td className="py-2.5 text-right select-none">
                        <button
                          onClick={() =>
                            setActiveModal({
                              type: "matching",
                              title: `Suggestions Matching IA : ${need.clientName}`,
                              content: `Le moteur de recommandation Kredo a identifié 3 profils compatibles : Consultant B (97% de match), Consultant C (97% de match) et Consultant A (92% de match).`,
                            })
                          }
                          className="bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] font-bold px-2 py-0.5 rounded-full inline-block transition-colors"
                        >
                          {need.aiMatchScore}%
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/20 text-[10px] text-muted select-none">
            Suggestions basées sur pgvector sémantique & profil CVs.
          </div>
        </SurfaceCard>
      </div>

      {/* Interactive Modal Sheet (Glassmorphic Accent Overlay) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-surface/95 border border-border rounded-xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent" />

            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-sm font-bold text-heading font-heading">
                {activeModal.title}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-muted hover:text-body transition-colors"
                title="Fermer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-body leading-relaxed">{activeModal.content}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border/30 pt-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-xs font-semibold px-4 py-2 bg-canvas hover:bg-surface-hover border border-border rounded-lg text-body transition-colors"
              >
                Annuler
              </button>
              {activeModal.type === "affecter" && (
                <button
                  type="button"
                  onClick={() => confirmAllocation(activeModal.consultantName)}
                  className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors"
                >
                  Confirmer Affectation
                </button>
              )}
              {activeModal.type === "former" && (
                <button
                  type="button"
                  onClick={() => confirmAllocation(activeModal.consultantName)}
                  className="text-xs font-bold px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-white shadow transition-colors"
                >
                  Débloquer Budget
                </button>
              )}
              {activeModal.type !== "affecter" && activeModal.type !== "former" && (
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
