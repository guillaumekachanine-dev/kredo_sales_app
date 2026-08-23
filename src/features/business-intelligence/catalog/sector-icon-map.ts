const ICON_BY_MACRO_SLUG: Record<string, string> = {
  "aeronautique-spatial-defense": "Spatial, défense & systèmes critiques.png",
  "banque-finance-assurance": "Services financiers & Assurance.png",
  "btp-construction-immobilier": "Construction & Cadre bâti.png",
  "commerce-distribution-services-specialises": "Commerce & Distribution.png",
  "ehpad-residences-seniors": "EHPAD & Résidence seniors.png",
  "energie-petrochimie-environnement": "Énergie & Environnement.png",
  "industrie-manufacturiere-electronique-equipements": "Industrie & Équipements.png",
  "logiciels-saas-services-numeriques": "Numérique & Éditeurs de logiciels.png",
  "sante-medtech-medico-social": "Santé, MedTech & medico-social.png",
  "secteur-public-enseignement-recherche": "Sphère publique, enseignement & recherche.png",
  "services-entreprises-personnes": "Services aux entreprises & aux personnes.png",
  "tourisme-hotellerie-loisirs": "Tourisme & Voyage.png",
  "transport-mobilite-regionale": "Transport, Logistique & Concessions de flux.png",
}

export function getSectorIconPath(macroSlug: string | null | undefined): string | null {
  if (!macroSlug) return null
  const fileName = ICON_BY_MACRO_SLUG[macroSlug]
  if (!fileName) return null
  return `/images/sectors/${encodeURIComponent(fileName)}`
}
