"use client"

import { BI_CHAPTERS, type BiChapter } from "../navigation/business-intelligence-chapters"

type ChapterAvailability = Partial<Record<Exclude<BiChapter, "home">, boolean>>

type BusinessIntelligenceSignatureHeaderProps = {
  activeChapter: BiChapter
  title: string
  segmentName: string
  macroName?: string | null
  availability?: ChapterAvailability
  onNavigate?: (chapter: BiChapter) => void
}

function ChapterMarker({ available }: { available: boolean }) {
  return available ? (
    <span className="size-[18px] shrink-0 rounded-full border-2 border-white bg-edito-brass" aria-hidden="true" />
  ) : (
    <span className="size-[18px] shrink-0 rounded-full border-2 border-white/45 bg-transparent" aria-hidden="true" />
  )
}

function BusinessIntelligenceChapterRail({
  availability,
  onNavigate,
}: {
  availability: ChapterAvailability
  onNavigate?: (chapter: BiChapter) => void
}) {
  const chapters = BI_CHAPTERS.filter((chapter) => chapter.id !== "home")

  return (
    <nav aria-label="Parcours Business Intelligence" className="absolute left-[7%] top-[13%] h-[74%] w-[34%]">
      <div className="relative h-full">
        <div className="absolute bottom-2 left-[8px] top-2 w-px bg-white/45" aria-hidden="true" />
        <ol className="relative flex h-full flex-col justify-between">
          {chapters.map((chapter) => {
            const available = availability[chapter.id as Exclude<BiChapter, "home">] ?? false
            const content = (
              <>
                <ChapterMarker available={available} />
                <span className={available ? "text-[12px] font-bold leading-4 text-white" : "text-[12px] font-bold leading-4 text-white/48"}>
                  {chapter.label}
                </span>
              </>
            )

            if (!onNavigate) {
              return (
                <li key={chapter.id} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-4">
                  {content}
                </li>
              )
            }

            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(chapter.id)}
                  className="grid min-h-10 w-full grid-cols-[18px_1fr] items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass"
                  aria-label={`Ouvrir ${chapter.label}`}
                >
                  {content}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

function CompactPlanes() {
  return (
    <>
      <div
        className="absolute inset-0 bg-edito-navy"
        style={{ clipPath: "polygon(0 0, 66% 0, 61% 100%, 0 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-surface"
        style={{ clipPath: "polygon(66% 0, 69% 0, 64% 100%, 61% 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-brass"
        style={{ clipPath: "polygon(69% 0, 100% 0, 100% 100%, 64% 100%)" }}
        aria-hidden="true"
      />
    </>
  )
}

function BusinessIntelligenceHomeHeader({
  segmentName,
  macroName,
  availability = {},
  onNavigate,
}: Pick<BusinessIntelligenceSignatureHeaderProps, "segmentName" | "macroName" | "availability" | "onNavigate">) {
  return (
    <header className="relative h-[350px] shrink-0 overflow-hidden border-b border-edito-border">
      <div
        className="absolute inset-0 bg-edito-navy"
        style={{ clipPath: "polygon(0 0, 65% 0, 43% 100%, 0 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-surface"
        style={{ clipPath: "polygon(65% 0, 68.2% 0, 46.2% 100%, 43% 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-brass"
        style={{ clipPath: "polygon(68.2% 0, 100% 0, 100% 100%, 46.2% 100%)" }}
        aria-hidden="true"
      />

      <BusinessIntelligenceChapterRail availability={availability} onNavigate={onNavigate} />

      <div className="absolute right-[5.8%] top-[11%] w-[34%] text-edito-navy">
        <div className="min-w-0 text-right">
          <p className="truncate text-[21px] font-bold uppercase leading-none tracking-tight">{segmentName}</p>
          {macroName ? (
            <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.2em] text-edito-navy/70">{macroName}</p>
          ) : null}
        </div>

        <div className="mt-12 flex flex-col items-end text-right">
          <div className="inline-flex border-2 border-edito-navy bg-edito-surface px-3 py-1.5 text-[27px] font-black uppercase leading-none tracking-tight text-edito-navy">
            Business
          </div>
          <div className="mt-3 whitespace-nowrap text-[clamp(2.75rem,4vw,4.25rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] text-edito-navy">
            Intelligence
          </div>
        </div>
      </div>
    </header>
  )
}

function BusinessIntelligenceChapterHeader({
  segmentName,
  title,
}: Pick<BusinessIntelligenceSignatureHeaderProps, "segmentName" | "title">) {
  return (
    <header className="relative h-[88px] shrink-0 overflow-hidden border-b border-edito-border">
      <CompactPlanes />
      <div className="absolute inset-y-0 left-[4.5%] z-10 flex max-w-[54%] items-center">
        <p className="truncate text-[17px] font-black uppercase tracking-[0.035em] text-white">
          {segmentName}
        </p>
      </div>
      <div className="absolute inset-y-0 right-[5%] z-10 flex w-[29%] items-center justify-end text-right">
        <h1 className="line-clamp-2 text-[clamp(0.8rem,1.15vw,1.125rem)] font-black uppercase leading-tight tracking-[0.09em] text-edito-navy">
          {title}
        </h1>
      </div>
    </header>
  )
}

export function BusinessIntelligenceSignatureHeader(props: BusinessIntelligenceSignatureHeaderProps) {
  if (props.activeChapter === "home") {
    return (
      <BusinessIntelligenceHomeHeader
        segmentName={props.segmentName}
        macroName={props.macroName}
        availability={props.availability}
        onNavigate={props.onNavigate}
      />
    )
  }

  return <BusinessIntelligenceChapterHeader segmentName={props.segmentName} title={props.title} />
}
