import type { CockpitKpi } from "@/lib/cockpit/cockpit-desktop-types"

const accentByKpiId: Record<CockpitKpi["id"], string> = {
  "revenue-ytd": "success",
  "margin-ytd": "brass",
  "weighted-pipeline": "primary",
  "exposure-30d": "danger",
}

export function CockpitKpiStrip({ kpis }: { kpis: CockpitKpi[] }) {
  return (
    <section aria-label="Indicateurs clés" className="kredo-cockpit-desktop__kpi-strip">
      {kpis.map((kpi) => (
        <article key={kpi.id} className="kredo-cockpit-desktop__kpi-card" data-accent={accentByKpiId[kpi.id]}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{kpi.label}</p>
          <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.02em] text-heading">{kpi.value}</p>
          {kpi.detail ? <p className="mt-2 text-xs text-body">{kpi.detail}</p> : null}
        </article>
      ))}
    </section>
  )
}
