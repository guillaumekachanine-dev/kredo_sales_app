"use client";

import { useMemo, useState } from "react";
import { COMMERCIAL_ACTIVITY_NATURE_LABELS } from "./commercial-activity-category";
import {
  buildCommercialActivityMobileKpis,
  buildCommercialActivityMobileTimeline,
} from "./commercial-activity-mobile-model";
import type {
  CommercialActivityFilterNature,
  CommercialActivityPeriodPreset,
  CommercialActivitySnapshot,
} from "./commercial-activity-types";

function format(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
function comparison(value: number | null) {
  return value === null ? "—" : `${value > 0 ? "+" : ""}${format(value)} %`;
}

export function CommercialActivityMobileSummary({
  snapshot,
  preset,
  nature,
}: {
  snapshot: CommercialActivitySnapshot;
  preset: CommercialActivityPeriodPreset;
  nature: CommercialActivityFilterNature;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const points = useMemo(
    () => buildCommercialActivityMobileTimeline(snapshot, preset),
    [preset, snapshot],
  );
  const kpis = buildCommercialActivityMobileKpis(snapshot, nature);
  const maximum = Math.max(
    1,
    ...points.flatMap((point) => [point.completed, point.planned]),
  );
  const selected = points.find((point) => point.key === selectedKey) ?? null;
  const maximumCompleted = Math.max(
    0,
    ...points.map((point) => point.completed),
  );
  const nonZeroDistribution = snapshot.distribution.filter(
    (item) => item.count > 0,
  );

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-2">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="min-w-0 rounded-xl border border-white/8 bg-white/[0.025] p-3"
          >
            <p className="min-h-8 text-[10px] font-semibold uppercase leading-snug tracking-[.08em] text-white/45">
              {kpi.label}
            </p>
            <strong className="mt-1 block truncate font-heading text-xl tabular-nums text-white">
              {format(kpi.value)}
              {kpi.suffix}
            </strong>
            <span className="mt-1 block text-[10px] tabular-nums text-white/50">
              {comparison(kpi.comparison)}
            </span>
          </div>
        ))}
      </div>
      <section aria-labelledby="commercial-activity-mobile-trend-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3
              id="commercial-activity-mobile-trend-title"
              className="text-sm font-semibold text-white"
            >
              Réalisé vs planifié
            </h3>
            <p className="mt-1 text-[11px] text-white/45">
              La dernière valeur et le maximum réalisé sont libellés.
            </p>
          </div>
          <span className="text-[10px] text-white/45">
            Max. {format(maximumCompleted)}
          </span>
        </div>
        {points.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-9 text-center text-xs text-white/45">
            Aucune activité sur cette période.
          </p>
        ) : (
          <>
            <div
              className="mt-4 grid h-44 grid-flow-col auto-cols-fr items-end gap-1 border-b border-white/10 pb-6"
              role="img"
              aria-label="Activité réalisée et planifiée par période"
            >
              {points.map((point, index) => (
                <button
                  key={point.key}
                  type="button"
                  aria-pressed={selected?.key === point.key}
                  onClick={() =>
                    setSelectedKey(
                      selected?.key === point.key ? null : point.key,
                    )
                  }
                  className="group relative flex h-full min-w-0 items-end justify-center gap-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/70"
                  aria-label={`${point.label}: ${format(point.completed)} réalisé, ${format(point.planned)} planifié`}
                >
                  <span
                    className="w-[42%] rounded-t-sm bg-brand-brass transition-[height] duration-150 motion-reduce:transition-none"
                    style={{ height: `${(point.completed / maximum) * 100}%` }}
                  />
                  <span
                    className="w-[42%] rounded-t-sm border border-dashed border-white/45 bg-white/[0.08] transition-[height] duration-150 motion-reduce:transition-none"
                    style={{ height: `${(point.planned / maximum) * 100}%` }}
                  />
                  {point.completed === maximumCompleted &&
                  maximumCompleted > 0 ? (
                    <span className="absolute -top-5 text-[10px] font-semibold tabular-nums text-brand-brass">
                      {format(point.completed)}
                    </span>
                  ) : null}
                  {index === points.length - 1 ? (
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/65">
                      {format(point.completed)} / {format(point.planned)}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-white/60">
              <span>
                <i className="mr-1 inline-block size-2 rounded-sm bg-brand-brass" />
                Réalisé
              </span>
              <span>
                <i className="mr-1 inline-block size-2 rounded-sm border border-dashed border-white/50" />
                Planifié
              </span>
            </div>
            {selected ? (
              <p
                role="status"
                className="mt-3 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/75"
              >
                {selected.label} : {format(selected.completed)} réalisé ·{" "}
                {format(selected.planned)} planifié
              </p>
            ) : null}
            <table className="sr-only">
              <caption>Données détaillées du graphique</caption>
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Réalisé</th>
                  <th>Planifié</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.key}>
                    <td>{point.label}</td>
                    <td>{point.completed}</td>
                    <td>{point.planned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
      {nonZeroDistribution.length > 1 ? (
        <section aria-labelledby="commercial-activity-mobile-distribution-title">
          <h3
            id="commercial-activity-mobile-distribution-title"
            className="text-sm font-semibold text-white"
          >
            Répartition de l’activité réalisée
          </h3>
          <div className="mt-3 space-y-3">
            {snapshot.distribution.map((item) => (
              <div
                key={item.nature}
                className="grid grid-cols-[minmax(100px,1fr)_minmax(72px,1.4fr)_auto] items-center gap-2"
              >
                <span className="text-[11px] text-white/70">
                  {COMMERCIAL_ACTIVITY_NATURE_LABELS[item.nature]}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-white/[.08]">
                  <i
                    className="block h-full rounded-full bg-brand-brass"
                    style={{ width: `${item.sharePct}%` }}
                  />
                </span>
                <strong className="text-[11px] tabular-nums text-white">
                  {format(item.count)}
                </strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
