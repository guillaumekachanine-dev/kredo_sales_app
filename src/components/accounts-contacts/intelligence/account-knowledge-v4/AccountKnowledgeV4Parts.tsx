"use client"

// ─── Pièces partagées de la restitution V4 (Account Intelligence, Lot 1) ────
// Consommées par `AccountKnowledgeV4Desktop` ET `AccountKnowledgeV4Mobile` : ce
// sont des pièces, pas une vue — aucune n'est chargée puis masquée en CSS. La
// variante passe par `isMobile` (cibles tactiles 44 px, tailles `edito` mobile).
//
// Toute la logique (bandeau, numérotation, modes, mises en garde) vit dans
// `@/lib/intelligence/account-knowledge-v4-view` ; ici, uniquement du rendu.

import type { ComponentType } from "react"

import { formatDayMonthYear } from "@/lib/formatting/date-fr"
import type { AccountKnowledgeQualificationV4, AccountKnowledgeV4SectionKey } from "@/lib/intelligence/account-intelligence-contracts"
import {
  ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES,
  ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_HINTS,
  ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_LABELS,
  type AccountKnowledgeEpistemicMode,
  type AccountKnowledgeV4Banner,
  type AccountKnowledgeV4SourceView,
  type AccountKnowledgeV4StatementView,
} from "@/lib/intelligence/account-knowledge-v4-view"
import { cn } from "@/lib/utils"
import { BarChart2, Compass, Link2, Shield, Swords, Target, Users } from "@/features/legacy/folio/icons"
import { FolioSourceMarker } from "../folio-v3/FolioStudyPrimitives"

// ─── Icônes de section ──────────────────────────────────────────────────────
// Icônes line existantes (edito §10) — aucune nouvelle icône.

export const ACCOUNT_KNOWLEDGE_V4_SECTION_ICONS: Record<
  AccountKnowledgeV4SectionKey,
  ComponentType<{ className?: string }>
> = {
  synthesis: Compass,
  identity: Shield,
  business_and_offering: Target,
  customers_and_market: Users,
  competition_and_positioning: Swords,
  value_chain_and_dependencies: Link2,
  history_ambitions_and_news: Compass,
  implications_for_kredo: BarChart2,
}

// ─── Badge épistémique ──────────────────────────────────────────────────────
// Le libellé porte l'information ; la couleur ne fait que la redoubler (edito
// §14). L'hypothèse a une bordure en tirets : ce qui est supposé ne ressemble
// pas à ce qui est établi, même en niveaux de gris.

const QUALIFICATION_BADGE_CLASSES: Record<AccountKnowledgeQualificationV4, string> = {
  established: "border-edito-navy bg-edito-navy text-edito-surface",
  declared: "border-edito-heading bg-edito-surface text-edito-heading",
  inferred: "border-edito-border bg-edito-chip text-edito-body",
  hypothesis: "border-dashed border-edito-brass bg-edito-amber-soft text-edito-ink",
}

export function QualificationBadge({
  qualification,
  isMobile = false,
}: {
  qualification: AccountKnowledgeQualificationV4
  isMobile?: boolean
}) {
  return (
    <span
      title={ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_HINTS[qualification]}
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 font-bold uppercase tracking-wider",
        isMobile ? "h-5 text-[9px]" : "h-5 text-[10px]",
        QUALIFICATION_BADGE_CLASSES[qualification],
      )}
    >
      {ACCOUNT_KNOWLEDGE_V4_QUALIFICATION_LABELS[qualification]}
    </span>
  )
}

// ─── Bandeau d'ancrage ──────────────────────────────────────────────────────
// Bandeau éditorial edito (§7) : fond navy, badge brass, titre gold, explication
// courte. Il n'est pas décoratif (`04` §8) : c'est la première chose lue.

const BANNER_BADGE_LABELS: Record<AccountKnowledgeV4Banner["status"], string> = {
  nominal: "Ancrage nominal",
  degraded: "Collecte en échec",
  internal_only: "Sans source externe",
}

