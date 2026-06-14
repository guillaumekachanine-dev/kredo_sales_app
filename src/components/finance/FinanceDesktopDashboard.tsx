"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { FinanceDashboardData, BillingAnomaly, LateBilling } from "@/lib/finance/finance-data"

export function FinanceDesktopDashboard({ data }: { data: FinanceDashboardData }) {
  const { kpis, monthlyPL, anomalies } = data

  // Active interactive modal state
  const [activeModal, setActiveModal] = useState<{
    type: "dunning" | "bench" | "workflow" | "sync"
    title: string
    content: string
    targetName?: string
    targetDetails?: string
  } | null>(null)

  // Interactive local states for late billings list and sync triggers
  const [billingList, setBillingList] = useState<LateBilling[]>(data.lateBillings)
  const [anomalyList, setAnomalyList] = useState<BillingAnomaly[]>(anomalies)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSort, setSelectedSort] = useState<string>("all")

  // Handle action click
  const handleActionClick = (item: any, type: "dunning" | "bench" | "workflow") => {
    if (type === "dunning") {
      setActiveModal({
        type: "dunning",
        title: `Relance Auto-Dunning (n8n) : ${item.clientName}`,
        content: `Préparez l'envoi du message de relance n8n pour le bon de commande N° ${item.bcNumber}. Jours de retard : ${item.delayDays} jours. Valeur en attente : ${item.valueAmount}. Le workflow générera un email personnalisé et notifiera l'équipe finance sur Teams.`,
        targetName: item.id,
        targetDetails: item.clientName,
      })
    } else if (type === "bench") {
      setActiveModal({
        type: "bench",
        title: `Arbitrage Facturation & Bench : ${item.consultantName}`,
        content: `Le consultant ${item.consultantName} est affecté à un TJM de ${item.tjm} mais présente une incohérence de temps déclarée de 12h entre l'activité et le plan de charge Supabase. Souhaitez-vous régulariser les comptes ?`,
        targetName: item.id,
        targetDetails: item.consultantName,
      })
    } else {
      setActiveModal({
        type: "workflow",
        title: `Optimisation Sémantique de Matching : ${item.consultantName}`,
        content: `Exécuter le workflow de rapprochement des compétences pour augmenter la facturabilité de ${item.consultantName} (Taux d'adéquation actuel inférieur à 10%). Le modèle pgvector proposera les 3 meilleures missions en cours.`,
        targetName: item.id,
        targetDetails: item.consultantName,
      })
    }
  }

  // Confirm and execute action
  const confirmAction = (modalType: string, targetId?: string) => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      if (modalType === "dunning") {
        setBillingList((prev) => prev.filter((b) => b.id !== targetId))
      } else if (modalType === "bench" || modalType === "workflow") {
        setAnomalyList((prev) => prev.filter((a) => a.id !== targetId))
      }
      setActiveModal({
        type: "sync",
        title: "Action Complétée",
        content: "Le workflow automatisé n8n a été déclenché et les données du dashboard financier ont été actualisées.",
      })
    }, 1000)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-6 select-none relative">
      {/* Title Bar / Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Synthèse Financière - Décisionnel
          </h1>
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
                <span className="text-3xl font-bold text-heading">{kpi.value}</span>
                {kpi.trendBadge && (
                  <span className="inline-flex items-center text-[10px] font-bold text-[#2C7D5C] bg-[#E8F5E9] px-1.5 py-0.5 rounded shadow-sm">
                    {kpi.trendBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Sparkline overlay */}
            {kpi.hasSparkline && (
              <div className="absolute bottom-2 right-4 w-16 h-10">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <defs>
                    <linearGradient id={`kpi-grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={kpi.id === "f-marge-brute" ? "#E53E3E" : "#2C7D5C"} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={kpi.id === "f-marge-brute" ? "#E53E3E" : "#2C7D5C"} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={
                      kpi.id === "f-marge-brute"
                        ? "M0,25 Q15,30 30,28 T60,35 T80,32 T100,20"
                        : "M0,35 Q15,30 30,32 T60,20 T80,15 T100,5"
                    }
                    fill="none"
                    stroke={kpi.id === "f-marge-brute" ? "#E53E3E" : "#2C7D5C"}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d={
                      kpi.id === "f-marge-brute"
                        ? "M0,25 Q15,30 30,28 T60,35 T80,32 T100,20 L100,40 L0,40 Z"
                        : "M0,35 Q15,30 30,32 T60,20 T80,15 T100,5 L100,40 L0,40 Z"
                    }
                    fill={`url(#kpi-grad-${kpi.id})`}
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart: P&L Opérationnel - Analyse Mensuelle */}
      <SurfaceCard className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            P&L Opérationnel - Analyse Mensuelle
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

        {/* Custom SVG Grouped Stacked Column Chart */}
        <div className="relative w-full h-[220px]">
          {/* Legend indicator */}
          <div className="flex items-center gap-4 mb-3 text-[10px] font-bold text-body">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#334155]" />
              <span>CA Realized</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#10B981]" />
              <span>Marge Brute</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#EF4444]" />
              <span>Bench Cost [101]</span>
            </div>
          </div>

          <svg className="w-full h-[180px]" viewBox="0 0 800 200" preserveAspectRatio="none">
            {/* Grid horizontal guidelines */}
            <line x1="40" y1="20" x2="780" y2="20" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="40" y1="60" x2="780" y2="60" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="40" y1="100" x2="780" y2="100" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="40" y1="140" x2="780" y2="140" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="40" y1="180" x2="780" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Left Axis labels */}
            <g fontSize="9" fill="#94A3B8" fontWeight="bold">
              <text x="30" y="24" textAnchor="end">2500</text>
              <text x="30" y="64" textAnchor="end">2000</text>
              <text x="30" y="104" textAnchor="end">1500</text>
              <text x="30" y="144" textAnchor="end">1000</text>
              <text x="30" y="184" textAnchor="end">0</text>
            </g>

            {/* Group 1: Jan 2026 (X=100) */}
            {/* CA Realized (slate): val=1900 -> Y=58.4, H=121.6 */}
            <rect x="100" y="58.4" width="28" height="121.6" fill="#334155" rx="3" />
            {/* Stacked (Marge + Bench): Bench (red) val=250 -> Y=164, H=16. Marge (green) val=1400 -> Y=74.4, H=89.6 */}
            <rect x="132" y="164" width="28" height="16" fill="#EF4444" rx="1" />
            <rect x="132" y="74.4" width="28" height="89.6" fill="#10B981" rx="3" />

            {/* Group 2: Fev (X=240) */}
            {/* CA: val=1950 -> Y=55.2, H=124.8 */}
            <rect x="240" y="55.2" width="28" height="124.8" fill="#334155" rx="3" />
            {/* Stacked: Bench val=250 -> Y=164, H=16. Marge val=1450 -> Y=71.2, H=92.8 */}
            <rect x="272" y="164" width="28" height="16" fill="#EF4444" rx="1" />
            <rect x="272" y="71.2" width="28" height="92.8" fill="#10B981" rx="3" />

            {/* Group 3: Mar (X=380) */}
            {/* CA: val=2050 -> Y=48.8, H=131.2 */}
            <rect x="380" y="48.8" width="28" height="131.2" fill="#334155" rx="3" />
            {/* Stacked: Bench val=250 -> Y=164, H=16. Marge val=1350 -> Y=77.6, H=86.4 */}
            <rect x="412" y="164" width="28" height="16" fill="#EF4444" rx="1" />
            <rect x="412" y="77.6" width="28" height="86.4" fill="#10B981" rx="3" />

            {/* Group 4: Abr (X=520) */}
            {/* CA: val=2100 -> Y=45.6, H=134.4 */}
            <rect x="520" y="45.6" width="28" height="134.4" fill="#334155" rx="3" />
            {/* Stacked: Bench val=250 -> Y=164, H=16. Marge val=1500 -> Y=68, H=96 */}
            <rect x="552" y="164" width="28" height="16" fill="#EF4444" rx="1" />
            <rect x="552" y="68" width="28" height="96" fill="#10B981" rx="3" />

            {/* Group 5: May (X=660) */}
            {/* CA: val=2200 -> Y=39.2, H=140.8 */}
            <rect x="660" y="39.2" width="28" height="140.8" fill="#334155" rx="3" />
            {/* Stacked: Bench val=250 -> Y=164, H=16. Marge val=1550 -> Y=64.8, H=99.2 */}
            <rect x="692" y="164" width="28" height="16" fill="#EF4444" rx="1" />
            <rect x="692" y="64.8" width="28" height="99.2" fill="#10B981" rx="3" />
          </svg>

          {/* X Axis Month Labels */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-bold text-muted pl-24 pr-24 select-none">
            <span>Jan 2026</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>May</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Bottom section layout */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* LeftBottom Card: Anomalies Facturation & Bench (col-span-6) */}
        <SurfaceCard className="col-span-6 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Anomalies Facturation & Bench (n8n Sémantique)
              </h2>
              <span className="text-[10px] text-muted">Semantic audit by n8n</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/20 select-none">
                    <th className="py-2">Consultant</th>
                    <th className="py-2 text-center">TJM</th>
                    <th className="py-2">Anomalie Sémantique</th>
                    <th className="py-2 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {anomalyList.map((a) => {
                    const initials = a.consultantName.split(" ").map((n) => n[0]).join("");
                    return (
                      <tr key={a.id} className="hover:bg-canvas/30 transition-colors">
                        <td className="py-2.5 font-bold text-heading flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[9px] text-body select-none">
                            {initials}
                          </div>
                          <span>{a.consultantName}</span>
                        </td>
                        <td className="py-2.5 text-center font-semibold text-body">{a.tjm}</td>
                        <td className="py-2.5 text-muted font-medium flex items-center gap-1.5 flex-wrap">
                          <span>{a.anomalyText}</span>
                          {a.badgeText && (
                            <span className="bg-red-50 text-red-600 border border-red-100 px-1 py-0.2 rounded font-bold text-[8px]">
                              {a.badgeText}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleActionClick(a, a.actionLabel === "Gérer Bench" ? "bench" : "workflow")}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded border transition-colors",
                              a.actionLabel === "Gérer Bench"
                                ? "bg-primary text-white border-primary hover:bg-primary-hover"
                                : "bg-surface text-body border-border hover:bg-surface-hover"
                            )}
                          >
                            {a.actionLabel}
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
            Moteur de détection sémantique actif sur logs et comptes.
          </div>
        </SurfaceCard>

        {/* RightBottom Card: Facturation en Retard (col-span-6) */}
        <SurfaceCard className="col-span-6 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Facturation en Retard (n8n Relance Auto.)
              </h2>
              <span className="text-[10px] text-muted">Cash flow automation by n8n</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/20 select-none">
                    <th className="py-2">Client</th>
                    <th className="py-2">BC N°</th>
                    <th className="py-2 text-center">Jours de Retard</th>
                    <th className="py-2">Valeur</th>
                    <th className="py-2 text-right">Relance n8n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {billingList.map((bill) => (
                    <tr key={bill.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-2.5 font-bold text-heading flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-black text-white font-black text-[9px] flex items-center justify-center select-none">
                          {bill.logoLetter}
                        </div>
                        <span>{bill.clientName}</span>
                      </td>
                      <td className="py-2.5 text-body">{bill.bcNumber}</td>
                      <td className="py-2.5 text-center">
                        <span className="bg-[#FFE0B2] text-[#E65100] px-2 py-0.5 rounded-full text-[9px] font-bold inline-block">
                          {bill.delayDays}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold text-heading font-mono">{bill.valueAmount}</td>
                      <td className="py-2.5 text-right select-none">
                        <button
                          onClick={() => handleActionClick(bill, "dunning")}
                          className="bg-emerald-50 text-emerald-700 hover:bg-[#C8E6C9] hover:text-[#2E7D32] border border-emerald-100 font-bold px-2.5 py-1 rounded transition-colors text-[10px]"
                        >
                          {bill.actionLabel}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/20 text-[10px] text-muted select-none">
            Campagnes dunning déclenchées automatiquement à 30/60/90j.
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

              {activeModal.type === "dunning" && (
                <div className="bg-canvas/50 border border-border/60 rounded-lg p-3 text-[10px] text-muted space-y-1 font-mono">
                  <div>• Sender: n8n Dunning Robot</div>
                  <div>• Recipient: Finance Dept ({activeModal.targetDetails})</div>
                  <div>• Template: Auto_Late_Payment_D120_FR</div>
                </div>
              )}
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
              {activeModal.type === "dunning" && (
                <button
                  type="button"
                  onClick={() => confirmAction("dunning", activeModal.targetName)}
                  className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white shadow transition-colors flex items-center gap-1.5"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Traitement..." : "Lancer Relance"}
                </button>
              )}
              {activeModal.type === "bench" && (
                <button
                  type="button"
                  onClick={() => confirmAction("bench", activeModal.targetName)}
                  className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Ajustement..." : "Régulariser"}
                </button>
              )}
              {activeModal.type === "workflow" && (
                <button
                  type="button"
                  onClick={() => confirmAction("workflow", activeModal.targetName)}
                  className="text-xs font-bold px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-white shadow transition-colors"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Recherche..." : "Exécuter Match"}
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
