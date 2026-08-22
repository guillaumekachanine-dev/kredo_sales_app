import type {
  TerrainDependency,
  TerrainMarketThesis,
  TerrainRegulatoryItem,
  TerrainRiskOpportunity,
  TerrainTopAccount,
  TerrainValueChainStep,
} from "./terrain-model"

export type TerrainSourceFixture = {
  id: number
  publisher: string
  tier: number | null
  attests: string
  consultedAt: string | null
  url: string | null
}

export const terrainRegulatoryExact: TerrainRegulatoryItem = {
  name: "IFRA 52",
  timing: { kind: "exact", date: "2026-12-31" },
  urgency: "high",
}

export const terrainRegulatoryWindow: TerrainRegulatoryItem = {
  name: "IFRA 52",
  timing: { kind: "window", label: "fin novembre 2026" },
}

export const terrainRegulatoryUnavailable: TerrainRegulatoryItem = {
  name: "Réglementation",
  timing: { kind: "unavailable" },
}

export const terrainMarketTheses: TerrainMarketThesis[] = [
  { title: "Thèse", text: "La traçabilité des ingrédients devient un enjeu de mise sur le marché autant qu’un sujet de conformité.", commercialAngle: "Cadrer les flux de preuve entre qualité, R&D et fournisseurs.", sourceIds: [12] },
  { title: "Thèse", text: "Les cycles de reformulation raccourcissent sous l’effet des attentes consommateurs et de la réglementation.", commercialAngle: "Identifier les frictions entre laboratoire, data produit et équipes réglementaires.", sourceIds: [12, 31] },
  { title: "Thèse", text: "La sécurisation des approvisionnements impose une visibilité fine sur les données fournisseur et les substitutions.", commercialAngle: "Ouvrir par l’industrialisation des référentiels matières.", sourceIds: [31] },
  { title: "Thèse", text: "La différenciation passe par la capacité à transformer les exigences documentaires en accélérateur de lancement.", commercialAngle: "Faire émerger un pilote de gouvernance de données produit.", sourceIds: [44] },
  { title: "Thèse", text: "Les acteurs les plus résilients lient désormais veille réglementaire, formulation et arbitrages commerciaux.", commercialAngle: "Positionner un socle de décision partagé, sans ajouter de couche métier parallèle.", sourceIds: [55] },
]

export const terrainRiskOpportunities: TerrainRiskOpportunity[] = [
  { risk: "Une information réglementaire dispersée ralentit les arbitrages de formulation.", opportunity: "Unifier la preuve pour réduire les reprises et sécuriser les délais de lancement.", sourceIds: [12] },
  { risk: "Les dépendances matières rendent les plans de substitution difficiles à piloter.", opportunity: "Rendre les alternatives visibles par famille d’ingrédients et niveau d’impact.", sourceIds: [31] },
]

export const terrainMessage = "Dans les ingrédients parfumés, la vitesse de décision dépend désormais de la qualité du lien entre formulation, conformité et données fournisseur."

export const terrainObjections = [
  { objection: "Nos équipes réglementaires disposent déjà de leurs outils ; pourquoi ajouter un dispositif ?", response: "L’objectif n’est pas d’ajouter un outil, mais de relier les preuves existantes aux arbitrages de formulation et de lancement." },
  { objection: "Le sujet est trop métier pour une équipe externe.", response: "Commencer par un pilote cadré avec les experts métier : qualité de donnée, responsabilités et irritants de passage de relais." },
  { objection: "Nous n’avons pas de capacité disponible pour un programme transverse.", response: "Proposer un diagnostic court sur un flux prioritaire, puis une feuille de route séquencée selon les jalons réglementaires." },
  { objection: "La donnée fournisseur reste hétérogène.", response: "C’est précisément le bon point d’entrée : qualifier les zones de risque et standardiser les informations réellement décisionnelles." },
  { objection: "Nous préférons attendre les prochaines publications.", response: "Préparer maintenant les scénarios et les données de preuve évite de comprimer les délais lorsque la notification est confirmée." },
]

export const terrainTopAccounts: TerrainTopAccount[] = [
  { name: "Robertet", category: "Leader indépendant", commercialAngle: "Traçabilité ingrédients et arbitrages de reformulation.", confidence: "Confiance segment", appetenceScore: 35, commercialEligibility: "unknown", isBenchmarkAccount: true },
  { name: "Mane", category: "Maison de composition", commercialAngle: "Référentiel fournisseur et accélération des cycles qualité.", confidence: "Confiance segment", appetenceScore: 31, commercialEligibility: "eligible" },
  { name: "Givaudan", category: "Leader international", commercialAngle: "Gouvernance produit et chaîne de preuve multi-pays.", confidence: "Confiance macro", appetenceScore: 28, commercialEligibility: "eligible" },
  { name: "Symrise", category: "Benchmark sectoriel", commercialAngle: "Modèle de comparaison hors prospection active.", confidence: "Confiance macro", appetenceScore: 25, commercialEligibility: "non_prospectable", isBenchmarkAccount: true },
]

