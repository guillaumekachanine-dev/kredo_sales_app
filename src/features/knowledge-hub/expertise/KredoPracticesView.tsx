/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useRef, useEffect } from "react"
import { PracticeItem, OfferItem, JobItem } from "./kredo-expertise.types"

interface PracticesViewProps {
  practices: PracticeItem[]
  jobs: JobItem[]
  onSelectPractice: (practice: PracticeItem | null) => void
  isMobile?: boolean
}

const PRACTICE_METADATA: Record<
  string,
  { icon: string; logoUrl: string; bgClass: string; textClass: string; borderClass: string }
> = {
  "data-ai": {
    icon: "🧠",
    logoUrl: "/images/practice_icons/practice_data_ia.png",
    bgClass: "bg-[#F0F5FF]/50",
    textClass: "text-[#1D39C4]",
    borderClass: "border-[#ADC6FF]",
  },
  "cloud-engineering": {
    icon: "☁️",
    logoUrl: "/images/practice_icons/practice_cloud_engineering.png",
    bgClass: "bg-[#F6FFED]/50",
    textClass: "text-[#389E0D]",
    borderClass: "border-[#B7EB8F]",
  },
  "digital-business-solutions": {
    icon: "💻",
    logoUrl: "/images/practice_icons/practice_digital_business_solutions.png",
    bgClass: "bg-[#FFF7E6]/50",
    textClass: "text-[#D46B08]",
    borderClass: "border-[#FFD591]",
  },
  "digital-experience": {
    icon: "🎨",
    logoUrl: "/images/practice_icons/practice_digital_experience.png",
    bgClass: "bg-[#FFF0F6]/50",
    textClass: "text-[#C41D7F]",
    borderClass: "border-[#FFADD2]",
  },
  "cybersecurity": {
    icon: "🛡️",
    logoUrl: "/images/practice_icons/practice_cybersecurity.png",
    bgClass: "bg-[#FFF1F0]/50",
    textClass: "text-[#CF1322]",
    borderClass: "border-[#FFA39E]",
  },
  "legacy-systems-mainframe": {
    icon: "⚙️",
    logoUrl: "/images/practice_icons/practice_legacy_mainframe.png",
    bgClass: "bg-[#F9F0FF]/50",
    textClass: "text-[#531DAB]",
    borderClass: "border-[#D3ADF7]",
  },
  "project-agile-delivery": {
    icon: "⏱️",
    logoUrl: "/images/practice_icons/practice_project_agile_delivery.png",
    bgClass: "bg-[#F5F5F5]/50",
    textClass: "text-[#666666]",
    borderClass: "border-[#D9D9D9]",
  },
  "quality-engineering-testing": {
    icon: "🧪",
    logoUrl: "/images/practice_icons/practice_QA_testing.png",
    bgClass: "bg-[#E6FFFB]/50",
    textClass: "text-[#08979C]",
    borderClass: "border-[#87E8DE]",
  },
}

const getPracticeMeta = (slug: string) => {
  return (
    PRACTICE_METADATA[slug] || {
      icon: "💼",
      logoUrl: "/images/practice_icons/practice_data_ia.png",
      bgClass: "bg-edito-chip",
      textClass: "text-edito-navy",
      borderClass: "border-edito-border",
    }
  );
}

// Clean commercial sentences starting with "nous" / "Nous"
function cleanCommercialSentences(text: string | null | undefined): string | null {
  if (!text) return null
  const sentences = text.split(/(?<=[.!?])\s+/)
  const cleaned = sentences.filter((s) => {
    const trimmed = s.trim()
    return !/^[Nn]ous\b/.test(trimmed)
  })
  return cleaned.join(" ")
}

