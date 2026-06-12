import type {
  ClientIntelligenceContact,
  ClientIntelligencePresence,
  IntelligenceSource,
} from "@/lib/intelligence/intelligence-data"
import { FreshnessLine, PhasePresence } from "./intelligence-parts"
import Link from "next/link"
import type { DashboardAction } from "@/lib/dashboard/dashboard-types"

// ─────────────────────────────────────────────────────────────────────────────
//  IntelligenceRightRail — « Tour de contrôle » (ADR-0008)
//
//  Parti pris : un panneau SOMBRE (navy `--heading`) qui tranche avec le cockpit
//  clair. Voile cobalt en haut + liseré cobalt à gauche + cartes givrées
//  clair-sur-sombre + puce « live ». Flat, premium, palette Cobalt Franc only,
//  zéro ombre. Pleine hauteur → coupe le header (= largeur de la section
//  principale).
// ─────────────────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function RailHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="h-px w-3 bg-primary/70" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-fg/55">{title}</h3>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-primary-fg/10 px-1.5 py-px text-[10px] font-bold text-primary-fg/70">
          {count}
        </span>
      )}
    </div>
  )
}

export function IntelligenceRightRail({
  freshness,
  presence,
  contacts,
  analysisSource,
  quickActions,
  message,
}: {
  freshness: {
    latestRunAt: string | null
    latestRunStatus: string | null
    countRuns: number
    countResults: number
  }
  presence: ClientIntelligencePresence
  contacts: ClientIntelligenceContact[]
  analysisSource: IntelligenceSource
  quickActions: DashboardAction[]
  message?: string | null
}) {
  return (
    <aside className="relative hidden w-80 shrink-0 overflow-y-auto bg-rail lg:block">

      <div className="relative space-y-6 p-5">
        {/* Eyebrow — identité du panneau + puce live */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-fg/60">
            Tour de contrôle
          </span>
        </div>

        {/* Actions rapides */}
        {quickActions && quickActions.length > 0 && (
          <section>
            <RailHeading title="Actions rapides" />
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const btnCls = "inline-flex items-center justify-center gap-2 rounded border border-primary-fg/10 bg-primary-fg/[0.04] px-2.5 py-2 text-center text-xs font-semibold text-primary-fg transition-all active:scale-95 hover:bg-primary-fg/[0.08] cursor-pointer min-h-[40px]"
                const content = (
                  <>
                    {action.icon}
                    <span>{action.label}</span>
                  </>
                )
                if (action.href) {
                  return (
                    <Link key={action.id} href={action.href} className={btnCls}>
                      {content}
                    </Link>
                  )
                }
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className={btnCls}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
            {message && (
              <p className="mt-2 text-center text-[11px] text-primary-fg/50 font-medium transition-opacity">
                {message}
              </p>
            )}
          </section>
        )}

        {/* Fraîcheur & moteur */}
        <section>
          <RailHeading title="Fraîcheur & moteur" />
          <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.05] p-3.5">
            <FreshnessLine
              latestRunAt={freshness.latestRunAt}
              latestRunStatus={freshness.latestRunStatus}
              fallbackSource={analysisSource}
              tone="dark"
            />
            <div className="mt-3 border-t border-primary-fg/10 pt-3">
              <PhasePresence presence={presence} tone="dark" />
            </div>
          </div>
        </section>

        {/* Contacts clés */}
        <section>
          <RailHeading title="Contacts clés" count={contacts.length} />
          {contacts.length === 0 ? (
            <p className="text-xs italic text-primary-fg/40">Aucun contact rattaché.</p>
          ) : (
            <ul className="space-y-1.5">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-center gap-3 rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5 transition-colors hover:bg-primary-fg/[0.08]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/25 text-[10px] font-bold text-primary-fg">
                    {initials(contact.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-primary-fg">{contact.fullName}</p>
                    <p className="truncate text-[11px] text-primary-fg/45">
                      {contact.jobTitle ?? contact.relationshipRole ?? "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Prochaines actions */}
        <section>
          <RailHeading title="Prochaines actions" />
          <div className="rounded-lg border border-dashed border-primary-fg/15 bg-primary-fg/[0.02] px-3 py-5 text-center">
            <p className="text-[11px] leading-relaxed text-primary-fg/40">
              Générées par la roadmap commerciale <span className="text-primary-fg/55">(lot G)</span>.
            </p>
          </div>
        </section>
      </div>
    </aside>
  )
}
