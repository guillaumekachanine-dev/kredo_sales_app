import { describe, expect, it } from 'vitest'
import {
  KREDO_OFFERS_CATALOG,
  PRACTICES,
  getOfferBySlug,
  getOffersByPractice,
  mapKredoPracticeToOfferPractice,
  mapOfferPracticeToKredoPractice,
} from './practices'

describe('practice and offer catalog mapping (Action A6)', () => {
  it('contient les 8 practices KREDO', () => {
    expect(PRACTICES.length).toBe(8)
    const slugs = PRACTICES.map((p) => p.slug)
    expect(slugs).toEqual([
      'data-ia',
      'digital-cloud',
      'agile-pm',
      'cybersecurity',
      'qa-testing',
      'custom-apps',
      'ux-ui-design',
      'legacy-mainframe',
    ])
  })

  it('indexe l’intégralité des 41 offres du catalogue', () => {
    expect(KREDO_OFFERS_CATALOG.length).toBe(41)
  })

  it('résout chaque offre par son slug exact', () => {
    const generativeAi = getOfferBySlug('generative-ai-rag-automation')
    expect(generativeAi).toBeDefined()
    expect(generativeAi?.name).toBe('Generative AI, RAG & Intelligent Automation')
    expect(generativeAi?.practiceSlug).toBe('data-ia')

    const socDetection = getOfferBySlug('soc-detection-incident-response')
    expect(socDetection).toBeDefined()
    expect(socDetection?.name).toBe('SOC, Detection & Incident Response')
    expect(socDetection?.practiceSlug).toBe('cybersecurity')
  })

  it('récupère toutes les offres d’une practice', () => {
    const dataOffers = getOffersByPractice('data-ia')
    expect(dataOffers.length).toBe(5)

    const customAppOffers = getOffersByPractice('custom-apps')
    expect(customAppOffers.length).toBe(6)

    const legacyOffers = getOffersByPractice('legacy-mainframe')
    expect(legacyOffers.length).toBe(5)
  })

  it('mappe kredo_practice vers offer_practices.slug', () => {
    expect(mapKredoPracticeToOfferPractice('data_ai')).toBe('data-ia')
    expect(mapKredoPracticeToOfferPractice('cloud_eng')).toBe('digital-cloud')
    expect(mapKredoPracticeToOfferPractice('cyber')).toBe('cybersecurity')
    expect(mapKredoPracticeToOfferPractice('product')).toBe('agile-pm')
    expect(mapKredoPracticeToOfferPractice('testing')).toBe('qa-testing')
    expect(mapKredoPracticeToOfferPractice('apps')).toBe('custom-apps')
    expect(mapKredoPracticeToOfferPractice('design')).toBe('ux-ui-design')
    expect(mapKredoPracticeToOfferPractice('legacy')).toBe('legacy-mainframe')
    expect(mapKredoPracticeToOfferPractice('multi')).toBeNull()
  })

  it('mappe offer_practices.slug vers kredo_practice', () => {
    expect(mapOfferPracticeToKredoPractice('data-ia')).toBe('data_ai')
    expect(mapOfferPracticeToKredoPractice('digital-cloud')).toBe('cloud_eng')
    expect(mapOfferPracticeToKredoPractice('cybersecurity')).toBe('cyber')
    expect(mapOfferPracticeToKredoPractice('agile-pm')).toBe('product')
    expect(mapOfferPracticeToKredoPractice('qa-testing')).toBe('testing')
    expect(mapOfferPracticeToKredoPractice('custom-apps')).toBe('apps')
    expect(mapOfferPracticeToKredoPractice('ux-ui-design')).toBe('design')
    expect(mapOfferPracticeToKredoPractice('legacy-mainframe')).toBe('legacy')
  })
})
