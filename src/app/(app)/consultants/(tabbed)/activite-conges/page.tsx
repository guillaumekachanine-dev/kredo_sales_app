import { permanentRedirect } from "next/navigation"

// Route historique consolidée dans le shell Consultants (chantier
// docs/FEATURES/consultants_workspace/, Lot 5). Le contenu vit désormais dans
// `/consultants?section=activite-conges` (loader `get-consultants-activity`,
// rendu `ActivityDashboard`). Le fichier de route est retiré au Lot 15.

export default function ActiviteCongesLegacyRoute() {
  permanentRedirect("/consultants?section=activite-conges")
}
