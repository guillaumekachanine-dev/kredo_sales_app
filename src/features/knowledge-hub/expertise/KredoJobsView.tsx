"use client"

import { useState } from "react"
import { JobItem, PracticeItem } from "./kredo-expertise.types"

interface JobsViewProps {
  jobs: JobItem[]
  practices: PracticeItem[]
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

export function KredoJobsView({
  jobs,
  practices,
}: JobsViewProps) {
  const [search, setSearch] = useState("")
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>("all")
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)

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

  const handleToggleExpand = (jobId: string) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId))
  }

  const renderJobItem = (job: JobItem) => {
    const isExpanded = expandedJobId === job.id
    return (
      <div
        key={job.id}
        className="border-b border-edito-border/40 py-4 last:border-b-0 space-y-2.5 transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs" role="img" aria-label="Métier">💼</span>
              <h4 className="text-xs font-bold text-edito-navy truncate">
                {job.title}
              </h4>
              <span className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[8px] font-bold text-edito-muted border border-edito-border/50">
                {job.practiceName}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-edito-body pl-4 border-l border-edito-border">
              {job.mainMission}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleExpand(job.id)}
            className={`flex min-h-[44px] min-w-[56px] sm:min-h-[32px] sm:min-w-[48px] items-center justify-center rounded border px-2.5 text-[10px] font-bold shrink-0 transition-colors ${
              isExpanded
                ? "bg-edito-brass border-edito-brass text-white"
                : "bg-edito-surface border-edito-border text-edito-navy hover:bg-edito-chip"
            }`}
          >
            {isExpanded ? "Fermer" : "Détails"}
          </button>
        </div>

        {/* Tech Stack Preview */}
        {!isExpanded && job.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 pl-4">
            {job.techStack.slice(0, 5).map((tech) => (
              <span
                key={tech}
                className="rounded border border-edito-border/40 bg-edito-chip/50 px-1.5 py-0.5 text-[8px] font-medium text-edito-muted"
              >
                {tech}
              </span>
            ))}
            {job.techStack.length > 5 && (
              <span className="text-[8px] font-bold text-edito-muted pt-0.5">
                +{job.techStack.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Expanded Accordion Details */}
        {isExpanded && (
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

            {job.techStack.length > 0 && (
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5 mb-2">
                  <span>🛠️</span> Stack Technologique Complète
                </span>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {job.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded border border-edito-border/60 bg-edito-chip px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-edito-surface p-4 rounded-xl border border-edito-border shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-edito-muted">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un métier, une techno..."
            className="h-9 w-full rounded-md border border-edito-border bg-edito-canvas pl-9 pr-3 text-xs text-edito-body placeholder:text-edito-muted outline-none focus:border-edito-brass"
          />
        </div>

        {/* Practice Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="practice-filter" className="text-[10px] font-bold uppercase tracking-wider text-edito-navy shrink-0 flex items-center gap-1">
            <span>👁️</span> Practice :
          </label>
          <select
            id="practice-filter"
            value={selectedPracticeId}
            onChange={(e) => setSelectedPracticeId(e.target.value)}
            className="h-9 rounded-md border border-edito-border bg-edito-canvas px-3 text-xs text-edito-body outline-none focus:border-edito-brass cursor-pointer"
          >
            <option value="all">Toutes les practices</option>
            {practices.map((p) => (
              <option key={p.id} value={p.id}>
                {PRACTICE_ICONS[p.slug] || "💼"} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Jobs List */}
      <div className="bg-edito-surface rounded-xl border border-edito-border p-5 divide-y divide-edito-border/30 shadow-xs">
        {practices.map((practice) => {
          const practiceJobs = jobsByPractice.get(practice.id) ?? []
          if (practiceJobs.length === 0) return null
          const icon = PRACTICE_ICONS[practice.slug] || "💼"

          return (
            <div key={practice.id} className="py-5 first:pt-0 last:pb-0 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-edito-brass flex items-center gap-2 border-l-2 border-edito-brass pl-2.5">
                <span className="text-sm" role="img" aria-hidden="true">{icon}</span>
                <span>{practice.name}</span>
                <span className="ml-1 rounded-full bg-edito-chip px-2 py-0.5 text-[8px] font-bold text-edito-muted border border-edito-border/40">
                  {practiceJobs.length}
                </span>
              </h3>
              <div className="divide-y divide-edito-border/10 pl-2">
                {practiceJobs.map((job) => renderJobItem(job))}
              </div>
            </div>
          )
        })}

        {filteredJobs.length === 0 && (
          <div className="py-12 text-center text-xs text-edito-muted flex flex-col items-center justify-center gap-2">
            <span className="text-lg">📭</span>
            <span>Aucun métier ne correspond à votre recherche.</span>
          </div>
        )}
      </div>
    </div>
  )
}