export function AnchoringBanner({
  banner,
  producerLabel,
  isMobile = false,
}: {
  banner: AccountKnowledgeV4Banner
  producerLabel: string
  isMobile?: boolean
}) {
  const alert = banner.tone === "alert"
  return (
    <section
      aria-label="Ancrage de l'analyse"
      role={alert ? "note" : undefined}
      className={cn(
        "rounded-lg border border-edito-border bg-edito-navy",
        isMobile ? "p-3.5" : "px-5 py-4",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-bold uppercase tracking-wider",
            alert ? "bg-edito-brass text-edito-ink" : "border border-edito-gold/60 text-edito-gold",
          )}
        >
          {alert ? (
            <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {BANNER_BADGE_LABELS[banner.status]}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-edito-surface/60">{producerLabel}</span>
      </div>
      <h3 className={cn("mt-2 font-bold text-edito-gold", isMobile ? "text-xs" : "text-sm")}>{banner.title}</h3>
      <p className={cn("mt-1 leading-relaxed text-edito-surface/80", isMobile ? "text-[11px]" : "text-xs")}>
        {banner.body}
      </p>
      <p className="mt-2 font-mono text-[10px] text-edito-surface/60">{banner.metrics}</p>
    </section>
  )
}

// ─── Sélecteur de mode (04 §4) ──────────────────────────────────────────────

export function EpistemicModeSelector({
  mode,
  onChange,
  countsByMode,
  isMobile = false,
}: {
  mode: AccountKnowledgeEpistemicMode
  onChange: (mode: AccountKnowledgeEpistemicMode) => void
  countsByMode: Record<AccountKnowledgeEpistemicMode, number>
  isMobile?: boolean
}) {
  const active = ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES.find((entry) => entry.mode === mode)
  return (
    <div className={cn(isMobile ? "space-y-1.5" : "flex flex-wrap items-center gap-3")}>
      <div
        role="group"
        aria-label="Mode de lecture"
        className={cn(
          "inline-flex rounded border border-edito-border bg-edito-surface p-0.5",
          isMobile && "grid w-full grid-cols-3",
        )}
      >
        {ACCOUNT_KNOWLEDGE_EPISTEMIC_MODES.map((entry) => {
          const selected = entry.mode === mode
          return (
            <button
              key={entry.mode}
              type="button"
              aria-pressed={selected}
              title={entry.hint}
              onClick={() => onChange(entry.mode)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-sm px-3 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
                isMobile ? "min-h-[44px]" : "min-h-8",
                selected
                  ? "bg-edito-navy text-edito-surface"
                  : "text-edito-muted hover:bg-edito-chip hover:text-edito-heading",
              )}
            >
              {entry.label}
              <span className={cn("font-mono text-[10px]", selected ? "text-edito-gold" : "text-edito-muted")}>
                {countsByMode[entry.mode]}
              </span>
            </button>
          )
        })}
      </div>
      {active ? <p className="text-[11px] text-edito-muted">{active.hint}</p> : null}
    </div>
  )
}

// ─── Sources ────────────────────────────────────────────────────────────────

function formatDate(value: string | null): string | null {
  return value ? formatDayMonthYear(value) : null
}

const EXCERPT_MAX_CHARS = 320

function clampExcerpt(excerpt: string): string {
  return excerpt.length > EXCERPT_MAX_CHARS ? `${excerpt.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…` : excerpt
}

/** Marqueurs `[n]` en fin d'affirmation — numéro global, identique dans tout le rapport. */
export function SourceMarkers({ sources }: { sources: AccountKnowledgeV4SourceView[] }) {
  if (sources.length === 0) return null
  return (
    <>
      {sources.map((source) =>
        source.url ? (
          <FolioSourceMarker key={source.id} index={source.number} url={source.url} />
        ) : (
          <span
            key={source.id}
            title={source.caveat ?? source.sourceTypeLabel}
            className="ml-0.5 align-super text-[9px] text-edito-muted"
          >
            [{source.number}]
          </span>
        ),
      )}
    </>
  )
}

export function SourceEntry({ source, isMobile = false }: { source: AccountKnowledgeV4SourceView; isMobile?: boolean }) {
  const consulted = formatDate(source.consultedAt)
  const published = formatDate(source.publishedAt)
  const meta = [
    source.sourceTypeLabel,
    source.domain,
    published ? `publié le ${published}` : null,
    consulted ? `consulté le ${consulted}` : null,
  ].filter(Boolean)

  return (
    <li className="flex gap-2">
      <span className="w-6 shrink-0 pt-px text-right font-mono text-[10px] text-edito-muted">[{source.number}]</span>
      <div className="min-w-0 flex-1">
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "break-words font-semibold text-edito-heading underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
              isMobile ? "text-xs" : "text-[12px]",
            )}
          >
            {source.label}
          </a>
        ) : (
          <span className={cn("break-words font-semibold text-edito-body", isMobile ? "text-xs" : "text-[12px]")}>
            {source.label}
          </span>
        )}
        <p className="mt-0.5 text-[10px] text-edito-muted">{meta.join(" · ")}</p>
        {source.excerpt ? (
          <blockquote className="mt-1.5 border-l-2 border-edito-border pl-2.5 text-[11px] italic leading-relaxed text-edito-body">
            « {clampExcerpt(source.excerpt)} »
          </blockquote>
        ) : null}
        {source.caveat ? (
          <p className="mt-1 text-[10px] font-semibold text-danger">{source.caveat}</p>
        ) : null}
      </div>
    </li>
  )
}

