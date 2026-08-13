// ─── Practice color system ─────────────────────────────────────────────────────
// ⚠️ DEUX VOCABULAIRES DE PRACTICES COEXISTENT, et un seul slug leur est commun
// (`cybersecurity`). Ne jamais joindre l'un sur l'autre.
//
//   · `PracticeSlug`      — vocabulaire FRONT, ci-dessous. Sert à l'affichage
//                           (couleurs, images, badges). Consommé par ~8 composants.
//   · `OfferPracticeSlug` — vocabulaire BASE, `offer_practices.slug`. C'est LUI
//                           qui joint sur `offers`, `offer_pricing_grids`, etc.
//
// Le pont entre les deux est explicite : PRACTICE_SLUG_TO_OFFER_PRACTICE.
// Les color_hex sont également stockés dans offer_practices.color_hex (Supabase)
// — les deux doivent rester synchronisés.

export type PracticeSlug =
  | 'data-ia'
  | 'digital-cloud'
  | 'agile-pm'
  | 'cybersecurity'
  | 'qa-testing'
  | 'custom-apps'
  | 'ux-ui-design'
  | 'legacy-mainframe'

export interface PracticeConfig {
  slug: PracticeSlug
  name: string
  shortName: string
  /** Couleur solide hex — correspond à offer_practices.color_hex */
  color: string
  /** Gradient CSS (Data/IA uniquement) */
  gradient?: string
}

export const PRACTICES: PracticeConfig[] = [
  {
    slug: 'data-ia',
    name: 'Data Intelligence & Artificial Intelligence',
    shortName: 'Data & IA',
    color: '#818CF8',
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.72) 0%, rgba(129,140,248,0.72) 28%, rgba(192,132,252,0.72) 52%, rgba(244,114,182,0.72) 76%, rgba(52,211,153,0.72) 100%)',
  },
  {
    slug: 'digital-cloud',
    name: 'Digital & Cloud Engineering',
    shortName: 'Digital & Cloud',
    color: '#10B981',
  },
  {
    slug: 'agile-pm',
    name: 'Agile Product Management & Delivery',
    shortName: 'Agile & PMO',
    color: '#D97706',
  },
  {
    slug: 'cybersecurity',
    name: 'Cybersecurity & SecOps',
    shortName: 'Cyber & SecOps',
    color: '#C41E3A',
  },
  {
    slug: 'qa-testing',
    name: 'QA & Testing',
    shortName: 'QA & Testing',
    color: '#0891B2',
  },
  {
    slug: 'custom-apps',
    name: 'Custom Business Applications & Software Architecture',
    shortName: 'Apps & Architecture',
    color: '#6366F1',
  },
  {
    slug: 'ux-ui-design',
    name: 'UX Research, Product Design & Omnichannel Services',
    shortName: 'UX/UI & Product',
    color: '#EC4899',
  },
  {
    slug: 'legacy-mainframe',
    name: 'Legacy Modernization, Mainframe & MCO Operations',
    shortName: 'Legacy & Mainframe',
    color: '#64748B',
  },
]

// ─── Lookups ──────────────────────────────────────────────────────────────────

const BY_SLUG = new Map(PRACTICES.map((p) => [p.slug, p]))

export function getPracticeBySlug(slug: string): PracticeConfig | undefined {
  return BY_SLUG.get(slug as PracticeSlug)
}

// ─── Correspondance des vocabulaires de practices (Action A6 — MASTER STUDY) ───
// Les 8 valeurs ci-dessous sont celles de `offer_practices.slug` en base, relevées
// live le 2026-08-13. Elles font autorité : c'est sur elles que joignent `offers`,
// `offer_pricing_grids` et toute requête SQL. La première version de cette table
// mappait vers `PracticeSlug` (le vocabulaire front) tout en le documentant comme
// `offer_practices.slug` : 7 des 8 valeurs ne joignaient donc aucune ligne, en silence.

