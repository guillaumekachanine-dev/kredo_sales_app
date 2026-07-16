"use client"

import { useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import { formatEuro, formatDateNumeric } from "@/lib/formatters"
import { updateMissionRisk } from "@/app/(app)/missions/_actions/update-mission-risk"
import { cn } from "@/lib/utils"
import { MissionDetailTabs } from "./MissionDetailTabs"
import { MissionSynthesisTab } from "./MissionSynthesisTab"
import { MissionCollaboratorTab } from "./MissionCollaboratorTab"
import { MissionPlanningTab } from "./MissionPlanningTab"
import { MissionActivityTab } from "./MissionActivityTab"
import { MissionFinancialTab } from "./MissionFinancialTab"
import { getRiskFromMetadata } from "./mission-detail-types"
import type {
  MissionDetailViewModel,
  MissionDetailTabId,
  RiskLevel,
} from "./mission-detail-types"
import {
  computeOverallActivityRate,
  computeRealMarginPct,
  isEndingSoon,
} from "./mission-detail-utils"

const STATUS_MAP: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "inProgress" }> = {
  active: { label: "En cours", variant: "success" },
  paused: { label: "Suspendue", variant: "neutral" },
  ended: { label: "Terminée", variant: "neutral" },
  cancelled: { label: "Annulée", variant: "danger" },
}

const RISK_CLASSES: Record<RiskLevel, string> = {
  faible: "bg-success/10 border-success/20 text-success",
  modere: "bg-warning/10 border-warning/20 text-warning",
  critique: "bg-danger/10 border-danger/20 text-danger",
}

interface MissionDetailMobileProps {
  vm: MissionDetailViewModel
  onRefresh: () => void
}

export function MissionDetailMobile({ vm, onRefresh }: MissionDetailMobileProps) {
  const [activeTab, setActiveTab] = useState<MissionDetailTabId>("synthesis")
  const initialRisk = getRiskFromMetadata(vm.mission.metadata)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initialRisk.level)
  const [riskDescription, setRiskDescription] = useState(initialRisk.description)
  const [showRiskDialog, setShowRiskDialog] = useState(false)
  const [isEditingRisk, setIsEditingRisk] = useState(false)
  const [isUpdatingRisk, setIsUpdatingRisk] = useState(false)
  const [riskFormLevel, setRiskFormLevel] = useState<RiskLevel>(riskLevel)
  const [riskFormDesc, setRiskFormDesc] = useState(riskDescription)

  const { mission, company } = vm

  const statusInfo = STATUS_MAP[mission.status] ?? { label: mission.status, variant: "neutral" as const }
  const endSoon = isEndingSoon(mission.end_date)
  const overallRate = computeOverallActivityRate(vm.activityReports)
  const realMargin = computeRealMarginPct(vm.activityReports)

  const companyName = company?.name ?? "Compte non renseigné"
  const logoPath =
    company?.metadata &&
    typeof (company.metadata as Record<string, unknown>).logo_path === "string"
      ? ((company.metadata as Record<string, unknown>).logo_path as string)
      : null

  const handleTabChange = (tab: MissionDetailTabId) => {
    setActiveTab(tab)
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
    <>
      {/* Mobile header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3 mb-3">
          <CompanyLogo
            name={companyName}
            logoPath={logoPath}
            website={company?.website ?? null}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              Mission · {mission.external_ref || mission.id.slice(0, 8)}
            </span>
            <h1 className="text-base font-bold text-heading leading-tight truncate">
              {mission.title}
            </h1>
            <p className="text-[10px] text-muted truncate">{companyName}</p>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          <StatusPill label={statusInfo.label} variant={statusInfo.variant} dot />
          {endSoon ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-danger/20 bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1 h-1 rounded-full bg-danger animate-pulse" />
              Fin proche
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRiskFormLevel(riskLevel)
                setRiskFormDesc(riskDescription)
                setIsEditingRisk(false)
                setShowRiskDialog(true)
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider",
                RISK_CLASSES[riskLevel]
              )}
            >
              <span className="w-1 h-1 rounded-full bg-current" />
              Risque {riskLevel}
            </button>
          )}
          {mission.start_date && (
            <span className="text-[10px] text-muted px-2 py-0.5 rounded bg-canvas border border-border/60 font-semibold">
              Depuis {formatDateNumeric(mission.start_date)}
            </span>
          )}
        </div>

        {/* Quick KPIs */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">TJM</span>
            <span className="text-base font-bold font-mono text-heading">{formatEuro(mission.tjm)}</span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Marge réelle</span>
            <span className={cn(
              "text-base font-bold font-mono",
              realMargin === null ? "text-muted" :
              realMargin >= 25 ? "text-success" :
              realMargin >= 15 ? "text-warning" : "text-danger"
            )}>
              {realMargin !== null ? `${realMargin.toFixed(0)}%` : "—"}
            </span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Activité</span>
            <span className={cn(
              "text-base font-bold font-mono",
              overallRate === null ? "text-muted" :
              overallRate >= 85 ? "text-success" :
              overallRate >= 70 ? "text-warning" : "text-danger"
            )}>
              {overallRate !== null ? `${overallRate.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border/60 overflow-x-auto scrollbar-none">
        <MissionDetailTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "synthesis" && (
          <MissionSynthesisTab vm={vm} onRefresh={onRefresh} />
        )}
        {activeTab === "collaborator" && (
          <MissionCollaboratorTab vm={vm} />
        )}
        {activeTab === "planning" && (
          <MissionPlanningTab vm={vm} />
        )}
        {activeTab === "activity" && (
          <MissionActivityTab vm={vm} />
        )}
        {activeTab === "financial" && (
          <MissionFinancialTab vm={vm} onRefresh={onRefresh} />
        )}
      </div>

      {/* Risk dialog */}
      <AppDialog
        open={showRiskDialog}
        onOpenChange={setShowRiskDialog}
        title="Suivi du risque de la mission"
        description="Niveau de risque opérationnel et financier."
      >
        <div className="flex flex-col gap-4 mt-2">
          {!isEditingRisk ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Niveau :</span>
                <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border", RISK_CLASSES[riskLevel])}>
                  {riskLevel}
                </span>
              </div>
              <p className="text-xs text-body leading-relaxed bg-canvas p-3 rounded border border-border/60">
                {riskDescription}
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button type="button" onClick={() => setShowRiskDialog(false)} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-heading">
                  Fermer
                </button>
                <button type="button" onClick={() => { setRiskFormLevel(riskLevel); setRiskFormDesc(riskDescription); setIsEditingRisk(true) }} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-primary/30 text-primary">
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
                      "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md border transition-all",
                      riskFormLevel === lvl
                        ? lvl === "faible" ? "bg-success text-white border-success"
                          : lvl === "modere" ? "bg-warning text-white border-warning"
                          : "bg-danger text-white border-danger"
                        : lvl === "faible" ? "text-success border-success/30"
                          : lvl === "modere" ? "text-warning border-warning/30"
                          : "text-danger border-danger/30"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <textarea
                value={riskFormDesc}
                onChange={(e) => setRiskFormDesc(e.target.value)}
                className="w-full min-h-[80px] p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50"
                placeholder="Description du risque..."
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button type="button" disabled={isUpdatingRisk} onClick={() => setIsEditingRisk(false)} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-heading">
                  Annuler
                </button>
                <button type="button" disabled={isUpdatingRisk} onClick={handleSaveRisk} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white disabled:opacity-50">
                  {isUpdatingRisk ? "…" : "Sauvegarder"}
                </button>
              </div>
            </>
          )}
        </div>
      </AppDialog>
    </>
  )
}
