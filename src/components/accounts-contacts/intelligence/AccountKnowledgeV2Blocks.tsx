"use client"

// ─── Rendu de l'artefact « Connaissance entreprise » V2 ─────────────────────
// Lot 1. Aucun nouvel écrin graphique : on réutilise `SectionBlock` et la même
// carte que les blocs V1 (`rounded border border-border/60 bg-canvas/40`).
// La seule chose que ces blocs ajoutent à l'existant, c'est ce qui fait la
// valeur de V2 — chaque affirmation porte sa source, nommée et cliquable.

import type {
  AccountKnowledgeContentV2,
  AccountKnowledgeIdentityV2,
  AccountKnowledgeMarketPositioningV2,
  AccountKnowledgeOrganisationV2,
  AccountKnowledgeValueChainV2,
} from "@/lib/intelligence/account-intelligence-contracts"
import type { Claim, DeterministicIndicator } from "@/lib/intelligence/intelligence-common-contracts"
import type {
  AccountKnowledgeCitedSource,
  ClientIntelligenceContact,
} from "@/lib/intelligence/intelligence-data"
import { SectionBlock } from "./intelligence-parts"

export type SourceIndex = Map<string, AccountKnowledgeCitedSource>

export function buildSourceIndex(sources: readonly AccountKnowledgeCitedSource[]): SourceIndex {
  return new Map(sources.map((source) => [source.id, source]))
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  official_site: "Site officiel",
  regulatory_filing: "Registre public",
  news_media: "Presse",
  press_release: "Communiqué",
  internal_crm: "Base KREDO",
  job_board: "Offres d'emploi",
  professional_profile: "Profil professionnel",
  public_tender: "Appel d'offres",
  human_note: "Note interne",
}

function sourceTypeLabel(type: string): string {
  return SOURCE_TYPE_LABELS[type] ?? type
}

/**
 * Bandeau de sources d'une affirmation. Une source dont l'UUID n'est pas résolu
 * est affichée comme « source indisponible » plutôt que masquée : une citation
 * qui ne mène nulle part doit se voir, pas disparaître.
 */
