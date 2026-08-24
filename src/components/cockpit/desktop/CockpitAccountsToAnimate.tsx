import Link from "next/link"
import { CockpitSectionHeading } from "@/components/cockpit/desktop/CockpitSectionHeading"

import type { CockpitAccountActivation } from "@/lib/cockpit/cockpit-desktop-types"

const reasonAccent: Record<CockpitAccountActivation["reasonType"], string> = {
  overdue_action: "danger",
  advanced_opportunity: "brass",
  actionable_signal: "success",
  urgent_issue: "danger",
  dormant_relationship: "violet",
}

export function CockpitAccountsToAnimate({
  accounts,
}: {
  accounts: CockpitAccountActivation[]
}) {
  return (
    <aside className="kredo-cockpit-desktop__panel kredo-cockpit-desktop__accounts" aria-label="Comptes à animer">
      <CockpitSectionHeading eyebrow="Comptes à animer" title="Activation ciblée">
        <span className="kredo-cockpit-desktop__section-caption">Action · signal · échéance</span>
      </CockpitSectionHeading>

      {accounts.length ? (
        <div className="mt-4 space-y-2">
          {accounts.slice(0, 4).map((account) => (
            <article
              key={account.companyId}
              className="kredo-cockpit-desktop__account"
              data-accent={reasonAccent[account.reasonType]}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-heading">{account.companyName}</h3>
                  <p className="mt-1 truncate text-xs text-muted">{account.reasonLabel}</p>
                </div>
                {account.exposureLabel ? (
                  <span className="kredo-cockpit-desktop__account-indicator">
                    {account.exposureLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-body">{account.sector}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/prospection/accounts/${account.companyId}`} className="kredo-cockpit-desktop__text-link">
                    Fiche
                  </Link>
                  <Link href={account.primaryAction.href} className="kredo-cockpit-desktop__action-link">
                    {account.primaryAction.label}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-body">Aucun compte ne requiert une activation prioritaire.</p>
      )}

      <Link href="/prospection/accounts" className="kredo-cockpit-desktop__list-link">
        Voir la liste priorisée →
      </Link>
    </aside>
  )
}
