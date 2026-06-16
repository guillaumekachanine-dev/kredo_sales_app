"use client"

import { useState } from "react"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { InsightCard } from "@/components/ui/InsightCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import { DataTable } from "@/components/ui/data-table/DataTable"
import type { DataTableColumn, DataTableSort } from "@/components/ui/data-table/DataTable"
import { PnlBarChart } from "./PnlBarChart"
import type {
  FinanceDashboardData,
  LateBilling,
  BillingAnomaly,
  FinanceKpiDeltaTone,
} from "@/lib/finance/finance-data"

type ModalType = "dunning" | "bench" | "match" | "sync"

type ActiveModal = {
  type: ModalType
  title: string
  content: string
  targetId?: string
} | null

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

function toneFromKpi(t: FinanceKpiDeltaTone | undefined): "positive" | "negative" | "neutral" {
  if (t === "positive") return "positive"
  if (t === "negative") return "negative"
  return "neutral"
}

export function FinanceDesktopDashboard({ data }: { data: FinanceDashboardData }) {
  const { kpis, pnlRows, anomalies, lateBillings } = data

  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [billingRows, setBillingRows] = useState<LateBilling[]>(lateBillings)
  const [anomalyRows, setAnomalyRows] = useState<BillingAnomaly[]>(anomalies)
  const [sort, setSort] = useState<DataTableSort | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const openDunning = (bill: LateBilling) =>
    setActiveModal({
      type: "dunning",
      title: `Relance n8n — ${bill.clientName}`,
      content: `Déclencher le workflow de recouvrement pour ${bill.clientName} (${bill.bcNumber}). Retard : ${bill.delayDays} jours. Montant : ${bill.valueAmount}. Un email de relance personnalisé sera envoyé et l'équipe notifiée sur Teams.`,
      targetId: bill.id,
    })

  const openBench = (a: BillingAnomaly) =>
    setActiveModal({
      type: a.actionLabel === "Gérer Bench" ? "bench" : "match",
      title: `${a.actionLabel} — ${a.consultantName}`,
      content:
        a.actionLabel === "Gérer Bench"
          ? `Régulariser l'incohérence de temps déclaré pour ${a.consultantName} (TJM ${a.tjm}). Détail : ${a.anomalyText}.`
          : `Lancer le matching sémantique pgvector pour ${a.consultantName} (TJM ${a.tjm}). Le modèle proposera les 3 meilleures missions correspondantes.`,
      targetId: a.id,
    })

  const confirmAction = () => {
    if (!activeModal || !activeModal.targetId) return
    setIsProcessing(true)
    const id = activeModal.targetId
    const type = activeModal.type
    setTimeout(() => {
      setIsProcessing(false)
      if (type === "dunning") setBillingRows((prev) => prev.filter((b) => b.id !== id))
      else if (type === "bench" || type === "match") setAnomalyRows((prev) => prev.filter((a) => a.id !== id))
      setActiveModal({
        type: "sync",
        title: "Workflow déclenché",
        content: "Le scénario n8n est en cours d'exécution. Les données seront actualisées à la prochaine synchronisation.",
      })
    }, 800)
  }

  // DataTable columns for late billings
  const billingColumns: DataTableColumn<LateBilling>[] = [
    {
      id: "client",
      header: "Client",
      cell: (row) => <span className="font-semibold text-heading">{row.clientName}</span>,
      accessor: (row) => row.clientName,
      sortable: true,
    },
    {
      id: "bc",
      header: "BC N°",
      cell: (row) => <span className="font-mono text-sm text-body">{row.bcNumber}</span>,
    },
    {
      id: "delay",
      header: "Retard",
      cell: (row) => (
        <StatusPill
          label={`${row.delayDays} j`}
          variant={
            row.delayDays > 90 ? "danger" : row.delayDays > 60 ? "warning" : "neutral"
          }
        />
      ),
      accessor: (row) => row.delayDays,
      sortable: true,
      align: "center",
    },
    {
      id: "amount",
      header: "Montant",
      cell: (row) => (
        <span className="font-mono font-semibold text-heading">{row.valueAmount}</span>
      ),
      align: "right",
    },
    {
      id: "action",
      header: "",
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openDunning(row)}>
          {row.actionLabel}
        </Button>
      ),
      align: "right",
    },
  ]

  const sortedBillingRows = [...billingRows].sort((a, b) => {
    if (!sort) return 0
    let av: string | number = 0
    let bv: string | number = 0
    if (sort.columnId === "client") { av = a.clientName; bv = b.clientName }
    if (sort.columnId === "delay") { av = a.delayDays; bv = b.delayDays }
    if (av < bv) return sort.direction === "asc" ? -1 : 1
    if (av > bv) return sort.direction === "asc" ? 1 : -1
    return 0
  })

  return (
    <>
      <DesktopAnalyticalPage
        eyebrow="Centre de profit"
        title="Synthèse Financière"
        description="P&L consolidé — pnl_monthly"
        maxWidth="wide"
        kpis={
          <div className="grid grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                deltaTone={toneFromKpi(kpi.deltaTone)}
                context={kpi.context}
              />
            ))}
          </div>
        }
        rail={
          <div className="flex flex-col gap-4">
            <InsightCard
              eyebrow="n8n — Audit sémantique"
              title={
                anomalyRows.length > 0
                  ? `${anomalyRows.length} anomalie${anomalyRows.length > 1 ? "s" : ""} détectée${anomalyRows.length > 1 ? "s" : ""}`
                  : "Aucune anomalie"
              }
              summary={
                anomalyRows.length > 0
                  ? "Incohérences détectées entre les temps déclarés et le plan de charge Supabase."
                  : "Tous les temps déclarés sont cohérents avec le plan de charge."
              }
              recommendation={
                anomalyRows.length > 0
                  ? "Rapprocher les activités et régulariser avant la prochaine clôture."
                  : undefined
              }
              sourceLabel="n8n · semantic audit"
            />

            {anomalyRows.map((a) => (
              <AlertBlock
                key={a.id}
                variant="warning"
                title={a.consultantName}
                description={a.anomalyText}
                icon={<IconAlert />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => openBench(a)}>
                    {a.actionLabel}
                  </Button>
                }
              />
            ))}

            {billingRows.length > 0 && (
              <AlertBlock
                variant="danger"
                title={`${billingRows.length} facture${billingRows.length > 1 ? "s" : ""} en retard`}
                description="Campagnes dunning actives — relances 30/60/90 j"
                icon={<IconClock />}
              />
            )}
          </div>
        }
        lowerContent={
          billingRows.length > 0 ? (
            <SurfaceCard padding="none">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-heading">
                  Facturation en retard
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Relances automatiques n8n — campagnes 30/60/90 j
                </p>
              </div>
              <DataTable
                ariaLabel="Facturations en retard"
                rows={sortedBillingRows}
                columns={billingColumns}
                getRowId={(row) => row.id}
                sort={sort}
                onSortChange={setSort}
                emptyState={
                  <p className="py-8 text-center text-sm text-muted">
                    Aucune facture en retard
                  </p>
                }
              />
            </SurfaceCard>
          ) : (
            <AlertBlock
              variant="success"
              title="Aucune facture en retard"
              description="Toutes les relances ont été traitées."
            />
          )
        }
      >
        {/* Zone principale — graphique P&L */}
        <SurfaceCard padding="none">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-heading">
              Évolution P&L mensuel
            </h2>
            <div className="mt-3 flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-2.5 rounded-sm bg-dataviz-1 opacity-80" />
                CA
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-2.5 rounded-sm bg-dataviz-4 opacity-80" />
                Marge brute
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-2.5 rounded-full bg-dataviz-2" />
                Résultat op. (ligne)
              </span>
            </div>
          </div>
          <div className="p-5">
            <PnlBarChart rows={pnlRows} />
          </div>
        </SurfaceCard>
      </DesktopAnalyticalPage>

      <AppDialog
        open={Boolean(activeModal)}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null)
        }}
        title={activeModal?.title ?? ""}
        footer={
          activeModal ? (
            <>
              {activeModal.type !== "sync" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                >
                  Annuler
                </Button>
              )}
              {activeModal.type === "dunning" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmAction}
                  disabled={isProcessing}
                >
                  {isProcessing ? "En cours…" : "Lancer la relance"}
                </Button>
              )}
              {activeModal.type === "bench" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmAction}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Régularisation…" : "Régulariser"}
                </Button>
              )}
              {activeModal.type === "match" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={confirmAction}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Matching…" : "Exécuter le match"}
                </Button>
              )}
              {activeModal.type === "sync" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                >
                  Fermer
                </Button>
              )}
            </>
          ) : null
        }
      >
        <p className="leading-relaxed">{activeModal?.content ?? ""}</p>
      </AppDialog>
    </>
  )
}
