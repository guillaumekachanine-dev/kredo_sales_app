export type CompetitiveMapSegmentOption = {
  slug: string
  name: string
  macroSlug: string
  macroName: string
}

export type HistoryItemFixture = {
  id: string
  dateLabel: string
  sectorName: string
  rawDate: string
  accountCount: number
}

export type AccountFixture = {
  index: number
  nom: string
  categorie: "leader" | "challenger" | "specialiste" | "emergent" | "inconnu"
  caMeur: number | null
  effectifFrance: number | null
  appetenceScore: number | null
  accessibiliteScore: number | null
  confiance: "Haute" | "Moyenne" | "Faible"
  estCompteEtalon: boolean
  status: "resolved" | "ambiguous" | "not_found"
  candidates: Array<{
    companyId: string
    name: string
    siren: string | null
    matchScore: number
  }>
  selectedCandidateId: string | null
  mode: "attach" | "create"
  createdName: string
  skip: boolean
  positioning: string
  angleEntree: string
  forces: string
  vulnerabilite: string
  activites: string
}

export const MOCK_SEGMENTS: CompetitiveMapSegmentOption[] = [
  { slug: "btp-infrastructures", name: "BTP & Infrastructures", macroSlug: "construction", macroName: "Construction & BTP" },
  { slug: "spatial-defense", name: "Spatial & Défense", macroSlug: "aero-defense", macroName: "Aéronautique & Défense" },
  { slug: "tourisme-sejours", name: "Tourisme & Séjours", macroSlug: "services-transport", macroName: "Services & Transports" },
  { slug: "energie-utilities", name: "Énergie & Utilités", macroSlug: "energie", macroName: "Énergie & Environnement" },
  { slug: "banque-assurance", name: "Banque & Assurance", macroSlug: "finance", macroName: "Finance & Assurance" },
]

export const MOCK_HISTORY: HistoryItemFixture[] = [
  { id: "doc-1", dateLabel: "14 août", rawDate: "2026-08-14", sectorName: "Spatial & Défense", accountCount: 6 },
  { id: "doc-2", dateLabel: "12 août", rawDate: "2026-08-12", sectorName: "Tourisme & Séjours", accountCount: 5 },
  { id: "doc-3", dateLabel: "08 août", rawDate: "2026-08-08", sectorName: "BTP & Infrastructures", accountCount: 4 },
  { id: "doc-4", dateLabel: "02 août", rawDate: "2026-08-02", sectorName: "Énergie & Utilités", accountCount: 7 },
  { id: "doc-5", dateLabel: "28 juil.", rawDate: "2026-07-28", sectorName: "Banque & Assurance", accountCount: 8 },
]

