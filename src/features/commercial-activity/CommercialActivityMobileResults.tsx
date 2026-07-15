"use client";

import { buildCommercialActivityMobileResults } from "./commercial-activity-mobile-model";
import type {
  CommercialActivityFilterNature,
  CommercialActivitySnapshot,
} from "./commercial-activity-types";

function format(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

export function CommercialActivityMobileResults({
  snapshot,
  nature,
}: {
  snapshot: CommercialActivitySnapshot;
  nature: CommercialActivityFilterNature;
}) {
  const groups = buildCommercialActivityMobileResults(snapshot, nature);
  if (groups.length === 0)
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <h3 className="text-sm font-semibold text-white">
          Aucun résultat commercial structuré
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          Cette nature ne possède pas de résultat commercial ou recrutement
          directement attribuable.
        </p>
      </div>
    );
  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Résultats observés</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
          Ces enregistrements ne représentent ni une conversion ni une causalité
          entre étapes.
        </p>
      </div>
      {groups.map((group) => (
        <section
          key={group.title}
          aria-labelledby={`commercial-results-${group.title}`}
        >
          <h4
            id={`commercial-results-${group.title}`}
            className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/45"
          >
            {group.title}
          </h4>
          <div className="mt-2 divide-y divide-white/8 rounded-xl border border-white/8 bg-white/[0.02]">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
              >
                <span className="text-xs text-white/70">{item.label}</span>
                <strong className="shrink-0 text-sm tabular-nums text-white">
                  {format(item.value)}
                  {item.suffix}
                </strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