export type OfferPracticeSlug =
  | 'data-ai'
  | 'cloud-engineering'
  | 'cybersecurity'
  | 'digital-business-solutions'
  | 'digital-experience'
  | 'legacy-systems-mainframe'
  | 'project-agile-delivery'
  | 'quality-engineering-testing'

export const OFFER_PRACTICE_SLUGS: readonly OfferPracticeSlug[] = [
  'data-ai',
  'cloud-engineering',
  'cybersecurity',
  'digital-business-solutions',
  'digital-experience',
  'legacy-systems-mainframe',
  'project-agile-delivery',
  'quality-engineering-testing',
] as const

/** Pont front → base. Le seul endroit où les deux vocabulaires se rencontrent. */
export const PRACTICE_SLUG_TO_OFFER_PRACTICE: Record<PracticeSlug, OfferPracticeSlug> = {
  'data-ia': 'data-ai',
  'digital-cloud': 'cloud-engineering',
  'agile-pm': 'project-agile-delivery',
  cybersecurity: 'cybersecurity',
  'qa-testing': 'quality-engineering-testing',
  'custom-apps': 'digital-business-solutions',
  'ux-ui-design': 'digital-experience',
  'legacy-mainframe': 'legacy-systems-mainframe',
}

/** Pont base → front, dérivé du précédent : une seule table à maintenir. */
export const OFFER_PRACTICE_TO_PRACTICE_SLUG = Object.fromEntries(
  Object.entries(PRACTICE_SLUG_TO_OFFER_PRACTICE).map(([front, base]) => [base, front]),
) as Record<OfferPracticeSlug, PracticeSlug>

// `kredo_practice` — vocabulaire des tables sector_* (sector_pain_points,
// sector_regulatory_items). Valeurs réellement présentes en base au 2026-08-13 :
// data_ai · cloud_eng · cyber · product · multi. Les quatre autres clés sont
// prévues par le contrat MASTER STUDY mais n'ont encore aucune occurrence.
export const KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP: Record<string, OfferPracticeSlug | null> = {
  data_ai: 'data-ai',
  cloud_eng: 'cloud-engineering',
  cyber: 'cybersecurity',
  product: 'project-agile-delivery',
  testing: 'quality-engineering-testing',
  apps: 'digital-business-solutions',
  design: 'digital-experience',
  legacy: 'legacy-systems-mainframe',
  multi: null,
}

export const OFFER_PRACTICE_TO_KREDO_PRACTICE_MAP = Object.fromEntries(
  Object.entries(KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP)
    .filter((entry): entry is [string, OfferPracticeSlug] => entry[1] !== null)
    .map(([kredo, offer]) => [offer, kredo]),
) as Record<OfferPracticeSlug, string>

const OFFER_PRACTICE_SET = new Set<string>(OFFER_PRACTICE_SLUGS)

export function isOfferPracticeSlug(slug: string | null | undefined): slug is OfferPracticeSlug {
  return !!slug && OFFER_PRACTICE_SET.has(slug)
}

/** `kredo_practice` (sector_*) → `offer_practices.slug`. `null` pour `multi`. */
export function mapKredoPracticeToOfferPractice(
  practice: string | null | undefined,
): OfferPracticeSlug | null {
  if (!practice) return null
  const key = practice.toLowerCase().trim()
  if (key in KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP) return KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP[key]
  // Un slug base déjà correct passe tel quel ; un slug front est traduit.
  if (isOfferPracticeSlug(key)) return key
  return PRACTICE_SLUG_TO_OFFER_PRACTICE[key as PracticeSlug] ?? null
}

/** `offer_practices.slug` → `kredo_practice`. Accepte aussi un slug front. */
export function mapOfferPracticeToKredoPractice(slug: string | null | undefined): string | null {
  if (!slug) return null
  const key = slug.toLowerCase().trim()
  const base = isOfferPracticeSlug(key) ? key : PRACTICE_SLUG_TO_OFFER_PRACTICE[key as PracticeSlug]
  return base ? (OFFER_PRACTICE_TO_KREDO_PRACTICE_MAP[base] ?? null) : null
}

