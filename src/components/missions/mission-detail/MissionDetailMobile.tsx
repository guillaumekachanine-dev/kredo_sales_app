"use client"

import { useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { AppDialog } from "@/components/ui/AppDialog"
import { updateMissionRisk } from "@/app/(app)/missions/_actions/update-mission-risk"
import { cn } from "@/lib/utils"
import { MissionDetailTabs } from "./MissionDetailTabs"
import { MissionSynthesisTab } from "./MissionSynthesisTab"
import { MissionCollaboratorTab } from "./MissionCollaboratorTab"
import { MissionPlanningTab } from "./MissionPlanningTab"
import { MissionActivityTab } from "./MissionActivityTab"
import { MissionFinancialTab } from "./MissionFinancialTab"
import { getRiskFromMetadata } from "./mission-detail-types"
import type { MissionDetailViewModel, MissionMobileTabId, RiskLevel } from "./mission-detail-types"
import { isEndingSoon } from "./mission-detail-utils"

const RISK_CLASSES: Record<RiskLevel, string> = {
  faible: "bg-success/10 border-success/20 text-success",
  modere: "bg-warning/10 border-warning/20 text-warning",
  critique: "bg-danger/10 border-danger/20 text-danger",
}

const RISK_LABELS: Record<RiskLevel, string> = {
  faible: "Risque faible",
  modere: "Risque modéré",
  critique: "Risque critique",
}

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

  const initialRisk = getRiskFromMetadata(vm.mission.metadata)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initialRisk.level)
  const [riskDescription, setRiskDescription] = useState(initialRisk.description)
  const [showRiskDialog, setShowRiskDialog] = useState(false)
  const [isEditingRisk, setIsEditingRisk] = useState(false)
  const [isUpdatingRisk, setIsUpdatingRisk] = useState(false)
  const [riskFormLevel, setRiskFormLevel] = useState<RiskLevel>(riskLevel)
  const [riskFormDesc, setRiskFormDesc] = useState(riskDescription)

  const { mission, company } = vm
  const endSoon = isEndingSoon(mission.end_date)

  const companyName = company?.name ?? "Compte non renseigné"
  const logoPath =
    company?.metadata &&
    typeof (company.metadata as Record<string, unknown>).logo_path === "string"
      ? ((company.metadata as Record<string, unknown>).logo_path as string)
      : null

  const openRiskDialog = () => {
    setRiskFormLevel(riskLevel)
    setRiskFormDesc(riskDescription)
    setIsEditingRisk(false)
    setShowRiskDialog(true)
  }

  const handleSaveRisk = async () => {
    setIsUpdatingRisk(true)
    const res = await updateMissionRisk(mission.id, riskFormLevel, riskFormDesc)
    setIsUpdatingRisk(false)
    if (res.error) {
      alert(res.error)
    } else {
      setRiskLevel(riskFormLevel)
      setRiskDescription(riskFormDesc)
      setIsEditingRisk(false)
      setShowRiskDialog(false)
    }
  }

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
          <>
            {/* Suivi du risque — relogé depuis l'ancien header */}
            <button
              type="button"
              onClick={openRiskDialog}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius-small)] border px-3 py-2.5 text-left",
                RISK_CLASSES[riskLevel],
              )}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider">
                  {RISK_LABELS[riskLevel]}
                  {endSoon ? " · échéance proche" : ""}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium opacity-80">
                  {riskDescription}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider underline">
                Modifier
              </span>
            </button>

            <div className="mt-4">
              <MissionSynthesisTab vm={vm} onRefresh={onRefresh} />
            </div>

            <SectionDivider label="Données financières" />
            <MissionFinancialTab vm={vm} onRefresh={onRefresh} />
          </>
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

      {/* Dialog suivi du risque */}
      <AppDialog
        open={showRiskDialog}
        onOpenChange={setShowRiskDialog}
        title="Suivi du risque de la mission"
        description="Niveau de risque opérationnel et financier."
      >
        <div className="mt-2 flex flex-col gap-4">
          {!isEditingRisk ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Niveau :</span>
                <span className={cn("rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", RISK_CLASSES[riskLevel])}>
                  {riskLevel}
                </span>
              </div>
              <p className="rounded border border-border/60 bg-canvas p-3 text-xs leading-relaxed text-body">
                {riskDescription}
              </p>
              <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
                <button type="button" onClick={() => setShowRiskDialog(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-heading">
                  Fermer
                </button>
                <button type="button" onClick={() => { setRiskFormLevel(riskLevel); setRiskFormDesc(riskDescription); setIsEditingRisk(true) }} className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary">
                  Modifier
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                {(["faible", "modere", "critique"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setRiskFormLevel(lvl)}
                    className={cn(
                      "flex-1 rounded-md border py-2 text-xs font-bold uppercase tracking-wider transition-all",
                      riskFormLevel === lvl
                        ? lvl === "faible" ? "border-success bg-success text-white"
                          : lvl === "modere" ? "border-warning bg-warning text-white"
                          : "border-danger bg-danger text-white"
                        : lvl === "faible" ? "border-success/30 text-success"
                          : lvl === "modere" ? "border-warning/30 text-warning"
                          : "border-danger/30 text-danger",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <textarea
                value={riskFormDesc}
                onChange={(e) => setRiskFormDesc(e.target.value)}
                className="min-h-[80px] w-full rounded border border-border bg-canvas p-2.5 text-xs text-heading focus:border-primary/50 focus:outline-none"
                placeholder="Description du risque..."
              />
              <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
                <button type="button" disabled={isUpdatingRisk} onClick={() => setIsEditingRisk(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-heading">
                  Annuler
                </button>
                <button type="button" disabled={isUpdatingRisk} onClick={handleSaveRisk} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  {isUpdatingRisk ? "…" : "Sauvegarder"}
                </button>
              </div>
            </>
          )}
        </div>
      </AppDialog>
    </div>
  )
}
