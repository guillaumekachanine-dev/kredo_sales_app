import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

type Dot = "ok" | "warning" | "error"

const DOT_CLS: Record<Dot, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  error: "bg-danger",
}

const aiSources = [
  { id: "s1", name: "LinkedIn Sales Navigator", scope: "Contacts & signaux", status: "ok" as Dot, detail: "Connecte" },
  { id: "s2", name: "Hunter.io", scope: "Enrichissement email", status: "error" as Dot, detail: "Cle API expiree" },
  { id: "s3", name: "Google News API", scope: "Veille & actualite", status: "ok" as Dot, detail: "Connecte" },
  { id: "s4", name: "n8n WebScraper", scope: "Etudes sectorielles", status: "ok" as Dot, detail: "Connecte" },
  { id: "s5", name: "Pappers / Societe.com", scope: "Donnees legales", status: "warning" as Dot, detail: "Quota bientot atteint" },
]

const scoringFacets = [
  { label: "Adequation secteur / offre", weight: "25%" },
  { label: "Maturite du besoin (signaux)", weight: "25%" },
  { label: "Pouvoir de decision des contacts", weight: "20%" },
  { label: "Potentiel financier (ACV estime)", weight: "20%" },
  { label: "Fraicheur de la relation", weight: "10%" },
]

const pitchParams = [
  { label: "Ton par defaut", value: "Professionnel, direct" },
  { label: "Longueur cible", value: "120-160 mots" },
  { label: "Langue", value: "Francais" },
  { label: "Signature", value: "Centre de profit - KREDO" },
]

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 bg-canvas px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold text-heading">Parametres</h1>
        <p className="mt-1 text-sm text-body">
          Configuration globale de l&apos;application.
        </p>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  PARAMETRES AI TOOLS                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
          Parametres AI Tools
        </h2>
        <div className="flex flex-col gap-6">
          {/* Sources & connecteurs */}
          <SurfaceCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-heading">Sources & connecteurs</h3>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-surface-hover"
              >
                Ajouter une source
              </button>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {aiSources.map((s) => (
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

          {/* Methode de scoring */}
          <SurfaceCard className="p-5">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-heading">Methode de scoring</h3>
              <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-muted">
                Version active &middot; v1
              </span>
            </div>
            <p className="mb-4 text-xs text-body">
              Fonction <span className="font-medium">deterministe versionnee, echelle 1-10</span>. Le LLM
              note les facettes, KREDO calcule le score &mdash; consultable et versionnable ici, non editable a la volee.
            </p>
            <ul className="flex flex-col gap-2">
              {scoringFacets.map((f) => (
                <li key={f.label} className="flex items-center justify-between rounded-md bg-canvas px-3 py-2">
                  <span className="text-sm text-body">{f.label}</span>
                  <span className="text-sm font-medium text-heading">{f.weight}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-surface-hover">
                Voir le detail du calcul
              </button>
              <button type="button" disabled className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted opacity-60">
                Proposer une nouvelle version
              </button>
            </div>
          </SurfaceCard>

          {/* Redaction des pitch & mails */}
          <SurfaceCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-heading">Redaction des pitch & mails</h3>
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
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  PARAMETRES UTILISATEUR                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
          Parametres utilisateur
        </h2>
        <div className="flex flex-col gap-6">
          {/* Workspace */}
          <SurfaceCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-heading">Workspace & securite</h3>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Workspace</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">KREDO_ESN</dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Utilisateurs actifs</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">14</dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Sauvegarde</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">Aujourd&apos;hui, 04h00</dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Securite</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">MFA & RLS actives</dd>
              </div>
            </dl>
          </SurfaceCard>

          {/* Profil */}
          <SurfaceCard className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-heading">Mon profil</h3>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Nom</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">Guillaume Kasanin</dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Role</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">Owner</dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Email</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">guillaume@kredo.dev</dd>
              </div>
              <div className="bg-surface px-3 py-2.5">
                <dt className="text-xs text-muted">Preferences UI</dt>
                <dd className="mt-0.5 text-sm font-medium text-heading">Theme cobalt</dd>
              </div>
            </dl>
          </SurfaceCard>
        </div>
      </section>
    </div>
  )
}
