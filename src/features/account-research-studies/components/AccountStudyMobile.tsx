"use client"

// ─── Étude publiée — Mobile ─────────────────────────────────────────────────
// Lecture continue (edito §8) sur UNE surface claire : la vue mobile tourne sous le
// thème cockpit (cobalt), où du navy edito posé à nu serait illisible. Même modèle de
// lecture que le Desktop, composition propre, cibles de 44 px.

import { useMemo, useState } from "react"

import type { AccountStudyKnowledge } from "../domain/study-contracts"
import {
  buildStudyReportView,
  countStatementsByMode,
  DEFAULT_STUDY_EPISTEMIC_MODE,
  selectStatementsForMode,
  type StudyEpistemicMode,
} from "../domain/study-view"
import { AccountStudyReader } from "./AccountStudyReader"
import {
  EpistemicModeSelector,
  GapsBlock,
  HiddenByModeNote,
  ReadingViewToggle,
  SectionDocumentsDisclosure,
  StatementItem,
  StudyBanner,
  type StudyReadingView,
} from "./StudyReportParts"
import { StudyBlockContent } from "./StudyText"

export function AccountStudyMobile({
  studyId,
  knowledge,
  companyName,
}: {
  studyId: string
  knowledge: AccountStudyKnowledge
  companyName: string
}) {
  const [reading, setReading] = useState<StudyReadingView>("text")
  const [mode, setMode] = useState<StudyEpistemicMode>(DEFAULT_STUDY_EPISTEMIC_MODE)
  const [readerOpen, setReaderOpen] = useState(false)

  const view = useMemo(() => buildStudyReportView(knowledge), [knowledge])
  const countsByMode = useMemo(() => countStatementsByMode(view.statementCounts), [view.statementCounts])

  return (
    <div className="space-y-4 rounded-xl border border-edito-border bg-edito-surface p-4">
      <StudyBanner view={view} isMobile />

      <ReadingViewToggle value={reading} onChange={setReading} statementsCount={countsByMode.exploratory} isMobile />
      {reading === "statements" ? (
        <EpistemicModeSelector mode={mode} onChange={setMode} countsByMode={countsByMode} isMobile />
      ) : null}

      <button
        type="button"
        onClick={() => setReaderOpen(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-edito-navy text-xs font-bold text-edito-navy active:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
      >
        Lire le rapport complet
      </button>

      <div className="space-y-4 border-t border-edito-border pt-4">
        {view.sections.map((section) => {
          const { visible, hiddenCount } = selectStatementsForMode(section.statements, mode)
          return (
            <section
              key={section.key}
              aria-labelledby={`study-mobile-${section.key}`}
              className="space-y-2 border-b border-edito-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-edito-navy/10 font-mono text-[10px] font-bold text-edito-navy">
                  {section.number}
                </span>
                <h3 id={`study-mobile-${section.key}`} className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                  {section.title}
                </h3>
              </div>
              <div className="space-y-3 pl-8">
                {reading === "text" ? (
                  section.blocks.map((block) => <StudyBlockContent key={block.id} block={block} isMobile />)
                ) : (
                  <div>
                    {visible.length > 0 ? (
                      <ul>
                        {visible.map((statement) => (
                          <StatementItem key={statement.id} statement={statement} isMobile />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] italic text-edito-muted">Aucune affirmation dans cette section.</p>
                    )}
                    <HiddenByModeNote hiddenCount={hiddenCount} />
                  </div>
                )}
                <GapsBlock gaps={section.gaps} isMobile />
                <SectionDocumentsDisclosure documents={section.documents} isMobile />
              </div>
            </section>
          )
        })}
      </div>

      {readerOpen ? (
        <AccountStudyReader
          open={readerOpen}
          onOpenChange={setReaderOpen}
          view={view}
          studyId={studyId}
          companyName={companyName}
          isMobile
        />
      ) : null}
    </div>
  )
}
