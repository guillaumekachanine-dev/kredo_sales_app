import { describe, expect, it } from 'vitest'
import {
  buildSearchEnvelope,
  departementFromPostalCode,
  extractDepartements,
  nafDivision,
} from '../domain/build-search-envelope'
import { classifyOffer, isInformationSystemsOffer, normalizeText } from '../domain/classify-offer'
import {
  DEFAULT_HIRING_SIGNAL_THRESHOLD,
  computeHiringIntensity,
  describeIntensity,
} from '../domain/compute-hiring-intensity'
import { matchEmployer } from '../domain/match-employer'
import type { NormalizedJobOffer } from '../domain/hiring-intensity.types'

const offer = (o: Partial<NormalizedJobOffer> & { id: string }): NormalizedJobOffer => ({
  intitule: '',
  ...o,
})

describe('normalisation', () => {
  it('retire accents et ponctuation', () => {
    expect(normalizeText('Ingénieur Sécurité — SI, Défense')).toBe('ingenieur securite si defense')
  })

  it('conserve les caractères techniques discriminants', () => {
    expect(normalizeText('Développeur C++ / .NET')).toBe('developpeur c++ / .net')
  })

  it('tolère null et undefined', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText(undefined)).toBe('')
  })
})

describe('classification par practice (vocabulaire base)', () => {
  it('classe sur les slugs offer_practices, jamais sur les slugs front', () => {
    expect(classifyOffer(offer({ id: '1', intitule: 'Data Engineer' })).practice).toBe('data-ai')
    expect(classifyOffer(offer({ id: '2', intitule: 'Ingénieur Cloud AWS' })).practice).toBe(
      'cloud-engineering',
    )
    expect(classifyOffer(offer({ id: '3', intitule: 'Analyste SOC' })).practice).toBe('cybersecurity')
    expect(classifyOffer(offer({ id: '4', intitule: 'Développeur COBOL' })).practice).toBe(
      'legacy-systems-mainframe',
    )
  })

  it('privilégie le terme présent dans l’intitulé sur celui noyé dans la description', () => {
    const result = classifyOffer(
      offer({
        id: '5',
        intitule: 'Data Scientist',
        description: 'Environnement cloud AWS, Kubernetes, Docker, Terraform, CI/CD.',
      }),
    )
    expect(result.practice).toBe('data-ai')
  })

  it('expose les termes qui ont produit la décision', () => {
    const result = classifyOffer(offer({ id: '6', intitule: 'Ingénieur DevOps Kubernetes' }))
    expect(result.practice).toBe('cloud-engineering')
    expect(result.matchedTerms).toContain('devops')
    expect(result.matchedTerms).toContain('kubernetes')
  })

  it('ne range pas par défaut une offre hors SI', () => {
    const result = classifyOffer(offer({ id: '7', intitule: 'Chaudronnier aéronautique' }))
    expect(result.practice).toBeNull()
    expect(isInformationSystemsOffer(offer({ id: '7', intitule: 'Chaudronnier aéronautique' }))).toBe(
      false,
    )
  })

  // Régression : intitulés réels renvoyés par l'API le 2026-08-13 sur l'enveloppe
  // NAF 30 / dép. 31. La première version, qui appariait en sous-chaîne, les classait
  // en cybersecurity et digital-experience — « mission » contient « ssi », « société »
  // contient « soc », « flux » contient « ux ».
  it('n’attrape pas un terme court en sous-chaîne d’un mot français', () => {
    const cas = [
      'Technicien Procédés Micro électronique-F/H',
      'Technicien Méthode Microélectronique DMS -F/H',
      'Technicien production érosion- secteur spatial F/H',
      'Câbleur/Câbleuse en faisceaux électriques (H/F)',
      'Mécanicien Piste A320/A330 A350 -CDI AIRBUS (H/F)',
    ]
    for (const intitule of cas) {
      expect(classifyOffer(offer({ id: intitule, intitule })).practice).toBeNull()
    }
  })

  it('ne déclenche pas cybersecurity sur une prose contenant « mission » ou « société »', () => {
    const result = classifyOffer(
      offer({
        id: 'prose',
        intitule: 'Technicien de production',
        description:
          'Au sein de notre société, votre mission principale consiste à assurer la transmission des pièces.',
      }),
    )
    expect(result.practice).toBeNull()
  })

  it('reconnaît toujours les sigles quand ils sont des mots entiers', () => {
    expect(classifyOffer(offer({ id: 's1', intitule: 'Analyste SOC / SIEM' })).practice).toBe(
      'cybersecurity',
    )
    expect(classifyOffer(offer({ id: 's2', intitule: 'Responsable SSI' })).practice).toBe(
      'cybersecurity',
    )
    expect(classifyOffer(offer({ id: 's3', intitule: 'Designer UX' })).practice).toBe(
      'digital-experience',
    )
  })

  it('couvre les variantes par préfixe', () => {
    expect(classifyOffer(offer({ id: 'p1', intitule: 'Ingénieur cryptographie' })).practice).toBe(
      'cybersecurity',
    )
    expect(classifyOffer(offer({ id: 'p2', intitule: 'Expert cybersécurité' })).practice).toBe(
      'cybersecurity',
    )
    expect(classifyOffer(offer({ id: 'p3', intitule: 'Développeuse Java' })).practice).toBe(
      'digital-business-solutions',
    )
  })

  it('retient une offre codée SI au ROME même sans terme reconnu', () => {
    const o = offer({ id: '8', intitule: 'Ingénieur études', romeCode: 'M1805' })
    expect(classifyOffer(o).practice).toBeNull()
    expect(isInformationSystemsOffer(o)).toBe(true)
  })
})