export const MOCK_ACCOUNTS: AccountFixture[] = [
  {
    index: 0,
    nom: "VINCI",
    categorie: "leader",
    caMeur: 68800,
    effectifFrance: 115000,
    appetenceScore: 29,
    accessibiliteScore: 5,
    confiance: "Haute",
    estCompteEtalon: true,
    status: "resolved",
    candidates: [
      { companyId: "c-vinci-sa", name: "VINCI SA", siren: "552037808", matchScore: 0.98 },
      { companyId: "c-vinci-energies", name: "VINCI ENERGIES SI", siren: "428784807", matchScore: 0.82 },
    ],
    selectedCandidateId: "c-vinci-sa",
    mode: "attach",
    createdName: "VINCI",
    skip: false,
    positioning: "Leader incontesté des concessions et de la construction, prioritaire sur les grands projets d'infrastructures.",
    angleEntree: "Direction de la Transformation Numérique & DSI Groupe via filiale VINCI Energies (smart building, IoT industriel).",
    forces: "Capacités financières massives, récurrence des revenus de concessions, présence internationale diversifiée.",
    vulnerabilite: "Organisation très décentralisée rendant les accords-cadres et le contracting groupe complexes.",
    activites: "Concession et construction d'infrastructures de transport, énergie et bâtiments. Major mondial du BTP.",
  },
  {
    index: 1,
    nom: "EIFFAGE",
    categorie: "leader",
    caMeur: 21800,
    effectifFrance: 68000,
    appetenceScore: 26,
    accessibiliteScore: 4,
    confiance: "Haute",
    estCompteEtalon: false,
    status: "resolved",
    candidates: [
      { companyId: "c-eiffage-sa", name: "EIFFAGE SA", siren: "709802094", matchScore: 0.96 },
      { companyId: "c-eiffage-energie", name: "EIFFAGE ENERGIE SYSTEMES", siren: "383508548", matchScore: 0.79 },
    ],
    selectedCandidateId: "c-eiffage-sa",
    mode: "attach",
    createdName: "EIFFAGE",
    skip: false,
    positioning: "Troisième major français du BTP avec ancrage européen fort sur la transition énergétique et les concessions autoroutières.",
    angleEntree: "Direction des Systèmes d'Information Eiffage Énergie Systèmes sur les projets de modernisation SI opérationnel.",
    forces: "Agilité régionale forte, excellente rentabilité opérationnelle de la branche concessions, gouvernance réactive.",
    vulnerabilite: "Forte dépendance au marché public français des grandes infrastructures ferroviaires et routières.",
    activites: "Infrastructure, concessions autoroutières, énergie et systèmes, construction de bâtiments tertiaires.",
  },
  {
    index: 2,
    nom: "BOUYGUES CONSTRUCTION",
    categorie: "challenger",
    caMeur: 9800,
    effectifFrance: 32000,
    appetenceScore: 22,
    accessibiliteScore: 3,
    confiance: "Moyenne",
    estCompteEtalon: false,
    status: "ambiguous",
    candidates: [
      { companyId: "c-bouygues-sa", name: "BOUYGUES SA", siren: "572015246", matchScore: 0.74 },
      { companyId: "c-bouygues-bat", name: "BOUYGUES BATIMENT ILE DE FRANCE", siren: "421041189", matchScore: 0.71 },
    ],
    selectedCandidateId: "c-bouygues-sa",
    mode: "attach",
    createdName: "BOUYGUES CONSTRUCTION",
    skip: false,
    positioning: "Acteur de référence sur le bâtiment et les grands ouvrages complexes, challenger sur les offres globales.",
    angleEntree: "DSI Bouygues SA & filiale BYCN IT pour la modernisation des outils de pilotage de chantier et BIM.",
    forces: "Expertise technique reconnue sur les ouvrages d'art complexes et projets internationaux haut de gamme.",
    vulnerabilite: "Pression constante sur les marges opérationnelles du BTP pur et cycles de commande allongés.",
    activites: "Conception, construction et réhabilitation d'ouvrages publics et privés, génie civil et structures.",
  },
  {
    index: 3,
    nom: "NGE",
    categorie: "specialiste",
    caMeur: 3100,
    effectifFrance: 16000,
    appetenceScore: 18,
    accessibiliteScore: null,
    confiance: "Haute",
    estCompteEtalon: false,
    status: "not_found",
    candidates: [],
    selectedCandidateId: null,
    mode: "create",
    createdName: "NGE",
    skip: false,
    positioning: "Premier groupe français indépendant de travaux publics, forte croissance tirée par les grands projets de transport.",
    angleEntree: "Direction de l'Organisation et de l'IT pour le déploiement d'outils ERP & Field Operations.",
    forces: "Croissance rapide, indépendance du capital, culture d'agilité décisionnelle et proximité du terrain.",
    vulnerabilite: "Visibilité internationale limitée par rapport aux trois majors et ressources IT internes contraintes.",
    activites: "BTP et travaux publics indépendants (terrassement, réseaux, ferroviaire, bâtiment et génie civil).",
  },
]

export const MOCK_RAW_JSON = JSON.stringify(
  {
    secteur: "BTP & Infrastructures",
    dateSnapshot: "2026-08-14",
    segmentLabel: "BTP & Infrastructures",
    compteEtalon: "VINCI",
    comptes: MOCK_ACCOUNTS.map((a) => ({
      nom: a.nom,
      categorie: a.categorie,
      caMeur: a.caMeur,
      effectifFrance: a.effectifFrance,
      appetenceScore: a.appetenceScore,
      accessibiliteScore: a.accessibiliteScore,
      confiance: a.confiance,
      estCompteEtalon: a.estCompteEtalon,
      profil: {
        metier_chaine_valeur: a.activites,
        couche_esn: { voie_entree_probable: a.angleEntree },
        grilles: { avantages: a.forces, vulnerabilite_principale: a.vulnerabilite },
      },
    })),
  },
  null,
  2,
)
