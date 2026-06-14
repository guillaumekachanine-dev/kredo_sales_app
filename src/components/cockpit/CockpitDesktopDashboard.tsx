"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { CockpitDashboardData, CriticalStaffingAlert, LowScoreProposal } from "@/lib/cockpit/cockpit-data"

export function CockpitDesktopDashboard({ data }: { data: CockpitDashboardData }) {
  const { kpis, timeline, bottlenecks, staffingAlerts, lowScoreProposals } = data

  // Active interactive modal state
  const [activeModal, setActiveModal] = useState<{
    type: "match" | "review" | "sync" | "info"
    title: string
    content: string
    targetName?: string
    targetScore?: number
  } | null>(null)

  // Interactive local states for updates
  const [alerts, setAlerts] = useState<CriticalStaffingAlert[]>(staffingAlerts)
  const [proposals, setProposals] = useState<LowScoreProposal[]>(lowScoreProposals)
  const [isProcessing, setIsProcessing] = useState(false)

  // Handle Action Click
  const handleAlertMatchClick = (alert: CriticalStaffingAlert) => {
    setActiveModal({
      type: "match",
      title: `Matching de Profils IA (n8n) : ${alert.anomaly}`,
      content: `Lancement du rapprochement sémantique pgvector pour résoudre l'anomalie de staffing : "${alert.statusText}".
      Le workflow n8n a identifié 2 profils internes disponibles avec un taux de compatibilité supérieur à 90% : Sophie Martin (Practice A) & Marc Colin (Practice 2).`,
      targetName: alert.id,
    })
  }

  const handleProposalReviewClick = (prop: LowScoreProposal) => {
    setActiveModal({
      type: "review",
      title: `Révision de Proposition IA : ${prop.consultantName}`,
      content: `La proposition commerciale pour ${prop.consultantName} chez ${prop.practiceName} (Valeur: ${prop.valueAmount}) présente un score de qualité IA rouge de ${prop.iaScore}%.
      Principaux points de friction détectés :
      - Manque de spécifications techniques sur le module Next.js / FastAPI (Rapprochement sémantique faible)
      - Profils anonymisés manquants.
      Souhaitez-vous déclencher la correction automatique IA de la proposition via n8n ?`,
      targetName: prop.id,
      targetScore: prop.iaScore,
    })
  }

  // Confirm and resolve action
  const confirmAction = (modalType: string, targetId?: string) => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      if (modalType === "match") {
        setAlerts((prev) => prev.filter((a) => a.id !== targetId))
      } else if (modalType === "review") {
        setProposals((prev) => prev.filter((p) => p.id !== targetId))
      }
      setActiveModal({
        type: "sync",
        title: "Action Réussie",
        content: "L'incohérence a été résolue et les données de pilotage ont été mises à jour avec succès.",
      })
    }, 1000)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-6 select-none relative">
      {/* Premium Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            KREDO Cockpit - Vue à 360° du Centre de Profit
          </h1>
          {/* Top warning badge next to title */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-200 bg-[#FFF8E1] text-[#E65100] text-[10px] font-bold shadow-sm">
            <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Alerte n8n: Analyse Prédictive Active</span>
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body hover:bg-surface-hover transition-colors"
            title="Calendrier"
          >
            <svg className="w-4 h-4 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body hover:bg-surface-hover transition-colors relative"
            title="Notifications"
          >
            <svg className="w-4 h-4 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border border-surface" />
          </button>

          {/* User GK initials avatar */}
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
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                {kpi.label}
              </span>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-bold text-heading">{kpi.value}</span>
                {kpi.trendBadge && (
                  <span className="inline-flex items-center text-[10px] font-bold text-[#2C7D5C] bg-[#E8F5E9] px-1.5 py-0.5 rounded shadow-sm">
                    {kpi.trendBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Custom SVG Mini charts inside KPI cards */}
            {kpi.id === "c-weighted-pipe" && (
              <div className="absolute bottom-2 right-4 w-16 h-10">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path d="M0,35 Q15,30 30,32 T60,20 T80,15 T100,5" fill="none" stroke="#2C7D5C" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {/* Average Project Margin mini bar chart */}
            {kpi.id === "c-project-margin" && (
              <div className="absolute bottom-2 right-4 w-14 h-8 flex items-end justify-between px-1">
                <span className="w-1.5 h-4 rounded bg-[#10B981]" />
                <span className="w-1.5 h-6 rounded bg-[#10B981]" />
                <span className="w-1.5 h-5 rounded bg-[#10B981]" />
                <span className="w-1.5 h-7 rounded bg-[#10B981]" />
                <span className="w-1.5 h-8 rounded bg-[#10B981]" />
              </div>
            )}

            {/* Global Bench Rate two progress bars */}
            {kpi.id === "c-bench-rate" && (
              <div className="absolute bottom-2 right-4 w-16 h-8 flex flex-col justify-center gap-1.5 select-none">
                <div className="w-full h-1 rounded bg-slate-100 overflow-hidden border border-border/50">
                  <div className="w-[60%] h-full bg-[#10B981]" />
                </div>
                <div className="w-full h-1 rounded bg-slate-100 overflow-hidden border border-border/50">
                  <div className="w-[45%] h-full bg-[#10B981]" />
                </div>
              </div>
            )}

            {/* Competence Match circular gauge */}
            {kpi.id === "c-match-accuracy" && (
              <div className="absolute bottom-1 right-2 w-14 h-10 select-none">
                <svg className="w-full h-full" viewBox="0 0 60 40">
                  <path d="M 10 32 A 20 20 0 0 1 50 32" fill="none" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
                  <path
                    d="M 10 32 A 20 20 0 0 1 50 32"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="62.8"
                    strokeDashoffset="6.28" // Approx 91% matching
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Middle Section: Combo Chart (8) & Bottlenecks chart (4) */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Combo Chart Card (col-span-8) */}
        <SurfaceCard className="col-span-8 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Pipeline Commercial vs. Ressourcement (Prédictif)
            </h2>

            <div className="relative">
              <select
                className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
              >
                <option>Filteres tilts</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* SVG Combo Chart */}
          <div className="relative w-full h-[240px]">
            {/* Legend indicator */}
            <div className="flex items-center gap-5 mb-3 text-[10px] font-bold text-body">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#10B981]" />
                <span>Pipeline stages</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#EA580C]" />
                <span>Predictive availability</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-full border-2 border-[#334155] bg-white" />
                <span>Availability for consultants</span>
              </div>
            </div>

            <svg className="w-full h-[190px]" viewBox="0 0 800 200" preserveAspectRatio="none">
              {/* Guidelines */}
              <line x1="30" y1="20" x2="780" y2="20" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="60" x2="780" y2="60" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="100" x2="780" y2="100" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="140" x2="780" y2="140" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="30" y1="180" x2="780" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />

              {/* Stacked columns: green bottom + orange top */}
              {/* Jan (center X=70) */}
              <rect x="58" y="148" width="24" height="32" fill="#10B981" rx="2" />
              <rect x="58" y="105.3" width="24" height="42.7" fill="#EA580C" rx="2" />

              {/* Fev (center X=160) */}
              <rect x="148" y="140" width="24" height="40" fill="#10B981" rx="2" />
              <rect x="148" y="92" width="24" height="48" fill="#EA580C" rx="2" />

              {/* Mar (center X=250) TODAY */}
              <rect x="238" y="121.3" width="24" height="58.7" fill="#10B981" rx="2" />
              <rect x="238" y="65.3" width="24" height="56" fill="#EA580C" rx="2" />

              {/* Abr (center X=340) */}
              <rect x="328" y="129.3" width="24" height="50.7" fill="#10B981" rx="2" />
              <rect x="328" y="70.6" width="24" height="58.7" fill="#EA580C" rx="2" />

              {/* Jun (center X=430) */}
              <rect x="418" y="116" width="24" height="64" fill="#10B981" rx="2" />
              <rect x="418" y="36" width="24" height="80" fill="#EA580C" rx="2" />

              {/* Oct (center X=520) */}
              <rect x="508" y="110.7" width="24" height="69.3" fill="#10B981" rx="2" />
              <rect x="508" y="22.7" width="24" height="88" fill="#EA580C" rx="2" />

              {/* Nov (center X=610) */}
              <rect x="598" y="118.7" width="24" height="61.3" fill="#10B981" rx="2" />
              <rect x="598" y="33.4" width="24" height="85.3" fill="#EA580C" rx="2" />

              {/* Dec (center X=700) */}
              <rect x="688" y="113.3" width="24" height="66.7" fill="#10B981" rx="2" />
              <rect x="688" y="22.6" width="24" height="90.7" fill="#EA580C" rx="2" />

              {/* Line: Availability for consultants */}
              <path
                d="M 70,62.7 L 160,68 L 250,60 L 340,100 L 430,46.7 L 520,46.7 L 610,62.7 L 700,52"
                fill="none"
                stroke="#334155"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Line Dots */}
              <circle cx="70" cy="62.7" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="160" cy="68" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="250" cy="60" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="340" cy="100" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="430" cy="46.7" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="520" cy="46.7" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="610" cy="62.7" r="4" fill="white" stroke="#334155" strokeWidth="2" />
              <circle cx="700" cy="52" r="4" fill="white" stroke="#334155" strokeWidth="2" />

              {/* TODAY Indicator at March (X=250) */}
              <line x1="250" y1="10" x2="250" y2="180" stroke="#0F172A" strokeWidth="2" />
              <text x="250" y="5" fill="#0F172A" fontSize="9" fontWeight="bold" textAnchor="middle">
                TODAY
              </text>
            </svg>

            {/* X Axis labels */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-bold text-muted pl-14 pr-24 select-none">
              <span>Jan</span>
              <span>Fev</span>
              <span>Mar</span>
              <span>Abr</span>
              <span>Jun</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </SurfaceCard>

        {/* Right Column: Analyse des Goulots (col-span-4) */}
        <SurfaceCard className="col-span-4 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Analyse des Goulots d&apos;Étranglement
              </h2>
              <span className="text-[10px] text-muted">Average days in sales stages</span>
            </div>

            {/* Horizontal Stacked Bars */}
            <div className="flex flex-col gap-4 mt-2">
              {bottlenecks.map((b) => {
                const qualifPct = (b.qualifDays / 60) * 100;
                const propPct = (b.propDays / 60) * 100;
                const negoPct = (b.negoDays / 60) * 100;
                const gagnePct = (b.gagneDays / 60) * 100;

                return (
                  <div key={b.stageName} className="flex items-center select-none">
                    <span className="w-16 text-[10px] font-bold text-body shrink-0">{b.stageName}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden flex bg-canvas shadow-inner border border-border/40">
                      {b.qualifDays > 0 && <div className="bg-[#1E3A8A]" style={{ width: `${qualifPct}%` }} />}
                      {b.propDays > 0 && <div className="bg-[#EA580C]" style={{ width: `${propPct}%` }} />}
                      {b.negoDays > 0 && <div className="bg-[#64748B]" style={{ width: `${negoPct}%` }} />}
                      {b.gagneDays > 0 && <div className="bg-[#16A34A]" style={{ width: `${gagnePct}%` }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center pt-2 border-t border-border/20">
            <span className="w-16 shrink-0" />
            <div className="flex-1 flex justify-between text-[8px] font-bold text-muted px-1">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Bottom Grid: Staffing alerts & proposals */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Left Bottom Card: Alertes Critiques de Staffing (col-span-6) */}
        <SurfaceCard className="col-span-6 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Alertes Critiques de Staffing (via n8n)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/20 select-none">
                    <th className="py-2">Anomaliés</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Suggestions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {alerts.map((item) => (
                    <tr key={item.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-2.5 font-bold text-heading flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#BE3E3E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{item.anomaly}</span>
                      </td>
                      <td className="py-2.5 text-body truncate max-w-[120px]" title={item.statusText}>
                        {item.statusText}
                      </td>
                      <td className="py-2.5 text-right select-none">
                        <button
                          onClick={() => handleAlertMatchClick(item)}
                          className="bg-[#334155] text-white hover:bg-[#1E293B] font-bold px-3 py-1 rounded transition-colors text-[9px] flex items-center gap-1 ml-auto border border-[#1E293B]"
                        >
                          <svg className="w-3 h-3 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          <span>AI Match</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/20 text-[10px] text-muted select-none">
            Anomalies repérées et matching recommandés mis à jour en continu.
          </div>
        </SurfaceCard>

        {/* Right Bottom Card: Proposals low IA score (col-span-6) */}
        <SurfaceCard className="col-span-6 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Propositions à Haute Valeur & Bas Score IA
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/20 select-none">
                    <th className="py-2">Opportunités</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Fin Mission</th>
                    <th className="py-2">Value</th>
                    <th className="py-2 text-right">Score IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {proposals.map((item) => {
                    const initials = item.consultantName.split(" ").map((n) => n[0]).join("");
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleProposalReviewClick(item)}
                        className="hover:bg-canvas/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 font-bold text-heading flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[9px] text-body select-none">
                            {initials}
                          </div>
                          <span className="group-hover:text-primary transition-colors">{item.consultantName}</span>
                        </td>
                        <td className="py-2.5 text-body">{item.practiceName}</td>
                        <td className="py-2.5 text-muted font-medium">{item.finMission}</td>
                        <td className="py-2.5 font-semibold text-heading font-mono">{item.valueAmount}</td>
                        <td className="py-2.5 text-right select-none">
                          <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm">
                            {item.iaScore}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/20 text-[10px] text-muted select-none">
            Analyse sémantique effectuée sur les chiffrages de propositions.
          </div>
        </SurfaceCard>
      </div>

      {/* Interactive Modal Sheet Overlay */}
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
              <p className="text-xs text-body leading-relaxed whitespace-pre-line">{activeModal.content}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border/30 pt-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-xs font-semibold px-4 py-2 bg-canvas hover:bg-surface-hover border border-border rounded-lg text-body transition-colors"
                disabled={isProcessing}
              >
                Annuler
              </button>
              {activeModal.type === "match" && (
                <button
                  type="button"
                  onClick={() => confirmAction("match", activeModal.targetName)}
                  className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors flex items-center gap-1.5"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Rapprochement..." : "Affecter Consultant"}
                </button>
              )}
              {activeModal.type === "review" && (
                <button
                  type="button"
                  onClick={() => confirmAction("review", activeModal.targetName)}
                  className="text-xs font-bold px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-white shadow transition-colors"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Optimisation..." : "Corriger avec l'IA"}
                </button>
              )}
              {activeModal.type === "sync" && (
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
