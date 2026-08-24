// ──────────────────────────────────────────────────────────────────────
//  Knowledge Hub — Design Lab static data
//  All values mirror the real KREDO corpus (sector_intelligence, offers,
//  intelligence_documents). Not connected to Supabase.
// ──────────────────────────────────────────────────────────────────────

export type KnowledgeDomain = {
  id: string
  label: string
  shortLabel: string
  count: number
  icon: string
}

export type KnowledgeItem = {
  id: string
  domain: string
  type: "sector_study" | "playbook" | "offer" | "account_synthesis" | "strategy" | "reference" | "methodology"
  title: string
  summary: string
  score: number | null
  updatedAt: string
  source: string
  isFavorite: boolean
  freshness: "fresh" | "aging" | "stale"
  connections: {
    accounts: { id: string; name: string; status: string }[]
    offers: { id: string; name: string; practice: string }[]
    reports: { id: string; title: string; type: string }[]
    signals: { id: string; title: string; date: string }[]
  }
  painPoints?: { title: string; frequency: number }[]
  regulations?: { name: string; deadline: string | null; urgency: string }[]
}

export type UseCase = {
  id: string
  icon: string
  title: string
  description: string
  domains: string[]
}

export const domains: KnowledgeDomain[] = [
  { id: "sectors", label: "Secteurs & Marchés", shortLabel: "Secteurs", count: 13, icon: "🏭" },
  { id: "offers", label: "Offres & Compétences", shortLabel: "Offres", count: 24, icon: "📦" },
  { id: "accounts", label: "Comptes & Intelligence", shortLabel: "Comptes", count: 8, icon: "🏢" },
  { id: "references", label: "Références & REX", shortLabel: "Références", count: 5, icon: "📌" },
  { id: "methods", label: "Méthodes & Ressources", shortLabel: "Méthodes", count: 0, icon: "📚" },
]

export const useCases: UseCase[] = [
  {
    id: "rdv",
    icon: "📋",
    title: "Préparer un rendez-vous",
    description: "Secteur, signaux, compte, actualité",
    domains: ["sectors", "accounts"],
  },
  {
    id: "proposal",
    icon: "📄",
    title: "Construire une proposition",
    description: "Offres, références, REX, tarifs",
    domains: ["offers", "references"],
  },
  {
    id: "portfolio",
    icon: "🏢",
    title: "Piloter mon portefeuille",
    description: "Synthèses, stratégies, scores",
    domains: ["accounts"],
  },
  {
    id: "sector",
    icon: "🔍",
    title: "Comprendre un secteur",
    description: "Étude complète, marché, playbook",
    domains: ["sectors"],
  },
  {
    id: "reference",
    icon: "📌",
    title: "Retrouver une référence",
    description: "Projets ref, cas clients",
    domains: ["references"],
  },
  {
    id: "corpus",
    icon: "📚",
    title: "Tout le corpus",
    description: "Navigation libre par domaine",
    domains: ["sectors", "offers", "accounts", "references", "methods"],
  },
]

