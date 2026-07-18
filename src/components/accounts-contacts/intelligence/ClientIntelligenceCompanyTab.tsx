"use client"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import { hasVisibleOpenQuestions } from "@/lib/intelligence/client-intelligence-company"
import { AccountKnowledgeOpenQuestions, AccountSignalsCard } from "./AccountKnowledgeBlocks"
import { CompanyCommercialContent } from "./CompanyCommercialContent"
import { CompanyEditorialSection } from "./CompanyEditorialSection"
import { CompanyIdentityPositioningContent } from "./CompanyIdentityPositioningContent"
import { CompanyOperationsContent } from "./CompanyOperationsContent"

const SECTION_LINKS = [
  { id: "company-identity", label: "Identité & positionnement" },
  { id: "company-operations", label: "Activités opérationnelles" },
  { id: "company-commercial", label: "Relation commerciale" },
  { id: "company-signals", label: "Signaux & actualités" },
]

export function ClientIntelligenceCompanyTab({
  data,
  onOpenAudit,
}: {
  data: ClientIntelligenceData
  onOpenAudit: () => void
}) {
  const hasQuestions = Boolean(
    data.accountKnowledge
    && hasVisibleOpenQuestions(data.accountKnowledge.data.open_questions),
  )

  return (
    <div className="space-y-6 pt-6">
      <nav aria-label="Sections de l’onglet Entreprise" className="sticky top-0 z-10 -mx-1 overflow-x-auto border-b border-border bg-canvas/95 px-1 py-2 backdrop-blur-sm">
        <div className="flex min-w-max items-center gap-1">
          {[...SECTION_LINKS, ...(hasQuestions ? [{ id: "company-questions", label: "Hypothèses à valider" }] : [])].map((link, index) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="inline-flex min-h-9 items-center gap-2 border-b-2 border-transparent px-3 text-[11px] font-bold text-muted transition-colors hover:border-brand-brass hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <span className="font-mono text-[9px] text-brand-brass">{String(index + 1).padStart(2, "0")}</span>
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <CompanyEditorialSection
        id="company-identity"
        index="01"
        title="Identité & positionnement"
        description="Données relationnelles prioritaires, complétées uniquement par les champs FOLIO structurés disponibles."
      >
        <CompanyIdentityPositioningContent
          identity={data.companyProfile}
          positioning={data.companyPositioning}
        />
      </CompanyEditorialSection>

      <CompanyEditorialSection
        id="company-operations"
        index="02"
        title="Activités opérationnelles"
        description="Dernier diagnostic process réussi, normalisé depuis les données structurées de l’audit sans relire le PDF."
      >
        <CompanyOperationsContent
          data={data.operationalSnapshot}
          auditAvailable={Boolean(data.diagnosticPdfUrl)}
          onOpenAudit={onOpenAudit}
        />
      </CompanyEditorialSection>

      <CompanyEditorialSection
        id="company-commercial"
        index="03"
        title="Relation commerciale"
        description="Historique des échanges, opportunités, engagements et carte des contacts prioritaires."
      >
        <CompanyCommercialContent
          timeline={data.commercialTimeline}
          opportunities={data.opportunities}
          missions={data.missions}
          projects={data.projects}
          contacts={data.contacts}
        />
      </CompanyEditorialSection>

      <CompanyEditorialSection
        id="company-signals"
        index="04"
        title="Signaux & actualités"
        description="Signaux natifs du compte, du plus récent au plus ancien, avec actions commerciales et validation humaine."
      >
        <AccountSignalsCard
          signals={data.accountSignals}
          variant="companyDesktop"
          companyId={data.company.id}
          companyName={data.company.name}
        />
      </CompanyEditorialSection>

      {hasQuestions && data.accountKnowledge ? (
        <div id="company-questions" className="scroll-mt-6">
          <AccountKnowledgeOpenQuestions
            data={data.accountKnowledge.data}
            resultId={data.accountKnowledge.resultId}
          />
        </div>
      ) : null}
    </div>
  )
}
