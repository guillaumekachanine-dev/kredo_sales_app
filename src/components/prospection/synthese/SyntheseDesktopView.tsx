"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SyntheseData } from "@/lib/prospection/synthese-data"
import { STATUS_TEXT, StatusDot } from "../prospection-parts"
import { HeaderCalendar } from "@/components/ui/HeaderCalendar"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"

export function SyntheseDesktopView({ data }: { data: SyntheseData }) {
  const { pipeline, accountsToActivate } = data

  // State for interactive features
  const [activeModal, setActiveModal] = useState<{
    type: "qualify" | "details" | "market" | "sync"
    title: string
    content: string
    targetName?: string
  } | null>(null)

  // Table filtering and search states
  const [selectedSort, setSelectedSort] = useState<"score" | "action" | "sector">("score")
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")

  // Mock matching alerts for the sidebar
  const matchingAlerts = [
    {
      id: "m-1",
      consultant: "Consultant X",
      match: "95%",
      role: "Opportunity Y",
      details: "including tiny pgvector",
      hasBadge: false,
    },
    {
      id: "m-2",
      consultant: "Consultant X",
      match: "95%",
      role: "Opportunity Y'",
      details: "matché à 92% including [Bank of Amer.]",
      hasBadge: true,
      badgeVal: "92%",
    },
    {
      id: "m-3",
      consultant: "Consultant X",
      match: "95%",
      role: "Role Y",
      details: "pgvector semantic index",
      hasBadge: false,
    },
    {
      id: "m-4",
      consultant: "Consultant X",
      match: "95%",
      role: "Opportunity Y",
      details: "skills matching query",
      hasBadge: false,
    },
    {
      id: "m-5",
      consultant: "Consultant X",
      match: "95%",
      role: "Role Z",
      details: "pgvector matching score",
      hasBadge: false,
    },
  ]

  // Mock scraping & intelligence alerts
  const [intelAlerts, setIntelAlerts] = useState([
    {
      id: "ia-1",
      type: "scraping",
      title: "Alerte Scraping : Offre d'emploi chez [cite Alstom] détectée pour [cite: Role Y]",
      company: "Alstom",
      role: "Role Y",
      badgeText: "Qualifier Lead",
      badgeType: "primary",
    },
    {
      id: "ia-2",
      type: "match",
      title: "Nouveau Match IA : '[cite: Consultant X]' matche à [cite: 92%] AI Match: 9% l'opportunité '[cite: Titre Opp]'",
      company: "Consultant X",
      role: "Titre Opp",
      badgeText: "Détails",
      badgeType: "secondary",
    },
    {
      id: "ia-3",
      type: "news",
      title: "Alerte Actualité : '[cite: Thales]' annonce une levée de fonds...",
      company: "Thales",
      badgeText: "Alerte Marché",
      badgeType: "accent",
    },
  ])

  // Custom currency formatter following mockup (€1.4M style)
  const formatEuroM = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `€${Math.round(value / 1000)}k`
    }
    return `€${value}`
  }

  // Handle Synchronisation Action
  const triggerSync = () => {
    setIsSyncing(true)
    setSyncMessage("Synchronisation pgvector & n8n en cours...")
    setTimeout(() => {
      setIsSyncing(false)
      setActiveModal({
        type: "sync",
        title: "Synchronisation Réussie",
        content: "Les prospects vectoriels et signaux d'opportunités ont été actualisés avec succès via les workflows n8n.",
      })
    }, 1200)
  }

  // Handle action button click
  const handleActionClick = (alertId: string, actionType: string, company: string) => {
    if (actionType === "Qualifier Lead") {
      setActiveModal({
        type: "qualify",
        title: `Qualifier le Lead : ${company}`,
        content: `Voulez-vous initier le processus de qualification pour ${company} ? Cette action créera une opportunité "Qualification" dans votre pipeline et lancera la séquence d'engagement n8n.`,
        targetName: alertId,
      })
    } else if (actionType === "Détails") {
      setActiveModal({
        type: "details",
        title: `Analyse Match IA : ${company}`,
        content: `Le profil correspond à 92% à l'opportunité ciblée. Le modèle pgvector a extrait une adéquation sémantique forte sur les compétences Next.js, FastAPI, et les architectures RAG.`,
        targetName: alertId,
      })
    } else if (actionType === "Alerte Marché") {
      setActiveModal({
        type: "market",
        title: `Signal Marché : ${company}`,
        content: `Une levée de fonds importante a été détectée sur ${company}. Les budgets IT devraient croître de 30% sur l'exercice en cours. Il est conseillé de positionner un contact clé d'ici 5 jours.`,
        targetName: alertId,
      })
    }
  }

  // Confirm qualification and remove alert to show interactivity
  const confirmQualify = (alertId?: string) => {
    if (alertId) {
      setIntelAlerts((prev) => prev.filter((a) => a.id !== alertId))
    }
    setActiveModal(null)
  }

  // Services tags fallback
  const getServicesTags = (name: string) => {
    const hash = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
    if (hash % 4 === 0) return [{ text: "Cloud", style: "bg-blue-50 text-blue-700 border-blue-200" }, { text: "DevOps", style: "bg-indigo-50 text-indigo-700 border-indigo-200" }]
    if (hash % 4 === 1) return [{ text: "AI / RAG", style: "bg-emerald-50 text-emerald-700 border-emerald-200" }]
    if (hash % 4 === 2) return [{ text: "Digital", style: "bg-amber-50 text-amber-700 border-amber-200" }, { text: "Next.js", style: "bg-slate-50 text-slate-700 border-slate-200" }]
    return [{ text: "Data Eng", style: "bg-purple-50 text-purple-700 border-purple-200" }]
  }

  // Dynamic Prospects Sorting
  const sortedProspects = [...accountsToActivate].sort((a, b) => {
    if (selectedSort === "score") {
      return (b.score ?? 0) - (a.score ?? 0)
    }
    if (selectedSort === "sector") {
      return a.sector.localeCompare(b.sector)
    }
    return 0 // action: default list ordering
  })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-6 select-none relative">
      {/* Premium Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-heading tracking-tight">
            Prospection Intelligence - Synthèse
          </h1>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-4">
<HeaderCalendar />

<HeaderAlerts />

          {/* User Avatar - GK */}
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

      {/* Main Grid: KPIs, Pipeline chart & Alerts */}
      <div className="grid grid-cols-12 gap-5 items-start">
        
        {/* Left Column: KPIs & Pipeline Diagram (col-span-8) */}
        <div className="col-span-8 flex flex-col gap-5">
          
          {/* 4 KPIs Row */}
          <div className="grid grid-cols-4 gap-4">
            {/* KPI 1: Taux de Conversion */}
            <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider leading-tight">
                Taux de Conversion<br />(Qualified Lead)
              </span>
              <div className="flex items-baseline mt-3">
                <span className="text-3xl font-bold text-heading">75%</span>
              </div>
            </div>

            {/* KPI 2: Vélocité Commerciale */}
            <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider leading-tight">
                Vélocité Commerciale<br />(Moy. Jours)
              </span>
              <div className="flex items-baseline mt-3">
                <span className="text-3xl font-bold text-heading">22 jours</span>
              </div>
            </div>

            {/* KPI 3: Pipe Actuel */}
            <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider leading-tight">
                Pipe Actuel<br />(Qualified)
              </span>
              <div className="flex items-baseline mt-3">
                <span className="text-3xl font-bold text-heading">
                  {formatEuroM(pipeline.totalWeighted)}
                </span>
              </div>
            </div>

            {/* KPI 4: Nouveaux Leads */}
            <div className="bg-surface rounded-xl p-5 border border-border/80 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider leading-tight">
                Nouveaux Leads<br />(S-1, via n8n)
              </span>
              <div className="flex items-baseline mt-3">
                <span className="text-3xl font-bold text-heading">12 leads</span>
              </div>
            </div>
          </div>

          {/* Vue d'ensemble du Pipeline Card */}
          <SurfaceCard className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
              Vue d&apos;ensemble du Pipeline Commercial (Qualified)
            </h2>

            {/* Stage Colors Legend */}
            <div className="flex items-center gap-4 mb-6 text-[10px] font-bold text-body">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#1E3A8A]" />
                <span>Qualiff</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#EA580C]" />
                <span>Proposition</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#64748B]" />
                <span>Nego</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#16A34A]" />
                <span>Gagne</span>
              </div>
            </div>

            {/* Stacked Bars Graphic */}
            <div className="flex flex-col gap-5">
              
              {/* Row 1: Prospecting */}
              <div className="flex items-center">
                <span className="w-28 text-xs font-bold text-body shrink-0">Prospecting</span>
                <div className="flex-1 h-9 rounded bg-canvas overflow-hidden flex shadow-inner border border-border/40">
                  <div className="bg-[#1E3A8A] flex items-center justify-center text-white text-[10px] font-bold relative" style={{ width: "45%" }}>
                    <span>{formatEuroM(pipeline.totalWeighted)}</span>
                  </div>
                  <div className="bg-[#EA580C] flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "25%" }}>
                  </div>
                  <div className="bg-[#16A34A] flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "30%" }}>
                  </div>
                </div>
              </div>

              {/* Row 2: Qualified Lead */}
              <div className="flex items-center">
                <span className="w-28 text-xs font-bold text-body shrink-0">Qualified Lead</span>
                <div className="flex-1 h-9 rounded bg-canvas overflow-hidden flex shadow-inner border border-border/40">
                  <div className="bg-[#1E3A8A] flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "35%" }}>
                    <span>{formatEuroM(pipeline.totalWeighted)}</span>
                  </div>
                  <div className="bg-[#EA580C] flex items-center justify-center text-white text-[9px] font-black" style={{ width: "25%" }}>
                    <span className="bg-black/20 px-1 py-0.5 rounded backdrop-blur-[2px]">Cean: 75%</span>
                  </div>
                  <div className="bg-[#16A34A] flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "40%" }}>
                  </div>
                </div>
              </div>

              {/* Row 3: Proposition */}
              <div className="flex items-center">
                <span className="w-28 text-xs font-bold text-body shrink-0">Proposition</span>
                <div className="flex-1 h-9 rounded bg-canvas overflow-hidden flex shadow-inner border border-border/40">
                  <div className="bg-[#1E3A8A] flex items-center justify-center text-white text-[9px] font-black" style={{ width: "25%" }}>
                    <span className="bg-black/20 px-1 py-0.5 rounded backdrop-blur-[2px]">45%: 95%</span>
                  </div>
                  <div className="bg-[#EA580C] flex items-center justify-center text-white text-[9px] font-black" style={{ width: "20%" }}>
                    <span className="bg-black/20 px-1 py-0.5 rounded backdrop-blur-[2px] whitespace-nowrap">Aleg: 20%</span>
                  </div>
                  <div className="bg-[#16A34A] flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "55%" }}>
                    <span>€1M</span>
                  </div>
                </div>
              </div>

              {/* Axis Ruler */}
              <div className="flex items-center pt-1 border-t border-border/40">
                <span className="w-28 shrink-0" />
                <div className="flex-1 flex justify-between text-[10px] font-bold text-muted px-1.5 select-none">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span>50</span>
                  <span>60</span>
                  <span>70</span>
                  <span>80</span>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>

        {/* Right Column: Alertes Matching AI (col-span-4) */}
        <SurfaceCard className="col-span-4 p-5 h-[390px] flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Alertes Matching AI (via n8n)
              </h2>
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[285px] pr-1.5 scrollbar-thin">
              {matchingAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleActionClick(alert.id, "Détails", alert.consultant)}
                  className="p-3 bg-canvas/30 hover:bg-canvas/70 border border-border/60 hover:border-primary/40 rounded-xl flex items-start justify-between gap-3 group transition-all cursor-pointer transform hover:translate-y-[-1px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                      {alert.consultant} - <span className="text-primary">{alert.match} Match</span>
                    </p>
                    <p className="text-[10px] text-body mt-0.5 leading-tight">
                      for {alert.role}
                    </p>
                    <p className="text-[9px] text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>{alert.details}</span>
                      {alert.hasBadge && (
                        <span className="bg-[#E8F5E9] text-[#2E7D32] px-1 py-0.2 rounded font-bold text-[8px]">
                          {alert.badgeVal}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Blue robot icon */}
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] text-muted text-center pt-2 border-t border-border/20">
            pgvector matching & workflows n8n actifs
          </div>
        </SurfaceCard>
      </div>

      {/* Bottom Section: Scrapers feed & Vector Prospects Table */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Alertes Intelligence Commerciale (via n8n) [29] (col-span-7) */}
        <SurfaceCard className="col-span-7 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-3 border-b border-border/40 mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Alertes Intelligence Commerciale (via n8n) <span className="text-muted ml-1">[{intelAlerts.length + 26}]</span>
              </h2>
            </div>

            <div className="flex flex-col gap-3.5">
              {intelAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between gap-4 p-3 bg-canvas/40 border border-border/50 rounded-xl hover:border-border transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Dynamic Icons */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                      alert.type === "scraping" && "bg-amber-50 border-amber-100 text-amber-600",
                      alert.type === "match" && "bg-blue-50 border-blue-100 text-blue-600",
                      alert.type === "news" && "bg-purple-50 border-purple-100 text-purple-600"
                    )}>
                      {alert.type === "scraping" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                      {alert.type === "match" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {alert.type === "news" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Highlighted text styling */}
                      <p className="text-xs font-medium text-heading leading-relaxed">
                        {alert.title.split(/\[cite:? |\]/).map((part, index) => {
                          if (index % 2 === 1) {
                            return <span key={index} className="text-primary font-bold border-b border-primary/20">{part}</span>
                          }
                          return part
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic action buttons */}
                  <button
                    type="button"
                    onClick={() => handleActionClick(alert.id, alert.badgeText, alert.company || "Prospection")}
                    className={cn(
                      "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 hover:shadow-sm",
                      alert.badgeType === "primary" && "bg-primary text-white border-primary hover:bg-primary-hover",
                      alert.badgeType === "secondary" && "bg-surface text-body border-border hover:bg-surface-hover",
                      alert.badgeType === "accent" && "bg-slate-900 text-white border-slate-950 hover:bg-slate-800"
                    )}
                  >
                    {alert.badgeText}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-3 border-t border-border/20 text-[10px] text-muted">
            Flux de scraping LinkedIn/Jobs & dépêches sectorielles synchronisés en tâche de fond.
          </div>
        </SurfaceCard>

        {/* Right: Top Prospects Vectoriels (Sémantiques, pgvector) [14] (col-span-5) */}
        <SurfaceCard className="col-span-5 p-5 flex flex-col justify-between border border-border/80 shadow-sm">
          <div>
            <div className="pb-2 border-b border-border/40 mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-heading uppercase tracking-wider">
                Top Prospects Vectoriels (pgvector) <span className="text-muted ml-0.5">[{sortedProspects.length + 8}]</span>
              </h2>

              {/* Sort Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value as any)}
                  className="text-[10px] border border-border bg-surface text-body rounded-lg py-1 px-2.5 pr-7 appearance-none focus:outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option value="score">Score Sémantique</option>
                  <option value="sector">Secteur d&apos;activité</option>
                  <option value="action">Dernière action</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Prospects Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-muted font-bold border-b border-border/30 select-none">
                    <th className="py-2">Entreprise</th>
                    <th className="py-2">Secteur</th>
                    <th className="py-2 text-center">Score IA</th>
                    <th className="py-2">Services</th>
                    <th className="py-2 text-right">Dernière</th>
                    <th className="py-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sortedProspects.map((prospect) => {
                    const initials = prospect.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                    const tags = getServicesTags(prospect.name);
                    const semanticScore = prospect.score ? Math.round((prospect.score / 5) * 100) : 95;
                    const logoColor = prospect.name.charCodeAt(0) % 2 === 0 ? "bg-black text-white" : "bg-[#EA580C] text-white";

                    return (
                      <tr key={prospect.id} className="hover:bg-canvas/30 transition-colors group">
                        <td className="py-2.5 font-bold text-heading">
                          <Link href={`/prospection/accounts/${prospect.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <div className={cn("w-5 h-5 rounded flex items-center justify-center font-bold text-[9px]", logoColor)}>
                              {initials}
                            </div>
                            <span className="truncate max-w-[85px]">{prospect.name}</span>
                          </Link>
                        </td>
                        <td className="py-2.5 text-body truncate max-w-[75px]" title={prospect.sector}>
                          {prospect.sector}
                        </td>
                        <td className="py-2.5 text-center font-bold text-heading">
                          {semanticScore}%
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1">
                            {tags.map((tag, i) => (
                              <span
                                key={i}
                                className={cn("px-1.5 py-0.5 rounded border text-[9px] font-semibold tracking-tight", tag.style)}
                              >
                                {tag.text}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-muted font-medium whitespace-nowrap">
                          {prospect.name.charCodeAt(1) % 2 === 0 ? "12 jours" : "22 jours"}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleActionClick(prospect.id, "Détails", prospect.name)}
                            className="p-1 rounded text-muted hover:text-primary hover:bg-canvas transition-colors"
                            title="Consulter analyse"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/20 flex items-center justify-between">
            <span className="text-[10px] text-muted">Vecteurs sémantiques enrichis</span>
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover hover:underline transition-colors shrink-0",
                isSyncing && "opacity-60 cursor-not-allowed"
              )}
            >
              <svg className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.21" />
              </svg>
              <span>{isSyncing ? "Sync..." : "Synchroniser"}</span>
            </button>
          </div>
        </SurfaceCard>
      </div>

      {/* Interactive Modal (Glassmorphic Backdrop Overlay) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-surface/95 border border-border rounded-xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header background accents */}
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
              <p className="text-xs text-body leading-relaxed">
                {activeModal.content}
              </p>

              {activeModal.type === "details" && (
                <div className="bg-canvas/50 border border-border/60 rounded-lg p-3 text-[10px] text-muted space-y-1">
                  <div>• DB Node: public.ai_intelligence_results</div>
                  <div>• Match Model: pgvector (cosine similarity)</div>
                  <div>• Input Token count: ~1.2k</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border/30 pt-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-xs font-semibold px-4 py-2 bg-canvas hover:bg-surface-hover border border-border rounded-lg text-body transition-colors"
              >
                {activeModal.type === "sync" ? "Fermer" : "Annuler"}
              </button>
              {activeModal.type === "qualify" && (
                <button
                  type="button"
                  onClick={() => confirmQualify(activeModal.targetName)}
                  className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors"
                >
                  Qualifier le Lead
                </button>
              )}
              {activeModal.type !== "qualify" && activeModal.type !== "sync" && (
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white shadow transition-colors"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
