// Mêmes routes que celles déjà construites par les résolveurs agenda
// (opportunities-resolver.ts, missions-resolver.ts, recruitment-resolver.ts)
// — pas de nouvelle convention, juste réutilisée ici pour le bouton "Ouvrir
// la fiche" des priorités et alertes business du brief hebdomadaire.
export function resolveWeeklyManagerEntityHref(
  entityType: string | undefined,
  entityId: string | undefined,
): string | null {
  if (!entityType || !entityId) return null

  switch (entityType) {
    case "opportunity":
      return `/missions/opps/${entityId}/edit`
    case "company":
      return `/prospection/accounts/${entityId}`
    case "mission":
      return `/missions?missionId=${entityId}`
    case "candidate":
      return `/recruitment?candidateId=${entityId}`
    default:
      return null
  }
}
