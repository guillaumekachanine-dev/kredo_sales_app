"use client"

// ─── Restitution V4 — Desktop (Account Intelligence, Lot 1) ─────────────────
// Analyse éditoriale dense (ADR-0006, `cockpit_intelligence_design` +
// `edito_bright_design`) : bandeau d'ancrage en tête, synthèse pleine largeur,
// puis un chapitre par section, récit d'abord et affirmations qualifiées ensuite.
// Les chapitres sont empilés en une colonne : ce sont des textes longs, pas des
// cartes de valeurs — edito §7 réserve la grille 2 colonnes « lorsque pertinent ».

import { useMemo, useState } from "react"

import type { AccountKnowledgeContentV4 } from "@/lib/intelligence/account-intelligence-contracts"
import {
  ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES,
  buildAccountKnowledgeV4View,
  countStatementsByMode,
  DEFAULT_ACCOUNT_KNOWLEDGE_EPISTEMIC_MODE,
  formatSiren,
  selectStatementsForMode,
  type AccountKnowledgeEpistemicMode,
  type AccountKnowledgeV4SectionView,
  type AccountKnowledgeV4SourceEvidence,
} from "@/lib/intelligence/account-knowledge-v4-view"
import { FolioStudySection, FolioStudySummary } from "../folio-v3/FolioStudyLayouts"
import { FolioNarrativeBlock, FolioStudySubheading } from "../folio-v3/FolioStudyPrimitives"
import {
  ACCOUNT_KNOWLEDGE_V4_SECTION_ICONS,
  AnchoringBanner,
  EpistemicModeSelector,
  HiddenByModeNote,
  KnowledgeGapsBlock,
  SectionSourcesDisclosure,
  StatementItem,
} from "./AccountKnowledgeV4Parts"
import { AccountKnowledgeV4ReportReader } from "./AccountKnowledgeV4ReportReader"

function SectionBody({
  section,
  mode,
  modeLabel,
}: {
  section: AccountKnowledgeV4SectionView
  mode: AccountKnowledgeEpistemicMode
  modeLabel: string
}) {
  const { visible, hiddenCount } = selectStatementsForMode(section.statements, mode)
  return (
    <>
      {section.narrative.length > 0 ? (
        <FolioNarrativeBlock>
          {section.narrative.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </FolioNarrativeBlock>
      ) : null}

      {section.statements.length > 0 ? (
        <div className="space-y-1">
          <FolioStudySubheading label={`Affirmations qualifiées · ${visible.length}`} />
          {visible.length > 0 ? (
            <ul>
              {visible.map((statement) => (
                <StatementItem key={statement.key} statement={statement} />
              ))}
            </ul>
          ) : null}
          <HiddenByModeNote hiddenCount={hiddenCount} modeLabel={modeLabel} />
        </div>
      ) : null}

      <KnowledgeGapsBlock gaps={section.gaps} />
      <SectionSourcesDisclosure sources={section.sources} />
    </>
  )
}

export function AccountKnowledgeV4Desktop({
  content,
  sourceEvidence,
  companyName,
}: {
  content: AccountKnowledgeContentV4
  sourceEvidence: readonly AccountKnowledgeV4SourceEvidence[]
  companyName: string
}) {
  const [mode, setMode] = useState<AccountKnowledgeEpistemicMode>(DEFAULT_ACCOUNT_KNOWLEDGE_EPISTEMIC_MODE)
  const [readerOpen, setReaderOpen] = useState(false)

  const view = useMemo(() => buildAccountKnowledgeV4View(content, sourceEvidence), [content, sourceEvidence])
  const countsByMode = useMemo(() => countStatementsByMode(view.statementCounts), [view.statementCounts])
  const modeLabel = ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES.find((entry) => entry.mode === mode)?.label.toLowerCase() ?? ""

  const synthesis = view.sections.find((section) => section.key === "synthesis") ?? null
  const chapters = view.sections.filter((section) => section.key !== "synthesis")

  const identity = [
    view.entity.legalName,
    view.entity.siren ? `SIREN ${formatSiren(view.entity.siren)}` : null,
    view.entity.nafCode ? `NAF ${view.entity.nafCode}` : null,
    view.entity.headquarters,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <AnchoringBanner banner={view.banner} producerLabel={view.producer.label} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edito-border pb-3">
        <EpistemicModeSelector mode={mode} onChange={setMode} countsByMode={countsByMode} />
        <div className="flex items-center gap-3">
          {identity.length > 0 ? (
            <p className="hidden text-[11px] text-edito-muted xl:block">{identity.join(" · ")}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setReaderOpen(true)}
            className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded border border-edito-navy px-3 text-[11px] font-bold text-edito-navy transition-colors hover:bg-edito-navy hover:text-edito-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5c1.75 0 3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18c-1.75 0-3.33.48-4.5 1.25" />
            </svg>
            Rapport complet
          </button>
        </div>
      </div>

      {synthesis ? (
        <FolioStudySummary>
          <SectionBody section={synthesis} mode={mode} modeLabel={modeLabel} />
        </FolioStudySummary>
      ) : null}

      {chapters.map((section) => (
        <FolioStudySection
          key={section.key}
          title={section.title}
          icon={ACCOUNT_KNOWLEDGE_V4_SECTION_ICONS[section.key]}
        >
          <SectionBody section={section} mode={mode} modeLabel={modeLabel} />
        </FolioStudySection>
      ))}

      {readerOpen ? (
        <AccountKnowledgeV4ReportReader
          open={readerOpen}
          onOpenChange={setReaderOpen}
          view={view}
          companyName={companyName}
        />
      ) : null}
    </div>
  )
}
