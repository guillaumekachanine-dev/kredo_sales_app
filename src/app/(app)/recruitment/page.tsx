import { permanentRedirect } from "next/navigation"

// Route historique consolidée dans le chapitre Candidats de Consultants
// (chantier docs/FEATURES/consultants_workspace/, Lot 10).
// Le point d'entrée canonique unique est `/consultants?section=candidats`.
// Le nettoyage physique du code legacy appartient au Lot 15.

export default function RecruitmentPage() {
  permanentRedirect("/consultants?section=candidats")
}
