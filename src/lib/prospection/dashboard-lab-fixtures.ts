export type FutureDemoSignalFixture = {
  id: `demo-signal-${string}`
  companyId: string
  companyName: string
  sector: string
  title: string
  summary: string
  signalType: "nomination" | "budget" | "reglementaire" | "recrutement" | "partnership"
  urgency: "high" | "medium"
  triggeredAt: string
  expiresAt: string
  recommendedPractice: "Data & AI" | "Cloud Eng" | "Product" | "Cyber"
  suggestedAction: string
}

export type FutureDemoWindowFixture = {
  id: `demo-window-${string}`
  sectorSlug: string
  sectorName: string
  title: string
  windowType: "signal_compte" | "budget_sectoriel" | "declencheur_reglementaire"
  urgency: "high" | "medium"
  detectedAt: string
  recommendedPractice: "Data & AI" | "Cloud Eng" | "Product" | "Cyber"
  playbook: string
  exposedCompanyIds: string[]
  exposedCompanyNames: string[]
}

export const FUTURE_DEMO_SIGNAL_FIXTURES = [
  {
    id: "demo-signal-experis-cyber-souverain",
    companyId: "c641e823-e6fb-428f-b7f1-e9fa4961d170",
    companyName: "Experis France",
    sector: "Services",
    title: "Programme cyber souverain élargi",
    summary: "Un budget transversal sécurité et modernisation workplace serait arbitré au T3.",
    signalType: "budget",
    urgency: "high",
    triggeredAt: "2026-06-24T09:30:00.000Z",
    expiresAt: "2026-07-12T18:00:00.000Z",
    recommendedPractice: "Cyber",
    suggestedAction: "Qualifier le sponsor transformation puis proposer un atelier cadrage sécurité.",
  },
  {
    id: "demo-signal-domusvi-data-operations",
    companyId: "78af90a6-814c-4ff6-9dcc-4d1cf083ee66",
    companyName: "Domusvi",
    sector: "Santé",
    title: "Refonte data opérationnelle multi-sites",
    summary: "Une équipe régionale pilote un chantier de consolidation des indicateurs d'exploitation.",
    signalType: "partnership",
    urgency: "medium",
    triggeredAt: "2026-06-22T08:00:00.000Z",
    expiresAt: "2026-07-18T18:00:00.000Z",
    recommendedPractice: "Data & AI",
    suggestedAction: "Obtenir un RDV exploratoire avec la direction des opérations et le SI régional.",
  },
  {
    id: "demo-signal-robertet-ot-cyber",
    companyId: "67b346ff-68c8-4f36-a510-13024955856f",
    companyName: "Robertet",
    sector: "Industrie",
    title: "Audit OT et segmentation industrielle",
    summary: "La fenêtre commerciale est courte avant le cadrage budgétaire de rentrée.",
    signalType: "reglementaire",
    urgency: "high",
    triggeredAt: "2026-06-25T07:45:00.000Z",
    expiresAt: "2026-07-08T18:00:00.000Z",
    recommendedPractice: "Cyber",
    suggestedAction: "Positionner une offre d'audit OT avant arbitrage du budget de septembre.",
  },
  {
    id: "demo-signal-expressions-parfumees-product-data",
    companyId: "90df1bb5-391e-4f9d-b010-652ebac67dc4",
    companyName: "Expressions Parfumees",
    sector: "Industrie",
    title: "Pilotage innovation parfum et données marché",
    summary: "Une équipe veut rapprocher tendances marché, R&D et mise en marché plus vite.",
    signalType: "recrutement",
    urgency: "medium",
    triggeredAt: "2026-06-18T10:15:00.000Z",
    expiresAt: "2026-07-20T18:00:00.000Z",
    recommendedPractice: "Product",
    suggestedAction: "Proposer un discovery workshop produit x data pour cadrer le besoin.",
  },
] as const satisfies readonly FutureDemoSignalFixture[]

export const FUTURE_DEMO_WINDOW_FIXTURES = [
  {
    id: "demo-window-industrie-cyber-ot",
    sectorSlug: "parfumerie-aromes",
    sectorName: "Parfumerie, Arômes & Cosmétique",
    title: "Durcissement OT et continuité industrielle",
    windowType: "declencheur_reglementaire",
    urgency: "high",
    detectedAt: "2026-06-25T07:45:00.000Z",
    recommendedPractice: "Cyber",
    playbook: "Audit OT ciblé + cadrage segmentation réseau industriel",
    exposedCompanyIds: [
      "67b346ff-68c8-4f36-a510-13024955856f",
      "90df1bb5-391e-4f9d-b010-652ebac67dc4",
    ],
    exposedCompanyNames: ["Robertet", "Expressions Parfumees"],
  },
  {
    id: "demo-window-sante-data-sites",
    sectorSlug: "banque-finance-assurance",
    sectorName: "Banque, Finance & Assurance",
    title: "Consolidation data multi-sites avant arbitrage 2027",
    windowType: "budget_sectoriel",
    urgency: "medium",
    detectedAt: "2026-06-22T08:00:00.000Z",
    recommendedPractice: "Data & AI",
    playbook: "Diagnostic KPI d'exploitation + trajectoire data platform légère",
    exposedCompanyIds: ["78af90a6-814c-4ff6-9dcc-4d1cf083ee66"],
    exposedCompanyNames: ["Domusvi"],
  },
] as const satisfies readonly FutureDemoWindowFixture[]