const CHEVRON = (
  <svg aria-hidden="true" className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

/**
 * Bouton **Vérifier** — désactivé. La vérification à la demande (`04` §7) arrive
 * au Lot 5 : INTEL-034 n'a jamais tourné avec succès. Le bouton existe dès
 * maintenant pour que la place de l'action soit fixée, pas pour la simuler.
 */
export function VerifyButton({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title="Vérification indépendante à la demande — disponible prochainement"
      className={cn(
        "inline-flex cursor-not-allowed items-center gap-1.5 rounded border border-edito-border px-2.5 text-[11px] font-bold text-edito-muted opacity-70",
        isMobile ? "min-h-[44px]" : "min-h-7",
      )}
    >
      Vérifier
      <span className="text-[9px] font-medium uppercase tracking-wider">bientôt</span>
    </button>
  )
}

/** Disclosure `Sources` au niveau de l'affirmation (`04` §8 — à la demande). */
export function StatementSourcesDisclosure({
  statement,
  isMobile = false,
}: {
  statement: AccountKnowledgeV4StatementView
  isMobile?: boolean
}) {
  const count = statement.sources.length
  return (
    <details className="group">
      <summary
        className={cn(
          "inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-[11px] font-semibold text-edito-muted select-none hover:text-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60 [&::-webkit-details-marker]:hidden",
          isMobile ? "min-h-[44px]" : "min-h-7",
        )}
      >
        {CHEVRON}
        {count === 0 ? "Aucune source citée" : `Sources · ${count}`}
      </summary>
      <div className="mt-2 space-y-3 rounded border border-edito-border bg-edito-canvas p-3">
        {count === 0 ? (
          <p className="text-[11px] text-edito-muted">
            {statement.qualification === "hypothesis"
              ? "Une hypothèse n'a pas à citer de source : elle se présente comme une piste à explorer."
              : "Cette affirmation ne cite aucune source."}
          </p>
        ) : (
          <ol className="space-y-2.5">
            {statement.sources.map((source) => (
              <SourceEntry key={source.id} source={source} isMobile={isMobile} />
            ))}
          </ol>
        )}
        <div className="border-t border-edito-border pt-2.5">
          <VerifyButton isMobile={isMobile} />
        </div>
      </div>
    </details>
  )
}

/** Une affirmation qualifiée : badge, texte, marqueurs, mise en garde, sources à la demande. */
export function StatementItem({
  statement,
  isMobile = false,
}: {
  statement: AccountKnowledgeV4StatementView
  isMobile?: boolean
}) {
  return (
    <li className={cn("border-t border-edito-border/70 first:border-t-0", isMobile ? "py-3" : "py-3")}>
      <div className={cn(isMobile ? "space-y-1.5" : "flex items-start gap-3")}>
        <div className={cn("flex flex-wrap items-center gap-1.5", !isMobile && "w-[92px] shrink-0 pt-0.5")}>
          <QualificationBadge qualification={statement.qualification} isMobile={isMobile} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("leading-relaxed text-edito-body", isMobile ? "text-xs" : "text-sm")}>
            {statement.text}
            <SourceMarkers sources={statement.sources} />
          </p>
          {statement.unanchoredClaim ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-danger">
              Aucune source externe — à ne pas tenir pour acquis
            </p>
          ) : null}
          <div className="mt-1">
            <StatementSourcesDisclosure statement={statement} isMobile={isMobile} />
          </div>
        </div>
      </div>
    </li>
  )
}

/** Lacunes déclarées de la section — toujours visibles (`04` §8). */
export function KnowledgeGapsBlock({ gaps, isMobile = false }: { gaps: string[]; isMobile?: boolean }) {
  if (gaps.length === 0) return null
  return (
    <div className="rounded border-l-2 border-edito-brass bg-edito-canvas px-3 py-2.5">
      <p className={cn("font-bold uppercase text-edito-heading", isMobile ? "text-[10px] tracking-wide" : "text-[11px] tracking-wider")}>
        Ce que l&apos;analyse n&apos;a pas pu établir
      </p>
      <ul className={cn("mt-1.5 list-disc space-y-1 pl-4 leading-relaxed text-edito-body", isMobile ? "text-xs" : "text-[12px]")}>
        {gaps.map((gap, index) => (
          <li key={index}>{gap}</li>
        ))}
      </ul>
    </div>
  )
}

/** Sources de la section (récit + affirmations), numérotation globale. */
export function SectionSourcesDisclosure({
  sources,
  isMobile = false,
}: {
  sources: AccountKnowledgeV4SourceView[]
  isMobile?: boolean
}) {
  if (sources.length === 0) return null
  return (
    <details className="group border-t border-edito-border pt-2">
      <summary
        className={cn(
          "inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-[10px] font-medium text-edito-muted select-none hover:text-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60 [&::-webkit-details-marker]:hidden",
          isMobile ? "min-h-[44px]" : "min-h-8",
        )}
      >
        {CHEVRON}
        Sources de la section — {sources.length}
      </summary>
      <ol className="mt-2 space-y-2.5">
        {sources.map((source) => (
          <SourceEntry key={source.id} source={source} isMobile={isMobile} />
        ))}
      </ol>
    </details>
  )
}

/** Mention de masquage par le mode — le filtre ne cache jamais sans le dire. */
export function HiddenByModeNote({ hiddenCount, modeLabel }: { hiddenCount: number; modeLabel: string }) {
  if (hiddenCount === 0) return null
  return (
    <p className="text-[11px] italic text-edito-muted">
      {hiddenCount} affirmation{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""} en mode {modeLabel}.
    </p>
  )
}
