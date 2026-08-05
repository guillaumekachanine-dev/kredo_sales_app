"use client"

import { useMemo, type ReactNode } from "react"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import { hasVisibleOpenQuestions } from "@/lib/intelligence/client-intelligence-company"
import {
  AccountKnowledgeOpenQuestions,
  AccountKnowledgeOpenQuestionsV2,
  AccountSignalsCard,
} from "./AccountKnowledgeBlocks"
import {
  buildSourceIndex,
  hasMarketPositioningContent,
  hasOrganisationContent,
  hasValueChainContent,
  IdentityV2Content,
  MarketPositioningV2Content,
  OrganisationV2Content,
  ValueChainV2Content,
} from "./AccountKnowledgeV2Blocks"
import { AccountKnowledgeUpdateControlsDesktop } from "./AccountKnowledgeUpdateControls"
import { useAccountKnowledgeRun } from "./use-account-knowledge-run"
import { CompanyCommercialContent } from "./CompanyCommercialContent"
import { CompanyEditorialSection } from "./CompanyEditorialSection"
import { CompanyIdentityPositioningContent } from "./CompanyIdentityPositioningContent"
import { CompanyOperationsContent } from "./CompanyOperationsContent"

type CompanySection = {
  id: string
  label: string
  title: string
  description: string
  content: ReactNode
}

export function ClientIntelligenceCompanyTab({
  data,
  onOpenAudit,
}: {
  data: ClientIntelligenceData
  onOpenAudit: () => void
}) {
  const knowledge = data.accountKnowledge
  const { status, errorMessage, trigger } = useAccountKnowledgeRun(data.company.id)

  const sourceIndex = useMemo(
    () => buildSourceIndex(data.accountKnowledgeSources),
    [data.accountKnowledgeSources],
  )

  const hasQuestions = knowledge
    ? knowledge.version === 1
      ? hasVisibleOpenQuestions(knowledge.data.open_questions)
      : knowledge.data.open_questions.some((question) => !question.dismissed)
    : false

  // Les sections sont construites puis numérotées : un artefact V2 en ajoute
  // deux (chaîne de valeur, organisation) que FOLIO ne sait pas alimenter, et
  // l'index affiché doit rester cohérent avec la navigation.
  const v2 = knowledge?.version === 2 ? knowledge.data : null

  const sections: CompanySection[] = []

  sections.push({
    id: "company-identity",
    label: "Identité & positionnement",
    title: "Identité & positionnement",
    description: v2
      ? "Affirmations produites par le moteur, chacune adossée à sa source vérifiable."
      : "Données relationnelles prioritaires, complétées uniquement par les champs FOLIO structurés disponibles.",
    content: v2 ? (
      <div className="space-y-4">
        <IdentityV2Content identity={v2.identity} summary={v2.account_summary} sources={sourceIndex} />
        {hasMarketPositioningContent(v2) ? (
          <MarketPositioningV2Content positioning={v2.market_positioning} sources={sourceIndex} />
        ) : null}
      </div>
    ) : (
      <CompanyIdentityPositioningContent
        identity={data.companyProfile}
        positioning={data.companyPositioning}
      />
    ),
  })

  if (v2 && hasValueChainContent(v2)) {
    sections.push({
      id: "company-value-chain",
      label: "Chaîne de valeur",
      title: "Chaîne de valeur",
      description: "Maillons, dépendances et vulnérabilités du compte, tels qu'attestés par les sources citées.",
      content: <ValueChainV2Content valueChain={v2.company_value_chain} sources={sourceIndex} />,
    })
  }

  if (v2 && hasOrganisationContent(v2)) {
    sections.push({
      id: "company-organisation",
      label: "Organisation",
      title: "Organisation & interlocuteurs",
      description: "Directions observées, poids stratégique du compte et rôle des interlocuteurs identifiés.",
      content: (
        <OrganisationV2Content
          organisation={v2.organisation}
          contacts={data.contacts}
          sources={sourceIndex}
        />
      ),
    })
  }

  sections.push({
    id: "company-operations",
    label: "Activités opérationnelles",
    title: "Activités opérationnelles",
    description: "Dernier diagnostic process réussi, normalisé depuis les données structurées de l’audit sans relire le PDF.",
    content: (
      <CompanyOperationsContent
        data={data.operationalSnapshot}
        auditAvailable={Boolean(data.diagnosticPdfUrl)}
        onOpenAudit={onOpenAudit}
      />
    ),
  })

  sections.push({
    id: "company-commercial",
    label: "Relation commerciale",
    title: "Relation commerciale",
    description: "Historique des échanges, opportunités, engagements et carte des contacts prioritaires.",
    content: (
      <CompanyCommercialContent
        timeline={data.commercialTimeline}
        opportunities={data.opportunities}
        missions={data.missions}
        projects={data.projects}
        contacts={data.contacts}
      />
    ),
  })

  sections.push({
    id: "company-signals",
    label: "Signaux & actualités",
    title: "Signaux & actualités",
    description: "Signaux natifs du compte, du plus récent au plus ancien, avec actions commerciales et validation humaine.",
    content: (
      <AccountSignalsCard
        signals={data.accountSignals}
        variant="companyDesktop"
        companyId={data.company.id}
        companyName={data.company.name}
        lastUpdatedAt={data.accountWatch.lastRunAt}
      />
    ),
  })

  const navLinks = [
    ...sections.map((section) => ({ id: section.id, label: section.label })),
    ...(hasQuestions ? [{ id: "company-questions", label: "Hypothèses à valider" }] : []),
  ]

  return (
    <div className="space-y-6 pt-6">
      <AccountKnowledgeUpdateControlsDesktop
        state={knowledge}
        lastUpdatedAt={data.accountKnowledgeLastUpdatedAt}
        status={status}
        errorMessage={errorMessage}
        onUpdate={() => void trigger()}
      />
      <nav aria-label="Sections de l’onglet Entreprise" className="sticky top-0 z-10 -mx-1 overflow-x-auto border-b border-border bg-canvas/95 px-1 py-2 backdrop-blur-sm">
        <div className="flex min-w-max items-center gap-1">
          {navLinks.map((link, index) => (
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

      {sections.map((section, index) => (
        <CompanyEditorialSection
          key={section.id}
          id={section.id}
          index={String(index + 1).padStart(2, "0")}
          title={section.title}
          description={section.description}
        >
          {section.content}
        </CompanyEditorialSection>
      ))}

      {hasQuestions && knowledge ? (
        <div id="company-questions" className="scroll-mt-6">
          {knowledge.version === 1 ? (
            <AccountKnowledgeOpenQuestions data={knowledge.data} resultId={knowledge.resultId} />
          ) : (
            <AccountKnowledgeOpenQuestionsV2 data={knowledge.data} />
          )}
        </div>
      ) : null}
    </div>
  )
}
