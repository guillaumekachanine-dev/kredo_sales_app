import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import type { SuiviData } from "@/lib/prospection/suivi-data"
import {
  STATUS_TEXT,
  StatusDot,
  ChannelTag,
  HorizonBadge,
  CampaignStatusPill,
  ProgressBar,
  CompanyLink,
} from "./suivi-parts"

// Suivi — vue desktop, orientée ACTION (analyse légère ; le décisionnel vit en Synthèse).
export function SuiviDesktopView({ data }: { data: SuiviData }) {
  const { kpis, deadlines, roadmap, campaigns, recommendations, interactions } = data

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 bg-canvas px-6 py-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-heading">Suivi de prospection</h1>
          <p className="mt-1 max-w-2xl text-sm text-body">
            Le cockpit d&apos;action : campagnes, échéances, interactions et recommandations IA.
            La roadmap commerciale issue du Client Intelligence se planifie ici.
          </p>
        </div>
        <Link
          href="/prospection/suivi/campaigns/new"
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-deep"
        >
          Nouvelle campagne
        </Link>
      </header>

      {/* KPI strip — compteurs d'action */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <SurfaceCard key={kpi.id} className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot status={kpi.status} />
              <span className="text-xs text-muted">{kpi.label}</span>
            </div>
            <div className={cn("mt-2 text-2xl font-semibold tabular-nums", STATUS_TEXT[kpi.status])}>
              {kpi.value}
            </div>
          </SurfaceCard>
        ))}
      </div>

      {/* Échéances (8) + Recommandations IA (4) */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <SurfaceCard className="col-span-8 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-heading">Échéances</h2>
            <span className="text-xs text-muted">Ce qui réclame une action</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {deadlines.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <StatusDot status={d.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-heading">{d.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    <CompanyLink company={d.company} companyId={d.companyId} />
                  </p>
                </div>
                <ChannelTag channel={d.channel} />
                <span className={cn("w-20 shrink-0 text-right text-xs font-medium", d.overdue ? "text-danger" : "text-body")}>
                  {d.dueLabel}
                </span>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard accent="primary" className="col-span-4 p-5">
          <h2 className="mb-4 text-sm font-semibold text-heading">Recommandations IA</h2>
          <ul className="flex flex-col gap-4">
            {recommendations.map((r) => (
              <li key={r.id} className="flex gap-2.5">
                <StatusDot status="neutral" />
                <div className="min-w-0">
                <p className="text-sm font-medium text-heading">{r.title}</p>
                <p className="mt-1 text-xs text-body">{r.rationale}</p>
                {r.company && (
                  <p className="mt-1 text-xs text-muted">
                    <CompanyLink company={r.company} companyId={r.companyId} />
                  </p>
                )}
                </div>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      {/* Roadmap commerciale synchronisée — pont inter-modules (phase 4 → action) */}
      <SurfaceCard className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-heading">Roadmap commerciale synchronisée</h2>
          <span className="text-xs text-muted">Issue de la phase 4 du Client Intelligence</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {roadmap.map((item) => (
            <RoadmapCard key={item.id} item={item} />
          ))}
        </div>
      </SurfaceCard>

      {/* Campagnes (7) + Interactions (5) */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <SurfaceCard className="col-span-7 p-5">
          <h2 className="mb-4 text-sm font-semibold text-heading">Campagnes actives</h2>
          <ul className="flex flex-col gap-4">
            {campaigns.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-heading">{c.name}</p>
                  <CampaignStatusPill status={c.status} />
                </div>
                <div className="mt-2">
                  <ProgressBar value={c.progress} status={c.status === "active" ? "neutral" : "success"} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{c.channel} · {c.targets} cibles</span>
                  <span className="text-body">{c.nextStepLabel}</span>
                </div>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard className="col-span-5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-heading">Interactions récentes</h2>
          <ul className="flex flex-col divide-y divide-border">
            {interactions.map((it) => (
              <li key={it.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-heading">
                    <CompanyLink company={it.company} companyId={it.companyId} />
                  </span>
                  <span className="text-xs text-muted">{it.dateLabel}</span>
                </div>
                <p className="mt-0.5 text-xs text-body">
                  <span className="text-muted">{it.type} · </span>{it.summary}
                </p>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>
    </div>
  )
}

function RoadmapCard({ item }: { item: SuiviData["roadmap"][number] }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-heading">
          <CompanyLink company={item.company} companyId={item.companyId} />
        </span>
        <HorizonBadge horizon={item.horizon} />
      </div>
      <p className="mt-2 flex-1 text-xs text-body">{item.move}</p>
      {item.scheduled ? (
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 text-xs font-medium text-success">
          <StatusDot status="success" /> Planifiée
        </span>
      ) : (
        <Link
          href={`/prospection/suivi/campaigns/new?from=roadmap&company=${item.companyId}`}
          className="mt-3 inline-flex w-fit rounded border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/[0.06]"
        >
          Planifier l&apos;action
        </Link>
      )}
    </div>
  )
}
