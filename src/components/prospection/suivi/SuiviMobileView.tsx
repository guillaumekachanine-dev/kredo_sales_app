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

// Suivi — vue mobile, ACTION pure : ce que je fais maintenant, en gros et au pouce.
export function SuiviMobileView({ data }: { data: SuiviData }) {
  const { kpis, deadlines, roadmap, campaigns, recommendations, interactions } = data

  return (
    <div className="flex flex-col gap-5 bg-canvas px-4 py-5 pb-24">
      <header>
        <h1 className="text-lg font-semibold text-heading">Suivi</h1>
        <p className="mt-0.5 text-sm text-body">Vos actions de prospection du moment.</p>
      </header>

      {/* KPI — 2x2 compteurs d'action */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <SurfaceCard key={kpi.id} className="p-3">
            <div className={cn("text-2xl font-semibold tabular-nums", STATUS_TEXT[kpi.status])}>{kpi.value}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-muted">{kpi.label}</div>
          </SurfaceCard>
        ))}
      </div>

      {/* À faire — échéances en liste tappable */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">À faire</h2>
        <div className="flex flex-col gap-2">
          {deadlines.map((d) => (
            <SurfaceCard key={d.id} className="flex items-center gap-3 p-3.5">
              <StatusDot status={d.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-heading">{d.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  <CompanyLink company={d.company} companyId={d.companyId} />
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn("text-xs font-medium", d.overdue ? "text-danger" : "text-body")}>{d.dueLabel}</span>
                <ChannelTag channel={d.channel} />
              </div>
            </SurfaceCard>
          ))}
        </div>
      </section>

      {/* Roadmap synchronisée — cartes à planifier */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Roadmap à planifier</h2>
        <div className="flex flex-col gap-2">
          {roadmap.map((item) => (
            <SurfaceCard key={item.id} className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-heading">
                  <CompanyLink company={item.company} companyId={item.companyId} />
                </span>
                <HorizonBadge horizon={item.horizon} />
              </div>
              <p className="mt-1.5 text-xs text-body">{item.move}</p>
              {item.scheduled ? (
                <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-success">
                  <StatusDot status="success" /> Planifiée
                </span>
              ) : (
                <Link
                  href={`/prospection/suivi/campaigns/new?from=roadmap&company=${item.companyId}`}
                  className="mt-2.5 flex h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-fg"
                >
                  Planifier l&apos;action
                </Link>
              )}
            </SurfaceCard>
          ))}
        </div>
      </section>

      {/* Recommandations IA */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Recommandations IA</h2>
        <div className="flex flex-col gap-2">
          {recommendations.map((r) => (
            <SurfaceCard key={r.id} accent="primary" className="p-3.5">
              <p className="text-sm font-medium text-heading">{r.title}</p>
              <p className="mt-1 text-xs text-body">{r.rationale}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      {/* Campagnes — synthèse compacte avec jauge */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Campagnes</h2>
        <div className="flex flex-col gap-2">
          {campaigns.map((c) => (
            <SurfaceCard key={c.id} className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-heading">{c.name}</p>
                <CampaignStatusPill status={c.status} />
              </div>
              <div className="mt-2">
                <ProgressBar value={c.progress} tone={c.status === "active" ? "primary" : "success"} />
              </div>
              <p className="mt-1.5 text-xs text-muted">{c.nextStepLabel}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      {/* Interactions récentes */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Interactions récentes</h2>
        <div className="flex flex-col gap-2">
          {interactions.map((it) => (
            <SurfaceCard key={it.id} className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-heading">
                  <CompanyLink company={it.company} companyId={it.companyId} />
                </span>
                <span className="text-xs text-muted">{it.dateLabel}</span>
              </div>
              <p className="mt-0.5 text-xs text-body">
                <span className="text-muted">{it.type} · </span>{it.summary}
              </p>
            </SurfaceCard>
          ))}
        </div>
      </section>
    </div>
  )
}
