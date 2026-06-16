"use client"

import { useState } from "react"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { InsightCard } from "@/components/ui/InsightCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { PageQuickActions } from "@/components/ui/PageQuickActions"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import { DataTable } from "@/components/ui/data-table/DataTable"
import type { DataTableColumn, DataTableSort } from "@/components/ui/data-table/DataTable"
import type { PageQuickAction } from "@/components/ui/page-quick-actions"
import { PnlBarChart } from "./PnlBarChart"
import { PageFilterBar } from "@/components/ui/PageFilterBar"
import { PageFilterSelect } from "@/components/ui/PageFilterSelect"
import { PageViewSelector } from "@/components/ui/PageViewSelector"
import type { PageFilterOption } from "@/components/ui/PageFilterSelect"
import type {
  FinanceDashboardData,
  LateBilling,
  BillingAnomaly,
  FinanceKpiDeltaTone,
  PracticeMetric,
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

const IconSimulation = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14M7 16V9M12 16V5M17 16v-7" />
  </svg>
)

const IconSummary = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h7.5L19 9.25v10A1.75 1.75 0 0117.25 21h-10.5A1.75 1.75 0 015 19.25V6.5A1.75 1.75 0 016.75 4.75H7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 4.75v4.5h4.5M8 12h8M8 15.5h5" />
  </svg>
)

const IconTargets = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v3M12 17v3M4 12h3M17 12h3M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const IconPipeline = () => (
  <svg className="size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 8.75h5.5v6.5h-5.5zM13.75 5.75h5.5v4.5h-5.5zM13.75 13.25h5.5v5h-5.5z" />
  </svg>
)

function toneFromKpi(t: FinanceKpiDeltaTone | undefined): "positive" | "negative" | "neutral" {
  if (t === "positive") return "positive"
  if (t === "negative") return "negative"
  return "neutral"
}

function fmtEuro(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} M€`
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} k€`
  return `${sign}${Math.round(abs)} €`
}

function PracticeMetricsPanel({
  metric,
  totalRevenue,
}: {
  metric: PracticeMetric
  totalRevenue: number
}) {
  const sharePct = totalRevenue > 0 ? (metric.revenue / totalRevenue) * 100 : 0
  const marginTone =
    metric.grossMarginPct >= 30 ? "positive"
    : metric.grossMarginPct >= 15 ? "neutral"
    : "negative"

  const items = [
    {
      label: "CA YTD",
      value: fmtEuro(metric.revenue),
      sub: `${sharePct.toFixed(0)} % du CA global`,
    },
    {
      label: "Marge brute",
      value: `${metric.grossMarginPct.toFixed(1)} %`,
      sub: fmtEuro(metric.grossMargin),
      tone: marginTone,
    },
    {
      label: "Jours facturés",
      value: metric.billableDays.toFixed(0),
      sub: "YTD",
    },
    {
      label: "Consultants actifs",
      value: String(metric.consultantCount),
      sub: "missions en cours",
    },
  ] as const

  return (
    <SurfaceCard padding="none">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Practice
          </p>
          <h2 className="text-sm font-bold text-heading">{metric.practice}</h2>
        </div>
        <span className="text-[length:var(--font-size-label-sm)] text-muted">
          Métriques YTD
        </span>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5 px-5 py-4">
            <p className="text-[11px] font-medium text-muted">{item.label}</p>
            <p
              className={[
                "font-heading text-xl font-bold leading-tight",
                "tone" in item && item.tone === "positive" ? "text-success"
                : "tone" in item && item.tone === "negative" ? "text-danger"
                : "text-heading",
              ].join(" ")}
            >
              {item.value}
            </p>
            <p className="text-[11px] text-muted">{item.sub}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  )
}

