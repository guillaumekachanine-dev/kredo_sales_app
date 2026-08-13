// ─── Practice color system ─────────────────────────────────────────────────────
// Source de vérité côté front. Les color_hex sont également stockés dans
// offer_practices.color_hex (Supabase) — les deux doivent rester synchronisés.

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

// ─── Practice Key Correspondence (Action A6 - MASTER STUDY) ─────────────────────
// Table de correspondance entre kredo_practice (base sector_*) et offer_practices.slug (table offer_practices)

export const KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP: Record<string, PracticeSlug | null> = {
  data_ai: 'data-ia',
  cloud_eng: 'digital-cloud',
  cyber: 'cybersecurity',
  product: 'agile-pm',
  testing: 'qa-testing',
  apps: 'custom-apps',
  design: 'ux-ui-design',
  legacy: 'legacy-mainframe',
  multi: null,
}

export const OFFER_PRACTICE_TO_KREDO_PRACTICE_MAP: Record<string, string> = {
  'data-ia': 'data_ai',
  'data-ai': 'data_ai',
  'digital-cloud': 'cloud_eng',
  'cloud-engineering': 'cloud_eng',
  cloud_eng: 'cloud_eng',
  cybersecurity: 'cyber',
  cyber: 'cyber',
  'agile-pm': 'product',
  product: 'product',
  'qa-testing': 'testing',
  'custom-apps': 'apps',
  'ux-ui-design': 'design',
  'legacy-mainframe': 'legacy',
}

export function mapKredoPracticeToOfferPractice(practice: string | null | undefined): PracticeSlug | null {
  if (!practice) return null
  const key = practice.toLowerCase().trim()
  return KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP[key] ?? (BY_SLUG.has(key as PracticeSlug) ? (key as PracticeSlug) : null)
}

export function mapOfferPracticeToKredoPractice(slug: string | null | undefined): string | null {
  if (!slug) return null
  const key = slug.toLowerCase().trim()
  return OFFER_PRACTICE_TO_KREDO_PRACTICE_MAP[key] ?? null
}

// ─── 44 OFFERS CATALOG INDEX (Table offers Supabase) ─────────────────────────

export interface OfferCatalogEntry {
  slug: string
  name: string
  practiceSlug: PracticeSlug
  shortDescription: string
  keywords: string[]
}

