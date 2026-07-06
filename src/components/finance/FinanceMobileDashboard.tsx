"use client"

import { useState } from "react"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileHeroInsight } from "@/components/ui/mobile/MobileHeroInsight"
import { MobileActionCard } from "@/components/ui/mobile/MobileActionCard"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { FinanceDashboardData, LateBilling, BillingAnomaly } from "@/lib/finance/finance-data"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { FinancialModelingMobileFlow } from "@/features/financial-modeling"

type SheetType = "dunning" | "bench"

type SheetContent = {
  type: SheetType
  title: string
  description: string
  primaryBtn: string
  targetId: string
}

type ActiveSheet = SheetContent | null

const MONTHS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
]

function fmtMonthShort(iso: string): string {
  const d = new Date(iso)
  return MONTHS_FR[d.getMonth()]
}

const IconClock = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IconAlert = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

export function FinanceMobileDashboard({ data }: { data: FinanceDashboardData }) {
  const { kpis, pnlRows, lateBillings, anomalies } = data

  const margeKpi = kpis.find((k) => k.id === "f-marge-brute")
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const opKpi = kpis.find((k) => k.id === "f-resultat-op")

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [billingRows, setBillingRows] = useState<LateBilling[]>(lateBillings)
  const [anomalyRows, setAnomalyRows] = useState<BillingAnomaly[]>(anomalies)

  const urgentBilling = billingRows[0] ?? null
  const firstAnomaly = anomalyRows[0] ?? null
  const noAlerts = !urgentBilling && !firstAnomaly

  const heroTone =
    margeKpi?.deltaTone === "negative"
      ? "danger"
      : margeKpi?.deltaTone === "positive"
        ? "success"
        : "brand"

  const openSheet = (type: SheetType, target: LateBilling | BillingAnomaly) => {
    if (type === "dunning") {
      const bill = target as LateBilling
      setActiveSheet({
        type,
        title: `Relance — ${bill.clientName}`,
        description: `Déclencher la relance n8n pour ${bill.clientName} (${bill.bcNumber}). Retard : ${bill.delayDays} jours. Montant : ${bill.valueAmount}.`,
        primaryBtn: "Envoyer la relance",
        targetId: bill.id,
      })
    } else {
      const a = target as BillingAnomaly
      setActiveSheet({
        type,
        title: `${a.actionLabel} — ${a.consultantName}`,
        description: `${a.anomalyText}. TJM : ${a.tjm}.`,
        primaryBtn: a.actionLabel === "Gérer Bench" ? "Régulariser" : "Lancer le match",
        targetId: a.id,
      })
    }
  }

  const confirmSheetAction = (type: SheetType, targetId: string) => {
    if (type === "dunning") setBillingRows((prev) => prev.filter((b) => b.id !== targetId))
    else setAnomalyRows((prev) => prev.filter((a) => a.id !== targetId))
    setActiveSheet(null)
  }

  // Last 3 months for the mini trend bars
  const trendRows = pnlRows.slice(-3)
  const trendMax = Math.max(...trendRows.map((r) => r.revenue_total), 1)

  return (
    <>
      <MobileActionPage
        header={
          <MobilePageHeader
            title="Finance"
          />
        }
        hero={
          margeKpi ? (
            <MobileHeroInsight
              eyebrow="Marge brute"
              title="Trajectoire financière"
              value={margeKpi.value}
              summary={
                margeKpi.delta
                  ? `Variation : ${margeKpi.delta} vs période précédente.`
                  : "Taux de marge brute de la dernière période disponible."
              }
              confidence={
                margeKpi.deltaTone === "positive"
                  ? "En progression"
                  : margeKpi.deltaTone === "negative"
                    ? "En recul"
                    : "Stable"
              }
              sourceLabel="pnl_monthly"
              tone={heroTone}
            />
          ) : undefined
        }
      >
        {/* Actions prioritaires de simulation et rapport */}
        <div className="shrink-0 space-y-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setIsSimulationOpen(true)}
            className="h-11 rounded-[var(--radius-large)] flex items-center justify-center gap-2"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14M7 16V9M12 16V5M17 16v-7" />
            </svg>
            <span>Simuler une mission</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => openReportGeneration({ origin: "global", reportType: "financial" })}
            className="h-11 rounded-[var(--radius-large)] flex items-center justify-center gap-2"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h7.5L19 9.25v10A1.75 1.75 0 0117.25 21h-10.5A1.75 1.75 0 015 19.25V6.5A1.75 1.75 0 016.75 4.75H7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 4.75v4.5h4.5M8 12h8M8 15.5h5" />
            </svg>
            <span>Rapport financier</span>
          </Button>
        </div>

        {/* Facturation urgente */}
        {urgentBilling && (
          <MobileActionCard
            title={urgentBilling.clientName}
            description={`${urgentBilling.bcNumber} — ${urgentBilling.valueAmount}`}
            icon={<IconClock />}
            status={
              <StatusPill
                label={`${urgentBilling.delayDays} j`}
                variant={urgentBilling.delayDays > 90 ? "danger" : "warning"}
              />
            }
            primaryAction={
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => openSheet("dunning", urgentBilling)}
              >
                Relancer
              </Button>
            }
          />
        )}

        {/* Anomalie bench */}
        {firstAnomaly && (
          <MobileActionCard
            title={firstAnomaly.consultantName}
            description={firstAnomaly.anomalyText}
            icon={<IconAlert />}
            status={
              <StatusPill
                label={firstAnomaly.badgeText ?? "Anomalie"}
                variant="warning"
              />
            }
            primaryAction={
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => openSheet("bench", firstAnomaly)}
              >
                {firstAnomaly.actionLabel}
              </Button>
            }
          />
        )}

        {/* Résultat opérationnel + mini tendance CA */}
        {opKpi && (
          <SurfaceCard padding="default" radius="xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-muted">
                  Résultat opérationnel
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-heading">
                  {opKpi.value}
                </p>
                {opKpi.context && (
                  <p className="mt-0.5 text-xs text-body">{opKpi.context}</p>
                )}
              </div>
              <StatusPill
                label={
                  opKpi.deltaTone === "positive"
                    ? "Bénéficiaire"
                    : opKpi.deltaTone === "negative"
                      ? "Déficitaire"
                      : "Neutre"
                }
                variant={
                  opKpi.deltaTone === "positive"
                    ? "success"
                    : opKpi.deltaTone === "negative"
                      ? "danger"
                      : "neutral"
                }
              />
            </div>

            {/* Mini barre tendance CA — 3 derniers mois, HTML/Tailwind pur */}
            {trendRows.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted">CA — 3 dernières périodes</p>
                <div className="flex items-end gap-2" style={{ height: "40px" }}>
                  {trendRows.map((r) => {
                    const pct = Math.max(12, (r.revenue_total / trendMax) * 100)
                    return (
                      <div
                        key={r.period_month}
                        className="flex flex-1 flex-col items-center gap-1"
                        style={{ height: "100%" }}
                      >
                        <div className="w-full flex-1 flex flex-col justify-end">
                          <div
                            className="w-full rounded-sm bg-dataviz-1 opacity-80"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-medium text-muted">
                          {fmtMonthShort(r.period_month)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </SurfaceCard>
        )}

        {/* État vide */}
        {noAlerts && !opKpi && (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-border bg-surface py-10 text-center">
            <p className="text-sm font-semibold text-heading">Aucune action requise</p>
            <p className="mt-1 text-xs text-body">
              Toutes les alertes ont été traitées.
            </p>
          </div>
        )}
      </MobileActionPage>

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
                onClick={() =>
                  confirmSheetAction(activeSheet.type, activeSheet.targetId)
                }
              >
                {activeSheet.primaryBtn}
              </Button>
            </>
          ) : null
        }
      >
        <p className="leading-relaxed">{activeSheet?.description ?? ""}</p>
      </AppDialog>

      <FinancialModelingMobileFlow
        open={isSimulationOpen}
        onOpenChange={setIsSimulationOpen}
      />
    </>
  )
}
