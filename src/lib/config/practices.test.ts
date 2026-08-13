import { describe, expect, it } from 'vitest'
import {
  KREDO_OFFERS_CATALOG,
  KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP,
  OFFER_PRACTICE_SLUGS,
  OFFER_PRACTICE_TO_PRACTICE_SLUG,
  PRACTICES,
  PRACTICE_SLUG_TO_OFFER_PRACTICE,
  getOfferBySlug,
  getOffersByPractice,
  isOfferPracticeSlug,
  mapKredoPracticeToOfferPractice,
  mapOfferPracticeToKredoPractice,
} from './practices'

// Référence relevée live dans Supabase le 2026-08-13 :
//   select p.slug, count(o.id) from offer_practices p
//   left join offers o on o.practice_id = p.id group by 1 order by 1;
// C'est la table `offer_practices` qui fait autorité, pas le vocabulaire front.
// Ces tests échouent si le code redérive un slug qui ne joint rien en base — c'est
// exactement le défaut que la première version de l'action A6 avait introduit.
const OFFER_PRACTICES_EN_BASE: Record<string, number> = {
  'cloud-engineering': 5,
  cybersecurity: 5,
  'data-ai': 5,
  'digital-business-solutions': 6,
  'digital-experience': 5,
  'legacy-systems-mainframe': 5,
  'project-agile-delivery': 5,
  'quality-engineering-testing': 5,
}

describe('vocabulaire des practices — base vs front', () => {
  it('OFFER_PRACTICE_SLUGS est exactement offer_practices.slug en base', () => {
    expect([...OFFER_PRACTICE_SLUGS].sort()).toEqual(Object.keys(OFFER_PRACTICES_EN_BASE).sort())
  })

  it('le pont front → base couvre les 8 practices front et ne vise que des slugs base', () => {
    expect(Object.keys(PRACTICE_SLUG_TO_OFFER_PRACTICE).sort()).toEqual(
      PRACTICES.map((p) => p.slug).sort(),
    )
    for (const base of Object.values(PRACTICE_SLUG_TO_OFFER_PRACTICE)) {
      expect(OFFER_PRACTICES_EN_BASE).toHaveProperty(base)
    }
  })

  it('le pont est bijectif — aucune practice base ne reçoit deux practices front', () => {
    const cibles = Object.values(PRACTICE_SLUG_TO_OFFER_PRACTICE)
    expect(new Set(cibles).size).toBe(cibles.length)
    expect(Object.keys(OFFER_PRACTICE_TO_PRACTICE_SLUG).sort()).toEqual(
      Object.keys(OFFER_PRACTICES_EN_BASE).sort(),
    )
  })

  it('`cybersecurity` est le seul slug commun aux deux vocabulaires', () => {
    const communs = PRACTICES.map((p) => p.slug).filter((s) => isOfferPracticeSlug(s))
    expect(communs).toEqual(['cybersecurity'])
  })
})

describe('catalogue des offres', () => {
  it('indexe les 41 offres et les répartit comme la base', () => {
    expect(KREDO_OFFERS_CATALOG.length).toBe(41)
    const parPractice: Record<string, number> = {}
    for (const offre of KREDO_OFFERS_CATALOG) {
      parPractice[offre.offerPracticeSlug] = (parPractice[offre.offerPracticeSlug] ?? 0) + 1
    }
    expect(parPractice).toEqual(OFFER_PRACTICES_EN_BASE)
  })

  it('rattache chaque offre à un slug base existant, et à aucun slug front', () => {
    for (const offre of KREDO_OFFERS_CATALOG) {
      expect(isOfferPracticeSlug(offre.offerPracticeSlug)).toBe(true)
    }
  })

  it('n’a aucun slug d’offre en double', () => {
    const slugs = KREDO_OFFERS_CATALOG.map((o) => o.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('résout une offre par son slug exact', () => {
    expect(getOfferBySlug('generative-ai-rag-automation')).toMatchObject({
      name: 'Generative AI, RAG & Intelligent Automation',
      offerPracticeSlug: 'data-ai',
    })
    expect(getOfferBySlug('custom-business-applications-b2b-portals')).toMatchObject({
      offerPracticeSlug: 'digital-business-solutions',
    })
    expect(getOfferBySlug('inconnue')).toBeUndefined()
  })

  it('récupère les offres d’une practice par son slug base, front ou kredo_practice', () => {
    expect(getOffersByPractice('data-ai')).toHaveLength(5)
    expect(getOffersByPractice('digital-business-solutions')).toHaveLength(6)
    // tolérance d'entrée : un slug front ou une kredo_practice sont traduits
    expect(getOffersByPractice('data-ia')).toHaveLength(5)
    expect(getOffersByPractice('data_ai')).toHaveLength(5)
    expect(getOffersByPractice('multi')).toHaveLength(0)
    expect(getOffersByPractice('inconnue')).toHaveLength(0)
  })
})

describe('mappers kredo_practice ↔ offer_practices.slug', () => {
  it('mappe chaque kredo_practice vers un slug qui existe en base', () => {
    expect(mapKredoPracticeToOfferPractice('data_ai')).toBe('data-ai')
    expect(mapKredoPracticeToOfferPractice('cloud_eng')).toBe('cloud-engineering')
    expect(mapKredoPracticeToOfferPractice('cyber')).toBe('cybersecurity')
    expect(mapKredoPracticeToOfferPractice('product')).toBe('project-agile-delivery')
    expect(mapKredoPracticeToOfferPractice('testing')).toBe('quality-engineering-testing')
    expect(mapKredoPracticeToOfferPractice('apps')).toBe('digital-business-solutions')
    expect(mapKredoPracticeToOfferPractice('design')).toBe('digital-experience')
    expect(mapKredoPracticeToOfferPractice('legacy')).toBe('legacy-systems-mainframe')
    expect(mapKredoPracticeToOfferPractice('multi')).toBeNull()

    for (const cible of Object.values(KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP)) {
      if (cible !== null) expect(OFFER_PRACTICES_EN_BASE).toHaveProperty(cible)
    }
  })

  it('accepte un slug déjà correct et traduit un slug front', () => {
    expect(mapKredoPracticeToOfferPractice('cloud-engineering')).toBe('cloud-engineering')
    expect(mapKredoPracticeToOfferPractice('digital-cloud')).toBe('cloud-engineering')
    expect(mapKredoPracticeToOfferPractice('  DATA_AI  ')).toBe('data-ai')
    expect(mapKredoPracticeToOfferPractice('inconnue')).toBeNull()
    expect(mapKredoPracticeToOfferPractice(null)).toBeNull()
    expect(mapKredoPracticeToOfferPractice(undefined)).toBeNull()
  })

  it('fait l’aller-retour sans perte sur les 8 kredo_practice mappées', () => {
    for (const [kredo, base] of Object.entries(KREDO_PRACTICE_TO_OFFER_PRACTICE_MAP)) {
      if (base === null) continue
      expect(mapOfferPracticeToKredoPractice(base)).toBe(kredo)
    }
  })

  it('remonte une kredo_practice depuis un slug base ou front', () => {
    expect(mapOfferPracticeToKredoPractice('quality-engineering-testing')).toBe('testing')
    expect(mapOfferPracticeToKredoPractice('qa-testing')).toBe('testing')
    expect(mapOfferPracticeToKredoPractice('inconnue')).toBeNull()
    expect(mapOfferPracticeToKredoPractice(null)).toBeNull()
  })
})
