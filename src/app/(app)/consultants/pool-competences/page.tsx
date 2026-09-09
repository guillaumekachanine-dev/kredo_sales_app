import { permanentRedirect } from "next/navigation"

// Route historique consolidée dans le shell Consultants (chantier
// docs/FEATURES/consultants_workspace/, Lot 6). Le contenu vit désormais dans
// `/consultants?section=pool-competences` (loader `get-consultants-skills`,
// rendu `PoolCompetencesMap`). Le fichier de route est retiré au Lot 15.

export default function PoolCompetencesLegacyRoute() {
  permanentRedirect("/consultants?section=pool-competences")
}
