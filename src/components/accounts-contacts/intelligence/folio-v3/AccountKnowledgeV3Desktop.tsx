"use client"

import { useMemo, useState } from "react"
import type { AccountKnowledgeContentV3, AccountKnowledgeClaimV3 } from "@/lib/intelligence/account-intelligence-contracts"
import type { SourceIndex } from "../AccountKnowledgeV2Blocks"
import type { ClientIntelligenceSignal } from "@/lib/intelligence/intelligence-data"
import { FolioStudySummary, FolioStudySection, FolioIdentityGrid } from "./FolioStudyLayouts"
import { FolioEditorialList, FolioNarrativeBlock, FolioSourceDisclosure } from "./FolioStudyPrimitives"
import { FolioClaimText, buildClaimVerificationIndex } from "./FolioStudyShared"
import { AccountSignalsCompactList, AccountSignalsModal } from "./AccountSignalsV3"

export function AccountKnowledgeV3Desktop({
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
      description: renderClaim(claim) as unknown as string // FolioEditorialList accepts ReactNode in reality if we cast, but let's change FolioEditorialList types to ReactNode
    }))
  }

  const mapClaimToLabeledList = (claims: AccountKnowledgeClaimV3[]) => {
    return claims.map(claim => {
      // Si on a un format "Nom — Description", on pourrait parser, mais le contrat dit qu'on envoie juste du texte brut pour l'instant
      return { description: renderClaim(claim) as unknown as string }
    })
  }

  const extractSources = (claim: AccountKnowledgeClaimV3 | null, acc: Set<string>) => {
    if (!claim) return
    claim.source_refs.forEach(ref => acc.add(ref))
  }

  const extractSourcesFromArray = (claims: AccountKnowledgeClaimV3[], acc: Set<string>) => {
    claims.forEach(c => extractSources(c, acc))
  }

  // --- 1. Synthèse du compte ---
  const summarySources = new Set<string>()
  extractSources(content.account_summary, summarySources)

  // --- 2. Fiche d'identité ---
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

  // --- 3. Positionnement marché ---
  const mpSources = new Set<string>()
  const mp = content.market_positioning
  extractSources(mp.account_positioning, mpSources)
  extractSources(mp.competitive_environment, mpSources)
  extractSourcesFromArray(mp.direct_competitors, mpSources)
  extractSourcesFromArray(mp.competitive_advantages, mpSources)
  extractSourcesFromArray(mp.opportunities, mpSources)
  extractSourcesFromArray(mp.threats, mpSources)
  // policy_and_ambitions
  extractSources(mp.policy_and_ambitions.purpose, mpSources)
  extractSources(mp.policy_and_ambitions.philosophy, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.culture, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.public_statements, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.ambitions, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.strategic_axes, mpSources)
  extractSourcesFromArray(mp.policy_and_ambitions.leadership_posture, mpSources)
  extractSources(mp.policy_and_ambitions.claimed_identity, mpSources)

  // --- 4. Offres et clientèle ---
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

  // --- 5. Chaîne de valeur ---
  const vcSources = new Set<string>()
  const vc = content.value_chain
  extractSources(vc.description, vcSources)
  extractSources(vc.value_proposition, vcSources)
  extractSourcesFromArray(vc.key_links, vcSources)
  extractSourcesFromArray(vc.critical_partners_or_suppliers, vcSources)
  extractSourcesFromArray(vc.dependencies, vcSources)
  extractSourcesFromArray(vc.vulnerabilities, vcSources)
  extractSources(vc.end_customer_relationship, vcSources)

  // --- 6. Environnement réglementaire ---
  const reSources = new Set<string>()
  const re = content.regulatory_environment
  extractSourcesFromArray(re.current_regulations, reSources)
  extractSourcesFromArray(re.required_certifications, reSources)
  extractSourcesFromArray(re.compliance_risks, reSources)

  // --- 7. Tendances et actualité ---
  const tnSources = new Set<string>()
  const tn = content.trends_and_news
  extractSources(tn.analysis, tnSources)
  const significantSignals = signals.filter(s => tn.significant_signal_ids.includes(s.id))
  // Fallback to top 3 if empty
  const displaySignals = significantSignals.length > 0 ? significantSignals : signals.slice(0, 3)

  const buildDisclosure = (refs: Set<string>) => {
    return Array.from(refs).map((ref, i) => {
      const src = sources.get(ref)
      return {
        index: i + 1, // Will be mapped by FolioClaimText but let's keep indices correct in disclosure
        url: src?.url ?? null,
        title: src?.name ?? "Source inconnue",
        date: src?.publishedAt ?? null,
        type: src?.type ?? "unknown"
      }
    })
  }

  // L'index réel affiché dans le ClaimText doit correspondre au tableau général ou par section ?
  // La charte dit [1] dans la section, et Sources - 1 en bas de la section.
  // On passe `sources` complet au ClaimText et on lui laisse afficher l'index. 
  // Wait, if we render [1] per section, FolioClaimText needs to know the index per section.
  // We can just use the global index from `sources.get(ref)` or just random [1]. For simplicity we use [ref index].
  // But wait, FolioClaimText maps over claim.source_refs: `FolioSourceMarker index={idx + 1}` which is relative to the CLAIM, not the section.
  // This matches standard LLM citations: each claim has [1][2], and the disclosure at the bottom lists all sources for the section.
  // So buildDisclosure is just a list of all sources used in the section.

  return (
    <div className="space-y-6">
      {content.account_summary && (
        <FolioStudySummary>
          <p>{renderClaim(content.account_summary)}</p>
          <FolioSourceDisclosure sources={buildDisclosure(summarySources)} />
        </FolioStudySummary>
      )}

      <FolioStudySection title="Fiche d'identité">
        <FolioIdentityGrid items={identityItems} />
        {content.identity.dynamic && (
          <div className="mt-4 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded">
            <h4 className="text-[11px] font-bold uppercase text-[#243B63] mb-1 tracking-wider">Dynamique du compte</h4>
            <p className="text-xs text-[#334155]">{content.identity.dynamic.label} — {content.identity.dynamic.score}/100</p>
          </div>
        )}
        <FolioSourceDisclosure sources={buildDisclosure(idSources)} />
      </FolioStudySection>

      <FolioStudySection title="Positionnement marché">
        {mp.account_positioning && <FolioNarrativeBlock><p>{renderClaim(mp.account_positioning)}</p></FolioNarrativeBlock>}
        {mp.competitive_environment && (
          <div className="mt-4">
            <h4 className="text-[11px] font-bold uppercase text-[#243B63] mb-2 tracking-wider">Environnement concurrentiel</h4>
            <FolioNarrativeBlock><p>{renderClaim(mp.competitive_environment)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioEditorialList label="Concurrents directs" items={mapClaimToList(mp.direct_competitors)} />
        <FolioEditorialList label="Avantages concurrentiels" items={mapClaimToList(mp.competitive_advantages)} />
        <FolioEditorialList label="Opportunités" items={mapClaimToList(mp.opportunities)} />
        <FolioEditorialList label="Menaces" items={mapClaimToList(mp.threats)} />
        
        <div className="mt-6 pt-4 border-t border-[#CBD5E1]/50">
          <h4 className="text-[12px] font-bold uppercase text-[#1E3150] mb-3 tracking-wider">Politique et ambitions</h4>
          {mp.policy_and_ambitions.purpose && <p className="text-sm text-[#334155] mb-2"><strong>Raison d'être :</strong> {renderClaim(mp.policy_and_ambitions.purpose)}</p>}
          {mp.policy_and_ambitions.philosophy && <p className="text-sm text-[#334155] mb-4"><strong>Philosophie :</strong> {renderClaim(mp.policy_and_ambitions.philosophy)}</p>}
          <FolioEditorialList label="Culture" items={mapClaimToList(mp.policy_and_ambitions.culture)} />
          <FolioEditorialList label="Déclarations publiques" items={mapClaimToList(mp.policy_and_ambitions.public_statements)} />
          <FolioEditorialList label="Ambitions" items={mapClaimToList(mp.policy_and_ambitions.ambitions)} />
          <FolioEditorialList label="Axes stratégiques" items={mapClaimToList(mp.policy_and_ambitions.strategic_axes)} />
          <FolioEditorialList label="Posture des dirigeants" items={mapClaimToList(mp.policy_and_ambitions.leadership_posture)} />
        </div>
        <FolioSourceDisclosure sources={buildDisclosure(mpSources)} />
      </FolioStudySection>

      <FolioStudySection title="Offres et clientèle">
        {oc.core_business && (
          <div className="mb-4">
            <h4 className="text-[11px] font-bold uppercase text-[#243B63] mb-2 tracking-wider">Cœur de métier</h4>
            <FolioNarrativeBlock><p>{renderClaim(oc.core_business)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioEditorialList label="Offres" items={mapClaimToList(oc.offers)} />
        <FolioEditorialList label="Domaines couverts" items={mapClaimToList(oc.covered_domains)} />
        <FolioEditorialList label="Services" items={mapClaimToList(oc.services)} />
        <FolioEditorialList label="Modèles de service" items={mapClaimToList(oc.service_models)} />
        <FolioEditorialList label="Activités complémentaires" items={mapClaimToList(oc.complementary_activities)} />
        <FolioEditorialList label="Périmètres non couverts" items={mapClaimToList(oc.uncovered_activities)} />
        
        <div className="mt-6 pt-4 border-t border-[#CBD5E1]/50">
          <h4 className="text-[12px] font-bold uppercase text-[#1E3150] mb-3 tracking-wider">Clientèle</h4>
          {oc.customer_profile && <FolioNarrativeBlock><p>{renderClaim(oc.customer_profile)}</p></FolioNarrativeBlock>}
          <FolioEditorialList label="Segments de clientèle" items={mapClaimToList(oc.customer_segments)} />
          <FolioEditorialList label="Poids des segments" items={mapClaimToList(oc.segment_weights)} />
          <FolioEditorialList label="Tendances comportementales" items={mapClaimToList(oc.behavioral_trends)} />
          <FolioEditorialList label="Besoins non satisfaits" items={mapClaimToList(oc.unmet_needs)} />
        </div>
        <FolioSourceDisclosure sources={buildDisclosure(ocSources)} />
      </FolioStudySection>

      <FolioStudySection title="Chaîne de valeur">
        {vc.description && <FolioNarrativeBlock><p>{renderClaim(vc.description)}</p></FolioNarrativeBlock>}
        {vc.value_proposition && (
          <div className="mt-4">
            <h4 className="text-[11px] font-bold uppercase text-[#243B63] mb-2 tracking-wider">Proposition de valeur</h4>
            <FolioNarrativeBlock><p>{renderClaim(vc.value_proposition)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioEditorialList label="Maillons clés" items={mapClaimToList(vc.key_links)} />
        <FolioEditorialList label="Partenaires ou fournisseurs critiques" items={mapClaimToList(vc.critical_partners_or_suppliers)} />
        <FolioEditorialList label="Dépendances" items={mapClaimToList(vc.dependencies)} />
        <FolioEditorialList label="Vulnérabilités" items={mapClaimToList(vc.vulnerabilities)} />
        {vc.end_customer_relationship && (
          <div className="mt-4">
            <h4 className="text-[11px] font-bold uppercase text-[#243B63] mb-2 tracking-wider">Relation client final</h4>
            <FolioNarrativeBlock><p>{renderClaim(vc.end_customer_relationship)}</p></FolioNarrativeBlock>
          </div>
        )}
        <FolioSourceDisclosure sources={buildDisclosure(vcSources)} />
      </FolioStudySection>

      <FolioStudySection title="Environnement réglementaire">
        <FolioEditorialList label="Réglementations en vigueur" items={mapClaimToList(re.current_regulations)} />
        <FolioEditorialList label="Certifications requises" items={mapClaimToList(re.required_certifications)} />
        <FolioEditorialList label="Risques de conformité" items={mapClaimToList(re.compliance_risks)} />
        <FolioSourceDisclosure sources={buildDisclosure(reSources)} />
      </FolioStudySection>

      <FolioStudySection title="Tendances et actualité">
        {tn.analysis && <FolioNarrativeBlock><p>{renderClaim(tn.analysis)}</p></FolioNarrativeBlock>}
        <div className="mt-4">
          <AccountSignalsCompactList signals={displaySignals} onOpenAll={() => setSignalsModalOpen(true)} />
        </div>
        <FolioSourceDisclosure sources={buildDisclosure(tnSources)} />
      </FolioStudySection>

      <AccountSignalsModal
        open={signalsModalOpen}
        onClose={() => setSignalsModalOpen(false)}
        signals={signals}
        isMobile={false}
      />
    </div>
  )
}