function ClaimSources({ claim, sources }: { claim: Claim; sources: SourceIndex }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {claim.nature === "analysis" ? "Analyse" : "Fait"}
      </span>
      <span className="text-[10px] text-muted">· confiance {Math.round(claim.confidence * 100)} %</span>
      {claim.source_refs.map((ref) => {
        const source = sources.get(ref)
        if (!source) {
          return (
            <span key={ref} className="rounded border border-border bg-canvas/50 px-1.5 py-0.5 text-[10px] text-muted">
              Source indisponible
            </span>
          )
        }
        const label = `${sourceTypeLabel(source.type)} — ${source.name}`
        return source.url ? (
          <a
            key={ref}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className="max-w-[18rem] truncate rounded border border-border bg-canvas/50 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:underline"
          >
            {label} ↗
          </a>
        ) : (
          <span
            key={ref}
            title={label}
            className="max-w-[18rem] truncate rounded border border-border bg-canvas/50 px-1.5 py-0.5 text-[10px] font-medium text-body"
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function ClaimCard({ claim, sources, label }: { claim: Claim; sources: SourceIndex; label?: string }) {
  return (
    <div className="rounded border border-border/60 bg-canvas/40 px-3 py-2">
      {label ? (
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-heading">{label}</span>
      ) : null}
      <p className="text-xs leading-relaxed text-body">{claim.text}</p>
      <ClaimSources claim={claim} sources={sources} />
    </div>
  )
}

/** Rend une liste de Claims, ou rien du tout : une section vide reste vide. */
function ClaimList({ claims, sources }: { claims: readonly Claim[]; sources: SourceIndex }) {
  if (claims.length === 0) return null
  return (
    <div className="space-y-1.5">
      {claims.map((claim, index) => (
        <ClaimCard key={index} claim={claim} sources={sources} />
      ))}
    </div>
  )
}

function ClaimGroup({
  title,
  claims,
  sources,
}: {
  title: string
  claims: readonly Claim[]
  sources: SourceIndex
}) {
  if (claims.length === 0) return null
  return (
    <SectionBlock title={title}>
      <ClaimList claims={claims} sources={sources} />
    </SectionBlock>
  )
}

// ─── Indicateur déterministe ────────────────────────────────────────────────

function DynamicIndicatorCard({ indicator }: { indicator: DeterministicIndicator }) {
  const period = `${new Date(indicator.period_start).toLocaleDateString("fr-FR")} → ${new Date(indicator.period_end).toLocaleDateString("fr-FR")}`
  return (
    <div className="rounded border border-border/60 bg-canvas/40 px-3 py-2">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-heading">Dynamique du compte</span>
      <p className="text-xs leading-relaxed text-body">
        {indicator.label}
        {indicator.score !== null ? ` — ${indicator.score}/100` : ""}
      </p>
      <p className="mt-1.5 text-[10px] text-muted">
        {indicator.evidence_count} signal{indicator.evidence_count > 1 ? "s" : ""} sourcé
        {indicator.evidence_count > 1 ? "s" : ""} · {period} · méthode {indicator.method_version}
      </p>
      {/* Dit explicitement ce que la mesure n'est pas : c'est le contresens que
          l'indicateur doit rendre impossible (cf. account-dynamic.ts). */}
      <p className="mt-1 text-[10px] italic text-muted">
        Mesure l’activité détectée et sourcée sur la période — ni une croissance économique, ni un sentiment.
      </p>
    </div>
  )
}

// ─── Sections ───────────────────────────────────────────────────────────────

export function IdentityV2Content({
  identity,
  summary,
  sources,
}: {
  identity: AccountKnowledgeIdentityV2
  summary: Claim | null
  sources: SourceIndex
}) {
  const fields: Array<{ label: string; claim: Claim | null }> = [
    { label: "Activité principale", claim: identity.primary_activity },
    { label: "Siège", claim: identity.headquarters },
    { label: "Chiffre d’affaires", claim: identity.revenue },
    { label: "Effectif", claim: identity.employee_count },
  ]
  const present = fields.filter((field) => field.claim !== null)

  if (!summary && present.length === 0 && !identity.dynamic) return null

  return (
    <div className="space-y-4">
      {summary ? (
        <SectionBlock title="Synthèse du compte" reading>
          <ClaimCard claim={summary} sources={sources} />
        </SectionBlock>
      ) : null}

      {present.length > 0 || identity.dynamic ? (
        <SectionBlock title="Identité">
          <div className="space-y-1.5">
            {present.map(({ label, claim }) => (
              <ClaimCard key={label} claim={claim as Claim} sources={sources} label={label} />
            ))}
            {identity.dynamic ? <DynamicIndicatorCard indicator={identity.dynamic} /> : null}
          </div>
        </SectionBlock>
      ) : null}
    </div>
  )
}

export function MarketPositioningV2Content({
  positioning,
  sources,
}: {
  positioning: AccountKnowledgeMarketPositioningV2
  sources: SourceIndex
}) {
  return (
    <div className="space-y-4">
      {positioning.positioning ? (
        <SectionBlock title="Positionnement">
          <ClaimCard claim={positioning.positioning} sources={sources} />
        </SectionBlock>
      ) : null}
      {positioning.claimed_identity ? (
        <SectionBlock title="Identité revendiquée">
          <ClaimCard claim={positioning.claimed_identity} sources={sources} />
        </SectionBlock>
      ) : null}
      <ClaimGroup title="Concurrents directs" claims={positioning.direct_competitors} sources={sources} />
      <ClaimGroup title="Segments de clientèle" claims={positioning.customer_segments} sources={sources} />
      <ClaimGroup title="Différenciateurs" claims={positioning.differentiators} sources={sources} />
      <ClaimGroup title="Périmètres non couverts" claims={positioning.uncovered_scope} sources={sources} />
      <ClaimGroup title="Menaces" claims={positioning.threats} sources={sources} />
      <ClaimGroup title="Opportunités" claims={positioning.opportunities} sources={sources} />
    </div>
  )
}

export function ValueChainV2Content({
  valueChain,
  sources,
}: {
  valueChain: AccountKnowledgeValueChainV2
  sources: SourceIndex
}) {
  return (
    <div className="space-y-4">
      {valueChain.description ? (
        <SectionBlock title="Chaîne de valeur" reading>
          <ClaimCard claim={valueChain.description} sources={sources} />
        </SectionBlock>
      ) : null}
      {valueChain.value_proposition ? (
        <SectionBlock title="Proposition de valeur">
          <ClaimCard claim={valueChain.value_proposition} sources={sources} />
        </SectionBlock>
      ) : null}
      <ClaimGroup title="Maillons clés" claims={valueChain.key_links} sources={sources} />
      <ClaimGroup title="Dépendances" claims={valueChain.dependencies} sources={sources} />
      <ClaimGroup title="Vulnérabilités" claims={valueChain.vulnerabilities} sources={sources} />
      <ClaimGroup title="Base clients" claims={valueChain.customer_base} sources={sources} />
    </div>
  )
}

export function OrganisationV2Content({
  organisation,
  contacts,
  sources,
}: {
  organisation: AccountKnowledgeOrganisationV2
  contacts: readonly ClientIntelligenceContact[]
  sources: SourceIndex
}) {
  const contactNameById = new Map(contacts.map((contact) => [contact.id, contact]))

  return (
    <div className="space-y-4">
      {organisation.strategic_weight ? (
        <SectionBlock title="Poids stratégique">
          <ClaimCard claim={organisation.strategic_weight} sources={sources} />
        </SectionBlock>
      ) : null}
      <ClaimGroup title="Directions & départements" claims={organisation.departments} sources={sources} />
      <ClaimGroup title="Process observés" claims={organisation.process_observations} sources={sources} />

      {organisation.key_contacts.length > 0 ? (
        <SectionBlock title="Interlocuteurs clés">
          <div className="space-y-1.5">
            {organisation.key_contacts.map((keyContact) => {
              const contact = contactNameById.get(keyContact.contact_id)
              return (
                <ClaimCard
                  key={keyContact.contact_id}
                  claim={keyContact.role_summary}
                  sources={sources}
                  // Le contrat ne stocke que le contact_id : le nom vient du CRM,
                  // il n'est jamais recopié dans l'artefact (il changerait sans lui).
                  label={contact ? `${contact.fullName}${contact.jobTitle ? ` — ${contact.jobTitle}` : ""}` : "Contact retiré du compte"}
                />
              )
            })}
          </div>
        </SectionBlock>
      ) : null}
    </div>
  )
}

/** `true` si l'artefact a au moins une chose à montrer dans cette section. */
export function hasMarketPositioningContent(content: AccountKnowledgeContentV2): boolean {
  const mp = content.market_positioning
  return Boolean(
    mp.positioning
    || mp.claimed_identity
    || mp.direct_competitors.length
    || mp.customer_segments.length
    || mp.differentiators.length
    || mp.uncovered_scope.length
    || mp.threats.length
    || mp.opportunities.length,
  )
}

export function hasValueChainContent(content: AccountKnowledgeContentV2): boolean {
  const vc = content.company_value_chain
  return Boolean(
    vc.description
    || vc.value_proposition
    || vc.key_links.length
    || vc.dependencies.length
    || vc.vulnerabilities.length
    || vc.customer_base.length,
  )
}

export function hasOrganisationContent(content: AccountKnowledgeContentV2): boolean {
  const org = content.organisation
  return Boolean(
    org.strategic_weight
    || org.departments.length
    || org.process_observations.length
    || org.key_contacts.length,
  )
}
