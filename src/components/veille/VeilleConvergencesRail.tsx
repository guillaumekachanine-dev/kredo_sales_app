"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { cn } from "@/lib/utils"
import type { CompanyContextStats, VeilleArticle } from "@/app/(app)/veille/_data/veille-data"
import { parseVeilleArticleConvergences } from "@/features/veille/convergences/domain/parse-veille-convergences"
import type {
  VeilleArticleConvergencesConfidence,
  VeilleConvergenceEvidenceRef,
  VeilleConvergenceEvidenceType,
  VeilleConvergenceMatchedIssue,
  VeilleConvergencePlaybookSuggestion,
  VeilleConvergenceRecommendedAction,
  VeilleConvergenceRelatedAccount,
  VeilleConvergenceRelatedOpportunity,
} from "@/features/veille/convergences/domain/veille-convergences-contracts"

export interface VeilleConvergencesRailProps {
  article: VeilleArticle
  company: CompanyContextStats | null
  watched: boolean
  onPitch: () => void
  onNote: () => void
  onQualify: () => void
  onAddToList: () => void
  onOpportunity: () => void
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-border pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-heading">
      {children}
    </h2>
  )
}

function confidenceLabel(confidence: VeilleArticleConvergencesConfidence): string {
  switch (confidence) {
    case "high":
      return "Confiance élevée"
    case "medium":
      return "Confiance moyenne"
    case "low":
      return "Confiance faible"
  }
}

function confidenceBadgeClass(confidence: VeilleArticleConvergencesConfidence): string {
  switch (confidence) {
    case "high":
      return "border-success/30 bg-success/10 text-success"
    case "medium":
      return "border-brand-brass/30 bg-brand-brass/10 text-brand-brass"
    case "low":
      return "border-border bg-edito-canvas text-muted"
  }
}

function evidenceTypeLabel(type: VeilleConvergenceEvidenceType): string {
  switch (type) {
    case "article":
      return "Article"
    case "company":
      return "Compte"
    case "account_issue":
      return "Enjeu"
    case "account_signal":
      return "Signal"
    case "account_fact":
      return "Fait"
    case "opportunity":
      return "Opportunité"
    case "sector_playbook":
      return "Playbook"
  }
}

function ConvergenceHeader({ confidence }: { confidence: VeilleArticleConvergencesConfidence }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
      <h3 className="font-heading text-xs font-bold text-heading">
        Convergences identifiées
      </h3>
      <span
        className={cn(
          "inline-flex items-center rounded-xs border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
          confidenceBadgeClass(confidence)
        )}
      >
        Confiance de convergence : {confidenceLabel(confidence)}
      </span>
    </div>
  )
}

function ConvergenceSummary({ synthesis }: { synthesis: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs leading-relaxed text-heading font-medium">{synthesis}</p>
    </div>
  )
}