export function FinanceDesktopDashboard({ data }: { data: FinanceDashboardData }) {
  const { kpis, pnlRows, anomalies, lateBillings, practiceMetrics } = data

  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [billingRows, setBillingRows] = useState<LateBilling[]>(lateBillings)
  const [anomalyRows, setAnomalyRows] = useState<BillingAnomaly[]>(anomalies)
  const [sort, setSort] = useState<DataTableSort | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Filtres P&L
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [viewWindow, setViewWindow] = useState<string>("6")
  const [practiceFilter, setPracticeFilter] = useState<string>("all")

  const uniqueSources = Array.from(new Set(pnlRows.map((r) => r.source))).filter(Boolean)
  const sourceOptions: PageFilterOption[] = [
    { value: "all", label: "Toutes les sources" },
    ...uniqueSources.map((s) => ({
      value: s,
      label:
        s === "import" ? "Import"
        : s === "cra_derived" ? "CRA dérivé"
        : s === "budget" ? "Budget"
        : s === "forecast" ? "Forecast"
        : s,
    })),
  ]

  const practiceOptions: PageFilterOption[] = [
    { value: "all", label: "Toutes les practices" },
    ...practiceMetrics.map((p) => ({ value: p.practice, label: p.practice })),
  ]

  const viewItems = [
    { value: "6", label: "6 mois" },
    { value: "12", label: "12 mois" },
  ]

  const activeFilterCount =
    (sourceFilter !== "all" ? 1 : 0) + (practiceFilter !== "all" ? 1 : 0)

  const handleResetFilters = () => {
    setSourceFilter("all")
    setPracticeFilter("all")
  }

  const filteredPnlRows =
    sourceFilter === "all"
      ? pnlRows
      : pnlRows.filter((r) => r.source === sourceFilter)

  const selectedPractice: PracticeMetric | undefined =
    practiceFilter !== "all"
      ? practiceMetrics.find((p) => p.practice === practiceFilter)
      : undefined

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
      cell: (row) => <span className="text-sm text-body">{row.bcNumber}</span>,
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
        <span className="font-semibold text-heading">{row.valueAmount}</span>
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

  const quickActions: PageQuickAction[] = [
    {
      id: "simulation",
      label: "Simulation",
      icon: <IconSimulation />,
      feedbackMessage: "Fonctionnalité à venir",
    },
    {
      id: "summary",
      label: "Synthèse",
      icon: <IconSummary />,
      description: "Choisissez une synthèse puis produisez-la depuis le drawer.",
      submitLabel: "Produire la synthèse",
      options: [
        {
          id: "monthly-summary",
          label: "Synthèse mensuelle",
          icon: <IconSummary />,
          description: "Revenir à la synthèse mensuelle de la page Finance.",
          href: "/finance",
        },
        {
          id: "annual-pnl",
          label: "P&L annuel",
          icon: <IconSimulation />,
          description: "Accéder à la lecture annuelle du P&L.",
          href: "/finance",
        },
        {
          id: "targets",
          label: "Objectifs",
          icon: <IconTargets />,
          description: "Préparer une vue d’objectifs financiers consolidés.",
          feedbackMessage: "Fonctionnalité à venir",
        },
        {
          id: "oppy-pipe",
          label: "Pipe Oppy",
          icon: <IconPipeline />,
          description: "Basculer vers le pipe commercial des opportunités.",
          href: "/missions/opps",
        },
      ],
    },
  ]

  const toolbar = (
    <PageFilterBar
      activeCount={activeFilterCount}
      onReset={handleResetFilters}
      viewSelector={
        <PageViewSelector
          items={viewItems}
          value={viewWindow}
          onChange={setViewWindow}
          ariaLabel="Fenêtre temporelle du graphique P&L"
        />
      }
    >
      {practiceOptions.length > 1 ? (
        <PageFilterSelect
          id="finance-filter-practice"
          label="Practice"
          value={practiceFilter}
          options={practiceOptions}
          onChange={setPracticeFilter}
        />
      ) : null}
      {sourceOptions.length > 1 ? (
        <PageFilterSelect
          id="finance-filter-source"
          label="Source"
          value={sourceFilter}
          options={sourceOptions}
          onChange={setSourceFilter}
        />
      ) : null}
    </PageFilterBar>
  )

  return (
    <>
      <DesktopAnalyticalPage
        title="Synthèse Financière"
        maxWidth="wide"
        toolbar={toolbar}
        actions={<PageQuickActions actions={quickActions} />}
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
        {/* Panel Practice — visible uniquement si une practice est sélectionnée */}
        {selectedPractice ? (
          <PracticeMetricsPanel
            metric={selectedPractice}
            totalRevenue={practiceMetrics.reduce((s, p) => s + p.revenue, 0)}
          />
        ) : null}

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
            <PnlBarChart rows={filteredPnlRows} window={Number(viewWindow)} />
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
