/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useRef, useEffect } from "react"
import { JobItem, PracticeItem, SkillItem } from "./kredo-expertise.types"
import { SkillDescriptionTooltip } from "@/components/consultants/pool-competences/SkillDescriptionTooltip"
import type { SkillTooltipState } from "@/components/consultants/pool-competences/types"

interface JobsViewProps {
  jobs: JobItem[]
  practices: PracticeItem[]
  skills: SkillItem[]
}

const PRACTICE_ICONS: Record<string, string> = {
  "data-ai": "🧠",
  "cloud-engineering": "☁️",
  "digital-business-solutions": "💻",
  "digital-experience": "🎨",
  "cybersecurity": "🛡️",
  "legacy-systems-mainframe": "⚙️",
  "project-agile-delivery": "⏱️",
  "quality-engineering-testing": "🧪",
}

const PRACTICE_METADATA: Record<
  string,
  { icon: string; logoUrl: string; activeBorder: string; textClass: string; activeSectionBorder: string }
> = {
  "data-ai": {
    icon: "🧠",
    logoUrl: "/images/practice_icons/practice_data_ia.png",
    activeBorder: "border-[#1D39C4] border-2 shadow-xs",
    textClass: "text-[#1D39C4]",
    activeSectionBorder: "border-[#1D39C4]/30 ring-1 ring-[#1D39C4]/10 shadow-sm",
  },
  "cloud-engineering": {
    icon: "☁️",
    logoUrl: "/images/practice_icons/practice_cloud_engineering.png",
    activeBorder: "border-[#389E0D] border-2 shadow-xs",
    textClass: "text-[#389E0D]",
    activeSectionBorder: "border-[#389E0D]/30 ring-1 ring-[#389E0D]/10 shadow-sm",
  },
  "digital-business-solutions": {
    icon: "💻",
    logoUrl: "/images/practice_icons/practice_digital_business_solutions.png",
    activeBorder: "border-[#D46B08] border-2 shadow-xs",
    textClass: "text-[#D46B08]",
    activeSectionBorder: "border-[#D46B08]/30 ring-1 ring-[#D46B08]/10 shadow-sm",
  },
  "digital-experience": {
    icon: "🎨",
    logoUrl: "/images/practice_icons/practice_digital_experience.png",
    activeBorder: "border-[#C41D7F] border-2 shadow-xs",
    textClass: "text-[#C41D7F]",
    activeSectionBorder: "border-[#C41D7F]/30 ring-1 ring-[#C41D7F]/10 shadow-sm",
  },
  "cybersecurity": {
    icon: "🛡️",
    logoUrl: "/images/practice_icons/practice_cybersecurity.png",
    activeBorder: "border-[#CF1322] border-2 shadow-xs",
    textClass: "text-[#CF1322]",
    activeSectionBorder: "border-[#CF1322]/30 ring-1 ring-[#CF1322]/10 shadow-sm",
  },
  "legacy-systems-mainframe": {
    icon: "⚙️",
    logoUrl: "/images/practice_icons/practice_legacy_mainframe.png",
    activeBorder: "border-[#531DAB] border-2 shadow-xs",
    textClass: "text-[#531DAB]",
    activeSectionBorder: "border-[#531DAB]/30 ring-1 ring-[#531DAB]/10 shadow-sm",
  },
  "project-agile-delivery": {
    icon: "⏱️",
    logoUrl: "/images/practice_icons/practice_project_agile_delivery.png",
    activeBorder: "border-[#595959] border-2 shadow-xs",
    textClass: "text-[#595959]",
    activeSectionBorder: "border-[#595959]/30 ring-1 ring-[#595959]/10 shadow-sm",
  },
  "quality-engineering-testing": {
    icon: "🧪",
    logoUrl: "/images/practice_icons/practice_QA_testing.png",
    activeBorder: "border-[#08979C] border-2 shadow-xs",
    textClass: "text-[#08979C]",
    activeSectionBorder: "border-[#08979C]/30 ring-1 ring-[#08979C]/10 shadow-sm",
  },
}

const getPracticeMeta = (slug: string) => {
  return (
    PRACTICE_METADATA[slug] || {
      icon: "💼",
      logoUrl: "/images/practice_icons/practice_data_ia.png",
      activeBorder: "border-edito-brass border-2 shadow-xs",
      textClass: "text-edito-navy",
      activeSectionBorder: "border-edito-brass/30 ring-1 ring-edito-brass/10 shadow-sm",
    }
  );
}