export const items: KnowledgeItem[] = [
  // ── Secteurs ──────────────────────────────────
  {
    id: "s1",
    domain: "sectors",
    type: "sector_study",
    title: "Parfumerie, Arômes & Ingrédients de spécialité",
    summary: "Le secteur de la parfumerie et des arômes représente un marché mondial de 35 Md€, dominé par 4 majors (Givaudan, Firmenich/DSM, IFF, Symrise). La région PACA concentre une filière historique autour de Grasse. Les ESN y trouvent des opportunités sur la conformité REACH, la traçabilité supply chain et la migration vers l'industrie 4.0.",
    score: 4.8,
    updatedAt: "2026-06-14",
    source: "Agent IA + corpus FOLIO",
    isFavorite: true,
    freshness: "aging",
    connections: {
      accounts: [
        { id: "c1", name: "Robertet", status: "client" },
        { id: "c2", name: "Mane", status: "prospect" },
        { id: "c3", name: "Givaudan", status: "cible" },
        { id: "c4", name: "V. Mane Fils", status: "prospect" },
        { id: "c5", name: "Albert Vieille", status: "prospect" },
        { id: "c6", name: "Expressions Parfumées", status: "prospect" },
        { id: "c7", name: "Firmenich", status: "cible" },
        { id: "c8", name: "Symrise", status: "cible" },
      ],
      offers: [
        { id: "o1", name: "Data Intelligence & Analytics", practice: "Data" },
        { id: "o2", name: "Cloud Migration & Infrastructure", practice: "Cloud" },
        { id: "o3", name: "Cybersécurité & Compliance", practice: "Cyber" },
      ],
      reports: [
        { id: "r1", title: "Synthèse Robertet — Q2 2026", type: "client_summary" },
        { id: "r2", title: "Stratégie commerciale Mane", type: "commercial_strategy" },
      ],
      signals: [
        { id: "sg1", title: "REACH : révision annexe XVII prévue T4 2026", date: "2026-07-15" },
        { id: "sg2", title: "Robertet — résultats S1 publiés", date: "2026-07-20" },
      ],
    },
    painPoints: [
      { title: "Conformité réglementaire REACH / CLP", frequency: 8 },
      { title: "Traçabilité supply chain matières premières", frequency: 7 },
      { title: "Migration ERP / PLM vers le cloud", frequency: 6 },
      { title: "Cybersécurité des données formulation", frequency: 5 },
      { title: "Recrutement profils tech spécialisés", frequency: 4 },
    ],
    regulations: [
      { name: "REACH — révision annexe XVII", deadline: "2026-12-31", urgency: "high" },
      { name: "Directive CSRD — reporting ESG", deadline: "2027-01-01", urgency: "medium" },
      { name: "Norme ISO 9235 — arômes naturels", deadline: null, urgency: "low" },
    ],
  },
  {
    id: "s2",
    domain: "sectors",
    type: "sector_study",
    title: "Banque, Finance & Assurance",
    summary: "Secteur fortement réglementé (DORA, Solvabilité II, GAFI/LCB-FT), en transformation digitale accélérée. Les ESN y interviennent sur la conformité réglementaire, la modernisation des SI core banking, la data analytics et la cybersécurité. Corpus mince mais recherche réglementaire solide.",
    score: 4.4,
    updatedAt: "2026-06-15",
    source: "Agent IA + recherche réglementaire",
    isFavorite: false,
    freshness: "aging",
    connections: {
      accounts: [
        { id: "c10", name: "CEGEMA", status: "client" },
        { id: "c11", name: "Crédit Mutuel", status: "prospect" },
        { id: "c12", name: "Société Générale", status: "cible" },
      ],
      offers: [
        { id: "o1", name: "Data Intelligence & Analytics", practice: "Data" },
        { id: "o4", name: "Conformité & GRC", practice: "Conseil" },
        { id: "o3", name: "Cybersécurité & Compliance", practice: "Cyber" },
        { id: "o5", name: "Core Banking Modernization", practice: "Dev" },
      ],
      reports: [
        { id: "r3", title: "Synthèse CEGEMA — Intelligence", type: "client_summary" },
      ],
      signals: [
        { id: "sg3", title: "DORA — entrée en application janv. 2025", date: "2026-06-01" },
      ],
    },
    painPoints: [
      { title: "Conformité DORA / résilience opérationnelle", frequency: 6 },
      { title: "Modernisation core banking legacy", frequency: 5 },
      { title: "Lutte anti-blanchiment (LCB-FT)", frequency: 5 },
      { title: "Open Banking / APIs réglementaires", frequency: 4 },
    ],
  },
  {
    id: "s3",
    domain: "sectors",
    type: "sector_study",
    title: "Nutraceutique & Santé Naturelle",
    summary: "Référence de méthode actuelle. Chaque argument ROI porte sa source dans le texte. La distinction fait/estimation est explicite. Source_company_ids réellement peuplé — fréquences vérifiables.",
    score: 4.3,
    updatedAt: "2026-06-30",
    source: "Agent IA + Arkopharma + Uriach",
    isFavorite: true,
    freshness: "fresh",
    connections: {
      accounts: [
        { id: "c20", name: "Arkopharma", status: "client" },
        { id: "c21", name: "Laboratoire des Granions", status: "prospect" },
      ],
      offers: [
        { id: "o1", name: "Data Intelligence & Analytics", practice: "Data" },
        { id: "o6", name: "Supply Chain Intelligence", practice: "Conseil" },
      ],
      reports: [],
      signals: [
        { id: "sg4", title: "Synadiet — nouvelles recommandations EFSA", date: "2026-07-01" },
      ],
    },
  },
  {
    id: "s4",
    domain: "sectors",
    type: "sector_study",
    title: "Santé, MedTech & Médico-social",
    summary: "Secteur en forte croissance porté par le vieillissement de la population, la télémédecine et les dispositifs médicaux connectés. Réglementation MDR/IVDR structurante.",
    score: null,
    updatedAt: "2026-07-17",
    source: "Agent IA",
    isFavorite: false,
    freshness: "fresh",
    connections: {
      accounts: [
        { id: "c30", name: "Doctolib", status: "cible" },
        { id: "c31", name: "Korian", status: "prospect" },
      ],
      offers: [
        { id: "o1", name: "Data Intelligence & Analytics", practice: "Data" },
        { id: "o7", name: "Infrastructure Santé", practice: "Cloud" },
      ],
      reports: [],
      signals: [],
    },
  },
  {
    id: "s5",
    domain: "sectors",
    type: "sector_study",
    title: "BTP, Construction & Négoce",
    summary: "Marché fragmenté avec forte pression réglementaire (RE2020, BIM obligatoire). Les ESN interviennent sur la digitalisation des processus chantier, le BIM management et les ERP métier.",
    score: null,
    updatedAt: "2026-07-17",
    source: "Agent IA",
    isFavorite: false,
    freshness: "fresh",
    connections: {
      accounts: [
        { id: "c40", name: "Eiffage", status: "cible" },
        { id: "c41", name: "Bouygues Construction", status: "cible" },
      ],
      offers: [
        { id: "o8", name: "BIM & Digital Construction", practice: "Conseil" },
        { id: "o2", name: "Cloud Migration & Infrastructure", practice: "Cloud" },
      ],
      reports: [],
      signals: [],
    },
  },

  // ── Offres ──────────────────────────────────
  {
    id: "of1",
    domain: "offers",
    type: "offer",
    title: "Data Intelligence & Analytics",
    summary: "Accompagnement des entreprises dans la valorisation de leurs données : gouvernance data, BI/reporting, data science, machine learning, data engineering. Positionnement premium sur les cas d'usage métier à forte valeur ajoutée.",
    score: null,
    updatedAt: "2026-07-08",
    source: "Catalogue d'offres KREDO",
    isFavorite: true,
    freshness: "fresh",
    connections: {
      accounts: [
        { id: "c1", name: "Robertet", status: "client" },
        { id: "c10", name: "CEGEMA", status: "client" },
        { id: "c20", name: "Arkopharma", status: "client" },
      ],
      offers: [],
      reports: [],
      signals: [],
    },
  },
  {
    id: "of2",
    domain: "offers",
    type: "offer",
    title: "Cloud Migration & Infrastructure",
    summary: "Migration vers le cloud (Azure, AWS, GCP), infrastructure as code, conteneurisation, monitoring. Intervention sur les environnements on-premise legacy et les architectures hybrides.",
    score: null,
    updatedAt: "2026-07-08",
    source: "Catalogue d'offres KREDO",
    isFavorite: false,
    freshness: "fresh",
    connections: {
      accounts: [
        { id: "c1", name: "Robertet", status: "client" },
        { id: "c40", name: "Eiffage", status: "cible" },
      ],
      offers: [],
      reports: [],
      signals: [],
    },
  },
  {
    id: "of3",
    domain: "offers",
    type: "offer",
    title: "Cybersécurité & Compliance",
    summary: "Audits de sécurité, conformité réglementaire (NIS2, DORA, RGPD), SOC, tests d'intrusion, sensibilisation. Approche orientée risques et compliance plutôt que pure technique.",
    score: null,
    updatedAt: "2026-07-08",
    source: "Catalogue d'offres KREDO",
    isFavorite: false,
    freshness: "fresh",
    connections: {
      accounts: [
        { id: "c10", name: "CEGEMA", status: "client" },
        { id: "c12", name: "Société Générale", status: "cible" },
      ],
      offers: [],
      reports: [],
      signals: [],
    },
  },

  // ── Comptes (synthèses durables) ──────────────
  {
    id: "a1",
    domain: "accounts",
    type: "account_synthesis",
    title: "Synthèse compte — CEGEMA",
    summary: "Mutuelle santé spécialisée, client actif avec 2 missions en cours. Pipeline pondéré : 45 k€. Prochain RDV : revue trimestrielle planifiée.",
    score: null,
    updatedAt: "2026-07-25",
    source: "Intelligence KREDO",
    isFavorite: true,
    freshness: "fresh",
    connections: {
      accounts: [],
      offers: [
        { id: "o1", name: "Data Intelligence & Analytics", practice: "Data" },
        { id: "o3", name: "Cybersécurité & Compliance", practice: "Cyber" },
      ],
      reports: [
        { id: "r3", title: "Synthèse CEGEMA — Intelligence", type: "client_summary" },
        { id: "r4", title: "Stratégie commerciale CEGEMA", type: "commercial_strategy" },
      ],
      signals: [
        { id: "sg5", title: "CEGEMA — appel d'offres infra prévu Q4", date: "2026-07-28" },
      ],
    },
  },
  {
    id: "a2",
    domain: "accounts",
    type: "account_synthesis",
    title: "Synthèse compte — Robertet",
    summary: "Leader mondial des ingrédients naturels, client historique. 3 missions réalisées, 1 en cours. Forte appétence data et supply chain. Secteur parfumerie — référence de la fiche sectorielle.",
    score: null,
    updatedAt: "2026-06-30",
    source: "Intelligence KREDO",
    isFavorite: false,
    freshness: "aging",
    connections: {
      accounts: [],
      offers: [
        { id: "o1", name: "Data Intelligence & Analytics", practice: "Data" },
        { id: "o6", name: "Supply Chain Intelligence", practice: "Conseil" },
      ],
      reports: [
        { id: "r1", title: "Synthèse Robertet — Q2 2026", type: "client_summary" },
      ],
      signals: [
        { id: "sg2", title: "Robertet — résultats S1 publiés", date: "2026-07-20" },
      ],
    },
  },

  // ── Références ──────────────────────────────
  {
    id: "ref1",
    domain: "references",
    type: "reference",
    title: "Audit technique & roadmap data — Robertet",
    summary: "Diagnostic complet du SI et de la maturité data chez Robertet. Cartographie applicative, recommandations d'architecture cloud-native, plan de migration à 18 mois. Livré en Q1 2026.",
    score: null,
    updatedAt: "2026-03-15",
    source: "Projet livré",
    isFavorite: false,
    freshness: "fresh",
    connections: {
      accounts: [{ id: "c1", name: "Robertet", status: "client" }],
      offers: [{ id: "o1", name: "Data Intelligence & Analytics", practice: "Data" }],
      reports: [],
      signals: [],
    },
  },
]

export function getItemsByDomain(domainId: string): KnowledgeItem[] {
  return items.filter((item) => item.domain === domainId)
}

export function searchItems(query: string): KnowledgeItem[] {
  const lower = query.toLowerCase()
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.summary.toLowerCase().includes(lower),
  )
}

export function getFavorites(): KnowledgeItem[] {
  return items.filter((item) => item.isFavorite)
}

export function getStaleItems(): KnowledgeItem[] {
  return items.filter((item) => item.freshness === "stale" || item.freshness === "aging")
}