export const terrainTopAccountsStress: TerrainTopAccount[] = [
  { name: "Groupe international des ingrédients aromatiques et extraits naturels", category: "Groupe multi-activités de spécialités", commercialAngle: "Cartographier les dépendances de formulation et sécuriser les arbitrages de conformité avant chaque mise sur le marché.", confidence: "Confiance segment consolidée avec réserve méthodologique", appetenceScore: 35, commercialEligibility: "unknown" },
  { name: "Maison européenne de composition et de parfumerie fonctionnelle", category: "Acteur historique à portefeuille diversifié", commercialAngle: "Cadrer un premier flux de preuve de la donnée fournisseur vers les équipes qualité, R&D et affaires réglementaires.", confidence: "Confiance macro à consolider", appetenceScore: 31, commercialEligibility: "eligible" },
  { name: "Laboratoire de spécialités olfactives", category: "ETI exportatrice de solutions techniques", commercialAngle: "Prioriser les scénarios de substitution qui compressent les délais de validation lors des notifications.", confidence: "Confiance segment", appetenceScore: 28, commercialEligibility: "eligible" },
]

export const terrainValueChain: TerrainValueChainStep[] = [
  { id: "sourcing", stageLabel: "Amont", activityLabel: "Sourcing matières premières", description: "Sécurisation et qualification des matières." },
  { id: "extraction", stageLabel: "Amont", activityLabel: "Extraction & transformation", description: "Traçabilité des procédés et lots." },
  { id: "formulation", stageLabel: "Cœur", activityLabel: "Formulation", description: "Arbitrages R&D, coût et conformité." },
  { id: "compliance", stageLabel: "Cœur", activityLabel: "Évaluation réglementaire", description: "Constitution de la preuve produit." },
  { id: "production", stageLabel: "Aval", activityLabel: "Production & contrôle qualité", description: "Industrialisation et contrôles de libération." },
  { id: "distribution", stageLabel: "Aval", activityLabel: "Mise sur le marché", description: "Documentation client et adaptation locale." },
]

export const terrainDependencies: TerrainDependency[] = [
  { name: "Données de conformité matières", criticality: "haute", risk: "Preuve fragmentée selon les fournisseurs.", openService: "Gouvernance des référentiels" },
  { name: "Disponibilité des alternatives", criticality: "haute", risk: "Substitution lente lors des restrictions.", openService: "Data produit & traçabilité" },
  { name: "Capacité laboratoire", criticality: "moyenne", risk: "Validation saturée en période de notification.", openService: "Pilotage de portefeuille" },
]

export const terrainSources: TerrainSourceFixture[] = [
  { id: 12, publisher: "International Fragrance Association", tier: 1, attests: "Les évolutions de standards IFRA, leur portée et les éléments de calendrier associés pour les ingrédients parfumés.", consultedAt: "2026-08-20", url: "https://ifrafragrance.org/" },
  { id: 31, publisher: "European Chemicals Agency", tier: 1, attests: "Un corpus de consultation long destiné à vérifier le défilement réel de la sheet. Il décrit les publications et jeux de données consultés, les éléments de contexte réglementaire, les conditions de réemploi et les limites de lecture. Cette fixture reste volontairement dense afin que la zone centrale puisse défiler sans déplacer l’en-tête ni le CTA fixé dans le bas de la feuille. Elle ne constitue aucune donnée métier en production.\n\nLe contenu documente aussi le périmètre de consultation, les informations exclues du corpus, la nature des publications lues et la date à laquelle les éléments ont été rapprochés. Il précise que les extraits doivent être interprétés dans leur contexte, qu’ils ne remplacent pas une validation juridique et qu’ils ne portent pas, à eux seuls, une décision commerciale.\n\nCette troisième partie confirme le comportement attendu de la surface : l’en-tête de la source demeure présent, la zone narrative peut défiler sans être tronquée et l’action vers le site de l’éditeur reste toujours atteignable. Les paragraphes ne sont là que pour le contrôle de cette ergonomie dans le design-lab isolé.\n\nLa dernière partie simule les éléments de contexte qui accompagnent habituellement une consultation : liens entre les avis, périmètre géographique, vocabulaire utilisé par l’autorité et limites de la source citée. Elle permet de vérifier que la lecture ne se termine jamais derrière le pied de sheet, quelle que soit la densité du texte rendu.\n\nEn situation réelle, cette information serait structurée par le registre de sources. Dans ce prototype, elle sert uniquement à confirmer que le panneau conserve une zone de contenu réellement défilable, que le bouton de fermeture reste disponible et que le CTA éditeur ne disparaît pas lors d’une lecture longue.", consultedAt: "2026-08-19", url: "https://echa.europa.eu/" },
  { id: 44, publisher: "Observatoire des ingrédients", tier: 2, attests: "Source de démonstration sans URL publique disponible dans le registre courant.", consultedAt: "2026-08-17", url: null },
  { id: 55, publisher: "European Commission", tier: 1, attests: "Source de démonstration dont la date de consultation n’est pas disponible.", consultedAt: null, url: "https://commission.europa.eu/" },
]