// ─── Catalogue des 41 offres (table `offers` Supabase) ───────────────────────
// Les `slug` d'offres et leur rattachement correspondent un pour un à la table
// `offers` en base, relevés le 2026-08-13. `offerPracticeSlug` porte le slug BASE
// (`offer_practices.slug`), jamais le slug front.

export interface OfferCatalogEntry {
  slug: string
  name: string
  offerPracticeSlug: OfferPracticeSlug
  shortDescription: string
  keywords: string[]
}

export const KREDO_OFFERS_CATALOG: OfferCatalogEntry[] = [
  // --- data-ai (5 offres)
  {
    slug: 'data-ai-strategy-governance',
    name: 'Data & AI Strategy, Governance & Responsible AI',
    offerPracticeSlug: 'data-ai',
    shortDescription: 'Aligner la stratégie Data/IA sur les priorités métier et sécuriser la gouvernance.',
    keywords: ['data strategy', 'ai strategy', 'governance', 'responsible ai', 'roadmap'],
  },
  {
    slug: 'data-platforms-engineering-dataops',
    name: 'Data Platforms, Engineering & DataOps',
    offerPracticeSlug: 'data-ai',
    shortDescription: 'Concevoir et industrialiser les fondations data fiables qui alimentent analytics et IA.',
    keywords: ['data platform', 'data engineering', 'dataops', 'lakehouse', 'etl', 'elt'],
  },
  {
    slug: 'bi-analytics-decision-intelligence',
    name: 'BI, Analytics & Decision Intelligence',
    offerPracticeSlug: 'data-ai',
    shortDescription: 'Mettre à disposition des indicateurs fiables et des analyses directement actionnables.',
    keywords: ['business intelligence', 'analytics', 'power bi', 'decision intelligence', 'kpi'],
  },
  {
    slug: 'ai-machine-learning-mlops',
    name: 'AI, Machine Learning & MLOps',
    offerPracticeSlug: 'data-ai',
    shortDescription: 'Concevoir, déployer et superviser des modèles prédictifs intégrés aux opérations métier.',
    keywords: ['machine learning', 'predictive analytics', 'mlops', 'computer vision', 'forecasting'],
  },
  {
    slug: 'generative-ai-rag-automation',
    name: 'Generative AI, RAG & Intelligent Automation',
    offerPracticeSlug: 'data-ai',
    shortDescription: 'Créer des assistants et automatisations IA ancrés dans les données de l’entreprise.',
    keywords: ['generative ai', 'rag', 'agents', 'llmops', 'n8n', 'pgvector'],
  },

  // --- cloud-engineering (5 offres)
  {
    slug: 'cloud-strategy-assessment-landing-zones',
    name: 'Cloud Strategy, Assessment & Landing Zones',
    offerPracticeSlug: 'cloud-engineering',
    shortDescription: 'Définir une trajectoire cloud réaliste et poser des fondations gouvernées.',
    keywords: ['cloud strategy', 'assessment', 'landing zone', 'multicloud', 'governance'],
  },
  {
    slug: 'cloud-migration-application-modernization',
    name: 'Cloud Migration & Application Modernization',
    offerPracticeSlug: 'cloud-engineering',
    shortDescription: 'Migrer les workloads et moderniser les applications sans compromettre la continuité.',
    keywords: ['cloud migration', 'modernization', '6r', 'cloud native', 'replatforming'],
  },
  {
    slug: 'platform-engineering-devops-kubernetes',
    name: 'Platform Engineering, DevOps & Kubernetes',
    offerPracticeSlug: 'cloud-engineering',
    shortDescription: 'Fournir aux équipes produit une plateforme self-service qui accélère le delivery.',
    keywords: ['platform engineering', 'devops', 'kubernetes', 'terraform', 'ci/cd'],
  },
  {
    slug: 'cloud-operations-sre-observability',
    name: 'Cloud Operations, SRE & Observability',
    offerPracticeSlug: 'cloud-engineering',
    shortDescription: 'Exploiter les services cloud avec des objectifs de fiabilité mesurables.',
    keywords: ['sre', 'cloudops', 'observability', 'reliability', 'incident management'],
  },
  {
    slug: 'finops-greenops-cloud-optimization',
    name: 'FinOps, GreenOps & Cloud Optimization',
    offerPracticeSlug: 'cloud-engineering',
    shortDescription: 'Maîtriser les dépenses cloud et arbitrer coûts, performance et empreinte.',
    keywords: ['finops', 'greenops', 'cloud cost', 'rightsizing', 'showback'],
  },

  // --- cybersecurity (5 offres)
  {
    slug: 'cyber-strategy-grc-compliance',
    name: 'Cyber Strategy, GRC & Compliance',
    offerPracticeSlug: 'cybersecurity',
    shortDescription: 'Prioriser les risques et construire une trajectoire de cybersécurité défendable.',
    keywords: ['cyber strategy', 'grc', 'iso 27001', 'nis2', 'dora', 'risk'],
  },
  {
    slug: 'iam-pam-zero-trust',
    name: 'IAM, PAM & Zero Trust',
    offerPracticeSlug: 'cybersecurity',
    shortDescription: 'Sécuriser les identités, privilèges et accès dans des environnements hybrides.',
    keywords: ['iam', 'pam', 'zero trust', 'mfa', 'sso', 'identity'],
  },
  {
    slug: 'security-architecture-cloud-security',
    name: 'Security Architecture & Cloud Security',
    offerPracticeSlug: 'cybersecurity',
    shortDescription: 'Intégrer les exigences de sécurité dans les architectures et plateformes dès leur conception.',
    keywords: ['security architecture', 'cloud security', 'threat modeling', 'hardening', 'zero trust'],
  },
  {
    slug: 'application-security-devsecops-offensive-testing',
    name: 'Application Security, DevSecOps & Offensive Testing',
    offerPracticeSlug: 'cybersecurity',
    shortDescription: 'Réduire les vulnérabilités en intégrant la sécurité dans le cycle logiciel et par pentests.',
    keywords: ['appsec', 'devsecops', 'pentest', 'owasp', 'sast', 'dast'],
  },
  {
    slug: 'soc-detection-incident-response',
    name: 'SOC, Detection & Incident Response',
    offerPracticeSlug: 'cybersecurity',
    shortDescription: 'Améliorer la détection, la qualification et la réponse aux menaces.',
    keywords: ['soc', 'siem', 'detection', 'incident response', 'dfir', 'edr'],
  },

  // --- quality-engineering-testing (5 offres)
  {
    slug: 'quality-strategy-test-governance',
    name: 'Quality Strategy & Test Governance',
    offerPracticeSlug: 'quality-engineering-testing',
    shortDescription: 'Définir une stratégie qualité proportionnée aux risques et partagée.',
    keywords: ['quality strategy', 'test governance', 'risk based testing', 'qa', 'metrics'],
  },
  {
    slug: 'functional-api-integration-testing',
    name: 'Functional, API & Integration Testing',
    offerPracticeSlug: 'quality-engineering-testing',
    shortDescription: 'Sécuriser les parcours métier et les échanges inter-systèmes.',
    keywords: ['functional testing', 'api testing', 'integration testing', 'uat', 'test cases'],
  },
  {
    slug: 'test-automation-continuous-quality',
    name: 'Test Automation & Continuous Quality',
    offerPracticeSlug: 'quality-engineering-testing',
    shortDescription: 'Automatiser les contrôles utiles et les intégrer au delivery.',
    keywords: ['test automation', 'playwright', 'cypress', 'selenium', 'continuous testing'],
  },
  {
    slug: 'performance-reliability-resilience-testing',
    name: 'Performance, Reliability & Resilience Testing',
    offerPracticeSlug: 'quality-engineering-testing',
    shortDescription: 'Vérifier qu’un système tient la charge, se dégrade correctement et respecte ses SLA.',
    keywords: ['performance testing', 'load testing', 'k6', 'jmeter', 'resilience'],
  },
  {
    slug: 'mobile-accessibility-experience-quality',
    name: 'Mobile, Accessibility & Experience Quality',
    offerPracticeSlug: 'quality-engineering-testing',
    shortDescription: 'Garantir la qualité perçue sur les appareils, navigateurs et accessibilité.',
    keywords: ['mobile testing', 'accessibility', 'wcag', 'rgaa', 'cross browser'],
  },

  // --- Agile Product Management & Delivery (5 offers)
  {
    slug: 'project-program-management',
    name: 'Project & Program Management',
    offerPracticeSlug: 'project-agile-delivery',
    shortDescription: 'Piloter les engagements, dépendances et décisions d’un projet numérique complexe.',
    keywords: ['project management', 'program management', 'governance', 'risk', 'delivery'],
  },
  {
    slug: 'pmo-portfolio-transformation-governance',
    name: 'PMO, Portfolio & Transformation Governance',
    offerPracticeSlug: 'project-agile-delivery',
    shortDescription: 'Donner au management une vision fiable des priorités et capacités.',
    keywords: ['pmo', 'portfolio', 'transformation office', 'capacity', 'benefits'],
  },
  {
    slug: 'agile-delivery-scrum-kanban',
    name: 'Agile Delivery, Scrum & Kanban',
    offerPracticeSlug: 'project-agile-delivery',
    shortDescription: 'Améliorer le flux de delivery et la collaboration des équipes.',
    keywords: ['scrum', 'kanban', 'agile delivery', 'flow', 'team coaching'],
  },
  {
    slug: 'agile-at-scale-release-coordination',
    name: 'Agile at Scale & Release Coordination',
    offerPracticeSlug: 'project-agile-delivery',
    shortDescription: 'Coordonner plusieurs équipes et synchroniser les releases.',
    keywords: ['safe', 'release train', 'agile at scale', 'dependencies', 'release management'],
  },
  {
    slug: 'change-management-adoption',
    name: 'Change Management & Adoption',
    offerPracticeSlug: 'project-agile-delivery',
    shortDescription: 'Faire adopter les nouveaux outils, processus et modes de travail.',
    keywords: ['change management', 'adoption', 'training', 'stakeholders', 'communication'],
  },

  // --- UX Research, UI & Digital Product (5 offers)
  {
    slug: 'ux-research-service-design',
    name: 'UX Research & Service Design',
    offerPracticeSlug: 'digital-experience',
    shortDescription: 'Comprendre les usages réels et concevoir un service cohérent avant de réaliser.',
    keywords: ['ux research', 'service design', 'customer journey', 'user testing', 'discovery'],
  },
  {
    slug: 'product-design-ui-design-systems',
    name: 'Product Design, UI & Design Systems',
    offerPracticeSlug: 'digital-experience',
    shortDescription: 'Concevoir des interfaces cohérentes, accessibles et industrialisables.',
    keywords: ['product design', 'ui', 'design system', 'figma', 'accessibility'],
  },
  {
    slug: 'web-experiences-portals-ecommerce',
    name: 'Web Experiences, Portals & E-commerce',
    offerPracticeSlug: 'digital-experience',
    shortDescription: 'Développer des expériences web rapides, accessibles et orientées conversion.',
    keywords: ['web experience', 'frontend', 'ecommerce', 'portal', 'core web vitals'],
  },
  {
    slug: 'mobile-applications-omnichannel-services',
    name: 'Mobile Applications & Omnichannel Services',
    offerPracticeSlug: 'digital-experience',
    shortDescription: 'Créer des applications mobiles robustes et des parcours continus.',
    keywords: ['mobile', 'ios', 'android', 'react native', 'flutter', 'omnichannel'],
  },
  {
    slug: 'digital-product-management-optimization',
    name: 'Digital Product Management & Optimization',
    offerPracticeSlug: 'digital-experience',
    shortDescription: 'Piloter un produit numérique par la valeur, les usages et l’apprentissage continu.',
    keywords: ['product management', 'product analytics', 'cro', 'roadmap', 'experimentation'],
  },

  // --- Custom Business Applications & Software Architecture (6 offers)
  {
    slug: 'business-analysis-digital-process-design',
    name: 'Business Analysis & Digital Process Design',
    offerPracticeSlug: 'digital-business-solutions',
    shortDescription: 'Transformer un besoin métier diffus en processus cible et exigences claires.',
    keywords: ['business analysis', 'process design', 'requirements', 'bpmn', 'functional design'],
  },
  {
    slug: 'custom-business-applications-b2b-portals',
    name: 'Custom Business Applications & B2B Portals',
    offerPracticeSlug: 'digital-business-solutions',
    shortDescription: 'Construire des applications sur mesure qui soutiennent les opérations.',
    keywords: ['business application', 'b2b portal', 'custom software', 'saas', 'full stack'],
  },
  {
    slug: 'software-architecture-apis-integration',
    name: 'Software Architecture, APIs & Integration',
    offerPracticeSlug: 'digital-business-solutions',
    shortDescription: 'Découpler les systèmes, sécuriser les échanges et construire une architecture durable.',
    keywords: ['software architecture', 'api', 'integration', 'event driven', 'microservices'],
  },
  {
    slug: 'application-modernization-legacy-refactoring',
    name: 'Application Modernization & Legacy Refactoring',
    offerPracticeSlug: 'digital-business-solutions',
    shortDescription: 'Réduire la dette applicative et faire évoluer les logiciels existants.',
    keywords: ['application modernization', 'refactoring', 'legacy application', 'microservices', 'technical debt'],
  },
  {
    slug: 'application-management-productive-tma',
    name: 'Application Management & Productive TMA',
    offerPracticeSlug: 'digital-business-solutions',
    shortDescription: 'Maintenir et faire évoluer les applications avec une logique de service et SLA.',
    keywords: ['tma', 'application management', 'maintenance', 'support', 'sla'],
  },
  {
    slug: 'connected-products-iot-embedded-software',
    name: 'Connected Products, IoT & Embedded Software',
    offerPracticeSlug: 'digital-business-solutions',
    shortDescription: 'Concevoir les logiciels embarqués et services d’intégration des produits connectés.',
    keywords: ['embedded', 'firmware', 'iot', 'rtos', 'nfc', 'connected product'],
  },

  // --- Legacy Modernization, Mainframe & MCO (5 offers)
  {
    slug: 'legacy-estate-assessment-risk-reduction',
    name: 'Legacy Estate Assessment & Risk Reduction',
    offerPracticeSlug: 'legacy-systems-mainframe',
    shortDescription: 'Rendre visibles les risques techniques, opérationnels et humains du legacy.',
    keywords: ['legacy assessment', 'obsolescence', 'risk', 'mainframe', 'knowledge'],
  },
  {
    slug: 'mainframe-application-maintenance-evolution',
    name: 'Mainframe Application Maintenance & Evolution',
    offerPracticeSlug: 'legacy-systems-mainframe',
    shortDescription: 'Maintenir et faire évoluer les applications mainframe critiques en COBOL/CICS.',
    keywords: ['cobol', 'mainframe application', 'cics', 'db2', 'maintenance'],
  },
  {
    slug: 'legacy-infrastructure-mco-expert-operations',
    name: 'Legacy Infrastructure MCO & Expert Operations',
    offerPracticeSlug: 'legacy-systems-mainframe',
    shortDescription: 'Garantir le MCO des plateformes historiques (z/OS, Unix, AIX, Solaris).',
    keywords: ['legacy infrastructure', 'mco', 'zos', 'aix', 'solaris', 'operations'],
  },
  {
    slug: 'legacy-performance-reliability-major-incidents',
    name: 'Performance, Reliability & Major Incident Management',
    offerPracticeSlug: 'legacy-systems-mainframe',
    shortDescription: 'Stabiliser les systèmes historiques critiques et réduire les incidents majeurs.',
    keywords: ['major incident', 'problem management', 'capacity', 'performance', 'batch'],
  },
  {
    slug: 'legacy-modernization-knowledge-transfer',
    name: 'Legacy Modernization & Knowledge Transfer',
    offerPracticeSlug: 'legacy-systems-mainframe',
    shortDescription: 'Moderniser progressivement le legacy tout en sécurisant la connaissance.',
    keywords: ['legacy modernization', 'rehost', 'replatform', 'knowledge transfer', 'api enablement'],
  },
]

