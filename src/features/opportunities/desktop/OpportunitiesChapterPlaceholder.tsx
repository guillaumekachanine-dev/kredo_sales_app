// EmptyState provisoire des chapitres dont le contenu métier n'est pas encore
// outillé. Aucun bouton mort, aucune donnée fictive : on annonce simplement le
// lot qui livrera la surface.
//
//  - Synthèse → Lot 4 (livré) — plus routé ici
//  - Planning → Lot 9 (le planning Besoins & staffing reste accessible
//               depuis le chapitre « Besoins & staffing »)
//
// (Avant-vente est passé à `PresalesDesktop` au Lot 7.)

export type PlaceholderSection = "synthese" | "planning"

const COPY: Record<PlaceholderSection, { title: string; description: string }> = {
  synthese: {
    title: "Synthèse en préparation",
    description:
      "La surface analytique (KPI, pipe, compétences, processus, prochaines échéances) sera livrée dans un prochain lot.",
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
  section: PlaceholderSection
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
