"use client"

import { useState } from "react"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileHeroInsight } from "@/components/ui/mobile/MobileHeroInsight"
import { MobileActionCard } from "@/components/ui/mobile/MobileActionCard"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import type { CockpitDashboardData } from "@/lib/cockpit/cockpit-data"

type SheetType = "intervenir" | "revoir" | "details"

type SheetContent = {
  type: SheetType
  title: string
  description: string
  primaryBtn: string
  targetId: string
}

type ActiveSheet = SheetContent | null

const SHEETS: Record<SheetType, SheetContent> = {
  intervenir: {
    type: "intervenir",
    title: "Intervenir — Staffing Mismatch",
    description:
      "Lancer le rapprochement sémantique pgvector pour résoudre les incohérences de planification sur la practice Cloud/DevOps.",
    primaryBtn: "Lancer Matching IA",
    targetId: "st-1",
  },
  revoir: {
    type: "revoir",
    title: "Revoir Proposition — Score Rouge",
    description:
      "Ouvrir l'assistant d'audit qualité IA pour optimiser la proposition commerciale de Consultant B chez Client A.",
    primaryBtn: "Corriger avec l'IA",
    targetId: "pr-1",
  },
  details: {
    type: "details",
    title: "Prochain Signataire Potentiel",
    description:
      "Visualiser les détails de l'opportunité AXA Group (Taux de conversion IA : 88%) et planifier l'appel client final.",
    primaryBtn: "Consulter l'opportunité",
    targetId: "sig-1",
  },
}

const IconWarning = () => (
  <svg
    className="size-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
)

const IconDoc = () => (
  <svg
    className="size-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const IconTarget = () => (
  <svg
    className="size-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
)

export function CockpitMobileDashboard({
  data,
}: {
  data: CockpitDashboardData
}) {
  const { kpis } = data
  const pipeKpi = kpis.find((k) => k.id === "c-weighted-pipe")

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [staffingAlert, setStaffingAlert] = useState(true)
  const [proposalAlert, setProposalAlert] = useState(true)
  const [signAlert, setSignAlert] = useState(true)

  const openSheet = (type: SheetType) => {
    setActiveSheet(SHEETS[type])
  }

  const confirmSheetAction = (type: SheetType) => {
    if (type === "intervenir") setStaffingAlert(false)
    else if (type === "revoir") setProposalAlert(false)
    else setSignAlert(false)
    setActiveSheet(null)
  }

  const noAlerts = !staffingAlert && !proposalAlert && !signAlert

  return (
    <>
      <MobileActionPage
        header={
          <MobilePageHeader
            eyebrow="Centre de profit"
            title="Cockpit"
          />
        }
        hero={
          pipeKpi ? (
            <MobileHeroInsight
              eyebrow="Pipeline pondéré"
              title="Activité commerciale"
              value={pipeKpi.value}
              summary="Pipe consolidé du centre de profit."
              confidence={pipeKpi.trendBadge}
              tone="brand"
              sourceLabel="Supabase"
            />
          ) : undefined
        }
      >
        {noAlerts ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-border bg-surface py-10 text-center">
            <p className="text-sm font-semibold text-heading">
              Aucune action requise
            </p>
            <p className="mt-1 text-xs text-body">
              Toutes les alertes ont été traitées.
            </p>
          </div>
        ) : null}

        {staffingAlert && (
          <MobileActionCard
            title="Staffing Mismatch"
            description="Anomalie de planification détectée sur la practice Cloud/DevOps."
            icon={<IconWarning />}
            status={<StatusPill label="Critique" variant="danger" />}
            primaryAction={
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => openSheet("intervenir")}
              >
                Intervenir
              </Button>
            }
          />
        )}

        {proposalAlert && (
          <MobileActionCard
            title="Proposition — Score Rouge"
            description="La proposition Consultant B présente des incohérences détectées par l'IA."
            icon={<IconDoc />}
            status={<StatusPill label="À revoir" variant="warning" />}
            primaryAction={
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => openSheet("revoir")}
              >
                Revoir la proposition
              </Button>
            }
          />
        )}

        {signAlert && (
          <MobileActionCard
            title="Prochain Signataire Potentiel"
            description="AXA Group — Taux de conversion IA : 88%."
            icon={<IconTarget />}
            status={<StatusPill label="Opportunité" variant="success" />}
            primaryAction={
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => openSheet("details")}
              >
                Voir le détail
              </Button>
            }
          />
        )}
      </MobileActionPage>

      {/* Dialogue d'action mobile */}
      <AppDialog
        open={Boolean(activeSheet)}
        onOpenChange={(open) => {
          if (!open) setActiveSheet(null)
        }}
        title={activeSheet?.title ?? ""}
        footer={
          activeSheet ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveSheet(null)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => confirmSheetAction(activeSheet.type)}
              >
                {activeSheet.primaryBtn}
              </Button>
            </>
          ) : null
        }
      >
        <p className="leading-relaxed">{activeSheet?.description ?? ""}</p>
      </AppDialog>
    </>
  )
}
