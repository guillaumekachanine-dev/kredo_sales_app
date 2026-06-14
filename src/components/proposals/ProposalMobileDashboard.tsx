"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { ProposalDashboardData } from "@/lib/proposals/proposals-data"

export function ProposalMobileDashboard({ data }: { data: ProposalDashboardData }) {
  const { kpis } = data

  const carouselRef = useRef<HTMLDivElement>(null)

  // Active bottom sheet drawer state
  const [activeSheet, setActiveSheet] = useState<{
    type: "intervenir" | "contacter"
    title: string
    description: string
    primaryBtn: string
    targetId: string
  } | null>(null)

  // Interactive local states for mobile alerts
  const [criticalAlert, setCriticalAlert] = useState<{
    id: string
    client: string
    details: string
    scoreLabel: string
  } | null>({
    id: "crit-1",
    client: "Opportunity B",
    details: "Client/Opportunity B",
    scoreLabel: "IA Quality Score: Low",
  })

  const [imminentWin, setImminentWin] = useState<{
    id: string
    mission: string
    scoreLabel: string
  } | null>({
    id: "win-1",
    mission: "Mission RAG Next.js",
    scoreLabel: "IA Quality Score: High",
  })

  // Handle action click
  const handleActionClick = (type: "intervenir" | "contacter") => {
    if (type === "intervenir" && criticalAlert) {
      setActiveSheet({
        type: "intervenir",
        title: `Intervenir : ${criticalAlert.client}`,
        description: `La proposition commerciale pour ${criticalAlert.client} présente un score de qualité faible (inférieur à 50%). Le robot n8n a identifié un manque de précisions sur le chiffrage de charge. Souhaitez-vous planifier une révision interne ?`,
        primaryBtn: "Planifier Révision",
        targetId: criticalAlert.id,
      })
    } else if (type === "contacter" && imminentWin) {
      setActiveSheet({
        type: "contacter",
        title: `Contacter Client : ${imminentWin.mission}`,
        description: `La proposition commerciale pour ${imminentWin.mission} a été validée avec un score de qualité IA de 95%. Nous suggérons de contacter le client immédiatement pour finaliser la signature de l'accord.`,
        primaryBtn: "Notifier Client",
        targetId: imminentWin.id,
      })
    }
  }

  // Confirm sheet action
  const confirmSheetAction = (type: "intervenir" | "contacter") => {
    if (type === "intervenir") {
      setCriticalAlert(null)
    } else {
      setImminentWin(null)
    }
    setActiveSheet(null)
  }

  return (
    <div className="flex flex-col gap-6 bg-canvas px-4 py-5 pb-24 select-none relative min-h-screen">
      {/* Mobile Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <h1 className="text-lg font-extrabold font-heading text-heading tracking-tight">
          Proposal Intelligence
        </h1>

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

          {/* User GK Initials Avatar */}
          <div className="w-7 h-7 rounded-full bg-primary border border-border flex items-center justify-center font-extrabold text-[10px] text-white">
            GK
          </div>
        </div>
      </header>

      {/* Line Chart Widget: weighted_pipe_sparkline */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          weighted_pipe_sparkline
        </h2>

        {/* Compact Mobile Graph */}
        <div className="relative w-full h-[140px]">
          <svg className="w-full h-[115px] pl-2 pr-2" viewBox="0 0 320 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="m-weighted-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid line guidelines */}
            <line x1="10" y1="20" x2="310" y2="20" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="50" x2="310" y2="50" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="80" x2="310" y2="80" stroke="#F1F5F9" strokeWidth="1" />
            <line x1="10" y1="110" x2="310" y2="110" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Mobile Weighted Graph Area */}
            <path
              d="M 10,80 L 50,75 L 90,60 L 130,70 L 170,55 L 210,35 L 250,45 L 290,40 L 310,30 L 310,110 L 10,110 Z"
              fill="url(#m-weighted-grad)"
            />
            <path
              d="M 10,80 L 50,75 L 90,60 L 130,70 L 170,55 L 210,35 L 250,45 L 290,40 L 310,30"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
            />

            {/* Today indicator line */}
            <line x1="90" y1="10" x2="90" y2="110" stroke="#0F172A" strokeWidth="1.5" />
            <text x="90" y="5" fill="#0F172A" fontSize="7" fontWeight="bold" textAnchor="middle">
              TODAY
            </text>
          </svg>

          {/* Month labels underneath graph */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[8px] font-bold text-muted px-2.5">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jun</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Critical Risk alert Card */}
      {criticalAlert && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Opportunité à Risque Critique
          </h2>

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-2.5 min-w-0">
              {/* Colorful logo mockup */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow">
                C
              </div>

              <div className="min-w-0 flex-1 leading-tight">
                <h4 className="text-xs font-bold text-heading truncate">{criticalAlert.client}</h4>
                <p className="text-[10px] text-body mt-0.5">{criticalAlert.details}</p>
              </div>
            </div>

            <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-[8px] font-extrabold whitespace-nowrap">
              {criticalAlert.scoreLabel}
            </span>
          </div>

          {/* Touch target height >= 44px button */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 bg-canvas select-none">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={() => handleActionClick("intervenir")}
              className="flex-1 h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Intervenir
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Imminent Win alert Card */}
      {imminentWin && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Victoire Imminente
          </h2>

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0 leading-tight">
              <h4 className="text-xs font-extrabold text-heading truncate">{imminentWin.mission}</h4>
              <p className="text-[10px] text-body mt-0.5">Proposition prête pour signature client</p>
            </div>

            <span className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] px-2 py-0.5 rounded text-[8px] font-extrabold whitespace-nowrap">
              {imminentWin.scoreLabel}
            </span>
          </div>

          {/* Touch target height >= 44px button */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 bg-canvas select-none">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={() => handleActionClick("contacter")}
              className="flex-1 h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Contacter Client
            </button>
          </div>
        </SurfaceCard>
      )}

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
                onClick={() => confirmSheetAction(activeSheet.type)}
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
