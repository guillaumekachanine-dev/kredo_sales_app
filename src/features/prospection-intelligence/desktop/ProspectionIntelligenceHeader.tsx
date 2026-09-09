import {
  getProspectionDesktopChapterLabel,
  type PiTabKey,
} from "./ProspectionIntelligenceLocalNavigation"

export interface ProspectionIntelligenceHeaderProps {
  title?: string
  activeTab?: PiTabKey
}

export function ProspectionIntelligenceHeader({
  title,
  activeTab,
}: ProspectionIntelligenceHeaderProps = {}) {
  const displayTitle =
    title ?? (activeTab ? getProspectionDesktopChapterLabel(activeTab) : "Brief")

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-border/40 bg-surface/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex flex-1 items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <h1 className="font-heading text-lg font-bold tracking-tight text-heading">
            {displayTitle}
          </h1>
        </div>
      </div>
    </header>
  )
}
