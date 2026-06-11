import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

// Réglages prospection — cockpit de pilotage des paramètres du DOMAINE prospection
// (sources, méthode de scoring, rédaction des pitch). Volontairement scopé : il
// n'absorbe PAS les réglages workspace/globaux (/settings), pour ne pas recréer
// l'usine à gaz une porte plus loin.
//
// ⚠️ Scaffold (Lot 1). La méthode de scoring est présentée en LECTURE : c'est une
// fonction déterministe versionnée 1–10 (ADR-0007), pas un bouton libre. On peut
// la consulter / changer de version active, pas réécrire la formule à la volée.

type Dot = "ok" | "warning" | "error"

const DOT_CLS: Record<Dot, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  error: "bg-danger",
}

const sources = [
  { id: "s1", name: "LinkedIn Sales Navigator", scope: "Contacts & signaux", status: "ok" as Dot, detail: "Connecté" },
  { id: "s2", name: "Hunter.io", scope: "Enrichissement email", status: "error" as Dot, detail: "Clé API expirée" },
  { id: "s3", name: "Google News API", scope: "Veille & actualité", status: "ok" as Dot, detail: "Connecté" },
  { id: "s4", name: "n8n WebScraper", scope: "Études sectorielles", status: "ok" as Dot, detail: "Connecté" },
  { id: "s5", name: "Pappers / Societe.com", scope: "Données légales", status: "warning" as Dot, detail: "Quota bientôt atteint" },
]

const scoringFacets = [
  { label: "Adéquation secteur / offre", weight: "25%" },
  { label: "Maturité du besoin (signaux)", weight: "25%" },
  { label: "Pouvoir de décision des contacts", weight: "20%" },
  { label: "Potentiel financier (ACV estimé)", weight: "20%" },
  { label: "Fraîcheur de la relation", weight: "10%" },
]

const pitchParams = [
  { label: "Ton par défaut", value: "Professionnel, direct" },
  { label: "Longueur cible", value: "120–160 mots" },
  { label: "Langue", value: "Français" },
  { label: "Signature", value: "Centre de profit — KREDO" },
]

export default function ProspectionSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 bg-canvas px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold text-heading">Réglages prospection</h1>
        <p className="mt-1 text-sm text-body">
          Les paramètres des fonctionnalités de cette section : sources de données, méthode de
          scoring et rédaction des pitch.
        </p>
      </header>

      {/* Sources & connecteurs */}
      <SurfaceCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-heading">Sources & connecteurs</h2>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-surface-hover"
          >
            Ajouter une source
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLS[s.status])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-heading">{s.name}</p>
                <p className="text-xs text-muted">{s.scope}</p>
              </div>
              <span className={cn("shrink-0 text-xs", s.status === "error" ? "text-danger" : s.status === "warning" ? "text-warning" : "text-muted")}>
                {s.detail}
              </span>
            </li>
          ))}
        </ul>
      </SurfaceCard>

      {/* Méthode de scoring — lecture seule, gouvernée */}
      <SurfaceCard className="p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-heading">Méthode de scoring</h2>
          <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-muted">
            Version active · v1
          </span>
        </div>
        <p className="mb-4 text-xs text-body">
          Fonction <span className="font-medium">déterministe versionnée, échelle 1–10</span>. Le LLM
          note les facettes, KREDO calcule le score — consultable et versionnable ici, non éditable à la volée.
        </p>
        <ul className="flex flex-col gap-2">
          {scoringFacets.map((f) => (
            <li key={f.label} className="flex items-center justify-between rounded-md bg-canvas px-3 py-2">
              <span className="text-sm text-body">{f.label}</span>
              <span className="text-sm font-medium tabular-nums text-heading">{f.weight}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-surface-hover">
            Voir le détail du calcul
          </button>
          <button type="button" disabled className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted opacity-60">
            Proposer une nouvelle version
          </button>
        </div>
      </SurfaceCard>

      {/* Paramètres de rédaction (pitch / mails) */}
      <SurfaceCard className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-heading">Rédaction des pitch & mails</h2>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {pitchParams.map((p) => (
            <div key={p.label} className="bg-surface px-3 py-2.5">
              <dt className="text-xs text-muted">{p.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-heading">{p.value}</dd>
            </div>
          ))}
        </dl>
      </SurfaceCard>
    </div>
  )
}
