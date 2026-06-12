import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { IntelligenceSource } from "@/lib/intelligence/intelligence-data"

// ─────────────────────────────────────────────────────────────────────────────
//  Pièces présentationnelles partagées Desktop / Mobile (ADR-0008).
//  Pures, sans état. Palette Cobalt Franc uniquement.
// ─────────────────────────────────────────────────────────────────────────────

const LIFECYCLE_LABELS: Record<string, string> = {
  cible: "Cible",
  prospect: "Prospect",
  client_actif: "Client actif",
  client_dormant: "Client dormant",
  ancien_client: "Ancien client",
  partenaire: "Partenaire",
  non_prioritaire: "Non prioritaire",
  exclu: "Exclu",
}

export function lifecycleLabel(status: string): string {
  return LIFECYCLE_LABELS[status] ?? status
}

/** Badge de provenance — distingue donnée moteur vs FOLIO importé vs absente. */
export function ProvenanceBadge({ source }: { source: IntelligenceSource }) {
  const map: Record<IntelligenceSource, { label: string; cls: string }> = {
    engine: { label: "Moteur IA", cls: "bg-primary/10 text-primary border-primary/20" },
    folio: { label: "FOLIO", cls: "bg-warning/10 text-warning border-warning/25" },
    none: { label: "Aucune analyse", cls: "bg-surface-hover text-muted border-border" },
  }
  const { label, cls } = map[source]
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", cls)}>
      {label}
    </span>
  )
}

/** Pastille de score. Échelle volontairement non suffixée (1–10 vs /5 tranché au lot E). */
export function ScorePill({ score, className }: { score: number | null; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 rainbow-border-sweep", className)}>
      <span className="font-heading text-2xl font-bold leading-none text-heading">
        {score === null ? "—" : score.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
      </span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">Score IA</span>
    </div>
  )
}

export function KpiCard({ label, value, hint, status = "neutral" }: {
  label: string
  value: string
  hint?: string
  status?: "neutral" | "success" | "warning" | "danger"
}) {
  const valueCls = {
    neutral: "text-heading",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[status]
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className={cn("mt-1.5 block font-heading text-xl font-bold leading-tight", valueCls)}>{value}</span>
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </div>
  )
}

export function SectionBlock({ title, action, children, className, reading }: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Bloc de prose longue : sous le thème cockpit, repasse sur une surface
   *  de lecture claire (cf. .cockpit-reading dans globals.css). Sans effet
   *  hors cockpit. */
  reading?: boolean
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface p-5", reading && "cockpit-reading", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-canvas/40 p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="h-2.5 w-0.5 rounded-full bg-primary shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-heading">{label}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-body">{value}</p>
    </div>
  )
}

export function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="rounded border border-border bg-canvas/50 px-2 py-0.5 text-[11px] font-medium text-body">
          {item}
        </span>
      ))}
    </div>
  )
}

/** Liste « actualités & signaux faibles ». */
export function SignalList({ signals }: { signals: string[] }) {
  if (signals.length === 0) {
    return <p className="text-xs italic text-muted">Aucun signal récent capté pour l&apos;instant.</p>
  }
  return (
    <ul className="space-y-2">
      {signals.map((signal, i) => (
        <li key={i} className="flex gap-2.5 rounded border border-border/60 bg-canvas/40 p-2.5">
          <svg className="mt-1 h-2 w-2 text-heading shrink-0" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
            <polygon points="20,10 80,50 20,90" />
          </svg>
          <span className="text-xs leading-relaxed text-body">{signal}</span>
        </li>
      ))}
    </ul>
  )
}

/** Fraîcheur de l'analyse (dernier run moteur, sinon mention import legacy). */
export function FreshnessLine({ latestRunAt, latestRunStatus, fallbackSource, tone = "light" }: {
  latestRunAt: string | null
  latestRunStatus: string | null
  fallbackSource: IntelligenceSource
  tone?: "light" | "dark"
}) {
  let label: string
  if (latestRunAt) {
    const d = new Date(latestRunAt)
    const date = Number.isNaN(d.getTime())
      ? latestRunAt
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    label = `Dernier run moteur · ${date}${latestRunStatus ? ` · ${latestRunStatus}` : ""}`
  } else if (fallbackSource === "folio") {
    label = "FOLIO · run moteur jamais lancé"
  } else {
    label = "Aucune analyse disponible"
  }
  return <p className={cn("text-[11px]", tone === "dark" ? "text-primary-fg/55" : "text-muted")}>{label}</p>
}

/** Checklist de présence par phase (vue de synthèse). */
export function PhasePresence({ presence, tone = "light" }: {
  presence: {
    hasClientAnalysis: boolean
    hasSectorAnalysis: boolean
    hasProcessDiagnostic: boolean
    hasRoadmap: boolean
    hasLegacyAnalysis: boolean
    hasLegacySector: boolean
    hasLegacyPitches: boolean
  }
  tone?: "light" | "dark"
}) {
  const dark = tone === "dark"
  const rows: { label: string; engine: boolean; legacy: boolean }[] = [
    { label: "Analyse client (P1)", engine: presence.hasClientAnalysis, legacy: presence.hasLegacyAnalysis },
    { label: "Étude sectorielle (P2)", engine: presence.hasSectorAnalysis, legacy: presence.hasLegacySector },
    { label: "Diagnostic process (P3)", engine: presence.hasProcessDiagnostic, legacy: false },
    { label: "Roadmap (P4)", engine: presence.hasRoadmap, legacy: false },
    { label: "Pitchs (P5)", engine: false, legacy: presence.hasLegacyPitches },
  ]
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => {
        const state: IntelligenceSource = row.engine ? "engine" : row.legacy ? "folio" : "none"
        const dot =
          state === "engine" ? "bg-success" : state === "folio" ? "bg-warning" : dark ? "bg-primary-fg/20" : "bg-border"
        return (
          <li key={row.label} className="flex items-center justify-between gap-2 text-xs">
            <span className={cn("flex items-center gap-2", dark ? "text-primary-fg/80" : "text-body")}>
              <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
              {row.label}
            </span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-primary-fg/40" : "text-muted")}>
              {state === "engine" ? "Moteur" : state === "folio" ? "Legacy" : "—"}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Encart « à venir » pour les onglets/blocs non encore livrés (lots B→I). */
export function ComingSoon({ lot, children }: { lot: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-6 py-10 text-center">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{children}</span>
      <span className="text-[11px] text-muted/70">Disponible au {lot}</span>
    </div>
  )
}