export function KredoPracticesView({
  practices,
  jobs,
  onSelectPractice,
  isMobile = false,
}: PracticesViewProps) {
  const [expandedPracticeId, setExpandedPracticeId] = useState<string | null>(null)
  
  // Tracking card elements for auto-scroll tracking
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const prevExpandedId = useRef<string | null>(null)

  const handleToggleExpand = (practice: PracticeItem) => {
    const isExpanded = expandedPracticeId === practice.id
    const nextId = isExpanded ? null : practice.id
    setExpandedPracticeId(nextId)
    onSelectPractice(isExpanded ? null : practice)
  }

  // Smooth scroll tracking travelling hook — anchor just below sticky header
  useEffect(() => {
    if (expandedPracticeId) {
      prevExpandedId.current = expandedPracticeId
      const card = cardRefs.current[expandedPracticeId]
      if (card) {
        setTimeout(() => {
          const elementPosition = card.getBoundingClientRect().top + window.scrollY
          // 170px offset to clear the sticky tab+search header on mobile, 60px on desktop
          const offset = isMobile ? 170 : 60
          window.scrollTo({ top: elementPosition - offset, behavior: "smooth" })
        }, 180)
      }
    } else if (prevExpandedId.current) {
      const card = cardRefs.current[prevExpandedId.current]
      if (card) {
        setTimeout(() => {
          const elementPosition = card.getBoundingClientRect().top + window.scrollY
          const offset = isMobile ? 170 : 60
          window.scrollTo({ top: elementPosition - offset, behavior: "smooth" })
        }, 100)
      }
      prevExpandedId.current = null
    }
  }, [expandedPracticeId, isMobile])

  const renderOffersList = (offers: OfferItem[]) => {
    if (offers.length === 0) {
      return (
        <p className="text-[10px] text-edito-muted italic py-2">
          Aucune offre rattachée pour le moment.
        </p>
      )
    }

    return (
      <div className="space-y-4 pt-2 col-span-full">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5 border-b border-edito-border/30 pb-2">
          <span>💼</span> Offres de la Practice ({offers.length})
        </h4>
        
        {/* Render offers in a 2-column grid layout for desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-1.5">
          {offers.map((offer) => {
            const cleanedShort = cleanCommercialSentences(offer.shortDescription)
            const cleanedFull = cleanCommercialSentences(offer.fullDescription)

            return (
              <div key={offer.id} className="space-y-2.5 border-l-2 border-edito-brass/30 pl-4 h-fit">
                {/* Larger offer title with elegant bullet point */}
                <h5 className="text-xs sm:text-sm font-bold text-edito-navy flex items-center gap-2">
                  <span className="inline-flex size-2 rounded-full bg-edito-brass ring-4 ring-edito-brass/25 shrink-0" />
                  <span>{offer.name}</span>
                </h5>
                {cleanedShort && (
                  <p className="text-[11px] text-edito-body leading-relaxed">
                    {cleanedShort}
                  </p>
                )}
                {cleanedFull && cleanedFull !== cleanedShort && (
                  <p className="text-[11px] text-edito-muted leading-relaxed">
                    {cleanedFull}
                  </p>
                )}

                {/* Stretched stacked metadata lines (no horizontal columns, no truncation) */}
                <div className="flex flex-col gap-3 pt-2.5 border-t border-edito-border/20 mt-2 text-[10px]">
                  {offer.typicalDeliverables.length > 0 && (
                    <div>
                      <span className="font-bold text-edito-navy uppercase tracking-wider block mb-0.5">Livrables :</span>
                      <span className="text-edito-muted block leading-relaxed">{offer.typicalDeliverables.join(", ")}</span>
                    </div>
                  )}
                  {offer.typicalProfiles.length > 0 && (
                    <div>
                      <span className="font-bold text-edito-navy uppercase tracking-wider block mb-0.5">Profils :</span>
                      <span className="text-edito-muted block leading-relaxed">{offer.typicalProfiles.join(", ")}</span>
                    </div>
                  )}
                  {offer.useCases.length > 0 && (
                    <div>
                      <span className="font-bold text-edito-navy uppercase tracking-wider block mb-0.5">Cas d&apos;usage :</span>
                      <span className="text-edito-muted block leading-relaxed">{offer.useCases.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={`grid ${
      isMobile
        ? "grid-cols-2"
        : "grid-cols-1 md:grid-cols-2"
    } gap-4 md:gap-6 transition-all duration-700 ease-in-out`}>
      {practices.map((practice) => {
        const isExpanded = expandedPracticeId === practice.id
        const meta = getPracticeMeta(practice.slug)
        const practiceJobs = jobs.filter((j) => j.practiceId === practice.id)

        // Show all tags when expanded, otherwise slice to 5
        const displayTags = isExpanded ? practice.stackTags : practice.stackTags.slice(0, 5)

    return (
          <div
            key={practice.id}
            ref={(el) => { cardRefs.current[practice.id] = el }}
            className={`scroll-mt-28 rounded-lg border bg-edito-surface overflow-hidden transition-all duration-700 ease-in-out ${
              isExpanded
                ? "md:col-span-2 border-edito-brass ring-1 ring-edito-brass shadow-md"
                : "border-edito-border hover:border-edito-muted hover:shadow-[0_2px_8px_rgba(216,155,22,0.04)]"
            }`}
          >
            {/* Artistic Header Band with logo overlay */}
            <div className={`relative h-24 border-b ${meta.borderClass} ${meta.bgClass} flex items-center px-6 overflow-hidden`}>
              {/* Background large logo with transparency */}
              <img
                src={meta.logoUrl}
                alt=""
                className="absolute -right-2 top-1/2 -translate-y-1/2 h-20 w-auto object-contain opacity-20 pointer-events-none"
              />
              {/* Overlayed text content */}
              <button
                type="button"
                onClick={() => handleToggleExpand(practice)}
                aria-expanded={isExpanded}
                className="relative z-10 w-full flex items-center justify-between outline-none text-left bg-transparent border-0 p-0 cursor-pointer"
              >
                <div className="flex flex-col gap-1 pr-8">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${meta.textClass}`}>
                    {practice.name}
                  </h3>
                  <span className="text-[9px] font-bold text-edito-navy/60 uppercase tracking-wide bg-white/70 px-1.5 py-0.5 rounded shadow-3xs w-fit">
                    {practice.offers.length} {practice.offers.length > 1 ? "offres" : "offre"}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold text-edito-navy shrink-0 transition-transform duration-700 bg-white/80 p-2 rounded-full shadow-2xs ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
              </button>
            </div>

            {/* Card Content body — hidden on mobile when collapsed */}
            {(!isMobile || isExpanded) && (
              <div className="p-5 space-y-4">
                <p className="text-xs leading-relaxed text-edito-body">
                  {practice.description}
                </p>

                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                  <span>📁 {practice.jobCount} {practice.jobCount > 1 ? "métiers" : "métier"}</span>
                  <span>🏷️ {practice.stackTags.length} {practice.stackTags.length > 1 ? "technologies" : "technologie"}</span>
                </div>

                {/* Practice Technologies */}
                {practice.stackTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-3 border-t border-edito-border/50">
                    {displayTags.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center rounded border border-edito-border/60 bg-edito-chip/55 px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                      >
                        {tech}
                      </span>
                    ))}
                    {!isExpanded && practice.stackTags.length > 5 && (
                      <span className="text-[9px] font-semibold text-edito-muted pt-0.5 ml-1">
                        +{practice.stackTags.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsible Details Panel: Perimeter, Jobs, and Offers */}
                <div
                  className={`overflow-hidden transition-all duration-700 ease-in-out ${
                    isExpanded ? "max-h-[2800px] opacity-100 mt-4 border-t border-edito-border/50 pt-4" : "max-h-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="space-y-6">
                    {/* 1. Perimeter / Intervention Scope (moved from sidebar) */}
                    {practice.perimeter && (
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5">
                          <span>🌐</span> Périmètre d&apos;intervention
                        </h4>
                        <p className="text-xs text-edito-body leading-relaxed pl-4 border-l border-edito-brass/30">
                          {practice.perimeter}
                        </p>
                      </div>
                    )}

                    {/* 2. Rattachés Job Titles List (moved from sidebar) */}
                    {practiceJobs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy flex items-center gap-1.5">
                          <span>👥</span> Métiers rattachés ({practiceJobs.length})
                        </h4>
                        <div className="flex flex-wrap gap-2 pl-4">
                          {practiceJobs.map((job) => (
                            <span
                              key={job.id}
                              className="inline-flex items-center rounded-md border border-edito-border bg-white px-2.5 py-1 text-[10px] font-bold text-edito-navy shadow-3xs"
                            >
                              💼 {job.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Detailed Offers (displayed on full width, 2-column format) */}
                    {renderOffersList(practice.offers)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