export const KREDO_OFFERS_CATALOG: OfferCatalogEntry[] = [
  // --- Data & AI (5 offers)
  {
    slug: 'data-ai-strategy-governance',
    name: 'Data & AI Strategy, Governance & Responsible AI',
    practiceSlug: 'data-ia',
    shortDescription: 'Aligner la stratégie Data/IA sur les priorités métier et sécuriser la gouvernance.',
    keywords: ['data strategy', 'ai strategy', 'governance', 'responsible ai', 'roadmap'],
  },
  {
    slug: 'data-platforms-engineering-dataops',
    name: 'Data Platforms, Engineering & DataOps',
    practiceSlug: 'data-ia',
    shortDescription: 'Concevoir et industrialiser les fondations data fiables qui alimentent analytics et IA.',
    keywords: ['data platform', 'data engineering', 'dataops', 'lakehouse', 'etl', 'elt'],
  },
  {
    slug: 'bi-analytics-decision-intelligence',
    name: 'BI, Analytics & Decision Intelligence',
    practiceSlug: 'data-ia',
    shortDescription: 'Mettre à disposition des indicateurs fiables et des analyses directement actionnables.',
    keywords: ['business intelligence', 'analytics', 'power bi', 'decision intelligence', 'kpi'],
  },
  {
    slug: 'ai-machine-learning-mlops',
    name: 'AI, Machine Learning & MLOps',
    practiceSlug: 'data-ia',
    shortDescription: 'Concevoir, déployer et superviser des modèles prédictifs intégrés aux opérations métier.',
    keywords: ['machine learning', 'predictive analytics', 'mlops', 'computer vision', 'forecasting'],
  },
  {
    slug: 'generative-ai-rag-automation',
    name: 'Generative AI, RAG & Intelligent Automation',
    practiceSlug: 'data-ia',
    shortDescription: 'Créer des assistants et automatisations IA ancrés dans les données de l’entreprise.',
    keywords: ['generative ai', 'rag', 'agents', 'llmops', 'n8n', 'pgvector'],
  },

  // --- Digital & Cloud Engineering (5 offers)
  {
    slug: 'cloud-strategy-assessment-landing-zones',
    name: 'Cloud Strategy, Assessment & Landing Zones',
    practiceSlug: 'digital-cloud',
    shortDescription: 'Définir une trajectoire cloud réaliste et poser des fondations gouvernées.',
    keywords: ['cloud strategy', 'assessment', 'landing zone', 'multicloud', 'governance'],
  },
  {
    slug: 'cloud-migration-application-modernization',
    name: 'Cloud Migration & Application Modernization',
    practiceSlug: 'digital-cloud',
    shortDescription: 'Migrer les workloads et moderniser les applications sans compromettre la continuité.',
    keywords: ['cloud migration', 'modernization', '6r', 'cloud native', 'replatforming'],
  },
  {
    slug: 'platform-engineering-devops-kubernetes',
    name: 'Platform Engineering, DevOps & Kubernetes',
    practiceSlug: 'digital-cloud',
    shortDescription: 'Fournir aux équipes produit une plateforme self-service qui accélère le delivery.',
    keywords: ['platform engineering', 'devops', 'kubernetes', 'terraform', 'ci/cd'],
  },
  {
    slug: 'cloud-operations-sre-observability',
    name: 'Cloud Operations, SRE & Observability',
    practiceSlug: 'digital-cloud',
    shortDescription: 'Exploiter les services cloud avec des objectifs de fiabilité mesurables.',
    keywords: ['sre', 'cloudops', 'observability', 'reliability', 'incident management'],
  },
  {
    slug: 'finops-greenops-cloud-optimization',
    name: 'FinOps, GreenOps & Cloud Optimization',
    practiceSlug: 'digital-cloud',
    shortDescription: 'Maîtriser les dépenses cloud et arbitrer coûts, performance et empreinte.',
    keywords: ['finops', 'greenops', 'cloud cost', 'rightsizing', 'showback'],
  },

  // --- Cybersecurity & SecOps (5 offers)
  {
    slug: 'cyber-strategy-grc-compliance',
    name: 'Cyber Strategy, GRC & Compliance',
    practiceSlug: 'cybersecurity',
    shortDescription: 'Prioriser les risques et construire une trajectoire de cybersécurité défendable.',
    keywords: ['cyber strategy', 'grc', 'iso 27001', 'nis2', 'dora', 'risk'],
  },
  {
    slug: 'iam-pam-zero-trust',
    name: 'IAM, PAM & Zero Trust',
    practiceSlug: 'cybersecurity',
    shortDescription: 'Sécuriser les identités, privilèges et accès dans des environnements hybrides.',
    keywords: ['iam', 'pam', 'zero trust', 'mfa', 'sso', 'identity'],
  },
  {
    slug: 'security-architecture-cloud-security',
    name: 'Security Architecture & Cloud Security',
    practiceSlug: 'cybersecurity',
    shortDescription: 'Intégrer les exigences de sécurité dans les architectures et plateformes dès leur conception.',
    keywords: ['security architecture', 'cloud security', 'threat modeling', 'hardening', 'zero trust'],
  },
  {
    slug: 'application-security-devsecops-offensive-testing',
    name: 'Application Security, DevSecOps & Offensive Testing',
    practiceSlug: 'cybersecurity',
    shortDescription: 'Réduire les vulnérabilités en intégrant la sécurité dans le cycle logiciel et par pentests.',
    keywords: ['appsec', 'devsecops', 'pentest', 'owasp', 'sast', 'dast'],
  },
  {
    slug: 'soc-detection-incident-response',
    name: 'SOC, Detection & Incident Response',
    practiceSlug: 'cybersecurity',
    shortDescription: 'Améliorer la détection, la qualification et la réponse aux menaces.',
    keywords: ['soc', 'siem', 'detection', 'incident response', 'dfir', 'edr'],
  },

  // --- QA & Testing (5 offers)
  {
    slug: 'quality-strategy-test-governance',
    name: 'Quality Strategy & Test Governance',
    practiceSlug: 'qa-testing',
    shortDescription: 'Définir une stratégie qualité proportionnée aux risques et partagée.',
    keywords: ['quality strategy', 'test governance', 'risk based testing', 'qa', 'metrics'],
  },
  {
    slug: 'functional-api-integration-testing',
    name: 'Functional, API & Integration Testing',
    practiceSlug: 'qa-testing',
    shortDescription: 'Sécuriser les parcours métier et les échanges inter-systèmes.',
    keywords: ['functional testing', 'api testing', 'integration testing', 'uat', 'test cases'],
  },
  {
    slug: 'test-automation-continuous-quality',
    name: 'Test Automation & Continuous Quality',
    practiceSlug: 'qa-testing',
    shortDescription: 'Automatiser les contrôles utiles et les intégrer au delivery.',
    keywords: ['test automation', 'playwright', 'cypress', 'selenium', 'continuous testing'],
  },
  {
    slug: 'performance-reliability-resilience-testing',
    name: 'Performance, Reliability & Resilience Testing',
    practiceSlug: 'qa-testing',
    shortDescription: 'Vérifier qu’un système tient la charge, se dégrade correctement et respecte ses SLA.',
    keywords: ['performance testing', 'load testing', 'k6', 'jmeter', 'resilience'],
  },
  {
    slug: 'mobile-accessibility-experience-quality',
    name: 'Mobile, Accessibility & Experience Quality',
    practiceSlug: 'qa-testing',
    shortDescription: 'Garantir la qualité perçue sur les appareils, navigateurs et accessibilité.',
    keywords: ['mobile testing', 'accessibility', 'wcag', 'rgaa', 'cross browser'],
  },

  // --- Agile Product Management & Delivery (5 offers)
  {
    slug: 'project-program-management',
    name: 'Project & Program Management',
    practiceSlug: 'agile-pm',
    shortDescription: 'Piloter les engagements, dépendances et décisions d’un projet numérique complexe.',
    keywords: ['project management', 'program management', 'governance', 'risk', 'delivery'],
  },
  {
    slug: 'pmo-portfolio-transformation-governance',
    name: 'PMO, Portfolio & Transformation Governance',
    practiceSlug: 'agile-pm',
    shortDescription: 'Donner au management une vision fiable des priorités et capacités.',
    keywords: ['pmo', 'portfolio', 'transformation office', 'capacity', 'benefits'],
  },
  {
    slug: 'agile-delivery-scrum-kanban',
    name: 'Agile Delivery, Scrum & Kanban',
    practiceSlug: 'agile-pm',
    shortDescription: 'Améliorer le flux de delivery et la collaboration des équipes.',
    keywords: ['scrum', 'kanban', 'agile delivery', 'flow', 'team coaching'],
  },
  {
    slug: 'agile-at-scale-release-coordination',
    name: 'Agile at Scale & Release Coordination',
    practiceSlug: 'agile-pm',
    shortDescription: 'Coordonner plusieurs équipes et synchroniser les releases.',
    keywords: ['safe', 'release train', 'agile at scale', 'dependencies', 'release management'],
  },
  {
    slug: 'change-management-adoption',
    name: 'Change Management & Adoption',
    practiceSlug: 'agile-pm',
    shortDescription: 'Faire adopter les nouveaux outils, processus et modes de travail.',
    keywords: ['change management', 'adoption', 'training', 'stakeholders', 'communication'],
  },

  // --- UX Research, UI & Digital Product (5 offers)
  {
    slug: 'ux-research-service-design',
    name: 'UX Research & Service Design',
    practiceSlug: 'ux-ui-design',
    shortDescription: 'Comprendre les usages réels et concevoir un service cohérent avant de réaliser.',
    keywords: ['ux research', 'service design', 'customer journey', 'user testing', 'discovery'],
  },
  {
    slug: 'product-design-ui-design-systems',
    name: 'Product Design, UI & Design Systems',
    practiceSlug: 'ux-ui-design',
    shortDescription: 'Concevoir des interfaces cohérentes, accessibles et industrialisables.',
    keywords: ['product design', 'ui', 'design system', 'figma', 'accessibility'],
  },
  {
    slug: 'web-experiences-portals-ecommerce',
    name: 'Web Experiences, Portals & E-commerce',
    practiceSlug: 'ux-ui-design',
    shortDescription: 'Développer des expériences web rapides, accessibles et orientées conversion.',
    keywords: ['web experience', 'frontend', 'ecommerce', 'portal', 'core web vitals'],
  },
  {
    slug: 'mobile-applications-omnichannel-services',
    name: 'Mobile Applications & Omnichannel Services',
    practiceSlug: 'ux-ui-design',
    shortDescription: 'Créer des applications mobiles robustes et des parcours continus.',
    keywords: ['mobile', 'ios', 'android', 'react native', 'flutter', 'omnichannel'],
  },
  {
    slug: 'digital-product-management-optimization',
    name: 'Digital Product Management & Optimization',
    practiceSlug: 'ux-ui-design',
    shortDescription: 'Piloter un produit numérique par la valeur, les usages et l’apprentissage continu.',
    keywords: ['product management', 'product analytics', 'cro', 'roadmap', 'experimentation'],
  },

  // --- Custom Business Applications & Software Architecture (6 offers)
  {
    slug: 'business-analysis-digital-process-design',
    name: 'Business Analysis & Digital Process Design',
    practiceSlug: 'custom-apps',
    shortDescription: 'Transformer un besoin métier diffus en processus cible et exigences claires.',
    keywords: ['business analysis', 'process design', 'requirements', 'bpmn', 'functional design'],
  },
  {
    slug: 'custom-business-applications-b2b-portals',
    name: 'Custom Business Applications & B2B Portals',
    practiceSlug: 'custom-apps',
    shortDescription: 'Construire des applications sur mesure qui soutiennent les opérations.',
    keywords: ['business application', 'b2b portal', 'custom software', 'saas', 'full stack'],
  },
  {
    slug: 'software-architecture-apis-integration',
    name: 'Software Architecture, APIs & Integration',
    practiceSlug: 'custom-apps',
    shortDescription: 'Découpler les systèmes, sécuriser les échanges et construire une architecture durable.',
    keywords: ['software architecture', 'api', 'integration', 'event driven', 'microservices'],
  },
  {
    slug: 'application-modernization-legacy-refactoring',
    name: 'Application Modernization & Legacy Refactoring',
    practiceSlug: 'custom-apps',
    shortDescription: 'Réduire la dette applicative et faire évoluer les logiciels existants.',
    keywords: ['application modernization', 'refactoring', 'legacy application', 'microservices', 'technical debt'],
  },
  {
    slug: 'application-management-productive-tma',
    name: 'Application Management & Productive TMA',
    practiceSlug: 'custom-apps',
    shortDescription: 'Maintenir et faire évoluer les applications avec une logique de service et SLA.',
    keywords: ['tma', 'application management', 'maintenance', 'support', 'sla'],
  },
  {
    slug: 'connected-products-iot-embedded-software',
    name: 'Connected Products, IoT & Embedded Software',
    practiceSlug: 'custom-apps',
    shortDescription: 'Concevoir les logiciels embarqués et services d’intégration des produits connectés.',
    keywords: ['embedded', 'firmware', 'iot', 'rtos', 'nfc', 'connected product'],
  },

  // --- Legacy Modernization, Mainframe & MCO (5 offers)
  {
    slug: 'legacy-estate-assessment-risk-reduction',
    name: 'Legacy Estate Assessment & Risk Reduction',
    practiceSlug: 'legacy-mainframe',
    shortDescription: 'Rendre visibles les risques techniques, opérationnels et humains du legacy.',
    keywords: ['legacy assessment', 'obsolescence', 'risk', 'mainframe', 'knowledge'],
  },
  {
    slug: 'mainframe-application-maintenance-evolution',
    name: 'Mainframe Application Maintenance & Evolution',
    practiceSlug: 'legacy-mainframe',
    shortDescription: 'Maintenir et faire évoluer les applications mainframe critiques en COBOL/CICS.',
    keywords: ['cobol', 'mainframe application', 'cics', 'db2', 'maintenance'],
  },
  {
    slug: 'legacy-infrastructure-mco-expert-operations',
    name: 'Legacy Infrastructure MCO & Expert Operations',
    practiceSlug: 'legacy-mainframe',
    shortDescription: 'Garantir le MCO des plateformes historiques (z/OS, Unix, AIX, Solaris).',
    keywords: ['legacy infrastructure', 'mco', 'zos', 'aix', 'solaris', 'operations'],
  },
  {
    slug: 'legacy-performance-reliability-major-incidents',
    name: 'Performance, Reliability & Major Incident Management',
    practiceSlug: 'legacy-mainframe',
    shortDescription: 'Stabiliser les systèmes historiques critiques et réduire les incidents majeurs.',
    keywords: ['major incident', 'problem management', 'capacity', 'performance', 'batch'],
  },
  {
    slug: 'legacy-modernization-knowledge-transfer',
    name: 'Legacy Modernization & Knowledge Transfer',
    practiceSlug: 'legacy-mainframe',
    shortDescription: 'Moderniser progressivement le legacy tout en sécurisant la connaissance.',
    keywords: ['legacy modernization', 'rehost', 'replatform', 'knowledge transfer', 'api enablement'],
  },
]

const OFFERS_BY_SLUG = new Map(KREDO_OFFERS_CATALOG.map((o) => [o.slug, o]))

export function getOfferBySlug(slug: string): OfferCatalogEntry | undefined {
  if (!slug) return undefined
  return OFFERS_BY_SLUG.get(slug.toLowerCase().trim())
}

export function getOffersByPractice(practiceSlug: string): OfferCatalogEntry[] {
  if (!practiceSlug) return []
  const ps = mapKredoPracticeToOfferPractice(practiceSlug) ?? (practiceSlug as PracticeSlug)
  return KREDO_OFFERS_CATALOG.filter((o) => o.practiceSlug === ps)
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
