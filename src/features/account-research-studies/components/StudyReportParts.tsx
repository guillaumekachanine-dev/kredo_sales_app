"use client"

// ─── Pièces partagées de la restitution d'une étude ─────────────────────────
// Consommées par les vues Desktop et Mobile — des pièces, pas une vue : rien n'est
// chargé puis masqué en CSS. `isMobile` règle les cibles tactiles (44 px) et tailles.

import { formatDayMonthYear } from "@/lib/formatting/date-fr"
import { cn } from "@/lib/utils"

import { STUDY_QUALIFICATION_HINTS, STUDY_QUALIFICATION_LABELS, type StudyQualification } from "../domain/study-contracts"
import {
  STUDY_EPISTEMIC_MODES,
  type StudyDocumentView,
  type StudyEpistemicMode,
  type StudyReportView,
  type StudyStatementView,
} from "../domain/study-view"

export type StudyReadingView = "text" | "statements"

const QUALIFICATION_BADGE_CLASSES: Record<StudyQualification, string> = {
  established: "border-edito-navy bg-edito-navy text-edito-surface",
  declared: "border-edito-heading bg-edito-surface text-edito-heading",
  inferred: "border-edito-border bg-edito-chip text-edito-body",
  // Ce qui est supposé ne ressemble pas à ce qui est établi, même en niveaux de gris.
  hypothesis: "border-dashed border-edito-brass bg-edito-amber-soft text-edito-ink",
}

export function QualificationBadge({ qualification }: { qualification: StudyQualification }) {
  return (
    <span
      title={STUDY_QUALIFICATION_HINTS[qualification]}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] font-bold uppercase tracking-wider",
        QUALIFICATION_BADGE_CLASSES[qualification],
      )}
    >
      {STUDY_QUALIFICATION_LABELS[qualification]}
    </span>
  )
}

export function StudyBanner({ view, isMobile = false }: { view: StudyReportView; isMobile?: boolean }) {
  const alert = view.banner.tone === "alert"
  return (
    <section
      aria-label="Provenance de l'étude"
      className={cn("rounded-lg border border-edito-border bg-edito-navy", isMobile ? "p-3.5" : "px-5 py-4")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold uppercase tracking-wider",
            alert ? "bg-edito-brass text-edito-ink" : "border border-edito-gold/60 text-edito-gold",
          )}
        >
          {alert ? "Sans source" : "Étude sourcée"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-surface/60">
          Importée le {formatDayMonthYear(view.importedAt)}
        </span>
      </div>
      <h3 className={cn("mt-2 font-bold text-edito-gold", isMobile ? "text-xs" : "text-sm")}>{view.title}</h3>
      <p className={cn("mt-1 leading-relaxed text-edito-surface/80", isMobile ? "text-[11px]" : "text-xs")}>{view.banner.body}</p>
      <p className="mt-2 font-mono text-[10px] text-edito-surface/60">{view.banner.metrics}</p>
    </section>
  )
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  isMobile,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string; hint?: string; count?: number }[]
  onChange: (value: T) => void
  isMobile: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex rounded border border-edito-border bg-edito-surface p-0.5",
        isMobile && "grid w-full",
      )}
      style={isMobile ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-sm px-3 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
              isMobile ? "min-h-[44px]" : "min-h-8",
              selected ? "bg-edito-navy text-edito-surface" : "text-edito-muted hover:bg-edito-chip hover:text-edito-heading",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("font-mono text-[10px]", selected ? "text-edito-gold" : "text-edito-muted")}>{option.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function ReadingViewToggle({
  value,
  onChange,
  statementsCount,
  isMobile = false,
}: {
  value: StudyReadingView
  onChange: (value: StudyReadingView) => void
  statementsCount: number
  isMobile?: boolean
}) {
  return (
    <SegmentedControl
      label="Lecture"
      value={value}
      onChange={onChange}
      isMobile={isMobile}
      options={[
        { value: "text", label: "Étude intégrale", hint: "Le texte complet de l'étude, rangé par section" },
        { value: "statements", label: "Affirmations", hint: "Les informations qualifiées et sourcées", count: statementsCount },
      ]}
    />
  )
}

export function EpistemicModeSelector({
  mode,
  onChange,
  countsByMode,
  isMobile = false,
}: {
  mode: StudyEpistemicMode
  onChange: (mode: StudyEpistemicMode) => void
  countsByMode: Record<StudyEpistemicMode, number>
  isMobile?: boolean
}) {
  return (
    <SegmentedControl
      label="Qualifications affichées"
      value={mode}
      onChange={onChange}
      isMobile={isMobile}
      options={STUDY_EPISTEMIC_MODES.map((entry) => ({
        value: entry.mode,
        label: entry.label,
        hint: entry.hint,
        count: countsByMode[entry.mode],
      }))}
    />
  )
}

export function DocumentChip({ document }: { document: StudyDocumentView }) {
  return (
    <a
      href={document.url}
      target="_blank"
      rel="noopener noreferrer"
      title={document.label}
      className="inline-flex max-w-full items-center gap-1 rounded border border-edito-border bg-edito-canvas px-1.5 py-0.5 text-[10px] font-semibold text-edito-heading hover:border-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
    >
      <span className="truncate">{document.domain}</span>
    </a>
  )
}

export function DocumentEntry({ document, isMobile = false }: { document: StudyDocumentView; isMobile?: boolean }) {
  const meta = [
    document.sourceTypeLabel,
    document.publisher,
    document.citationNumbers.length ? `citations n° ${document.citationNumbers.join(", ")}` : null,
  ].filter(Boolean)
  return (
    <li className="min-w-0">
      <a
        href={document.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "break-words font-semibold text-edito-heading underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
          isMobile ? "text-xs" : "text-[12px]",
        )}
      >
        {document.label}
      </a>
      <p className="mt-0.5 break-all text-[10px] text-edito-muted">{document.domain}</p>
      <p className="text-[10px] text-edito-muted">{meta.join(" · ")}</p>
      {document.defaultQualified ? (
        <p className="mt-0.5 text-[10px] font-semibold text-danger">Source non qualifiée par la conversion (qualification par défaut).</p>
      ) : null}
    </li>
  )
}

