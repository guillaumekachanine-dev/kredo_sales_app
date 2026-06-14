"use client"

import { useState } from "react"
import Link from "next/link"

export interface Candidate {
  id: string
  name: string
  practice: string
  experience: string
  aiMatch: number
  targetClient: string
  logoLetter: string
  logoColor: string
  stage: "candidature" | "tech" | "rh" | "offre" | "embauche"
  email: string
  phone: string
  skills: string[]
  summary: string
}

export interface StaffingNeed {
  id: string
  client: string
  role: string
  practice: string
  urgence: "Haute" | "Moyenne" | "Basse"
  suggestedCandidates: {
    name: string
    avatarInitials: string
    score: number
  }[]
}

interface RecruitmentDesktopDashboardProps {
  initialCandidates: Candidate[]
  staffingNeeds: StaffingNeed[]
  onSelectCandidate: (candidate: Candidate) => void
}

export function RecruitmentDesktopDashboard({
  initialCandidates,
  staffingNeeds,
  onSelectCandidate,
}: RecruitmentDesktopDashboardProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates)
  const [filterPractice, setFilterPractice] = useState("all")
  const [filterUrgence, setFilterUrgence] = useState("all")

  // AI Matching alerts mirroring mockup
  const alerts = [
    {
      id: "alert-1",
      consultant: "Candidat X",
      match: "96%",
      role: "Role Y",
      details: "including tiny pgvector",
    },
    {
      id: "alert-2",
      consultant: "Candidat Y",
      match: "95%",
      role: "Role Z",
      details: "pgvector semantic matching",
    },
    {
      id: "alert-3",
      consultant: "Candidat Z",
      match: "95%",
      role: "Role W",
      details: "including tiny pgvector",
    },
    {
      id: "alert-4",
      consultant: "Candidat W",
      match: "96%",
      role: "Role V",
      details: "pgvector semantic matching",
    },
    {
      id: "alert-5",
      consultant: "Candidat V",
      match: "95%",
      role: "Role U",
      details: "matching skills index",
    },
  ]

  // Move candidate card to a different stage
  const moveCandidate = (id: string, direction: "left" | "right") => {
    const stages: Candidate["stage"][] = ["candidature", "tech", "rh", "offre", "embauche"]
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const currentIdx = stages.indexOf(c.stage)
        let newIdx = currentIdx
        if (direction === "left" && currentIdx > 0) newIdx = currentIdx - 1
        if (direction === "right" && currentIdx < stages.length - 1) newIdx = currentIdx + 1
        return { ...c, stage: stages[newIdx] }
      })
    )
  }

  // --- Filtering Logic ---
  const filteredCandidates = candidates.filter((c) => {
    if (filterPractice !== "all" && c.practice !== filterPractice) return false
    return true
  })

  const filteredStaffing = staffingNeeds.filter((need) => {
    if (filterPractice !== "all" && need.practice !== filterPractice) return false
    if (filterUrgence !== "all") {
      if (filterUrgence === "high" && need.urgence !== "Haute") return false
      if (filterUrgence === "normal" && need.urgence !== "Moyenne") return false
    }
    return true
  })

  // Group candidates by pipeline column
  const getStageCandidates = (stage: Candidate["stage"]) => {
    return filteredCandidates.filter((c) => c.stage === stage)
  }

  // Count active candidates (non-hired stages)
  const activeCount = candidates.filter((c) => c.stage !== "embauche").length

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6 bg-canvas">
      {/* Title Bar / Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4 select-none">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Pilotage du Recrutement
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Practice selection filter */}
          <div className="relative">
            <select
              value={filterPractice}
              onChange={(e) => setFilterPractice(e.target.value)}
              className="text-xs border border-border bg-surface text-body rounded-lg py-1.5 px-3 pr-8 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
            >
              <option value="all">Toutes les practices</option>
              <option value="AI">AI / RAG</option>
              <option value="Cloud">Cloud / DevOps</option>
              <option value="Data">Data Engineering</option>
              <option value="Digital">Digital / Next.js</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body hover:bg-surface-hover transition-colors"
            title="Calendrier"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg border border-border bg-surface text-body hover:bg-surface-hover transition-colors relative"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border border-surface" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary border border-border flex items-center justify-center font-bold text-xs text-white">
              GK
            </div>
            <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* KPI 1: Candidats Actifs */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Candidats Actifs
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-heading">
              {activeCount}
            </span>
          </div>
        </div>

        {/* KPI 2: Taux d'Offres Acceptées */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none relative overflow-hidden">
          <div>
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Taux d&apos;Offres Acceptées
            </span>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold text-heading">85%</span>
              <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2C7D5C] text-[10px] font-bold px-1.5 py-0.5 rounded">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </div>
          </div>
          {/* Sparkline */}
          <div className="absolute bottom-2 right-4 w-16 h-10">
            <svg className="w-full h-full" viewBox="0 0 100 40">
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#sparkline-grad)"
              />
            </svg>
          </div>
        </div>

        {/* KPI 3: TTH Moyen */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
            TTH Moyen
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-heading">22 jours</span>
          </div>
        </div>

        {/* KPI 4: CPA Moyen */}
        <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between select-none">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
            CPA Moyen
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-heading">2.1K€</span>
          </div>
        </div>
      </div>

      {/* Kanban Board Row */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted select-none">
          Pipeline Candidats
        </h2>

        <div className="grid grid-cols-5 gap-3.5 items-stretch min-h-[360px]">
          {/* Column definitions mapping the mockup */}
          {[
            { key: "candidature", label: "Candidature", color: "border-t-[3px] border-t-primary" },
            { key: "tech", label: "Entretien Tech", color: "border-t-[3px] border-t-accent" },
            { key: "rh", label: "Entretien RH", color: "border-t-[3px] border-t-warning" },
            { key: "offre", label: "Offre", color: "border-t-[3px] border-t-[#9C27B0]" },
            { key: "embauche", label: "Embauché", color: "border-t-[3px] border-t-success" },
          ].map((col) => {
            const list = getStageCandidates(col.key as Candidate["stage"])
            return (
              <div
                key={col.key}
                className={`flex-1 bg-surface border border-border/80 rounded-xl p-3 flex flex-col gap-3 ${col.color}`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-border/30 select-none">
                  <span className="text-xs font-bold text-heading leading-none">
                    {col.label}
                  </span>
                  <span className="text-[10px] font-bold text-muted bg-canvas px-1.5 py-0.5 rounded-full">
                    {list.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[320px] pr-0.5">
                  {list.length === 0 ? (
                    <div className="flex-1 border border-dashed border-border/60 rounded-lg flex items-center justify-center text-[10px] text-muted py-8 select-none">
                      Vide
                    </div>
                  ) : (
                    list.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelectCandidate(c)}
                        className="bg-canvas/40 border border-border/70 hover:border-primary/60 hover:bg-surface transition-all rounded-xl p-3 flex flex-col gap-2 cursor-pointer relative group"
                      >
                        {/* Candidate Avatar + Target Client Logo */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-border flex items-center justify-center font-bold text-[9px] text-heading">
                              {c.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span className="text-muted text-[10px] font-semibold select-none">+</span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] ${c.logoColor} shrink-0 select-none`}>
                              {c.logoLetter}
                            </div>
                          </div>

                          {/* Quick movement controls */}
                          <div className="hidden group-hover:flex items-center gap-0.5 z-20">
                            {col.key !== "candidature" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveCandidate(c.id, "left")
                                }}
                                className="p-0.5 bg-surface border border-border rounded hover:bg-slate-100 text-body"
                                title="Déplacer à gauche"
                              >
                                &larr;
                              </button>
                            )}
                            {col.key !== "embauche" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveCandidate(c.id, "right")
                                }}
                                className="p-0.5 bg-surface border border-border rounded hover:bg-slate-100 text-body"
                                title="Déplacer à droite"
                              >
                                &rarr;
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-heading group-hover:text-primary transition-colors truncate">
                            {c.name}
                          </h4>
                          <p className="text-[10px] text-body mt-0.5">
                            {c.practice} &middot; <span className="font-semibold">{c.experience}</span>
                          </p>
                        </div>

                        {/* Match score badge */}
                        <div className="flex justify-start select-none">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                            AI Match: {c.aiMatch}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid: AI matching Alerts & Staffing Needs */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Alertes Matching AI (via n8n) */}
        <div className="col-span-4 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-sm font-bold text-heading font-heading">
                Alertes Matching AI (via n8n)
              </h2>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[250px] pr-1">
              {alerts.map((alert) => {
                const targetC = candidates.find((c) => c.name.toLowerCase().includes(alert.consultant.toLowerCase())) || candidates[0]
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (targetC) onSelectCandidate(targetC)
                    }}
                    className="p-3 bg-canvas/40 border border-border/60 hover:border-primary/50 hover:bg-canvas/60 rounded-xl flex items-start justify-between gap-3 group transition-all cursor-pointer transform hover:translate-y-[-1px]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                        {alert.consultant} - <span className="text-primary">{alert.match} Match</span>
                      </p>
                      <p className="text-[10px] text-body mt-0.5">
                        for {alert.role}
                      </p>
                      <p className="text-[9px] text-muted font-mono mt-1">
                        {alert.details}
                      </p>
                    </div>
                    {/* Blue robot head icon */}
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-[#2554B8] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="text-[9px] text-muted text-center pt-2 mt-2 border-t border-border/20 select-none">
            Powered by n8n workflows & pgvector semantic matching
          </div>
        </div>

        {/* Besoins de Staffing & Candidats Suggérés */}
        <div className="col-span-8 bg-surface rounded-xl border border-border/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3 select-none">
              <h2 className="text-sm font-bold text-heading font-heading">
                Besoins de Staffing & Candidats Suggérés
              </h2>

              {/* Urgence filter */}
              <div className="relative">
                <select
                  value={filterUrgence}
                  onChange={(e) => setFilterUrgence(e.target.value)}
                  className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option value="all">Filtrer par urgence</option>
                  <option value="high">Urgence Haute</option>
                  <option value="normal">Urgence Moyenne</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/40 select-none">
                    <th className="py-2 pb-2">Client</th>
                    <th className="py-2 pb-2">Rôle</th>
                    <th className="py-2 pb-2">Pratique</th>
                    <th className="py-2 pb-2">Urgence</th>
                    <th className="py-2 pb-2 text-right">Candidats Suggérés (Score AI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredStaffing.map((need) => (
                    <tr key={need.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-2.5 font-bold text-heading flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-slate-900 text-white font-black text-[9px] flex items-center justify-center select-none">
                          {need.client.charAt(0)}
                        </div>
                        <span>{need.client}</span>
                      </td>
                      <td className="py-2.5 text-body">{need.role}</td>
                      <td className="py-2.5 text-muted font-medium">{need.practice}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          need.urgence === "Haute"
                            ? "bg-rose-100 text-[#BE3E3E]"
                            : need.urgence === "Moyenne"
                            ? "bg-amber-100 text-[#C08A20]"
                            : "bg-slate-100 text-body"
                        }`}>
                          {need.urgence === "Haute" ? "Urgence" : need.urgence}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 select-none">
                          {need.suggestedCandidates.map((sug, idx) => {
                            const cInfo = candidates.find((c) => c.name === sug.name) || candidates[0]
                            return (
                              <button
                                key={idx}
                                onClick={() => onSelectCandidate(cInfo)}
                                className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 hover:border-primary flex items-center justify-center font-bold text-[8px] text-primary relative group cursor-pointer"
                              >
                                {sug.avatarInitials}
                                <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] py-0.5 px-1.5 rounded whitespace-nowrap z-50">
                                  {sug.name} : {sug.score}%
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
