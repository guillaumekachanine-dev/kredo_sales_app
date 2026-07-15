"use client";

import { useState } from "react";
import type {
  CommercialActivityMetric,
  CommercialActivitySnapshot,
} from "./commercial-activity-types";

function format(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    value,
  );
}

export function CommercialActivityRhythm({
  snapshot,
}: {
  snapshot: CommercialActivitySnapshot;
}) {
  const [metric, setMetric] = useState<CommercialActivityMetric>("volume");
  const values = snapshot.timeline.map((point) => ({
    label: point.label,
    completed:
      metric === "volume" ? point.completedCount : point.completedHours,
    planned: metric === "volume" ? point.plannedCount : point.plannedHours,
  }));
  const maximum = Math.max(
    1,
    ...values.flatMap((point) => [point.completed, point.planned]),
  );
  const completed = values.reduce((total, point) => total + point.completed, 0);
  const planned = values.reduce((total, point) => total + point.planned, 0);
  const top = values.reduce(
    (current, point) => (point.completed > current.completed ? point : current),
    values[0] ?? { label: "—", completed: 0, planned: 0 },
  );
  return (
    <div className="space-y-6 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Rythme d’activité
          </h3>
          <p className="mt-1 text-[11px] text-white/45">
            Réalisé vs planifié, sans double axe.
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMetric("volume")}
            className={`rounded-md px-2.5 py-1.5 ${metric === "volume" ? "bg-white/10 text-white" : "text-white/50"}`}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() => setMetric("hours")}
            className={`rounded-md px-2.5 py-1.5 ${metric === "hours" ? "bg-white/10 text-white" : "text-white/50"}`}
          >
            Temps
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex h-60 min-w-[520px] items-end gap-3 border-b border-white/10 pb-7">
          {values.map((point) => (
            <div
              key={point.label}
              className="relative flex h-full flex-1 items-end justify-center gap-1"
            >
              <span
                className="w-[34%] rounded-t-sm bg-brand-brass transition-[height] duration-300"
                style={{ height: `${(point.completed / maximum) * 100}%` }}
                title={`${point.label}: ${format(point.completed)} réalisé`}
              />
              <span
                className="w-[34%] rounded-t-sm bg-white/20 transition-[height] duration-300"
                style={{ height: `${(point.planned / maximum) * 100}%` }}
                title={`${point.label}: ${format(point.planned)} planifié`}
              />
              <span className="absolute -bottom-5 inset-x-0 truncate text-center text-[9px] text-white/40">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 text-[11px]">
        <div className="border-t border-white/8 pt-3">
          <span className="text-white/45">Moyenne / période</span>
          <strong className="mt-1 block text-base tabular-nums text-white">
            {format(values.length ? completed / values.length : 0)}
          </strong>
        </div>
        <div className="border-t border-white/8 pt-3">
          <span className="text-white/45">Période la plus active</span>
          <strong className="mt-1 block text-base text-white">
            {top.label}
          </strong>
        </div>
        <div className="border-t border-white/8 pt-3">
          <span className="text-white/45">Réalisé vs planifié</span>
          <strong className="mt-1 block text-base tabular-nums text-white">
            {format(completed)} / {format(planned)}
          </strong>
        </div>
      </div>
    </div>
  );
}
