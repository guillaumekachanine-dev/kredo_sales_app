"use client"

import { useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { MissionDetailTabs } from "./MissionDetailTabs"
import { MissionSynthesisTab } from "./MissionSynthesisTab"
import { MissionCollaboratorTab } from "./MissionCollaboratorTab"
import { MissionPlanningTab } from "./MissionPlanningTab"
import { MissionActivityTab } from "./MissionActivityTab"
import { MissionFinancialTab } from "./MissionFinancialTab"
import type { MissionDetailViewModel, MissionMobileTabId } from "./mission-detail-types"

interface MissionDetailMobileProps {
  vm: MissionDetailViewModel
  onRefresh: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fiche mission — Mobile (ADR-0006). Langage visuel repris de /reports :
//  header logo + titre + client, nav pleine largeur 3 onglets, surfaces ouvertes.
//  Redistribution des 5 onglets Desktop en 3 :
//   • Synthèse     = MissionSynthesisTab + MissionFinancialTab
//   • Collaborateur = MissionCollaboratorTab + MissionActivityTab (activité + CRA)
//   • Planning     = MissionPlanningTab
// ─────────────────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mt-6 mb-4 flex items-center gap-3 border-t border-border pt-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  )
}

export function MissionDetailMobile({ vm, onRefresh }: MissionDetailMobileProps) {
  const [activeTab, setActiveTab] = useState<MissionMobileTabId>("synthesis")

  const { mission, company } = vm
  const companyName = company?.name ?? "Compte non renseigné"
  const logoPath =
    company?.metadata &&
    typeof (company.metadata as Record<string, unknown>).logo_path === "string"
      ? ((company.metadata as Record<string, unknown>).logo_path as string)
      : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
      {/* Header — logo + titre + client */}
      <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <CompanyLogo
            name={companyName}
            logoPath={logoPath}
            website={company?.website ?? null}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 font-heading text-lg font-bold leading-6 text-heading">
              {mission.title}
            </h1>
            <p className="mt-1 truncate text-xs text-muted">{companyName}</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <MissionDetailTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="shrink-0"
      />

      {/* Contenu */}
      <div className="engagements-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {activeTab === "synthesis" && (
          <div className="flex flex-col">
            <MissionSynthesisTab vm={vm} onRefresh={onRefresh} />
            <SectionDivider label="Données financières" />
            <MissionFinancialTab vm={vm} onRefresh={onRefresh} />
          </div>
        )}

        {activeTab === "collaborator" && (
          <>
            <MissionCollaboratorTab vm={vm} />
            <SectionDivider label="Activité réelle & CRA" />
            <MissionActivityTab vm={vm} />
          </>
        )}

        {activeTab === "planning" && <MissionPlanningTab vm={vm} />}
      </div>
    </div>
  )
}