describe('appariement employeur', () => {
  const thalesAlenia = ['THALES ALENIA SPACE FRANCE', 'Thalès Alénia Space']
  const thalesSix = ['THALES SIX GTS FRANCE SAS', 'Thales - systèmes défense, cyber et critiques']

  it('apparie à l’identique malgré accents et forme juridique', () => {
    expect(matchEmployer('Thalès Alénia Space France', thalesAlenia).level).toBe('exact')
  })

  it('apparie sur tous les tokens d’un alias multi-mots', () => {
    const m = matchEmployer('THALES ALENIA SPACE FRANCE SAS', thalesAlenia)
    expect(m.level).toBe('strong')
    expect(m.via).toBeTruthy()
  })

  it('REFUSE d’attribuer « Thales » seul à l’un des deux comptes Thales', () => {
    expect(matchEmployer('THALES', thalesAlenia).level).toBe('none')
    expect(matchEmployer('THALES', thalesSix).level).toBe('none')
  })

  it('ne confond pas les deux entités Thales entre elles', () => {
    expect(matchEmployer('THALES SIX GTS FRANCE SAS', thalesAlenia).level).toBe('none')
    expect(matchEmployer('THALES ALENIA SPACE FRANCE', thalesSix).level).toBe('none')
  })

  it('rend « none » sur un employeur anonymisé', () => {
    expect(matchEmployer(null, thalesAlenia).level).toBe('none')
    expect(matchEmployer('', thalesAlenia).level).toBe('none')
  })
})

describe('enveloppe de requête', () => {
  it('réduit le NAF à sa division', () => {
    expect(nafDivision('3030Z')).toBe('30')
    expect(nafDivision('61.30Z')).toBe('61')
    expect(nafDivision(null)).toBeNull()
  })

  it('déduit les départements des codes postaux', () => {
    expect(departementFromPostalCode('31100')).toBe('31')
    expect(departementFromPostalCode('75008')).toBe('75')
    expect(departementFromPostalCode('97400')).toBe('974')
    expect(departementFromPostalCode('abc')).toBeNull()
  })

  it('rend « 20 » pour la Corse plutôt que d’inventer 2A ou 2B', () => {
    expect(departementFromPostalCode('20000')).toBe('20')
  })

  it('extrait et déduplique les départements des adresses d’établissement', () => {
    expect(
      extractDepartements([
        '26 AVENUE JEAN-FRANCOIS CHAMPOLLION 31100 TOULOUSE',
        '5 RUE PAULIN TALABOT 31100 TOULOUSE',
        '4 AVENUE DES LOUVRESSES 92230 GENNEVILLIERS',
      ]),
    ).toEqual(['31', '92'])
  })

  it('éclate un nom de compte agrégeant deux entités', () => {
    const env = buildSearchEnvelope({
      legalName: 'ARIANEGROUP SAS',
      accountName: 'ArianeGroup / Arianespace',
      nafCode: '3030Z',
      establishmentAddresses: ['51-61 51 ROUTE DE VERNEUIL 78130 LES MUREAUX'],
    })
    expect(env.nafDivision).toBe('30')
    expect(env.departements).toEqual(['78'])
    expect(env.employerAliases).toContain('ARIANEGROUP SAS')
    expect(env.employerAliases.some((a) => a.trim() === 'Arianespace')).toBe(true)
  })
})

