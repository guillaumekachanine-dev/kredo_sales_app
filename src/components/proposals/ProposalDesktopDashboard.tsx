"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { ProposalDashboardData, ProposalAuditItem } from "@/lib/proposals/proposals-data"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"

export function ProposalDesktopDashboard({ data }: { data: ProposalDashboardData }) {
  const { kpis, timeline, bottlenecks, audits } = data

  // Active modal state
  const [activeModal, setActiveModal] = useState<{
    type: "audit" | "cycle" | "matching" | "filters"
    title: string
    content: string
    targetName?: string
    score?: number
  } | null>(null)

  // Filters state
  const [auditList, setAuditList] = useState<ProposalAuditItem[]>(audits)
  const [selectedSort, setSelectedSort] = useState<string>("all")

  // Handle row click or action
  const handleRowClick = (item: ProposalAuditItem) => {
    setActiveModal({
      type: "audit",
      title: `Audit Qualité IA : ${item.consultantName}`,
      content: `L'analyse IA attribue un score de qualité de ${item.qualityScore}% à cette proposition commerciale.
      - Alignement technique : Excellent (pgvector semantic score: 96%)
      - CVs attachés : Validé (${item.tags.join(" & ")})
      - Clarté du livrable : Conforme aux standards Kredo.
      Aucune anomalie critique détectée. La proposition est prête à être envoyée au client.`,
      targetName: item.consultantName,
      score: item.qualityScore,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-6 select-none relative">
      {/* Title Bar / Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Proposal Intelligence - Synthèse
          </h1>
          {/* Orange Warning badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-200 bg-[#FFF8E1] text-[#E65100] text-[10px] font-bold shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Alerte n8n: Audit Qualité IA Actif</span>
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-4">
<HeaderCalendar />

<HeaderAlerts />

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
                <span className="text-3xl font-bold text-heading">{kpi.value}</span>
                {kpi.trendBadge && (
                  <span className="inline-flex items-center text-[10px] font-bold text-[#2C7D5C] bg-[#E8F5E9] px-1.5 py-0.5 rounded shadow-sm">
                    {kpi.trendBadge}
                  </span>
                )}
                
                {/* Average Cycle Time warning label indicator */}
                {kpi.id === "p-cycle-time" && (
                  <span
                    onClick={() =>
                      setActiveModal({
                        type: "cycle",
                        title: "Alerte Vélocité Commerciale",
                        content: "Le temps de cycle moyen a augmenté de 5 jours par rapport au trimestre dernier. Des goulots d'étranglement majeurs se situent en phase de Négociation.",
                      })
                    }
                    className="w-5 h-5 rounded-full bg-rose-100 text-[#BE3E3E] hover:bg-rose-200 border border-rose-200 flex items-center justify-center font-extrabold text-[10px] cursor-pointer transition-colors"
                    title="Détail cycle"
                  >
                    A
                  </span>
                )}
              </div>
            </div>

            {/* Sparkline overlay graphics */}
            {kpi.hasSparkline && (
              <div className="absolute bottom-2 right-4 w-16 h-10">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <defs>
                    <linearGradient id={`kpi-grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2C7D5C" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2C7D5C" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,35 Q15,30 30,32 T60,20 T80,15 T100,5"
                    fill="none"
                    stroke="#2C7D5C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,35 Q15,30 30,32 T60,20 T80,15 T100,5 L100,40 L0,40 Z"
                    fill={`url(#kpi-grad-${kpi.id})`}
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Middle Section: Pipe Velocity Chart (8) & Bottlenecks analysis (4) */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Left Column: Pipe Velocity Chart (col-span-8) */}
        <SurfaceCard className="col-span-8 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Pipe Velocity & Health Trend
            </h2>

            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
              >
                <option value="all">Filteres tilts</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Area graph */}
          <div className="relative w-full h-[220px]">
            {/* Legend indicator */}
            <div className="flex items-center gap-4 mb-3 text-[10px] font-bold text-body">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#10B981] opacity-90" />
                <span>Probability-weighted pipeline Values</span>
              </div>
            </div>

            <svg className="w-full h-[180px]" viewBox="0 0 800 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="weighted-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid guidelines */}
              <line x1="20" y1="20" x2="780" y2="20" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="60" x2="780" y2="60" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="100" x2="780" y2="100" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="140" x2="780" y2="140" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="20" y1="180" x2="780" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />

              {/* Line Area path */}
              {/* Jan(800), Fev(1000), Mar(1500), Abr(1200), Jun(2200), Oct(2400), Nov(2000), Dec(2150) */}
              {/* Y coordinates: 180 - (val/3000)*160 */}
              {/* Jan: 137.3. Fev: 126.7. Mar: 100. Abr: 116. Jun: 62.7. Oct: 52. Nov: 73.3. Dec: 65.3 */}
              <path
                d="M 20,137.3 L 128,126.7 L 236,100 L 344,116 L 452,62.7 L 560,52 L 668,73.3 L 776,65.3 L 776,180 L 20,180 Z"
                fill="url(#weighted-gradient)"
              />
              <path
                d="M 20,137.3 L 128,126.7 L 236,100 L 344,116 L 452,62.7 L 560,52 L 668,73.3 L 776,65.3"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* TODAY Indicator Line at month of March (X=236) */}
              <line x1="236" y1="10" x2="236" y2="180" stroke="#0F172A" strokeWidth="2" />
              <circle cx="236" cy="100" r="4" fill="#0F172A" />
              <text x="236" y="5" fill="#0F172A" fontSize="9" fontWeight="bold" textAnchor="middle">
                TODAY
              </text>
            </svg>

            {/* X Axis labels */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-bold text-muted px-2.5 select-none">
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

            {/* Horizontal Stacked Bar Chart */}
            <div className="flex flex-col gap-4 mt-2">
              {bottlenecks.map((b) => {
                const total = b.qualifDays + b.propDays + b.negoDays + b.gagneDays;
                // Calculate percentage widths for horizontal segments
                const qualifPct = (b.qualifDays / 60) * 100;
                const propPct = (b.propDays / 60) * 100;
                const negoPct = (b.negoDays / 60) * 100;
                const gagnePct = (b.gagneDays / 60) * 100;

                return (
                  <div key={b.stageName} className="flex items-center select-none">
                    <span className="w-16 text-[10px] font-bold text-body shrink-0">{b.stageName}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden flex bg-canvas shadow-inner border border-border/40">
                      {b.qualifDays > 0 && <div className="bg-[#1E3A8A]" style={{ width: `${qualifPct}%` }} title={`Qualif: ${b.qualifDays}j`} />}
                      {b.propDays > 0 && <div className="bg-[#EA580C]" style={{ width: `${propPct}%` }} title={`Proposition: ${b.propDays}j`} />}
                      {b.negoDays > 0 && <div className="bg-[#64748B]" style={{ width: `${negoPct}%` }} title={`Nego: ${b.negoDays}j`} />}
                      {b.gagneDays > 0 && <div className="bg-[#16A34A]" style={{ width: `${gagnePct}%` }} title={`Gagne: ${b.gagneDays}j`} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Graph X Ruler Axis */}
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

      {/* Bottom Section: Audit Qualité de Propositions */}
      <SurfaceCard className="p-5 flex flex-col justify-between border border-border/80 shadow-sm">
        <div>
          <div className="pb-3 border-b border-border/40 mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
              Audit Qualité de Propositions
            </h2>
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
              >
                <option value="all">Filter tilts</option>
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
                  <th className="py-2">Opportunités</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Fin Mission</th>
                  <th className="py-2">Value</th>
                  <th className="py-2"></th>
                  <th className="py-2"></th>
                  <th className="py-2 text-right">Proposal Quality Score (IA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {auditList.map((item) => {
                  const initials = item.consultantName.split(" ").map((n) => n[0]).join("");
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
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
                      <td className="py-2.5">
                        <span className="bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded text-[9px] font-bold select-none border border-[#C8E6C9]">
                          {item.tags[0]}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold select-none border border-border">
                          {item.tags[1]}
                        </span>
                      </td>
                      <td className="py-2.5 text-right flex items-center justify-end gap-3 select-none">
                        {/* Custom visual progress bar */}
                        <div className="w-36 h-2 bg-slate-100 border border-border/60 rounded-full overflow-hidden shrink-0 shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              item.qualityScore >= 90
                                ? "bg-emerald-500"
                                : item.qualityScore >= 80
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${item.qualityScore}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold text-[10px] text-white tracking-tight shrink-0 shadow-sm",
                            item.qualityScore >= 90
                              ? "bg-[#10B981]"
                              : item.qualityScore >= 80
                              ? "bg-amber-500"
                              : "bg-red-500"
                          )}
                        >
                          {item.qualityScore}%
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
          Moteur d&apos;audit de qualité actif. L&apos;analyse est déclenchée automatiquement à chaque révision de proposition.
        </div>
      </SurfaceCard>

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
              <p className="text-xs text-body leading-relaxed whitespace-pre-line">{activeModal.content}</p>

              {activeModal.type === "audit" && activeModal.score && (
                <div className="flex items-center gap-3 bg-canvas/60 border border-border/80 rounded-xl p-4 shadow-inner select-none">
                  <div className="w-12 h-12 rounded-full border border-border bg-surface flex items-center justify-center font-black text-xs text-primary shadow">
                    {activeModal.score}%
                  </div>
                  <div className="leading-tight text-[11px] text-body">
                    <span className="font-extrabold text-heading">Evaluation Qualité Validée</span>
                    <p className="text-muted mt-0.5">Le document répond aux exigences et a été certifié par le robot d&apos;audit n8n.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border/30 pt-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
