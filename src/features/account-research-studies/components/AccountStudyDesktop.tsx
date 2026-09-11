"use client"

// ─── Étude publiée — Desktop ────────────────────────────────────────────────
// Analyse éditoriale (ADR-0006, `cockpit_intelligence_design` + `edito_bright_design`) :
// bandeau de provenance, puis un chapitre par section. Deux lectures du même contenu :
// l'étude intégrale (texte verbatim) ou les affirmations qualifiées. Ni l'une ni l'autre
// ne résume : l'étude intégrale est le texte du PDF, toute l'étude, rangée par section.

import { useMemo, useState } from "react"

import { formatSiren } from "../domain/study-format"
import type { AccountStudyKnowledge } from "../domain/study-contracts"
import {
  buildStudyReportView,
  countStatementsByMode,
  DEFAULT_STUDY_EPISTEMIC_MODE,
  selectStatementsForMode,
  type StudyEpistemicMode,
  type StudySectionView,
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

function SectionCard({
  section,
  reading,
  mode,
}: {
  section: StudySectionView
  reading: StudyReadingView
  mode: StudyEpistemicMode
}) {
  const { visible, hiddenCount } = selectStatementsForMode(section.statements, mode)
  return (
    <section aria-labelledby={`study-section-${section.key}`} className="overflow-hidden rounded-lg border border-edito-border bg-edito-surface">
      <header className="flex items-center justify-between gap-3 border-b border-edito-border bg-edito-navy px-4 py-2.5">
        <h3 id={`study-section-${section.key}`} className="flex items-baseline gap-2 text-[12px] font-bold uppercase tracking-wider text-edito-surface">
          <span className="font-mono text-[10px] text-edito-gold">{String(section.number).padStart(2, "0")}</span>
          {section.title}
        </h3>
        <span className="text-[10px] font-medium text-edito-surface/60">
          {section.blocks.length} bloc{section.blocks.length > 1 ? "s" : ""} · {section.statements.length} affirmation{section.statements.length > 1 ? "s" : ""}
        </span>
      </header>
      <div className="space-y-4 p-4">
        {reading === "text" ? (
          section.blocks.length > 0 ? (
            <div className="space-y-3">
              {section.blocks.map((block) => (
                <StudyBlockContent key={block.id} block={block} />
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-edito-muted">Aucun passage de l&apos;étude rangé dans cette section.</p>
          )
        ) : section.statements.length > 0 ? (
          <div>
            {visible.length > 0 ? (
              <ul>
                {visible.map((statement) => (
                  <StatementItem key={statement.id} statement={statement} />
                ))}
              </ul>
            ) : null}
            <HiddenByModeNote hiddenCount={hiddenCount} />
          </div>
        ) : (
          <p className="text-xs italic text-edito-muted">Aucune affirmation extraite dans cette section.</p>
        )}
        <GapsBlock gaps={section.gaps} />
        <SectionDocumentsDisclosure documents={section.documents} />
      </div>
    </section>
  )
}

export function AccountStudyDesktop({
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

  const identity = view.entity
    ? [
        view.entity.legal_name,
        view.entity.siren ? `SIREN ${formatSiren(view.entity.siren)}` : null,
        view.entity.naf_code ? `NAF ${view.entity.naf_code}` : null,
        view.entity.headquarters,
      ].filter(Boolean)
    : []

  return (
    <div className="space-y-5">
      <StudyBanner view={view} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edito-border pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <ReadingViewToggle value={reading} onChange={setReading} statementsCount={countsByMode.exploratory} />
          {reading === "statements" ? (
            <EpistemicModeSelector mode={mode} onChange={setMode} countsByMode={countsByMode} />
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {identity.length > 0 ? <p className="hidden text-[11px] text-edito-muted xl:block">{identity.join(" · ")}</p> : null}
          <button
            type="button"
            onClick={() => setReaderOpen(true)}
            className="inline-flex min-h-8 shrink-0 items-center rounded border border-edito-navy px-3 text-[11px] font-bold text-edito-navy transition-colors hover:bg-edito-navy hover:text-edito-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
          >
            Rapport complet
          </button>
        </div>
      </div>

      {view.sections.map((section) => (
        <SectionCard key={section.key} section={section} reading={reading} mode={mode} />
      ))}

      {readerOpen ? (
        <AccountStudyReader
          open={readerOpen}
          onOpenChange={setReaderOpen}
          view={view}
          studyId={studyId}
          companyName={companyName}
        />
      ) : null}
    </div>
  )
}