export function KredoJobsView({
  jobs,
  practices,
  skills,
}: JobsViewProps) {
  const [search, setSearch] = useState("")
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>("all")
  const [expandedPracticeId, setExpandedPracticeId] = useState<string | null>(null)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [tooltipState, setTooltipState] = useState<SkillTooltipState>(null)

  // Refs for auto-scroll tracking
  const viewWrapperRef = useRef<HTMLDivElement | null>(null)
  const expandedContainerRef = useRef<HTMLDivElement | null>(null)
  const prevExpandedId = useRef<string | null>(null)

  // Map skill descriptions for tech hovers
  const skillDescMap = new Map<string, string>()
  for (const s of skills) {
    if (s.description) {
      skillDescMap.set(s.name.toLowerCase(), s.description)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.mainMission.toLowerCase().includes(search.toLowerCase()) ||
      job.techStack.some((tech) => tech.toLowerCase().includes(search.toLowerCase()))
    
    const matchesPractice =
      selectedPracticeId === "all" || job.practiceId === selectedPracticeId

    return matchesSearch && matchesPractice
  })

  const jobsByPractice = new Map<string, JobItem[]>()
  for (const job of filteredJobs) {
    if (!jobsByPractice.has(job.practiceId)) {
      jobsByPractice.set(job.practiceId, [])
    }
    jobsByPractice.get(job.practiceId)!.push(job)
  }

  const handleTogglePractice = (practiceId: string) => {
    setExpandedPracticeId((prev) => (prev === practiceId ? null : practiceId))
  }

  const handleToggleExpandJob = (jobId: string) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId))
  }

  // Smooth viewport scrolling traveling
  useEffect(() => {
    if (expandedPracticeId) {
      prevExpandedId.current = expandedPracticeId
      setTimeout(() => {
        const container = expandedContainerRef.current
        if (container) {
          // Align container perfectly below the sticky header controls
          const elementPosition = container.getBoundingClientRect().top + window.scrollY
          const offsetPosition = elementPosition - 170
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          })
        }
      }, 180)
    } else if (prevExpandedId.current) {
      setTimeout(() => {
        const wrapper = viewWrapperRef.current
        if (wrapper) {
          wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }, 100)
      prevExpandedId.current = null
    }
  }, [expandedPracticeId])

  const renderJobItem = (job: JobItem) => {
    const isJobExpanded = expandedJobId === job.id
    return (
      <div
        key={job.id}
        className="border border-edito-border/50 bg-edito-surface rounded-xl p-4 space-y-3 shadow-3xs"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs shrink-0" role="img" aria-label="Métier">💼</span>
            <h4 className="text-xs font-bold text-edito-navy truncate">
              {job.title}
            </h4>

            {/* Small Details button sitting inline with the title */}
            <button
              type="button"
              onClick={() => handleToggleExpandJob(job.id)}
              className={`inline-flex items-center gap-1 h-5.5 rounded px-2 text-[9px] font-bold transition-colors shrink-0 outline-none cursor-pointer border ${
                isJobExpanded
                  ? "bg-edito-brass border-edito-brass text-white"
                  : "bg-edito-chip border-edito-border/40 text-edito-navy hover:bg-edito-chip/80"
              }`}
            >
              <span>Détails</span>
              <span className={`text-[7px] transition-transform duration-200 ${isJobExpanded ? "rotate-90" : ""}`}>
                ▶
              </span>
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-edito-body pl-4 border-l border-edito-border">
          {job.mainMission}
        </p>

        {/* Tech Stack Preview with Description Tooltips */}
        {job.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 pl-4">
            {job.techStack.map((tech, idx) => {
              const techName = tech.trim()
              const desc = skillDescMap.get(techName.toLowerCase())
              const hasDescription = Boolean(desc)

              if (!isJobExpanded && idx >= 5) {
                if (idx === 5) {
                  return (
                    <span key="more" className="text-[8px] font-bold text-edito-muted pt-0.5">
                      +{job.techStack.length - 5}
                    </span>
                  )
                }
                return null
              }

              return (
                <span
                  key={tech}
                  tabIndex={hasDescription ? 0 : -1}
                  onMouseEnter={
                    hasDescription
                      ? (e) =>
                          setTooltipState({
                            id: techName,
                            name: techName,
                            description: desc || "",
                            rect: e.currentTarget.getBoundingClientRect(),
                          })
                      : undefined
                  }
                  onMouseLeave={hasDescription ? () => setTooltipState(null) : undefined}
                  className={`rounded border px-1.5 py-0.5 text-[8px] font-medium transition-colors ${
                    hasDescription
                      ? "border-edito-brass/45 bg-edito-brass/5 text-edito-navy cursor-help hover:bg-edito-brass/10"
                      : "border-edito-border/40 bg-edito-chip/50 text-edito-muted"
                  }`}
                >
                  {techName}
                </span>
              )
            })}
          </div>
        )}

        {/* Expanded Job Accordion Details */}
        {isJobExpanded && (
          <div className="rounded-lg border border-edito-border/80 bg-edito-canvas/20 p-4 mt-2 space-y-4 animate-fade-in text-[11px]">
            {job.responsibilities.length > 0 && (
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5 mb-1.5">
                  <span>🎯</span> Responsabilités principales
                </span>
                <ul className="space-y-1.5 text-edito-body pl-4 list-none">
                  {job.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-edito-brass shrink-0 mt-0.5">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.kpis.length > 0 && (
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5 mb-1.5">
                  <span>📈</span> Indicateurs clés (KPI)
                </span>
                <ul className="space-y-1.5 text-edito-body pl-4 list-none">
                  {job.kpis.map((kpi, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-edito-brass shrink-0 mt-0.5">✓</span>
                      <span>{kpi}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={viewWrapperRef} className="scroll-mt-24 space-y-6 animate-fade-in">
      {/* Sticky search row at top (sticks below header and tab nav) */}
      <div className="sticky top-[101px] md:top-0 z-30 bg-edito-canvas/90 backdrop-blur-md py-2 w-full">
        <div className="flex items-center gap-2 bg-edito-surface p-3 rounded-xl border border-edito-border shadow-xs w-full min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-edito-muted">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas pl-8 pr-2 text-xs text-edito-body placeholder:text-edito-muted outline-none focus:border-edito-brass min-w-0"
            />
          </div>

          {/* Practice Filter */}
          <div className="shrink-0 flex items-center gap-1.5 min-w-[120px] max-w-[150px]">
            <select
              id="practice-filter"
              value={selectedPracticeId}
              onChange={(e) => setSelectedPracticeId(e.target.value)}
              aria-label="Filtrer par Practice"
              className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas px-2 text-xs text-edito-body outline-none focus:border-edito-brass cursor-pointer truncate"
            >
              <option value="all">Toutes</option>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {PRACTICE_ICONS[p.slug] || "💼"} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of shrunk practice cards presented on a single horizontal row */}
      <div className="flex items-center gap-3 overflow-x-auto pb-3 w-full scrollbar-none snap-x select-none">
        {practices.map((practice) => {
          const isPracticeExpanded = expandedPracticeId === practice.id
          const meta = getPracticeMeta(practice.slug)
          const practiceJobs = jobsByPractice.get(practice.id) ?? []
          if (practiceJobs.length === 0) return null

          return (
            <button
              key={practice.id}
              type="button"
              onClick={() => handleTogglePractice(practice.id)}
              className={`kredo-cockpit-hover-motion flex-none w-[110px] aspect-square flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer outline-none snap-start ${
                isPracticeExpanded
                  ? `${meta.activeBorder} bg-white`
                  : "border-edito-border bg-edito-surface hover:border-edito-muted"
              }`}
            >
              <img
                src={meta.logoUrl}
                alt=""
                className="size-10 object-contain opacity-80"
              />
              <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 line-clamp-1 w-full ${isPracticeExpanded ? meta.textClass : "text-edito-navy"}`}>
                {practice.name}
              </span>
              <span className="text-[7px] font-bold text-edito-muted uppercase tracking-wide mt-0.5 block">
                {practiceJobs.length} {practiceJobs.length > 1 ? "métiers" : "métier"}
              </span>
            </button>
          )
        })}
      </div>

      {/* Expanded Jobs Container: organized in 2 columns (2 jobs per row) */}
      {expandedPracticeId && (() => {
        const practice = practices.find((p) => p.id === expandedPracticeId)
        const practiceJobs = jobsByPractice.get(expandedPracticeId) ?? []
        if (!practice) return null
        const meta = getPracticeMeta(practice.slug)

        return (
          <div
            ref={expandedContainerRef}
            className={`bg-edito-surface rounded-xl border p-5 ${meta.activeSectionBorder} animate-fade-in`}
          >
            <div className="space-y-4">
              {/* Fully clickable header row to easily close/collapse the section */}
              <button
                type="button"
                onClick={() => setExpandedPracticeId(null)}
                className="w-full text-left flex items-center justify-between border-b border-edito-border/50 pb-3 hover:opacity-85 transition-opacity cursor-pointer group outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <img src={meta.logoUrl} alt="" className="size-8 object-contain" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5">
                    <span>MÉTIERS DE LA PRACTICE :</span>
                    <span className={meta.textClass}>{practice.name}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-edito-muted group-hover:text-edito-brass transition-colors shrink-0">
                  <span>Fermer la section</span>
                  <span className="text-[10px]">✕</span>
                </div>
              </button>

              {/* 2 columns layout on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {practiceJobs.map((job) => renderJobItem(job))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Hover tooltip for technos */}
      <SkillDescriptionTooltip state={tooltipState} />
    </div>
  )
}
