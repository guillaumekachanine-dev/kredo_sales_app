"use client"

import type { ReactNode } from "react"

import { AccountStudyDesktop } from "@/features/account-research-studies/components/AccountStudyDesktop"
import { AccountStudyPanel } from "@/features/account-research-studies/components/AccountStudyPanel"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"

import { CompanyEditorialSection } from "./CompanyEditorialSection"
import { CompanyIdentityPositioningContent } from "./CompanyIdentityPositioningContent"

type CompanySection = {
  id: string
  label: string
  title: string
  description: string
  content: ReactNode
}

export function ClientIntelligenceCompanyTab({
  data,
}: {
  data: ClientIntelligenceData
}) {
  const currentStudy = data.accountStudy.current
  const sections: CompanySection[] = []

  if (!currentStudy) {
    sections.push({
      id: "company-identity",
      label: "Identité & positionnement",
      title: "Identité & positionnement",
      description: data.client?.source === "folio"
        ? "Données relationnelles et contenu FOLIO historique, conservés jusqu’à l’import d’une nouvelle étude."
        : "Données relationnelles disponibles pour ce compte, dans l’attente d’une étude de recherche.",
      content: (
        <CompanyIdentityPositioningContent
          identity={data.companyProfile}
          positioning={data.companyPositioning}
        />
      ),
    })
  }

  const navLinks = [
    ...(currentStudy ? [{ id: "company-study", label: "Étude de l’entreprise" }] : []),
    ...sections.map((section) => ({ id: section.id, label: section.label })),
  ]

  return (
    <div className="space-y-6 pt-6">
      <AccountStudyPanel
        state={data.accountStudy}
        companyId={data.company.id}
        companyName={data.company.name}
      />

      <nav
        aria-label="Sections de l’onglet Entreprise"
        className="sticky top-0 z-10 -mx-1 overflow-x-auto border-b border-border bg-canvas/95 px-1 py-2 backdrop-blur-sm"
      >
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

      {currentStudy ? (
        <section id="company-study" className="scroll-mt-14">
          <AccountStudyDesktop
            studyId={currentStudy.id}
            knowledge={currentStudy.knowledge}
            companyName={data.company.name}
            producer={currentStudy.producer}
            distribution={currentStudy.distribution}
          />
        </section>
      ) : null}

      {sections.map((section, index) => (
        <CompanyEditorialSection
          key={section.id}
          id={section.id}
          index={String(index + 1 + (currentStudy ? 1 : 0)).padStart(2, "0")}
          title={section.title}
          description={section.description}
        >
          {section.content}
        </CompanyEditorialSection>
      ))}
    </div>
  )
}
