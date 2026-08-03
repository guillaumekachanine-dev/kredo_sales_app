"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import type { OpportunityDetailData } from "@/app/(app)/missions/_data/get-opportunity-detail"
import type { OpportunityStandingProfile } from "@/types/database-domain"
import {
  FinancialModelingDesktopDialog,
  FinancialModelingMobileFlow,
  getFinancialModelForStaffingAction,
} from "@/features/financial-modeling"
import type { FinancialModelingLaunchPreset } from "@/features/financial-modeling"
import { OpportunityStandingPanel } from "./OpportunityStandingPanel"

interface OpportunityStaffingTabProps {
  data: OpportunityDetailData
  isMobile: boolean
  onPositionProfile: () => void
}

const noop = () => undefined

export function OpportunityStaffingTab({
  data,
  isMobile,
  onPositionProfile,
}: OpportunityStaffingTabProps) {
  const { opportunity, account } = data
  const [simulation, setSimulation] = useState<{ profile: OpportunityStandingProfile; modelId: string | null } | null>(null)
  const simulationProfile = simulation?.profile ?? null
  const simulationPreset = useMemo<FinancialModelingLaunchPreset | undefined>(() => {
    if (!simulationProfile) return undefined

    return {
      mode: "full",
      candidateId: simulationProfile.candidate_id,
      candidateName: simulationProfile.full_name,
      annualGrossSalary: simulationProfile.expected_salary,
      companyId: account?.id ?? null,
      companyName: account?.name ?? null,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      salesDailyRate: opportunity.target_daily_rate,
    }
  }, [account?.id, account?.name, opportunity.id, opportunity.target_daily_rate, opportunity.title, simulationProfile])

  const handleLaunchFinancialSimulation = async (profile: OpportunityStandingProfile) => {
    const result = await getFinancialModelForStaffingAction(opportunity.id, profile.candidate_id)
    if (!result.success) {
      alert(result.error || "Impossible de charger la simulation financière.")
      return
    }
    setSimulation({ profile, modelId: result.id })
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-5 border-b border-border/70 pb-4">
        <div>
          {!isMobile ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              02 — Staffing
            </p>
          ) : null}
          <h2 className="mt-1 font-heading text-lg font-bold text-heading sm:text-2xl">
            Profils positionnés
          </h2>
          <p className="mt-1 text-xs leading-5 text-body">
            {data.standingProfiles.length} profil{data.standingProfiles.length > 1 ? "s" : ""} lié{data.standingProfiles.length > 1 ? "s" : ""} à cette opportunité.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onPositionProfile}>
          Positionner un profil
        </Button>
      </div>

      <OpportunityStandingPanel
        profiles={data.standingProfiles}
        practice={opportunity.practice ?? ""}
        requiresStaffing={opportunity.requires_staffing}
        isEditing={false}
        isPending={false}
        onStartEdit={noop}
        onCancel={noop}
        onSave={noop}
        onPracticeChange={noop}
        onRequiresStaffingChange={noop}
        opportunityId={opportunity.id}
        companyId={account?.id ?? null}
        companyName={account?.name ?? null}
        opportunityTitle={opportunity.title}
        onLaunchFinancialSimulation={handleLaunchFinancialSimulation}
        readOnly
      />

      {isMobile ? (
        <FinancialModelingMobileFlow
          open={simulation !== null}
          onOpenChange={(open) => !open && setSimulation(null)}
          initialId={simulation?.modelId ?? undefined}
          initialPreset={simulationPreset}
          initialView={simulation?.modelId ? "summary" : "edit"}
          forceFullMode
        />
      ) : (
        <FinancialModelingDesktopDialog
          open={simulation !== null}
          onOpenChange={(open) => !open && setSimulation(null)}
          initialId={simulation?.modelId ?? undefined}
          initialPreset={simulationPreset}
          initialView={simulation?.modelId ? "summary" : "edit"}
          forceFullMode
        />
      )}
    </section>
  )
}