export function StatementItem({ statement, isMobile = false }: { statement: StudyStatementView; isMobile?: boolean }) {
  return (
    <li className="border-t border-edito-border/70 py-3 first:border-t-0">
      <div className={cn(isMobile ? "space-y-1.5" : "flex items-start gap-3")}>
        <div className={cn(!isMobile && "w-[92px] shrink-0 pt-0.5")}>
          <QualificationBadge qualification={statement.qualification} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("leading-relaxed text-edito-body", isMobile ? "text-xs" : "text-sm")}>{statement.text}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {statement.documents.map((document) => (
              <DocumentChip key={document.id} document={document} />
            ))}
            {statement.documents.length === 0 && statement.qualification !== "hypothesis" ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-danger">Aucune source citée par l&apos;étude</span>
            ) : null}
            {statement.qualifiedByFallback ? (
              <span className="text-[10px] font-semibold text-danger">Qualification non rendue — classée hypothèse par prudence</span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export function GapsBlock({ gaps, isMobile = false }: { gaps: string[]; isMobile?: boolean }) {
  if (gaps.length === 0) return null
  return (
    <div className="rounded border-l-2 border-edito-brass bg-edito-canvas px-3 py-2.5">
      <p className={cn("font-bold uppercase text-edito-heading", isMobile ? "text-[10px] tracking-wide" : "text-[11px] tracking-wider")}>
        Ce que l&apos;étude n&apos;a pas pu établir
      </p>
      <ul className={cn("mt-1.5 list-disc space-y-1 pl-4 leading-relaxed text-edito-body", isMobile ? "text-xs" : "text-[12px]")}>
        {gaps.map((gap, index) => (
          <li key={index}>{gap}</li>
        ))}
      </ul>
    </div>
  )
}

const CHEVRON = (
  <svg aria-hidden="true" className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

export function SectionDocumentsDisclosure({ documents, isMobile = false }: { documents: StudyDocumentView[]; isMobile?: boolean }) {
  if (documents.length === 0) return null
  return (
    <details className="group border-t border-edito-border pt-2">
      <summary
        className={cn(
          "inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-[10px] font-medium text-edito-muted select-none hover:text-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60 [&::-webkit-details-marker]:hidden",
          isMobile ? "min-h-[44px]" : "min-h-8",
        )}
      >
        {CHEVRON}
        Documents cités dans cette section — {documents.length}
      </summary>
      <ol className="mt-2 space-y-2.5 pl-1">
        {documents.map((document) => (
          <DocumentEntry key={document.id} document={document} isMobile={isMobile} />
        ))}
      </ol>
    </details>
  )
}

export function HiddenByModeNote({ hiddenCount }: { hiddenCount: number }) {
  if (hiddenCount === 0) return null
  return (
    <p className="text-[11px] italic text-edito-muted">
      {hiddenCount} affirmation{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""} par le filtre de qualification.
    </p>
  )
}
