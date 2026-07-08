"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table/DataTable"
import type {
  ClientIntelligenceIssue,
  ClientIntelligenceOfferRef,
} from "@/lib/intelligence/intelligence-data"
import type { CommercialStrategyContent } from "@/lib/intelligence/account-intelligence-contracts"
import { FactProvenanceBadge, SectionBlock } from "./intelligence-parts"

// ADR-0012 Lot 5 — rendu du mapping enjeu↔offre + angles/messages/objections
// (result_type=commercial_strategy, content_json pur — D-5, pas de table
// spine contrairement aux enjeux). Fichier séparé, même raison que
// AccountIssuesBlocks.tsx/AccountKnowledgeBlocks.tsx (vues déjà volumineuses).

const PERSONA_LABELS: Record<string, string> = {
  ceo: "CEO / Direction générale",
  cto_cio: "CTO / CIO",
  ciso: "CISO / RSSI",
  business_director: "Direction métier",
  purchasing: "Achats",
  hr_talent: "RH / Talent",
  technical: "Technique",
  operational: "Opérationnel",
  other: "Autre",
}

function personaLabel(key: string): string {
  return PERSONA_LABELS[key] ?? key
}

type ResolvedMatch = {
  issueId: string
  offerId: string
  issueTitle: string
  offerName: string
  offerPractice: string
  rationale: string
  provenance: CommercialStrategyContent["offer_matches"][number]["provenance"]
}

function resolveMatches(
  strategy: CommercialStrategyContent,
  issues: ClientIntelligenceIssue[],
  offers: ClientIntelligenceOfferRef[],
): ResolvedMatch[] {
  return strategy.offer_matches.map((match) => {
    const issue = issues.find((i) => i.id === match.issue_id)
    const offer = offers.find((o) => o.id === match.offer_id)
    return {
      issueId: match.issue_id,
      offerId: match.offer_id,
      issueTitle: issue?.title ?? "Enjeu non retrouvé",
      offerName: offer?.name ?? "Offre non retrouvée",
      offerPractice: offer?.practiceName ?? "",
      rationale: match.rationale,
      provenance: match.provenance,
    }
  })
}

// ─── Desktop — table triable (0 matrice visuelle custom, cf. décision Lot 4) ─

export function CommercialStrategyMatrixTable({
  strategy,
  issues,
  offers,
}: {
  strategy: CommercialStrategyContent
  issues: ClientIntelligenceIssue[]
  offers: ClientIntelligenceOfferRef[]
}) {
  const rows = resolveMatches(strategy, issues, offers)

  const columns: DataTableColumn<ResolvedMatch>[] = [
    {
      id: "issue",
      header: "Enjeu",
      cell: (row) => <p className="max-w-[16rem] truncate text-xs font-bold text-heading">{row.issueTitle}</p>,
    },
    {
      id: "offer",
      header: "Offre KREDO",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-heading">{row.offerName}</p>
          {row.offerPractice && <p className="text-[10px] text-muted">{row.offerPractice}</p>}
        </div>
      ),
    },
    {
      id: "provenance",
      header: "Preuve",
      align: "center",
      cell: (row) => <FactProvenanceBadge provenance={row.provenance} />,
    },
    {
      id: "rationale",
      header: "Justification",
      cell: (row) => <span className="text-[11px] leading-relaxed text-body">{row.rationale}</span>,
    },
  ]

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => `${row.issueId}-${row.offerId}`}
      ariaLabel="Mapping enjeu vers offre"
      emptyState={
        <div className="flex min-h-24 flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold text-heading">Aucun mapping enjeu↔offre proposé.</p>
        </div>
      }
    />
  )
}

// ─── Mobile — liste de cartes (jamais de DataTable en mobile) ───────────────

export function CommercialStrategyMatrixList({
  strategy,
  issues,
  offers,
}: {
  strategy: CommercialStrategyContent
  issues: ClientIntelligenceIssue[]
  offers: ClientIntelligenceOfferRef[]
}) {
  const rows = resolveMatches(strategy, issues, offers)

  if (rows.length === 0) {
    return <p className="text-xs italic text-muted">Aucun mapping enjeu↔offre proposé.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${row.issueId}-${row.offerId}`} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-heading">{row.offerName}</p>
            <FactProvenanceBadge provenance={row.provenance} />
          </div>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">→ {row.issueTitle}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-body">{row.rationale}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Angles / messages / objections — partagés Desktop & Mobile ────────────

export function ApproachAnglesList({ angles }: { angles: string[] }) {
  if (angles.length === 0) return <p className="text-xs italic text-muted">Aucun angle proposé.</p>
  return (
    <ol className="space-y-2">
      {angles.map((angle, i) => (
        <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-body">
          <span className="shrink-0 font-heading font-bold text-primary">{i + 1}.</span>
          {angle}
        </li>
      ))}
    </ol>
  )
}

export function PersonaMessagesList({ messages }: { messages: Record<string, string[]> }) {
  const entries = Object.entries(messages)
  if (entries.length === 0) return <p className="text-xs italic text-muted">Aucun message par persona.</p>
  return (
    <div className="space-y-3">
      {entries.map(([persona, msgs]) => (
        <div key={persona}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{personaLabel(persona)}</p>
          <ul className="mt-1 space-y-1">
            {msgs.map((m, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-body">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ObjectionsList({ objections }: { objections: CommercialStrategyContent["objections"] }) {
  if (objections.length === 0) return <p className="text-xs italic text-muted">Aucune objection anticipée.</p>
  return (
    <div className="space-y-3">
      {objections.map((obj, i) => (
        <div key={i} className="rounded border border-border/60 bg-canvas/40 p-2.5">
          <p className="text-xs font-bold text-heading">« {obj.objection} »</p>
          <p className="mt-1 text-[11px] leading-relaxed text-body">{obj.response}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Bloc composite — enveloppe les 4 sections, réutilisé Desktop & Mobile ──

export function CommercialStrategyGeneratedContent({
  strategy,
  issues,
  offers,
  isMobile,
}: {
  strategy: CommercialStrategyContent
  issues: ClientIntelligenceIssue[]
  offers: ClientIntelligenceOfferRef[]
  isMobile: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  return (
    <div className="space-y-4">
      <SectionBlock title="Angles d'approche">
        <ApproachAnglesList angles={strategy.approach_angles} />
      </SectionBlock>
      <SectionBlock title="Mapping enjeu → offre">
        {isMobile ? (
          <CommercialStrategyMatrixList strategy={strategy} issues={issues} offers={offers} />
        ) : (
          <CommercialStrategyMatrixTable strategy={strategy} issues={issues} offers={offers} />
        )}
      </SectionBlock>
      <SectionBlock
        title="Messages clés par persona"
        action={
          Object.keys(strategy.key_messages_by_persona).length > 2 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={cn("text-[10px] font-bold uppercase tracking-wider text-primary")}
            >
              {showAll ? "Réduire" : "Tout voir"}
            </button>
          ) : undefined
        }
      >
        <PersonaMessagesList
          messages={
            showAll
              ? strategy.key_messages_by_persona
              : Object.fromEntries(Object.entries(strategy.key_messages_by_persona).slice(0, 2))
          }
        />
      </SectionBlock>
      <SectionBlock title="Objections anticipées">
        <ObjectionsList objections={strategy.objections} />
      </SectionBlock>
    </div>
  )
}
