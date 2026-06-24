"use client"

import { useState } from "react"
import { Candidate } from "./dashboard/RecruitmentDesktopDashboard"
import { cn } from "@/lib/utils"

interface CandidateDetailDrawerProps {
  candidate: Candidate | null
  onClose: () => void
  onUpdateStage: (id: string, stage: Candidate["stage"]) => void
}

export function CandidateDetailDrawer({
  candidate,
  onClose,
  onUpdateStage,
}: CandidateDetailDrawerProps) {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    // Wait for slide animation to complete before clearing selection
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  if (!candidate) return null

  const isOpen = !isClosing

  const stages: { key: Candidate["stage"]; label: string }[] = [
    { key: "candidature", label: "Candidature" },
    { key: "tech", label: "Entretien Tech" },
    { key: "rh", label: "Entretien RH" },
    { key: "offre", label: "Offre" },
    { key: "embauche", label: "Embauché" },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 z-40",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col justify-between",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border/60 flex items-start justify-between select-none">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                Profil Recrutement
              </span>
              <span className="text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full">
                AI Match: {candidate.aiMatch}%
              </span>
            </div>
            <h2 className="text-base font-bold text-heading mt-1 leading-tight">
              {candidate.name}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-canvas text-body transition-colors focus:outline-none"
            title="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Context Card */}
          <div className="bg-canvas/40 border border-border/60 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider block select-none">Practice</span>
              <span className="text-xs font-bold text-heading mt-0.5 block">{candidate.practice}</span>
            </div>
            <div className="border-l border-border/40 pl-4">
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider block select-none">Expérience</span>
              <span className="text-xs font-bold text-heading mt-0.5 block">{candidate.experience}</span>
            </div>
            <div className="border-l border-border/40 pl-4">
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider block select-none">Cible</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={cn("w-4.5 h-4.5 rounded flex items-center justify-center font-bold text-[8px]", candidate.logoColor)}>
                  {candidate.logoLetter}
                </div>
                <span className="text-xs font-bold text-heading">{candidate.targetClient}</span>
              </div>
            </div>
          </div>

          {/* Quick Contact options */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`mailto:${candidate.email}?subject=Kredo Recruitment`}
              className="h-11 min-h-[44px] border border-border rounded-xl hover:bg-canvas/50 hover:text-primary flex items-center justify-center gap-2 text-xs font-bold text-body transition-all select-none"
            >
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
            <a
              href={`tel:${candidate.phone}`}
              className="h-11 min-h-[44px] border border-border rounded-xl hover:bg-canvas/50 hover:text-primary flex items-center justify-center gap-2 text-xs font-bold text-body transition-all select-none"
            >
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Téléphone
            </a>
          </div>

          {/* Pipeline Stage Updates */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block select-none">
              Modifier l&apos;Étape du Pipeline
            </span>
            <div className="flex flex-col gap-1.5 border border-border/60 rounded-xl p-3 bg-canvas/20">
              {stages.map((st) => {
                const isActive = candidate.stage === st.key
                return (
                  <button
                    key={st.key}
                    onClick={() => onUpdateStage(candidate.id, st.key)}
                    className={cn(
                      "w-full text-left py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-between",
                      isActive
                        ? "bg-primary text-primary-fg border-primary font-bold shadow-sm"
                        : "bg-surface hover:bg-canvas/40 text-heading border-border"
                    )}
                  >
                    <span>{st.label}</span>
                    {isActive && (
                      <svg className="w-4 h-4 text-primary-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* AI Match Reasons Summary */}
          <div className="space-y-2 select-none">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Synthèse IA & Matching
            </span>
            <div className="bg-blue-50/50 border border-blue-100/60 p-4 rounded-xl text-xs text-heading leading-relaxed font-medium">
              {candidate.summary}
            </div>
          </div>

          {/* Skills Badges */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block select-none">
              Compétences Clés
            </span>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg bg-canvas text-[10px] text-body font-bold border border-border/40"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-5 border-t border-border/60 bg-canvas/30 select-none">
          <p className="text-[9px] text-muted text-center leading-normal">
            Le changement d&apos;étape de recrutement synchronise automatiquement les rappels d&apos;entretien via n8n.
          </p>
        </div>
      </div>
    </>
  )
}
