// ─── Practice color system ─────────────────────────────────────────────────────
// Source de vérité côté front. Les color_hex sont également stockés dans
// offer_practices.color_hex (Supabase) — les deux doivent rester synchronisés.
// Le gradient AI/Data ne peut pas vivre en DB (colonne hex unique) : seule
// la couleur représentative (#818CF8) y est stockée.

export type PracticeSlug =
  | 'data-ia'
  | 'digital-cloud'
  | 'agile-pm'
  | 'cybersecurity'
  | 'qa-testing'

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
    // Arc-en-ciel subtil : bleu → violet → rose → orange → vert, 72 % opacité
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.72) 0%, rgba(129,140,248,0.72) 28%, rgba(192,132,252,0.72) 52%, rgba(244,114,182,0.72) 76%, rgba(52,211,153,0.72) 100%)',
  },
  {
    slug: 'digital-cloud',
    name: 'Digital & Cloud Engineering',
    shortName: 'Digital & Cloud',
    color: '#10B981', // Vert émeraude
  },
  {
    slug: 'agile-pm',
    name: 'Agile Product Management',
    shortName: 'Agile PM',
    color: '#D97706', // Jaune doré (amber-600)
  },
  {
    slug: 'cybersecurity',
    name: 'Cybersecurity & SecOps',
    shortName: 'Cyber & SecOps',
    color: '#C41E3A', // Rouge carmin
  },
  {
    slug: 'qa-testing',
    name: 'QA & Testing',
    shortName: 'QA & Testing',
    color: '#0891B2', // Cyan-teal — clarté, précision
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
  data_ai: "data-ia",
  cloud_eng: "digital-cloud",
  cyber: "cybersecurity",
  product: "agile-pm",
  multi: null,
}

export const OFFER_PRACTICE_TO_KREDO_PRACTICE_MAP: Record<string, string> = {
  "data-ia": "data_ai",
  "data-ai": "data_ai",
  "digital-cloud": "cloud_eng",
  "cloud-engineering": "cloud_eng",
  cloud_eng: "cloud_eng",
  cybersecurity: "cyber",
  cyber: "cyber",
  "agile-pm": "product",
  product: "product",
  "qa-testing": "multi",
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
    keywords: ['agile', 'product', 'pm', 'owner', 'scrum', 'management', 'apm'],
    slug: 'agile-pm',
  },
  {
    keywords: ['cyber', 'security', 'secops', 'securite', 'securité', 'soc', 'pentest'],
    slug: 'cybersecurity',
  },
  {
    keywords: ['qa', 'test', 'testing', 'quality', 'qualite', 'qualité', 'assurance'],
    slug: 'qa-testing',
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

/**
 * Retourne les styles inline pour un badge practice.
 * Pour Data/IA : gradient en background, texte sombre.
 * Pour les autres : fond très léger teinté + texte en couleur practice.
 */
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