function RelatedAccountsSection({ accounts }: { accounts: VeilleConvergenceRelatedAccount[] }) {
  if (accounts.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeading>Comptes concernés ({accounts.length})</SectionHeading>
      <ul className="space-y-2 text-[11px]" aria-label="Comptes concernés">
        {accounts.map((account, index) => (
          <li key={`${account.companyId}-${index}`} className="space-y-0.5">
            <div>
              {account.companyId ? (
                <Link
                  href={`/prospection/accounts?drawer=${account.companyId}`}
                  className="font-bold text-xs text-primary hover:underline outline-none focus-visible:ring-1 focus-visible:ring-heading"
                >
                  {account.companyName}
                </Link>
              ) : (
                <span className="font-bold text-xs text-heading">{account.companyName}</span>
              )}
            </div>
            {account.rationale ? (
              <p className="text-[11px] leading-snug text-body">{account.rationale}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MatchedIssuesSection({ issues }: { issues: VeilleConvergenceMatchedIssue[] }) {
  if (issues.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeading>Enjeux détectés ({issues.length})</SectionHeading>
      <ul className="space-y-2.5 text-[11px]" aria-label="Enjeux détectés">
        {issues.map((issue, index) => (
          <li key={`${issue.issueId}-${index}`} className="space-y-0.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
              {issue.companyName}
            </span>
            <h4 className="font-heading text-xs font-bold text-heading leading-tight">
              {issue.issueTitle}
            </h4>
            {issue.rationale ? (
              <p className="text-[11px] leading-snug text-body">{issue.rationale}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedOpportunitiesSection({
  opportunities,
}: {
  opportunities: VeilleConvergenceRelatedOpportunity[]
}) {
  if (opportunities.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeading>Opportunités liées ({opportunities.length})</SectionHeading>
      <ul className="space-y-2.5 text-[11px]" aria-label="Opportunités liées">
        {opportunities.map((opp, index) => (
          <li key={`${opp.opportunityId}-${index}`} className="space-y-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                {opp.companyName}
              </span>
              {opp.stage ? (
                <span className="inline-block rounded-xs border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  {opp.stage}
                </span>
              ) : null}
            </div>
            <h4 className="font-heading text-xs font-bold text-heading leading-tight">
              {opp.opportunityTitle}
            </h4>
            {opp.rationale ? (
              <p className="text-[11px] leading-snug text-body">{opp.rationale}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlaybookSuggestionSection({
  suggestion,
}: {
  suggestion: VeilleConvergencePlaybookSuggestion | null
}) {
  if (!suggestion) return null

  return (
    <div className="space-y-2">
      <SectionHeading>Suggestion Playbook</SectionHeading>
      <div className="space-y-1 rounded-xs border border-border bg-surface p-3">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-brass">
          {suggestion.sectorName}
        </span>
        {suggestion.targetSection ? (
          <h4 className="font-heading text-xs font-bold text-heading">
            Section cible : {suggestion.targetSection}
          </h4>
        ) : null}
        <p className="border-l-2 border-brand-brass/40 pl-2.5 py-0.5 text-xs italic text-body mt-1">
          « {suggestion.proposedArgument} »
        </p>
        {suggestion.rationale ? (
          <p className="text-[11px] leading-snug text-muted mt-1">{suggestion.rationale}</p>
        ) : null}
        <span className="block text-[9px] italic text-muted mt-1.5">
          Suggestion IA en lecture seule · Validation humaine requise
        </span>
      </div>
    </div>
  )
}

function RecommendedActionsSection({
  actions,
}: {
  actions: VeilleConvergenceRecommendedAction[]
}) {
  if (actions.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeading>Actions recommandées ({actions.length})</SectionHeading>
      <ul className="space-y-2 text-[11px]" aria-label="Actions recommandées">
        {actions.map((act, index) => (
          <li key={`${act.label}-${index}`} className="space-y-0.5">
            <div className="flex items-start gap-1.5 text-xs font-semibold text-heading">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{act.label}</span>
            </div>
            {act.rationale ? (
              <p className="text-[11px] leading-snug text-muted ml-3">{act.rationale}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvidenceRefsSection({ refs }: { refs: VeilleConvergenceEvidenceRef[] }) {
  if (refs.length === 0) return null

  return (
    <div className="space-y-2">
      <SectionHeading>Preuves mobilisées ({refs.length})</SectionHeading>
      <ul className="space-y-1.5 text-[11px]" aria-label="Preuves mobilisées">
        {refs.map((ref, index) => {
          const typeLabel = evidenceTypeLabel(ref.type)
          const isCompany = ref.type === "company" && ref.id

          return (
            <li key={`${ref.id}-${index}`} className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 rounded-xs border border-border bg-edito-canvas px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                {typeLabel}
              </span>
              {isCompany ? (
                <Link
                  href={`/prospection/accounts?drawer=${ref.id}`}
                  className="truncate text-xs font-medium text-primary hover:underline outline-none focus-visible:ring-1 focus-visible:ring-heading"
                >
                  {ref.label}
                </Link>
              ) : (
                <span className="truncate text-xs text-heading">{ref.label}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ExistingArticleActions({
  company,
  watched,
  onPitch,
  onNote,
  onQualify,
  onAddToList,
  onOpportunity,
}: {
  company: CompanyContextStats | null
  watched: boolean
  onPitch: () => void
  onNote: () => void
  onQualify: () => void
  onAddToList: () => void
  onOpportunity: () => void
}) {
  const actions = [
    { label: "Qualifier le signal", icon: "prioritize" as const, onClick: onQualify },
    { label: "Ajouter à la liste", icon: "report" as const, onClick: onAddToList },
    { label: "Créer une fenêtre commerciale", icon: "detect_risks" as const, onClick: onOpportunity },
    { label: "Créer une note compte", icon: "write_email" as const, onClick: onNote },
  ]

  return (
    <div className="space-y-4">
      <div>
        <SectionHeading>Agir</SectionHeading>
        <div className="mt-3 space-y-2">
          <Button
            variant="brass"
            size="sm"
            fullWidth
            onClick={onPitch}
            leftIcon={<IntelligenceIcon name="generate_pitch" preferVector />}
            className="justify-between"
          >
            Générer un pitch / mail
          </Button>
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              fullWidth
              onClick={action.onClick}
              leftIcon={<IntelligenceIcon name={action.icon} preferVector />}
              className="justify-start text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <SectionHeading>Contexte mobilisable</SectionHeading>
        <dl className="mt-3 divide-y divide-border text-[11px]">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Fiche compte</dt>
            <dd className={cn("font-bold", company ? "text-success" : "text-danger")}>
              {company ? company.name : "Non détecté"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Interactions</dt>
            <dd className="font-bold text-heading">{company?.interactionsCount ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Contacts clés</dt>
            <dd className="font-bold text-heading">{company?.contactsCount ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Analyses liées</dt>
            <dd className="font-bold text-heading">{company?.docsCount ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Statut de veille</dt>
            <dd className="font-bold text-heading">
              {company ? (watched ? "Surveillé" : "Non surveillé") : "—"}
            </dd>
          </div>
        </dl>
        {company ? (
          <Link
            href={`/prospection/accounts?drawer=${company.id}`}
            className="mt-3 block border border-border bg-surface px-3 py-2 text-center text-[11px] font-bold text-primary hover:bg-surface-hover"
          >
            Voir le compte
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function VeilleConvergencesRail({
  article,
  company,
  watched,
  onPitch,
  onNote,
  onQualify,
  onAddToList,
  onOpportunity,
}: VeilleConvergencesRailProps) {
  const convergences = useMemo(
    () => parseVeilleArticleConvergences(article.convergences),
    [article.convergences]
  )

  const isLowWithoutStructuredData =
    convergences !== null &&
    convergences.confidence === "low" &&
    convergences.matchedIssues.length === 0 &&
    convergences.relatedAccounts.length === 0 &&
    convergences.relatedOpportunities.length === 0 &&
    convergences.playbookSuggestion === null

  return (
    <aside className="border border-border bg-edito-canvas/55 divide-y divide-border text-heading">
      {convergences ? (
        <section className="p-4 space-y-4">
          <ConvergenceHeader confidence={convergences.confidence} />
          <ConvergenceSummary synthesis={convergences.synthesis} />

          {isLowWithoutStructuredData ? (
            <div className="rounded-xs border border-border/50 bg-surface/50 p-2.5 text-center text-xs text-muted italic">
              Aucune convergence structurée forte identifiée.
            </div>
          ) : (
            <>
              <RelatedAccountsSection accounts={convergences.relatedAccounts} />
              <MatchedIssuesSection issues={convergences.matchedIssues} />
              <RelatedOpportunitiesSection opportunities={convergences.relatedOpportunities} />
              <PlaybookSuggestionSection suggestion={convergences.playbookSuggestion} />
            </>
          )}

          <RecommendedActionsSection actions={convergences.recommendedActions} />
          <EvidenceRefsSection refs={convergences.evidenceRefs} />
        </section>
      ) : (
        <section className="p-4 space-y-3">
          <SectionHeading>Convergences identifiées</SectionHeading>
          <div className="rounded-xs border border-border/50 bg-surface/50 p-3 text-center text-xs text-muted italic">
            Analyse transverse non disponible pour cet article.
          </div>
        </section>
      )}

      <section className="p-4">
        <ExistingArticleActions
          company={company}
          watched={watched}
          onPitch={onPitch}
          onNote={onNote}
          onQualify={onQualify}
          onAddToList={onAddToList}
          onOpportunity={onOpportunity}
        />
      </section>
    </aside>
  )
}