const OFFERS_BY_SLUG = new Map(KREDO_OFFERS_CATALOG.map((o) => [o.slug, o]))

export function getOfferBySlug(slug: string): OfferCatalogEntry | undefined {
  if (!slug) return undefined
  return OFFERS_BY_SLUG.get(slug.toLowerCase().trim())
}

/** Offres d'une practice, par son slug BASE (`offer_practices.slug`). */
export function getOffersByPractice(offerPracticeSlug: string): OfferCatalogEntry[] {
  const base = mapKredoPracticeToOfferPractice(offerPracticeSlug)
  if (!base) return []
  return KREDO_OFFERS_CATALOG.filter((o) => o.offerPracticeSlug === base)
}

// Mots-clés pour fuzzy match sur collaborator.practice (champ texte libre)
const KEYWORDS: Array<{ keywords: string[]; slug: PracticeSlug }> = [
  {
    keywords: ['data', 'ia', 'ai', 'intelligence', 'artificial', 'machine', 'learning', 'analytics', 'mlops'],
    slug: 'data-ia',
  },
  {
    keywords: ['digital', 'cloud', 'engineering', 'fullstack', 'full-stack', 'frontend', 'backend', 'devops', 'infrastructure'],
    slug: 'digital-cloud',
  },
  {
    keywords: ['agile', 'product', 'pm', 'owner', 'scrum', 'management', 'apm', 'pmo', 'portfolio'],
    slug: 'agile-pm',
  },
  {
    keywords: ['cyber', 'security', 'secops', 'securite', 'securité', 'soc', 'pentest', 'grc', 'iam', 'zero trust'],
    slug: 'cybersecurity',
  },
  {
    keywords: ['qa', 'test', 'testing', 'quality', 'qualite', 'qualité', 'assurance'],
    slug: 'qa-testing',
  },
  {
    keywords: ['custom', 'application', 'b2b', 'software', 'architecture', 'api', 'integration', 'tma'],
    slug: 'custom-apps',
  },
  {
    keywords: ['ux', 'ui', 'design', 'service', 'omnichannel', 'figma', 'mobile app'],
    slug: 'ux-ui-design',
  },
  {
    keywords: ['legacy', 'mainframe', 'cobol', 'mco', 'aix', 'zos', 'solaris'],
    slug: 'legacy-mainframe',
  },
]

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function getPracticeByName(name: string | null | undefined): PracticeConfig | undefined {
  if (!name) return undefined
  const n = normalize(name)
  for (const { keywords, slug } of KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return BY_SLUG.get(slug)
  }
  return undefined
}

// ─── Badge inline style ───────────────────────────────────────────────────────

export interface PracticeBadgeStyle {
  background: string
  color: string
  border: string
}

export function practiceBadgeStyle(name: string | null | undefined): PracticeBadgeStyle {
  const p = getPracticeByName(name)
  if (!p) {
    return { background: 'var(--color-canvas)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }
  }
  if (p.gradient) {
    return {
      background: p.gradient,
      color: '#FFFFFF',
      border: `1px solid ${p.color}50`,
    }
  }
  return {
    background: `${p.color}18`,
    color: p.color,
    border: `1px solid ${p.color}35`,
  }
}
