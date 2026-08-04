import type { AutomationsDataError } from "@/lib/automations/automations-data"

// Une requête de la page qui échoue doit se voir. Le journal d'exécution est
// resté vide deux mois parce que son erreur PostgREST (PGRST200 : embed
// `owner:profiles(...)` impossible faute de clé étrangère) était absorbée par
// un `?? []`. Un bandeau plutôt qu'un `throw` : les 6 autres requêtes de la
// page restent utiles quand une seule tombe.
export function AutomationsDataErrorBanner({ errors }: { errors: AutomationsDataError[] }) {
  if (errors.length === 0) return null

  return (
    <div
      role="alert"
      className="mb-5 rounded-[var(--radius-medium)] border border-danger/30 bg-danger/[0.04] p-3"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-danger">
        {errors.length === 1 ? "Une source de données est indisponible" : `${errors.length} sources de données indisponibles`}
      </p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {errors.map((error) => (
          <li key={error.source} className="text-[11px] leading-normal text-body">
            <span className="font-semibold text-heading">{error.source}</span> — {error.message}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-muted">
        Les indicateurs concernés sont incomplets : ne pas les lire comme une absence d&apos;activité.
      </p>
    </div>
  )
}
