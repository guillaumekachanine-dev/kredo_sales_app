"use client"

import { useState } from "react"
import { Candidate } from "./RecruitmentDesktopDashboard"

interface RecruitmentMobileDashboardProps {
  candidates: Candidate[]
  onSelectCandidate: (candidate: Candidate) => void
}

export function RecruitmentMobileDashboard({
  candidates,
  onSelectCandidate,
}: RecruitmentMobileDashboardProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Carousel metrics
  const activeCandidates = candidates.filter((c) => c.stage !== "embauche")
  const kpis = [
    { label: "Candidats Actifs", value: activeCandidates.length },
    { label: "TTH Moyen", value: "22 jours" },
    { label: "Offres Acceptées", value: "85%" },
    { label: "CPA Moyen", value: "2.1K€" },
  ]

  const nextKpi = () => {
    setCarouselIndex((prev) => (prev + 1) % kpis.length)
  }

  // Candidates prioritized for mobile view (typically high AI scores or active)
  const prioritizedCandidates = candidates
    .filter((c) => c.stage !== "embauche")
    .sort((a, b) => b.aiMatch - a.aiMatch)
    .slice(0, 3)

  // Mock interviews agenda matching mockup
  const interviews = [
    {
      id: "int-1",
      name: "Candidat A",
      time: "10:30",
      type: "Entretien Tech",
      practice: "Digital",
    },
    {
      id: "int-2",
      name: "Candidat B",
      time: "14:15",
      type: "Entretien RH",
      practice: "AI / RAG",
    },
    {
      id: "int-3",
      name: "Candidat C",
      time: "16:00",
      type: "Qualification",
      practice: "Cloud",
    },
  ]

  return (
    <div className="w-full px-4 py-4 flex flex-col gap-5 bg-canvas select-none">
      {/* Mobile Title */}
      <div>
        <h1 className="text-xl font-bold font-heading text-heading">
          Recrutement
        </h1>
      </div>

      {/* KPI Carousel */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 flex gap-3 overflow-hidden">
          {/* Active Card */}
          <div className="flex-1 bg-surface border border-border/70 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              {kpis[carouselIndex].label}
            </span>
            <span className="text-2xl font-bold text-heading mt-1">
              {kpis[carouselIndex].value}
            </span>
          </div>

          {/* Next Card */}
          <div className="w-1/3 bg-surface border border-border/70 rounded-xl p-4 shadow-sm opacity-50 flex flex-col justify-between truncate">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider truncate">
              {kpis[(carouselIndex + 1) % kpis.length].label}
            </span>
            <span className="text-lg font-bold text-heading mt-1 truncate">
              {kpis[(carouselIndex + 1) % kpis.length].value}
            </span>
          </div>
        </div>

        {/* Carousel button */}
        <button
          onClick={nextKpi}
          className="w-10 h-10 rounded-full border border-border bg-surface flex items-center justify-center shadow-sm text-primary active:scale-95 transition-all shrink-0"
          aria-label="KPI suivant"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Candidats Prioritaires Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Candidats Prioritaires
        </h2>

        <div className="flex flex-col gap-3">
          {prioritizedCandidates.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCandidate(c)}
              className="bg-surface border border-border/70 rounded-xl p-4 shadow-sm flex flex-col gap-3 cursor-pointer hover:bg-surface-hover/30 active:scale-[0.99] transition-all"
            >
              {/* Avatar + name details */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center font-bold text-xs text-heading">
                    {c.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-heading truncate">{c.name}</h3>
                    <p className="text-[10px] text-body truncate mt-0.5">{c.practice} &middot; {c.experience}</p>
                  </div>
                </div>

                {/* AI Match badge */}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] shrink-0">
                  AI Match: {c.aiMatch}%
                </span>
              </div>

              {/* Touch Target CTA (Min 44px height) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = `mailto:${c.email}?subject=Kredo - Suivi de votre candidature`
                }}
                className="w-full h-11 min-h-[44px] rounded-lg border border-border bg-surface text-body hover:bg-surface-hover hover:text-primary hover:border-primary/50 text-xs font-bold flex items-center justify-center transition-all select-none active:scale-95 cursor-pointer"
              >
                Contacter
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Entretiens Aujourd'hui Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Entretiens Aujourd&apos;hui
        </h2>

        <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="text-muted font-bold border-b border-border/40 select-none">
                  <th className="py-2 pb-2">Nom</th>
                  <th className="py-2 pb-2">Heure</th>
                  <th className="py-2 pb-2">Type</th>
                  <th className="py-2 pb-2">Practice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {interviews.map((int) => {
                  // Link row clicks to the drawer context
                  const cInfo = candidates.find((c) => c.name.toLowerCase().includes(int.name.toLowerCase())) || candidates[0]
                  return (
                    <tr
                      key={int.id}
                      onClick={() => onSelectCandidate(cInfo)}
                      className="hover:bg-canvas/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 font-bold text-heading">{int.name}</td>
                      <td className="py-2.5 text-body font-semibold">{int.time}</td>
                      <td className="py-2.5 text-body">{int.type}</td>
                      <td className="py-2.5 text-muted font-medium">{int.practice}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
