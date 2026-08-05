// ─── Formatage de dates cohérent serveur / client ───────────────────────────
// Un composant client est AUSSI rendu sur le serveur. `toLocaleString` sans
// fuseau y utilise UTC, puis l'heure locale au navigateur : les deux textes
// diffèrent, l'hydratation React échoue (erreur #418) et l'heure affichée est
// brièvement fausse.
//
// KREDO est un outil français mono-fuseau : figer Europe/Paris rend le rendu
// déterministe des deux côtés, ce qu'un `suppressHydrationWarning` ne ferait
// pas — il masquerait l'avertissement sans corriger l'heure affichée.

export const KREDO_TIME_ZONE = "Europe/Paris"

/** Options à étendre pour tout affichage de date/heure rendu côté serveur. */
export const KREDO_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: KREDO_TIME_ZONE,
}

export function formatDayMonthYear(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return isoDate
    return new Intl.DateTimeFormat("fr-FR", {
      ...KREDO_DATE_TIME_OPTIONS,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d)
  } catch {
    return isoDate
  }
}
