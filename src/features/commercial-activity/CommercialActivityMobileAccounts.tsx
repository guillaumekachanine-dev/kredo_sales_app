"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildCommercialActivityMobileAccounts } from "./commercial-activity-mobile-model";
import type { CommercialActivitySnapshot } from "./commercial-activity-types";

function format(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    value,
  );
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
      }).format(new Date(value))
    : "—";
}

export function CommercialActivityMobileAccounts({
  snapshot,
}: {
  snapshot: CommercialActivitySnapshot;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const accounts = buildCommercialActivityMobileAccounts(snapshot);
  const visible = accounts.slice(0, expanded ? 10 : 5);
  if (accounts.length === 0)
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <h3 className="text-sm font-semibold text-white">
          Aucun compte associé
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          Aucun compte n’est directement associé aux activités réalisées dans ce
          périmètre.
        </p>
      </div>
    );
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Comptes activés</h3>
        <p className="mt-1 text-[11px] text-white/45">
          Classement par activité réalisée ; touchez une ligne pour ouvrir le
          compte.
        </p>
      </div>
      <div className="divide-y divide-white/8 rounded-xl border border-white/8 bg-white/[0.02]">
        {visible.map((account) => (
          <button
            key={account.companyId}
            type="button"
            onClick={() =>
              router.push(`/prospection/accounts/${account.companyId}`)
            }
            className="min-h-16 w-full px-3 py-3 text-left transition-colors hover:bg-white/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-brass/60"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <strong className="block truncate text-xs text-white">
                  {account.companyName}
                </strong>
                <span className="mt-1 block text-[10px] text-white/45">
                  {account.contactsReached} contact
                  {account.contactsReached > 1 ? "s" : ""} joint
                  {account.contactsReached > 1 ? "s" : ""} ·{" "}
                  {account.outcomesCount} résultat
                  {account.outcomesCount > 1 ? "s" : ""}
                </span>
              </span>
              <span className="shrink-0 text-right text-[10px] tabular-nums text-white/55">
                <strong className="block text-xs text-white">
                  {account.completedActivities} act.
                </strong>
                {format(account.completedHours)} h ·{" "}
                {date(account.lastActivityAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
      {accounts.length > 5 && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-11 w-full rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/50"
        >
          Voir les 5 suivants
        </button>
      ) : null}
    </div>
  );
}
