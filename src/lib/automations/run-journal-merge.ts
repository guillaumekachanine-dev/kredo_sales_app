import type { RunJournalRow } from "./automations-data"

// Logique partagée serveur ↔ client du journal d'exécution.
//
// Module volontairement SANS aucun import de valeur depuis `automations-data.ts`
// (qui porte `import "server-only"`) : une constante importée de là par un
// composant client tirerait le module serveur entier dans le bundle navigateur
// — panne de build que `tsc --noEmit` ne voit pas, seul `next build` la révèle
// (même piège que `VEILLE_RUNS_PER_MONTH` → `veille-cadence.ts`, Monitoring IA
// Lot 2). `RunJournalRow` est importé en `import type`, donc effacé à la
// compilation.

// Fenêtre du journal : nombre de runs chargés côté serveur, et plafond de la
// liste maintenue en direct côté client.
export const JOURNAL_LIMIT = 50

// Fusionne les lignes rechargées après un événement Realtime dans la liste
// courante : un run déjà présent est remplacé par sa version fraîche, un run
// inconnu (nouvelle exécution) est inséré, et la fenêtre reste bornée.
export function mergeRunJournalRows(
  current: RunJournalRow[],
  incoming: RunJournalRow[],
): RunJournalRow[] {
  const byId = new Map(current.map((row) => [row.id, row]))
  for (const row of incoming) byId.set(row.id, row)

  return [...byId.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // ISO 8601 : ordre lexicographique = ordre chronologique
    .slice(0, JOURNAL_LIMIT)
}