describe('agrégation de l’intensité', () => {
  const aliases = ['THALES ALENIA SPACE FRANCE']
  const base = { companyId: 'c-1', employerAliases: aliases, measuredAt: '2026-08-13' }

  it('compte, ventile et déclenche le signal au seuil', () => {
    const { intensity } = computeHiringIntensity({
      ...base,
      offers: [
        offer({ id: 'a', intitule: 'Data Engineer', employerName: 'THALES ALENIA SPACE FRANCE' }),
        offer({ id: 'b', intitule: 'Data Scientist', employerName: 'THALES ALENIA SPACE FRANCE' }),
        offer({ id: 'c', intitule: 'Analyste SOC', employerName: 'THALES ALENIA SPACE FRANCE' }),
      ],
    })
    expect(intensity.offersMatched).toBe(3)
    expect(intensity.byPractice).toEqual({ 'data-ai': 2, cybersecurity: 1 })
    expect(intensity.threshold).toBe(DEFAULT_HIRING_SIGNAL_THRESHOLD)
    expect(intensity.emitsSignal).toBe(true)
  })

  it('n’émet pas de signal sous le seuil', () => {
    const { intensity } = computeHiringIntensity({
      ...base,
      offers: [
        offer({ id: 'a', intitule: 'Data Engineer', employerName: 'THALES ALENIA SPACE FRANCE' }),
      ],
    })
    expect(intensity.emitsSignal).toBe(false)
  })

  it('déduplique les offres revenant sur plusieurs pages', () => {
    const dup = offer({
      id: 'a',
      intitule: 'Data Engineer',
      employerName: 'THALES ALENIA SPACE FRANCE',
    })
    const { intensity } = computeHiringIntensity({ ...base, offers: [dup, dup, dup] })
    expect(intensity.offersMatched).toBe(1)
  })

  it('sépare anonymes et autres employeurs, et en tire la couverture', () => {
    const { intensity } = computeHiringIntensity({
      ...base,
      offers: [
        offer({ id: 'a', intitule: 'Data Engineer', employerName: 'THALES ALENIA SPACE FRANCE' }),
        offer({ id: 'b', intitule: 'Ingénieur Cloud', employerName: 'AIRBUS DEFENCE AND SPACE SAS' }),
        offer({ id: 'c', intitule: 'Développeur Java', employerName: null }),
        offer({ id: 'd', intitule: 'Analyste SOC', employerName: '' }),
      ],
    })
    expect(intensity.offersMatched).toBe(1)
    expect(intensity.offersOtherEmployer).toBe(1)
    expect(intensity.offersAnonymous).toBe(2)
    // 2 attribuables sur 4 offres SI
    expect(intensity.recall).toBe(0.5)
  })

  it('ignore les offres hors SI dans le dénominateur', () => {
    const { intensity } = computeHiringIntensity({
      ...base,
      offers: [
        offer({ id: 'a', intitule: 'Data Engineer', employerName: 'THALES ALENIA SPACE FRANCE' }),
        offer({ id: 'z', intitule: 'Chaudronnier', employerName: null }),
      ],
    })
    expect(intensity.offersAnonymous).toBe(0)
    expect(intensity.recall).toBe(1)
  })

  it('rend une couverture nulle sur une enveloppe vide, sans division par zéro', () => {
    const { intensity } = computeHiringIntensity({ ...base, offers: [] })
    expect(intensity.recall).toBe(0)
    expect(intensity.emitsSignal).toBe(false)
  })

  it('énonce toujours la couverture dans le résumé', () => {
    const { intensity } = computeHiringIntensity({
      ...base,
      offers: [
        offer({ id: 'a', intitule: 'Data Engineer', employerName: 'THALES ALENIA SPACE FRANCE' }),
        offer({ id: 'c', intitule: 'Développeur Java', employerName: null }),
      ],
    })
    const texte = describeIntensity(intensity)
    expect(texte).toContain('Couverture de la mesure')
    expect(texte).toContain('anonymis')
  })

  it('dit explicitement qu’aucune offre n’est attribuée plutôt que de rendre zéro nu', () => {
    const { intensity } = computeHiringIntensity({
      ...base,
      offers: [offer({ id: 'c', intitule: 'Data Engineer', employerName: null })],
    })
    expect(describeIntensity(intensity)).toContain('Aucune offre SI attribuée')
  })
})
