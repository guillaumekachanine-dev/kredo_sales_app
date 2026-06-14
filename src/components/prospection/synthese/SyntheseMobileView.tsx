"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SyntheseData } from "@/lib/prospection/synthese-data"

export function SyntheseMobileView({ data }: { data: SyntheseData }) {
  const { pipeline } = data

  const carouselRef = useRef<HTMLDivElement>(null)

  // Interactive sheet states
  const [activeSheet, setActiveSheet] = useState<{
    title: string
    description: string
    primaryBtn: string
    actionId: string
  } | null>(null)

  // List of active priority actions
  const [priorityActions, setPriorityActions] = useState([
    {
      id: "pa-1",
      title: "Alerte Matching Urgent :",
      description: "Consultant X matche à l'opportunité de haut niveau détectée pour [cite: Role Y]",
      company: "Consultant X",
      btnText: "Contacter/Qualifier",
    },
    {
      id: "pa-2",
      title: "Nouveau Signal de Scraping :",
      description: "L'Oréal recrute un profil tech Lead Dev Next.js / pgvector",
      company: "L'Oréal",
      btnText: "Créer Opportunité",
    },
    {
      id: "pa-3",
      title: "Alerte Valeur :",
      description: "Opportunité de haut niveau détectée chez AXA Group",
      company: "AXA Group",
      btnText: "Détails",
    },
  ])

  // Custom euro Millions formatting
  const formatEuroM = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `€${Math.round(value / 1000)}k`
    }
    return `€${value}`
  }

  // Handle action click
  const handleActionClick = (actionId: string, title: string, company: string, btnText: string) => {
    let description = ""
    let primaryBtn = btnText

    if (btnText === "Contacter/Qualifier") {
      description = `Lancer la séquence de contact téléphonique ou d'emailing automatisée n8n pour positionner ${company}.`
    } else if (btnText === "Créer Opportunité") {
      description = `Créer une nouvelle opportunité "Détection" qualifiée dans le pipeline pour ${company}.`
    } else {
      description = `Détails sur l'opportunité d'AXA Group : budget estimé à 120k€, démarrage prévu le mois prochain.`
    }

    setActiveSheet({
      title: `${title} ${company}`,
      description,
      primaryBtn,
      actionId,
    })
  }

  // Confirm sheet action and remove from list
  const confirmSheetAction = (actionId: string) => {
    setPriorityActions((prev) => prev.filter((a) => a.id !== actionId))
    setActiveSheet(null)
  }

  // Scroll carousel helper
  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 160, behavior: "smooth" })
    }
  }

  return (
    <div className="flex flex-col gap-6 bg-canvas px-4 py-5 pb-24 select-none relative min-h-screen">
      
      {/* Mobile Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <h1 className="text-lg font-extrabold font-heading text-heading tracking-tight">
          Prospection Intel.
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

          {/* User GK initials avatar */}
          <div className="w-7 h-7 rounded-full bg-primary border border-border flex items-center justify-center font-extrabold text-[10px] text-white">
            GK
          </div>
        </div>
      </header>

      {/* Horizontal KPI Carousel Strip */}
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {/* Card 1: Nouveaux Leads */}
          <div className="w-36 shrink-0 bg-surface border border-border/80 shadow-sm rounded-xl p-3.5 snap-start">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Nouveaux Leads
            </span>
            <span className="text-xl font-bold text-heading mt-2 block leading-none">
              12 leads
            </span>
          </div>

          {/* Card 2: Pipe Potentiel */}
          <div className="w-36 shrink-0 bg-surface border border-border/80 shadow-sm rounded-xl p-3.5 snap-start">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Pipe Potentiel
            </span>
            <span className="text-xl font-bold text-heading mt-2 block leading-none">
              {formatEuroM(pipeline.totalWeighted)}
            </span>
          </div>

          {/* Card 3: Taux Conv */}
          <div className="w-36 shrink-0 bg-surface border border-border/80 shadow-sm rounded-xl p-3.5 snap-start">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Taux Conv.
            </span>
            <span className="text-xl font-bold text-heading mt-2 block leading-none">
              75%
            </span>
          </div>

          {/* Card 4: Vélocité */}
          <div className="w-36 shrink-0 bg-surface border border-border/80 shadow-sm rounded-xl p-3.5 snap-start">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Vélocité Moy.
            </span>
            <span className="text-xl font-bold text-heading mt-2 block leading-none">
              22 jours
            </span>
          </div>
        </div>

        {/* Carousel indicator button */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-7 h-7 bg-surface/90 border border-border rounded-full flex items-center justify-center shadow-md text-body focus:outline-none hover:bg-surface transition-colors"
          title="Faire défiler"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Aperçu du Pipeline (Early Stage) Funnel Widget */}
      <SurfaceCard className="p-4 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Aperçu du Pipeline (Early Stage)
        </h2>

        {/* Custom SVG Funnel Graphic */}
        <div className="flex items-center justify-between py-2">
          {/* Left Labels Column */}
          <div className="flex flex-col justify-between h-28 text-[10px] font-bold text-body select-none">
            <span className="leading-none py-1">Prospecting</span>
            <span className="leading-none py-1">Qualified Lead</span>
            <span className="leading-none py-1">Proposition</span>
          </div>

          {/* Center SVG Funnel */}
          <div className="w-24 h-28 flex items-center justify-center">
            <svg width="90" height="110" viewBox="0 0 100 110">
              {/* Layer 1: Prospecting (Dark Blue) */}
              <polygon points="5,5 95,5 80,35 20,35" fill="#1E3A8A" opacity="0.95" />
              
              {/* Layer 2: Qualified Lead (Orange) */}
              <polygon points="21,39 79,39 68,69 32,69" fill="#EA580C" opacity="0.95" />
              
              {/* Layer 3: Proposition (Green) */}
              <polygon points="33,73 67,73 55,103 45,103" fill="#16A34A" opacity="0.95" />
            </svg>
          </div>

          {/* Right Metrics Column */}
          <div className="flex flex-col justify-between h-28 text-[10px] font-bold text-heading text-right font-mono select-none">
            <span className="leading-none py-1">{formatEuroM(pipeline.totalWeighted)}</span>
            <span className="leading-none py-1">{formatEuroM(pipeline.totalWeighted)}</span>
            <span className="leading-none py-1 text-muted text-[9px] font-medium leading-tight">1 jours<br />14ps</span>
          </div>
        </div>
      </SurfaceCard>

      {/* Actions Prioritaires (n8n) Widget */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Actions Prioritaires (n8n)
        </h2>

        <div className="flex flex-col gap-3">
          {priorityActions.map((action) => (
            <SurfaceCard key={action.id} className="p-4 flex flex-col justify-between border border-border/70 hover:border-border transition-colors">
              <div className="text-xs leading-relaxed text-heading mb-3.5">
                <span className="font-extrabold text-[#BE3E3E] block mb-0.5">
                  {action.title}
                </span>
                <span className="text-body text-[11px]">
                  {action.description.split(/\[cite:? |\]/).map((part, index) => {
                    if (index % 2 === 1) {
                      return <span key={index} className="text-primary font-bold border-b border-primary/20">{part}</span>
                    }
                    return part
                  })}
                </span>
              </div>

              {/* Touch Target CTA Button (Height >= 44px for accessibility/mockup rule) */}
              <button
                type="button"
                onClick={() => handleActionClick(action.id, action.title, action.company, action.btnText)}
                className="w-full h-11 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center select-none"
              >
                {action.btnText}
              </button>
            </SurfaceCard>
          ))}
          {priorityActions.length === 0 && (
            <div className="py-8 border border-dashed border-border/80 rounded-xl text-center text-xs text-muted">
              Toutes les actions prioritaires ont été traitées !
            </div>
          )}
        </div>
      </div>

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
                onClick={() => confirmSheetAction(activeSheet.actionId)}
                className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center"
              >
                Confirmer : {activeSheet.primaryBtn}
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
