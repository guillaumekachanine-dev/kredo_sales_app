import type { OpportunitiesSection } from "../navigation/opportunities-sections"

// EmptyState provisoire des chapitres dont le contenu métier n'est pas encore
// outillé (Lot 1). Aucun bouton mort, aucune donnée fictive : on annonce
// simplement le lot qui livrera la surface.
//
//  - Synthèse    → Lot 4
//  - Avant-vente → Lot 7
//  - Planning    → Lot 9 (le planning Besoins & staffing reste accessible
//                  depuis le chapitre « Besoins & staffing »)

const COPY: Record<
  Exclude<OpportunitiesSection, "besoins">,
  { title: string; description: string }
> = {
  synthese: {
    title: "Synthèse en préparation",
    description:
      "La surface analytique (KPI, pipe, compétences, processus, prochaines échéances) sera livrée dans un prochain lot.",
  },
  "avant-vente": {
    title: "Avant-vente à venir",
    description:
      "Le suivi des projets d'avant-vente sera outillé dans un prochain lot. Aucune donnée n'est affichée tant que la structure métier n'est pas arrêtée.",
  },
  planning: {
    title: "Planning en préparation",
    description:
      "La vue planning dédiée aux opportunités sera livrée dans un prochain lot. En attendant, le planning des besoins & staffing reste accessible depuis le chapitre « Besoins & staffing ».",
  },
}

export function OpportunitiesChapterPlaceholder({
  section,
}: {
  section: Exclude<OpportunitiesSection, "besoins">
}) {
  const { title, description } = COPY[section]

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-canvas px-8 text-center">
      <div className="max-w-sm">
        <h2 className="font-heading text-lg font-bold text-heading">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
  )
}
