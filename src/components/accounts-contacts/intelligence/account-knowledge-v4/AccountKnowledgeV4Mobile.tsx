"use client"

// ─── Restitution V4 — Mobile (Account Intelligence, Lot 1) ──────────────────
// Lecture continue (edito §8) : une seule surface blanche, sections séparées par
// un filet, icône navy dans un carré clair, contenu indenté. Pas de réduction de
// la vue Desktop : même modèle de lecture, composition propre, cibles de 44 px.

import { useMemo, useState } from "react"

import type { AccountKnowledgeContentV4 } from "@/lib/intelligence/account-intelligence-contracts"
import {
  ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES,
  buildAccountKnowledgeV4View,
  countStatementsByMode,
  DEFAULT_ACCOUNT_KNOWLEDGE_EPISTEMIC_MODE,
  selectStatementsForMode,
  type AccountKnowledgeEpistemicMode,
  type AccountKnowledgeV4SourceEvidence,
} from "@/lib/intelligence/account-knowledge-v4-view"
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

export function AccountKnowledgeV4Mobile({
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

  return (
    // Une seule surface claire pour tout le bloc : la vue mobile tourne sous le thème
    // cockpit (cobalt), où du navy edito posé à nu serait illisible.
    <div className="space-y-4 rounded-xl border border-edito-border bg-edito-surface p-4">
      <AnchoringBanner banner={view.banner} producerLabel={view.producer.label} isMobile />

      <EpistemicModeSelector mode={mode} onChange={setMode} countsByMode={countsByMode} isMobile />

      <button
        type="button"
        onClick={() => setReaderOpen(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-edito-navy text-xs font-bold text-edito-navy transition-colors active:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
      >
        Lire le rapport complet
      </button>

      <div className="space-y-4 border-t border-edito-border pt-4">
        {view.sections.map((section) => {
          const Icon = ACCOUNT_KNOWLEDGE_V4_SECTION_ICONS[section.key]
          const { visible, hiddenCount } = selectStatementsForMode(section.statements, mode)
          return (
            <section
              key={section.key}
              aria-labelledby={`v4-mobile-${section.key}`}
              className="space-y-2 border-b border-edito-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-edito-navy/10 text-edito-navy">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h3 id={`v4-mobile-${section.key}`} className="text-xs font-bold uppercase tracking-wider text-edito-navy">
                  {section.title}
                </h3>
              </div>

              <div className="space-y-3 pl-8">
                {section.narrative.length > 0 ? (
                  <div className="space-y-2 text-xs leading-relaxed text-edito-body">
                    {section.narrative.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}

                {section.statements.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-edito-heading">
                      Affirmations qualifiées · {visible.length}
                    </p>
                    {visible.length > 0 ? (
                      <ul>
                        {visible.map((statement) => (
                          <StatementItem key={statement.key} statement={statement} isMobile />
                        ))}
                      </ul>
                    ) : null}
                    <HiddenByModeNote hiddenCount={hiddenCount} modeLabel={modeLabel} />
                  </div>
                ) : null}

                <KnowledgeGapsBlock gaps={section.gaps} isMobile />
                <SectionSourcesDisclosure sources={section.sources} isMobile />
              </div>
            </section>
          )
        })}
      </div>

      {readerOpen ? (
        <AccountKnowledgeV4ReportReader
          open={readerOpen}
          onOpenChange={setReaderOpen}
          view={view}
          companyName={companyName}
          isMobile
        />
      ) : null}
    </div>
  )
}
