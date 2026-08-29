import { cn } from "@/lib/utils"
import { formatEuroCompact, formatPct } from "@/lib/formatters"
import type {
  ClosureItem,
  EngagementsActivityAnalytics,
  MarginRealityItem,
} from "./engagements-activity-types"
import { ProductivityTrendChart } from "./ProductivityTrendChart"
import { UnplannedAbsenceTrendChart } from "./UnplannedAbsenceTrendChart"

// ─────────────────────────────────────────────────────────────────────────────
//  Vue « Activité & congés » — Desktop, Phase 2.
//  Surface analytique transverse (pas de rails) : composition éditoriale de
//  4 blocs, sections à filet fin, aucune card-in-card. Server Component :
//  toutes les agrégations viennent de buildEngagementsActivityAnalytics.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })

function formatClosureRange(closure: ClosureItem): string {
  const start = new Date(`${closure.startDate}T00:00:00`)
  if (closure.isSingleDay) return DAY_MONTH.format(start)
  const end = new Date(`${closure.endDate}T00:00:00`)
  return `${DAY_MONTH.format(start)} → ${DAY_MONTH.format(end)}`
}

/** « Sophie Martin » → « Sophie MARTIN » (prénom intact, nom en capitales). */
function formatCollaboratorName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0]} ${parts.slice(1).join(" ").toUpperCase()}`
}

function gapUnit(gapPoints: number): string {
  return Math.abs(gapPoints) < 2 ? "pt" : "pts"
}

function SectionShell({
  eyebrow,
  title,
  note,
  className,
  children,
}: {
  eyebrow: string
  title: string
  note?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-[var(--radius-medium)] border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          <h2 className="mt-1 font-heading text-sm font-bold tracking-tight text-heading">{title}</h2>
        </div>
        {note ? (
          <p className="shrink-0 text-right text-[10px] leading-4 text-muted">{note}</p>
        ) : null}
      </div>
      <div className="mt-4 min-h-0 flex-1">{children}</div>
    </section>
  )
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "danger" | "success" | "neutral"
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm font-semibold tabular-nums",
          tone === "danger"
            ? "text-danger"
            : tone === "success"
              ? "text-success"
              : "text-heading",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function gapTone(gapPoints: number): "danger" | "success" | "neutral" {
  if (gapPoints <= -1) return "danger"
  if (gapPoints >= 1) return "success"
  return "neutral"
}

function toneMarker(tone: "danger" | "success" | "neutral"): string {
  return tone === "danger" ? "bg-danger" : tone === "success" ? "bg-success" : "bg-primary"
}

function toneText(tone: "danger" | "success" | "neutral"): string {
  return tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-body"
}

function MarginDumbbell({ items }: { items: MarginRealityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted">
        Aucune mission ne dispose d’assez de CRA pour comparer marge théorique et marge réelle.
      </p>
    )
  }

  const values = items.flatMap((item) => [item.realPct, item.theoreticalPct])
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  const pos = (value: number) => ((value - min) / (max - min)) * 100

  return (
    <ol className="divide-y divide-border/70">
      {items.map((item) => {
        const real = pos(item.realPct)
        const target = pos(item.theoreticalPct)
        const tone = gapTone(item.gapPoints)
        const realLabel = formatPct(item.realPct)
        const theoreticalLabel = formatPct(item.theoreticalPct)

        return (
          <li
            key={item.missionId}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] items-center gap-4 py-1.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-4">
                {item.collaboratorName ? (
                  <>
                    <span className="font-bold text-heading">
                      {formatCollaboratorName(item.collaboratorName)}
                    </span>
                    <span className="text-body"> — {item.title}</span>
                  </>
                ) : (
                  <span className="font-semibold text-heading">{item.title}</span>
                )}
              </p>
              <p className="truncate text-[10px] text-muted" title={item.companyName}>
                {item.companyName}
              </p>
            </div>

            <div className="min-w-0">
              <div
                className="relative h-3.5"
                aria-label={`Marge réelle ${realLabel}, marge théorique ${theoreticalLabel}, écart ${
                  item.gapPoints > 0 ? "+" : ""
                }${item.gapPoints.toFixed(1)} ${gapUnit(item.gapPoints)}`}
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden="true" />
                <span
                  className={cn(
                    "absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full",
                    toneMarker(tone),
                  )}
                  style={{
                    left: `${Math.min(real, target)}%`,
                    width: `${Math.abs(target - real)}%`,
                  }}
                  aria-hidden="true"
                />
                {/* Cible = marge théorique (repère creux) */}
                <span
                  className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-heading bg-surface"
                  style={{ left: `${target}%` }}
                  aria-hidden="true"
                />
                {/* Réel = marge issue des snapshots CRA (repère plein) */}
                <span
                  className={cn(
                    "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    toneMarker(tone),
                  )}
                  style={{ left: `${real}%` }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-0.5 flex items-center gap-x-3 whitespace-nowrap text-[9px] font-medium leading-none">
                <span className={cn("inline-flex items-center gap-1", toneText(tone))}>
                  <span className={cn("size-1.5 shrink-0 rounded-full", toneMarker(tone))} aria-hidden="true" />
                  <span className="font-mono tabular-nums">{realLabel}</span> réel
                </span>
                <span className="inline-flex items-center gap-1 text-muted">
                  <span
                    className="size-1.5 shrink-0 rounded-full border border-heading bg-surface"
                    aria-hidden="true"
                  />
                  <span className="font-mono tabular-nums">{theoreticalLabel}</span> théorique
                </span>
                <span
                  className={cn(
                    "ml-auto font-mono font-semibold tabular-nums",
                    tone === "danger"
                      ? "text-danger"
                      : tone === "success"
                        ? "text-success"
                        : "text-muted",
                  )}
                >
                  {item.gapPoints > 0 ? "+" : ""}
                  {item.gapPoints.toFixed(1)} {gapUnit(item.gapPoints)}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function EngagementsActivityDesktop({
  data,
}: {
  data: EngagementsActivityAnalytics
}) {
  const { productivity, closures, marginReality, unplannedAbsences } = data
  const visibleClosures = closures.slice(0, 6)

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6 lg:px-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-black tracking-tight text-heading">
              Activité &amp; congés
            </h1>
            {data.status === "partial" ? (
              <span
                className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning"
                title={data.issues.join(" · ")}
              >
                Données partielles
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            Productivité CRA, rentabilité réelle et impact des absences sur les missions AT actives
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-full border border-border bg-surface px-4 py-1.5">
          <StatCell
            label="Activité moy. YTD"
            value={productivity.ytdAverageRate === null ? "—" : formatPct(productivity.ytdAverageRate)}
          />
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          <StatCell label="Cible" value={formatPct(productivity.targetRate)} tone="neutral" />
        </div>
      </header>

      {/* ── Rangée 1 : Productivité globale | Fermetures sites clients ─────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.7fr)]">
        <SectionShell
          eyebrow="Bloc 1 · CRA"
          title="Productivité globale des collaborateurs en mission"
          note={`Taux d’activité moyen · ${data.year}`}
        >
          {productivity.monthly.some((month) => month.rate !== null) ? (
            <ProductivityTrendChart
              monthly={productivity.monthly}
              targetRate={productivity.targetRate}
            />
          ) : (
            <p className="py-10 text-center text-xs text-muted">
              Aucun CRA disponible sur l’année en cours.
            </p>
          )}
        </SectionShell>

        <SectionShell eyebrow="Bloc 2 · Sites" title="Fermetures sites clients">
          {visibleClosures.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">Aucune fermeture client renseignée</p>
          ) : (
            <ol className="divide-y divide-border/70">
              {visibleClosures.map((closure) => (
                <li
                  key={closure.id}
                  className={cn("flex items-start justify-between gap-3 py-2.5", closure.isPast && "opacity-55")}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-heading" title={closure.companyName}>
                      {closure.companyName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-body">{formatClosureRange(closure)}</p>
                    {closure.label ? (
                      <p className="mt-0.5 truncate text-[10px] text-muted" title={closure.label}>
                        {closure.label}
                      </p>
                    ) : null}
                  </div>
                  {closure.isRecurring ? (
                    <span className="mt-0.5 shrink-0 rounded-full border border-border bg-canvas px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">
                      Annuel
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </SectionShell>
      </div>

      {/* ── Rangée 2 : Rentabilité théorique vs réelle | Impact absences ──── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.7fr)]">
        <SectionShell
          eyebrow="Bloc 3 · Finance"
          title="Rentabilité théorique vs réelle"
          note="Réel calculé sur les snapshots TJM / CJM des CRA"
        >
          <div className="mb-3 flex items-center gap-5 border-b border-border pb-3">
            <StatCell
              label="Marge théo. moy."
              value={marginReality.theoreticalAvg === null ? "—" : formatPct(marginReality.theoreticalAvg)}
            />
            <StatCell
              label="Marge réelle moy."
              value={marginReality.realAvg === null ? "—" : formatPct(marginReality.realAvg)}
            />
            <StatCell
              label="Écart moyen"
              value={
                marginReality.gapAvg === null
                  ? "—"
                  : `${marginReality.gapAvg > 0 ? "+" : ""}${marginReality.gapAvg.toFixed(1)} pts`
              }
              tone={
                marginReality.gapAvg === null ? "neutral" : gapTone(marginReality.gapAvg)
              }
            />
            <span className="ml-auto text-[9px] text-muted">● réel · ○ théorique</span>
          </div>
          <MarginDumbbell items={marginReality.items} />
        </SectionShell>

        <SectionShell
          eyebrow="Bloc 4 · Absences"
          title="Impact des absences non prévues"
          note="Jours maladie CRA"
        >
          <div className="grid grid-cols-3 gap-3 border-b border-border pb-3">
            <StatCell
              label="Jours non prévus"
              value={`${unplannedAbsences.totalDays.toFixed(1)} j`}
              tone={unplannedAbsences.totalDays > 0 ? "danger" : "neutral"}
            />
            <StatCell
              label="CA non réalisé est."
              value={formatEuroCompact(unplannedAbsences.estimatedLostRevenue)}
              tone={unplannedAbsences.estimatedLostRevenue > 0 ? "danger" : "neutral"}
            />
            <StatCell
              label="Marge non réalisée est."
              value={formatEuroCompact(unplannedAbsences.estimatedLostMargin)}
              tone={unplannedAbsences.estimatedLostMargin > 0 ? "danger" : "neutral"}
            />
          </div>

          <div className="mt-3">
            <UnplannedAbsenceTrendChart monthly={unplannedAbsences.monthly} />
          </div>

          {unplannedAbsences.topMissions.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
              {unplannedAbsences.topMissions.map((impact) => (
                <li
                  key={impact.missionId}
                  className="flex items-center justify-between gap-3 text-[10px]"
                >
                  <span className="min-w-0 truncate text-heading" title={impact.title}>
                    {impact.title}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted">
                    {impact.days.toFixed(1)} j · {formatEuroCompact(impact.lostMargin)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionShell>
      </div>
    </div>
  )
}
