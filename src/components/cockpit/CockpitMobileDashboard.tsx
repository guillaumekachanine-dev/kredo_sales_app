"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { CockpitDashboardData } from "@/lib/cockpit/cockpit-data"

export function CockpitMobileDashboard({ data }: { data: CockpitDashboardData }) {
  // Active bottom sheet drawer state
  const [activeSheet, setActiveSheet] = useState<{
    type: "intervenir" | "revoir" | "details"
    title: string
    description: string
    primaryBtn: string
    targetId: string
  } | null>(null)

  // Interactive local states for mobile alerts
  const [staffingAlert, setStaffingAlert] = useState<boolean>(true)
  const [proposalAlert, setProposalAlert] = useState<boolean>(true)
  const [signAlert, setSignAlert] = useState<boolean>(true)

  // Handle CTA buttons
  const handleAlertClick = (type: "intervenir" | "revoir" | "details") => {
    if (type === "intervenir") {
      setActiveSheet({
        type: "intervenir",
        title: "Intervenir (Staffing Mismatch)",
        description: "Lancer le rapprochement sémantique pgvector pour résoudre les incohérences de planification sur la practice Cloud/DevOps.",
        primaryBtn: "Lancer Matching IA",
        targetId: "st-1",
      })
    } else if (type === "revoir") {
      setActiveSheet({
        type: "revoir",
        title: "Revoir Proposal (Score Rouge)",
        description: "Ouvrir l'assistant d'audit qualité IA pour optimiser la proposition commerciale de Consultant B chez Client A.",
        primaryBtn: "Corriger avec l'IA",
        targetId: "pr-1",
      })
    } else {
      setActiveSheet({
        type: "details",
        title: "Prochain Signataire Potentiel",
        description: "Visualiser les détails de l'opportunité AXA Group (Taux de conversion IA: 88%) et planifier l'appel client final.",
        primaryBtn: "Consulter Opportunité",
        targetId: "sig-1",
      })
    }
  }

  // Confirm sheet action
  const confirmSheetAction = (type: "intervenir" | "revoir" | "details") => {
    if (type === "intervenir") {
      setStaffingAlert(false)
    } else if (type === "revoir") {
      setProposalAlert(false)
    } else {
      setSignAlert(false)
    }
    setActiveSheet(null)
  }

  return (
    <div className="flex flex-col gap-6 bg-canvas px-4 py-5 pb-24 select-none relative min-h-screen">
      {/* Mobile Navigation Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu trigger */}
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

      {/* Page Title */}
      <h1 className="text-lg font-extrabold font-heading text-heading tracking-tight">
        KREDO Cockpit
      </h1>

      {/* Pipeline Santé Card (Gauge + line chart) */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Pipeline Santé
        </h2>

        <div className="flex items-center justify-between py-2 gap-4">
          {/* Left Side: Jauge */}
          <div className="flex flex-col items-center gap-1 shrink-0 select-none">
            <svg className="w-20 h-14" viewBox="0 0 60 40">
              <path d="M 10 32 A 20 20 0 0 1 50 32" fill="none" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
              <path
                d="M 10 32 A 20 20 0 0 1 50 32"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="62.8"
                strokeDashoffset="12.5" // Approx 80% full
              />
            </svg>
            <span className="text-[10px] font-extrabold text-heading">Jauge</span>
          </div>

          {/* Right Side: small area chart */}
          <div className="flex-1 h-14 relative select-none">
            <svg className="w-full h-full" viewBox="0 0 180 50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="m-health-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path
                d="M 10,40 L 45,35 L 80,25 L 115,20 L 150,15 L 170,18 L 170,50 L 10,50 Z"
                fill="url(#m-health-grad)"
              />
              <path
                d="M 10,40 L 45,35 L 80,25 L 115,20 L 150,15 L 170,18"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />
            </svg>
            {/* simplified X Axis labels */}
            <div className="flex justify-between text-[7px] font-bold text-muted px-1.5 mt-1 select-none">
              <span>Jan</span>
              <span>Fev</span>
              <span>Mar</span>
              <span>Oct</span>
              <span>Dec</span>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Attention: Staffing Mismatch alert Card */}
      {staffingAlert && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 text-[#BE3E3E] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <h4 className="text-xs font-bold text-heading">Attention: Staffing Mismatch</h4>
              <p className="text-[10px] text-[#BE3E3E] font-extrabold mt-0.5">(n8n Alert)</p>
            </div>
          </div>

          {/* Touch target height >= 44px button */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 bg-canvas select-none">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={() => handleAlertClick("intervenir")}
              className="flex-1 h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Intervenir (Contact &gt; 44px)
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Proposition IA Score Rouge alert Card */}
      {proposalAlert && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-[#BE3E3E] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <h4 className="text-xs font-bold text-heading">Proposition IA Score Rouge</h4>
              <p className="text-[10px] text-muted mt-0.5">La proposition commerciale Consultant B présente des incohérences.</p>
            </div>
          </div>

          {/* Touch target height >= 44px button */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 bg-canvas select-none">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={() => handleAlertClick("revoir")}
              className="flex-1 h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Revoir Proposal
            </button>
          </div>
        </SurfaceCard>
      )}

      {/* Prochain Signataire Potentiel alert Card */}
      {signAlert && (
        <SurfaceCard className="p-4 flex flex-col justify-between border border-border/70 select-none">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#10B981] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <h4 className="text-xs font-bold text-heading">Prochain Signataire Potentiel</h4>
              <p className="text-[10px] text-muted mt-0.5">AXA Group - Taux de signature imminent.</p>
            </div>
          </div>

          {/* Touch target height >= 44px button */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted w-12 text-center shrink-0 border border-border rounded py-0.5 bg-canvas select-none">
              &gt; 44px
            </span>
            <button
              type="button"
              onClick={() => handleAlertClick("details")}
              className="flex-1 h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
            >
              Voir Detail
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
