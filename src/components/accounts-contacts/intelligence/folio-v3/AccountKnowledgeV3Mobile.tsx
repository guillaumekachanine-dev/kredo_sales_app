"use client"

import { useMemo, useState } from "react"
import type { AccountKnowledgeContentV3, AccountKnowledgeClaimV3 } from "@/lib/intelligence/account-intelligence-contracts"
import type { SourceIndex } from "../AccountKnowledgeV2Blocks"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { FolioStudySummary, FolioStudySection, FolioIdentityRowsMobile } from "./FolioStudyLayouts"
import { FolioEditorialList, FolioNarrativeBlock, FolioSourceDisclosure } from "./FolioStudyPrimitives"
import { FolioClaimText, buildClaimVerificationIndex } from "./FolioStudyShared"
import { AccountSignalsMobileCards, AccountSignalsModal } from "./AccountSignalsV3"

export function AccountKnowledgeV3Mobile({
  content,
  sources,
  signals,
}: {
  content: AccountKnowledgeContentV3
  sources: SourceIndex
  signals: ClientIntelligenceSignal[]
}) {
  const [signalsModalOpen, setSignalsModalOpen] = useState(false)
  const verificationIndex = useMemo(() => buildClaimVerificationIndex(content), [content])

  // -- Helpers for rendering claims
  const renderClaim = (claim: AccountKnowledgeClaimV3 | null) => {
    if (!claim) return null
    return <FolioClaimText claim={claim} sources={sources} verificationIndex={verificationIndex} />
  }

  const mapClaimToList = (claims: AccountKnowledgeClaimV3[]) => {
    return claims.map(claim => ({
      description: renderClaim(claim) as unknown as string
    }))
  }

  const extractSources = (claim: AccountKnowledgeClaimV3 | null, acc: Set<string>) => {
    if (!claim) return
    claim.source_refs.forEach(ref => acc.add(ref))
  }

  const extractSourcesFromArray = (claims: AccountKnowledgeClaimV3[], acc: Set<string>) => {
    claims.forEach(c => extractSources(c, acc))
  }

  const summarySources = new Set<string>()
  extractSources(content.account_summary, summarySources)

  const idSources = new Set<string>()
  extractSources(content.identity.company_name, idSources)
  extractSources(content.identity.legal_name, idSources)
  extractSources(content.identity.primary_activity, idSources)
  extractSources(content.identity.headquarters, idSources)
  extractSources(content.identity.sector, idSources)
  extractSources(content.identity.business_segment, idSources)
  extractSources(content.identity.revenue, idSources)
  extractSources(content.identity.employee_count, idSources)
  extractSourcesFromArray(content.identity.geographic_reach, idSources)

  const identityItems = [
    { label: "Nom de l'entreprise", value: renderClaim(content.identity.company_name) },
    { label: "Raison sociale", value: renderClaim(content.identity.legal_name) },
    { label: "Activité principale", value: renderClaim(content.identity.primary_activity) },
    { label: "Siège social", value: renderClaim(content.identity.headquarters) },
    { label: "Secteur d'activité", value: renderClaim(content.identity.sector) },
    { label: "Segment", value: renderClaim(content.identity.business_segment) },
    { label: "Chiffre d'affaires", value: renderClaim(content.identity.revenue) },
    { label: "Effectifs", value: renderClaim(content.identity.employee_count) },
    { label: "Portée géographique", value: content.identity.geographic_reach.map(renderClaim).reduce((acc, curr) => acc ? <>{acc}, {curr}</> : curr, null) }
  ].filter(item => item.value !== null)

  const mpSources = new Set<string>()
  const mp = content.market_positioning
  extractSources(mp.account_positioning, mpSources)
  extractSources(mp.competitive_environment, mpSources)
  extractSourcesFromArray(mp.direct_competitors, mpSources)
  extractSourcesFromArray(mp.competitive_advantages, mpSources)
  extractSourcesFromArray(mp.opportunities, mpSources)
  extractSourcesFromArray(mp.threats, mpSources)
  extractSources(mp.policy_and_ambitions.purpose, mpSources)
  extractSources(mp.policy_and_ambitions.philosophy, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.culture, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.public_statements, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.ambitions, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.strategic_axes, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.leadership_posture, mpSources)
  extractSources(mp.policy_and_ambitions.claimed_identity, mpSources)

  const ocSources = new Set<string>()
  const oc = content.offers_and_customers
  extractSources(oc.core_business, ocSources)
  extractSourcesFromArray(oc.offers, ocSources)
  extractSourcesFromArray(oc.covered_domains, ocSources)
  extractSourcesFromArray(oc.services, ocSources)
  extractSourcesFromArray(oc.service_models, ocSources)
  extractSourcesFromArray(oc.complementary_activities, ocSources)
  extractSourcesFromArray(oc.uncovered_activities, ocSources)
  extractSources(oc.customer_profile, ocSources)
  extractSourcesFromArray(oc.customer_segments, ocSources)
  extractSourcesFromArray(oc.segment_weights, ocSources)
  extractSourcesFromArray(oc.behavioral_trends, ocSources)
  extractSourcesFromArray(oc.unmet_needs, ocSources)

  const vcSources = new Set<string>()
  const vc = content.value_chain
  extractSources(vc.description, vcSources)
  extractSources(vc.value_proposition, vcSources)
  extractSourcesFromArray(vc.key_links, vcSources)
  extractSourcesFromArray(vc.critical_partners_or_suppliers, vcSources)
  extractSourcesFromArray(vc.dependencies, vcSources)
  extractSourcesFromArray(vc.vulnerabilities, vcSources)
  extractSources(vc.end_customer_relationship, vcSources)

  const reSources = new Set<string>()
  const re = content.regulatory_environment
  extractSourcesFromArray(re.current_regulations, reSources)
  extractSourcesFromArray(re.required_certifications, reSources)
  extractSourcesFromArray(re.compliance_risks, reSources)

  const tnSources = new Set<string>()
  const tn = content.trends_and_news
  extractSources(tn.analysis, tnSources)
  const significantSignals = signals.filter(s => tn.significant_signal_ids.includes(s.id))
  const displaySignals = significantSignals.length > 0 ? significantSignals : signals.slice(0, 3)

  const buildDisclosure = (refs: Set<string>) => {
    return Array.from(refs).map((ref, i) => {
      const src = sources.get(ref)
      return {
        index: i + 1,
        url: src?.url ?? null,
        title: src?.name ?? "Source inconnue",
        date: src?.publishedAt ?? null,
        type: src?.type ?? "unknown"
      }
    })
  }

  return (
    <div className="space-y-2">
      {content.account_summary && (
        <FolioStudySummary isMobile>
          <FolioNarrativeBlock isMobile><p>{renderClaim(content.account_summary)}</p></FolioNarrativeBlock>
          <FolioSourceDisclosure isMobile sources={buildDisclosure(summarySources)} />
        </FolioStudySummary>
      )}

      <FolioStudySection title="Fiche d'identité" isMobile>
        <FolioIdentityRowsMobile items={identityItems} />
        {content.identity.dynamic && (
          <div className="mt-4 p-3 bg-surface border border-[#CBD5E1]/50 rounded-lg">
            <h4 className="text-[10px] font-bold uppercase text-[#243B63] mb-1 tracking-wide">Dynamique du compte</h4>
            <p className="text-xs text-body">{content.identity.dynamic.label} — {content.identity.dynamic.score}/100</p>
          </div>
        )}
        <FolioSourceDisclosure isMobile sources={buildDisclosure(idSources)} />
      </FolioStudySection>

      <FolioStudySection title="Positionnement marché" isMobile>
        {mp.account_positioning && <FolioNarrativeBlock isMobile><p>{renderClaim(mp.account_positioning)}</p></FolioNarrativeBlock>}
        {mp.competitive_environment && (
          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase text-[#243B63] mb-2 tracking-wide">Environnement concurrentiel</h4>
            <FolioNarrativeBlock isMobile><p>{renderClaim(mp.competitive_environment)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioEditorialList isMobile label="Concurrents directs" items={mapClaimToList(mp.direct_competitors)} />
        <FolioEditorialList isMobile label="Avantages concurrentiels" items={mapClaimToList(mp.competitive_advantages)} />
        <FolioEditorialList isMobile label="Opportunités" items={mapClaimToList(mp.opportunities)} />
        <FolioEditorialList isMobile label="Menaces" items={mapClaimToList(mp.threats)} />
        
        <div className="mt-5 pt-3 border-t border-[#CBD5E1]/40">
          <h4 className="text-[11px] font-bold uppercase text-[#1E3150] mb-2.5 tracking-wide">Politique et ambitions</h4>
          {mp.policy_and_ambitions.purpose && <p className="text-xs text-body mb-2"><strong>Raison d'être :</strong> {renderClaim(mp.policy_and_ambitions.purpose)}</p>}
          {mp.policy_and_ambitions.philosophy && <p className="text-xs text-body mb-3"><strong>Philosophie :</strong> {renderClaim(mp.policy_and_ambitions.philosophy)}</p>}
          <FolioEditorialList isMobile label="Culture" items={mapClaimToList(mp.policy_and_ambitions.culture)} />
          <FolioEditorialList isMobile label="Déclarations publiques" items={mapClaimToList(mp.policy_and_ambitions.public_statements)} />
          <FolioEditorialList isMobile label="Ambitions" items={mapClaimToList(mp.policy_and_ambitions.ambitions)} />
          <FolioEditorialList isMobile label="Axes stratégiques" items={mapClaimToList(mp.policy_and_ambitions.strategic_axes)} />
          <FolioEditorialList isMobile label="Posture des dirigeants" items={mapClaimToList(mp.policy_and_ambitions.leadership_posture)} />
        </div>
        <FolioSourceDisclosure isMobile sources={buildDisclosure(mpSources)} />
      </FolioStudySection>

      <FolioStudySection title="Offres et clientèle" isMobile>
        {oc.core_business && (
          <div className="mb-4">
            <h4 className="text-[10px] font-bold uppercase text-[#243B63] mb-2 tracking-wide">Cœur de métier</h4>
            <FolioNarrativeBlock isMobile><p>{renderClaim(oc.core_business)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioEditorialList isMobile label="Offres" items={mapClaimToList(oc.offers)} />
        <FolioEditorialList isMobile label="Domaines couverts" items={mapClaimToList(oc.covered_domains)} />
        <FolioEditorialList isMobile label="Services" items={mapClaimToList(oc.services)} />
        <FolioEditorialList isMobile label="Modèles de service" items={mapClaimToList(oc.service_models)} />
        <FolioEditorialList isMobile label="Activités complémentaires" items={mapClaimToList(oc.complementary_activities)} />
        <FolioEditorialList isMobile label="Périmètres non couverts" items={mapClaimToList(oc.uncovered_activities)} />
        
        <div className="mt-5 pt-3 border-t border-[#CBD5E1]/40">
          <h4 className="text-[11px] font-bold uppercase text-[#1E3150] mb-2.5 tracking-wide">Clientèle</h4>
          {oc.customer_profile && <FolioNarrativeBlock isMobile><p>{renderClaim(oc.customer_profile)}</p></FolioNarrativeBlock>}
          <FolioEditorialList isMobile label="Segments de clientèle" items={mapClaimToList(oc.customer_segments)} />
          <FolioEditorialList isMobile label="Poids des segments" items={mapClaimToList(oc.segment_weights)} />
          <FolioEditorialList isMobile label="Tendances comportementales" items={mapClaimToList(oc.behavioral_trends)} />
          <FolioEditorialList isMobile label="Besoins non satisfaits" items={mapClaimToList(oc.unmet_needs)} />
        </div>
        <FolioSourceDisclosure isMobile sources={buildDisclosure(ocSources)} />
      </FolioStudySection>

      <FolioStudySection title="Chaîne de valeur" isMobile>
        {vc.description && <FolioNarrativeBlock isMobile><p>{renderClaim(vc.description)}</p></FolioNarrativeBlock>}
        {vc.value_proposition && (
          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase text-[#243B63] mb-2 tracking-wide">Proposition de valeur</h4>
            <FolioNarrativeBlock isMobile><p>{renderClaim(vc.value_proposition)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioEditorialList isMobile label="Maillons clés" items={mapClaimToList(vc.key_links)} />
        <FolioEditorialList isMobile label="Partenaires ou fournisseurs critiques" items={mapClaimToList(vc.critical_partners_or_suppliers)} />
        <FolioEditorialList isMobile label="Dépendances" items={mapClaimToList(vc.dependencies)} />
        <FolioEditorialList isMobile label="Vulnérabilités" items={mapClaimToList(vc.vulnerabilities)} />
        {vc.end_customer_relationship && (
          <div className="mt-4">
            <h4 className="text-[10px] font-bold uppercase text-[#243B63] mb-2 tracking-wide">Relation client final</h4>
            <FolioNarrativeBlock isMobile><p>{renderClaim(vc.end_customer_relationship)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioSourceDisclosure isMobile sources={buildDisclosure(vcSources)} />
      </FolioStudySection>

      <FolioStudySection title="Environnement réglementaire" isMobile>
        <FolioEditorialList isMobile label="Réglementations en vigueur" items={mapClaimToList(re.current_regulations)} />
        <FolioEditorialList isMobile label="Certifications requises" items={mapClaimToList(re.required_certifications)} />
        <FolioEditorialList isMobile label="Risques de conformité" items={mapClaimToList(re.compliance_risks)} />
        <FolioSourceDisclosure isMobile sources={buildDisclosure(reSources)} />
      </FolioStudySection>

      <FolioStudySection title="Tendances et actualité" isMobile>
        {tn.analysis && <FolioNarrativeBlock isMobile><p>{renderClaim(tn.analysis)}</p></FolioNarrativeBlock>}
        <div className="mt-4">
          <AccountSignalsMobileCards signals={displaySignals} onOpenAll={() => setSignalsModalOpen(true)} />
        </div>
        <FolioSourceDisclosure isMobile sources={buildDisclosure(tnSources)} />
      </FolioStudySection>

      <AccountSignalsModal
        open={signalsModalOpen}
        onClose={() => setSignalsModalOpen(false)}
        signals={signals}
        isMobile={true}
      />
    </div>
  )
}
