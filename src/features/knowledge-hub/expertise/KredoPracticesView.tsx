"use client"

import { PracticeItem } from "./kredo-expertise.types"

interface PracticesViewProps {
  practices: PracticeItem[]
  selectedPractice: PracticeItem | null
  onSelectPractice: (practice: PracticeItem | null) => void
  isMobile?: boolean
}

const PRACTICE_METADATA: Record<
  string,
  { icon: string; bgClass: string; textClass: string; borderClass: string }
> = {
  "data-ai": {
    icon: "🧠",
    bgClass: "bg-[#F0F5FF]",
    textClass: "text-[#1D39C4]",
    borderClass: "border-[#ADC6FF]",
  },
  "cloud-engineering": {
    icon: "☁️",
    bgClass: "bg-[#F6FFED]",
    textClass: "text-[#389E0D]",
    borderClass: "border-[#B7EB8F]",
  },
  "digital-business-solutions": {
    icon: "💻",
    bgClass: "bg-[#FFF7E6]",
    textClass: "text-[#D46B08]",
    borderClass: "border-[#FFD591]",
  },
  "digital-experience": {
    icon: "🎨",
    bgClass: "bg-[#FFF0F6]",
    textClass: "text-[#C41D7F]",
    borderClass: "border-[#FFADD2]",
  },
  "cybersecurity": {
    icon: "🛡️",
    bgClass: "bg-[#FFF1F0]",
    textClass: "text-[#CF1322]",
    borderClass: "border-[#FFA39E]",
  },
  "legacy-systems-mainframe": {
    icon: "⚙️",
    bgClass: "bg-[#F9F0FF]",
    textClass: "text-[#531DAB]",
    borderClass: "border-[#D3ADF7]",
  },
  "project-agile-delivery": {
    icon: "⏱️",
    bgClass: "bg-[#F5F5F5]",
    textClass: "text-[#666666]",
    borderClass: "border-[#D9D9D9]",
  },
  "quality-engineering-testing": {
    icon: "🧪",
    bgClass: "bg-[#E6FFFB]",
    textClass: "text-[#08979C]",
    borderClass: "border-[#87E8DE]",
  },
}

const getPracticeMeta = (slug: string) => {
  return (
    PRACTICE_METADATA[slug] || {
      icon: "💼",
      bgClass: "bg-edito-chip",
      textClass: "text-edito-navy",
      borderClass: "border-edito-border",
    }
  );
}

export function KredoPracticesView({
  practices,
  selectedPractice,
  onSelectPractice,
  isMobile = false,
}: PracticesViewProps) {
  if (isMobile) {
    return (
      <div className="space-y-4 animate-fade-in">
        {practices.map((practice) => {
          const isSelected = selectedPractice?.id === practice.id
          const meta = getPracticeMeta(practice.slug)

          return (
            <div
              key={practice.id}
              className={`rounded-xl border bg-edito-surface overflow-hidden transition-all duration-200 ${
                isSelected
                  ? "border-edito-brass ring-1 ring-edito-brass shadow-sm"
                  : "border-edito-border/80"
              }`}
            >
              {/* Header Band */}
              <div className={`px-4 py-3 border-b ${meta.borderClass} ${meta.bgClass} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm shrink-0" role="img" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${meta.textClass}`}>
                    {practice.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPractice(isSelected ? null : practice)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/60 text-edito-navy font-bold text-xs shadow-xs"
                >
                  {isSelected ? "✕" : "→"}
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <p className="text-[11px] leading-relaxed text-edito-body">
                  {practice.description}
                </p>

                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                  <span>🛠️ {practice.jobCount} {practice.jobCount > 1 ? "métiers associés" : "métier associé"}</span>
                </div>

                {/* Technologies */}
                {practice.stackTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 border-t border-edito-border/50 pt-2.5">
                    {practice.stackTags.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md border border-edito-border/60 bg-edito-chip/55 px-1.5 py-0.5 text-[8px] font-semibold text-edito-muted"
                      >
                        {tech}
                      </span>
                    ))}
                    {practice.stackTags.length > 4 && (
                      <span className="text-[8px] font-bold text-edito-muted pt-0.5">
                        +{practice.stackTags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Mobile Accordion details */}
                {isSelected && (
                  <div className="mt-3 border-t border-edito-border/50 pt-3 space-y-3 animate-fade-in text-[11px]">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy block">
                        🎯 Périmètre d&apos;expertise
                      </span>
                      <p className="mt-1 text-edito-body leading-relaxed pl-3 border-l border-edito-brass/40">
                        {practice.perimeter}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-edito-navy block">
                        📋 Cadre méthodologique
                      </span>
                      <p className="mt-1 text-edito-muted pl-3 border-l border-edito-border">
                        Fédère les compétences technologiques, les méthodologies de delivery et les certifications métiers du domaine.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Desktop layout (4x2 grid of cards with lightweight color bands)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      {practices.map((practice) => {
        const isSelected = selectedPractice?.id === practice.id
        const meta = getPracticeMeta(practice.slug)

        return (
          <button
            key={practice.id}
            type="button"
            onClick={() => onSelectPractice(isSelected ? null : practice)}
            className={`w-full rounded-lg border text-left bg-edito-surface overflow-hidden transition-all duration-200 outline-none cursor-pointer ${
              isSelected
                ? "border-edito-brass ring-1 ring-edito-brass shadow-xs"
                : "border-edito-border hover:border-edito-muted hover:shadow-[0_2px_8px_rgba(216,155,22,0.05)]"
            }`}
          >
            {/* Colored Header Band */}
            <div className={`px-5 py-3 border-b ${meta.borderClass} ${meta.bgClass} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <span className="text-base shrink-0" role="img" aria-hidden="true">
                  {meta.icon}
                </span>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${meta.textClass}`}>
                  {practice.name}
                </h3>
              </div>
              <span className="inline-flex size-5 items-center justify-center rounded bg-white/80 text-xs text-edito-navy shadow-2xs font-bold">
                →
              </span>
            </div>

            {/* Editorial Content */}
            <div className="p-5 space-y-4">
              <p className="text-xs leading-relaxed text-edito-body line-clamp-2">
                {practice.description}
              </p>

              <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider text-edito-muted">
                <span>📁 {practice.jobCount} {practice.jobCount > 1 ? "métiers" : "métier"}</span>
                <span>🏷️ {practice.stackTags.length} {practice.stackTags.length > 1 ? "technologies" : "technologie"}</span>
              </div>

              {practice.stackTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-3 border-t border-edito-border/50">
                  {practice.stackTags.slice(0, 5).map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center rounded border border-edito-border/60 bg-edito-chip/55 px-2 py-0.5 text-[9px] font-medium text-edito-muted"
                    >
                      {tech}
                    </span>
                  ))}
                  {practice.stackTags.length > 5 && (
                    <span className="text-[9px] font-semibold text-edito-muted pt-0.5 ml-1">
                      +{practice.stackTags.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
