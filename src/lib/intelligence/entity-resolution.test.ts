import { describe, expect, it } from "vitest"

import {
  AUDIT_CANDIDATE_LIMIT,
  NAME_GATE_MIN,
  REGISTRY_SEARCH_PER_PAGE,
  RESOLVED_MIN_NAME_SCORE,
  RESOLVED_MIN_SCORE,
  buildRegistrySearchQueries,
  employeeTrancheMidpoint,
  nameCore,
  nameVariants,
  normalizeRegistryResult,
  normalizeSiren,
  parseLocation,
  resolveEntity,
  scoreNamePair,
  toResolutionSnapshot,
  verifyKnownSiren,
  type AccountIdentityInput,
  type RegistryCandidate,
} from "./entity-resolution"

// ─── Fixtures ───────────────────────────────────────────────────────────────
// Toutes relevées sur `recherche-entreprises.api.gouv.fr` le 2026-09-07, et toutes
// tirées du portefeuille réel : ce sont les cas qui ont cassé, pas des cas d'école.

function candidate(overrides: Partial<RegistryCandidate> & { siren: string }): RegistryCandidate {
  return {
    legalName: null,
    alternateNames: [],
    nafCode: null,
    nafSection: null,
    hqCommune: null,
    hqPostalCode: null,
    hqDepartment: null,
    hqAddress: null,
    employeeTrancheCode: null,
    companyCategory: null,
    createdOn: null,
    administrativeState: "A",
    establishmentCount: null,
    revenueEur: null,
    revenueYear: null,
    ...overrides,
  }
}

function account(overrides: Partial<AccountIdentityInput>): AccountIdentityInput {
  return {
    name: null,
    legalName: null,
    hqLocation: null,
    sector: null,
    segment: null,
    employeeCount: null,
    knownSiren: null,
    knownNafCode: null,
    ...overrides,
  }
}

/** Les trois entités que la recherche « Tournaire » ramène réellement. */
const TOURNAIRE_LYON = candidate({
  siren: "505063438",
  legalName: "TOURNAIRE",
  alternateNames: ["TOURNAIRE"],
  nafCode: "43.99C",
  nafSection: "F",
  hqCommune: "LYON",
  hqPostalCode: "69006",
  hqDepartment: "69",
  hqAddress: "8 RUE PROFESSEUR WEILL 69006 LYON",
  employeeTrancheCode: "NN",
  companyCategory: "PME",
  createdOn: "2008-07-15",
})

const TOURNAIRE_SA = candidate({
  siren: "415550110",
  legalName: "TOURNAIRE SA",
  alternateNames: ["TOURNAIRE SA"],
  nafCode: "25.92Z",
  nafSection: "C",
  hqCommune: "GRASSE",
  hqPostalCode: "06130",
  hqDepartment: "06",
  hqAddress: "6 BOULEVARD DE L OBSERVATOIRE 06130 GRASSE",
  employeeTrancheCode: "32",
  companyCategory: "ETI",
  createdOn: "1955-01-01",
  revenueEur: 74020031,
  revenueYear: "2023",
})

const TOURNAIRE_HOLDING = candidate({
  siren: "914494778",
  legalName: "TOURNAIRE GROUP HOLDING",
  alternateNames: ["TOURNAIRE GROUP HOLDING"],
  nafCode: "70.10Z",
  nafSection: "M",
  hqCommune: "GRASSE",
  hqPostalCode: "06130",
  hqDepartment: "06",
  employeeTrancheCode: "02",
  companyCategory: "PME",
  createdOn: "2022-06-01",
})

const TOURNAIRE_ACCOUNT = account({
  name: "Tournaire",
  legalName: "Groupe Tournaire (Tournaire SA)",
  hqLocation: "Grasse",
  sector: "Industrie manufacturière, électronique & équipements",
  segment: "Emballages industriels",
  employeeCount: 70,
})

describe("entity-resolution — la régression Tournaire du 2026-09-04", () => {
  it("retient l'entité de Grasse et jamais celle de Lyon", () => {
    const resolution = resolveEntity(TOURNAIRE_ACCOUNT, [
      TOURNAIRE_LYON,
      TOURNAIRE_HOLDING,
      TOURNAIRE_SA,
    ])

    expect(resolution.decision).toBe("resolved")
    expect(resolution.chosen?.siren).toBe("415550110")
    expect(resolution.chosen?.siren).not.toBe("505063438")
    expect(resolution.canProposeCanonicalWrites).toBe(true)
  })

  it("classe l'entité lyonnaise derrière, avec la raison explicite", () => {
    const resolution = resolveEntity(TOURNAIRE_ACCOUNT, [
      TOURNAIRE_LYON,
      TOURNAIRE_HOLDING,
      TOURNAIRE_SA,
    ])
    const lyon = resolution.candidates.find((c) => c.candidate.siren === "505063438")
    const grasse = resolution.candidates.find((c) => c.candidate.siren === "415550110")

    expect(grasse!.score).toBeGreaterThan(lyon!.score)
    expect(lyon!.signals.find((s) => s.key === "activity_section")?.value).toBe(-1)
  })

  it("ne propose rien du tout si la seule entité trouvée est la mauvaise", () => {
    const resolution = resolveEntity(TOURNAIRE_ACCOUNT, [TOURNAIRE_LYON])

    // Géographie divergente ET section NAF inattendue : le candidat tombe sous le
    // seuil de candidature. Aucune entité n'est proposée, pas même à l'arbitrage.
    expect(resolution.decision).toBe("unresolved")
    expect(resolution.chosen).toBeNull()
    expect(resolution.canProposeCanonicalWrites).toBe(false)
  })

  it("aurait été neutralisée par le seul plafond de résultats : la bonne entité était en 5ᵉ position", () => {
    expect(REGISTRY_SEARCH_PER_PAGE).toBeGreaterThanOrEqual(10)
  })
})

describe("entity-resolution — invariant : le nom ne résout jamais seul", () => {
  it("le seuil de publication dépasse le poids maximal du nom", () => {
    // `WEIGHTS.name` vaut 3 : structurellement, un nom parfait plafonne sous le seuil.
    const nameOnly = resolveEntity(
      account({ name: "D-Orbit" }),
      [candidate({ siren: "400276754", legalName: "ORBIT", nafCode: "56.10C", nafSection: "I", hqCommune: "PARIS", hqPostalCode: "75015", hqDepartment: "75" })],
    )

    expect(RESOLVED_MIN_SCORE).toBeGreaterThan(3)
    expect(nameOnly.decision).toBe("needs_human_confirmation")
    expect(nameOnly.reasons.join(" ")).toContain("confirmation indépendante")
  })

  it("écarte un candidat dont le nom n'a rien à voir (MMV vs DEPIL TECH)", () => {
    const resolution = resolveEntity(
      account({ name: "MMV", sector: "Tourisme, Hôtellerie & Loisirs" }),
      [candidate({ siren: "529850455", legalName: "DEPIL TECH", nafCode: "96.02B", nafSection: "S", hqCommune: "NICE", hqPostalCode: "06200", hqDepartment: "06" })],
    )

    expect(resolution.decision).toBe("unresolved")
    expect(resolution.chosen).toBeNull()
    expect(resolution.candidates).toHaveLength(0)
  })
})

describe("entity-resolution — les cas qui doivent appeler un humain", () => {
  it("Ciffréo Bona : commune du CRM (Carros) différente de celle du registre (Cannes)", () => {
    const resolution = resolveEntity(
      account({
        name: "Ciffreo Bona",
        legalName: "Établissements Ciffréo et Bona (Ciffréo Bona)",
        hqLocation: "Carros",
        sector: "BTP, Construction & Immobilier",
        employeeCount: 1300,
      }),
      [candidate({ siren: "487652257", legalName: "CIFFREO BONA", nafCode: "46.73A", nafSection: "G", hqCommune: "CANNES", hqPostalCode: "06150", hqDepartment: "06" })],
    )

    expect(resolution.decision).toBe("needs_human_confirmation")
    expect(resolution.chosen?.siren).toBe("487652257")
    expect(resolution.canProposeCanonicalWrites).toBe(false)
  })

  it("Banque Populaire Méditerranée : le CRM dit Puteaux, le registre dit Nice", () => {
    const resolution = resolveEntity(
      account({
        name: "Banque Populaire Mediterranée",
        legalName: "Banque Populaire Méditerranée",
        hqLocation: "Puteaux",
        sector: "Banque, Finance & Assurance",
      }),
      [candidate({ siren: "058801481", legalName: "BANQUE POPULAIRE MEDITERRANEE", nafCode: "64.19Z", nafSection: "K", hqCommune: "NICE", hqPostalCode: "06000", hqDepartment: "06" })],
    )

    // L'appariement est en réalité correct — mais rien dans les données du CRM ne
    // permet de le savoir. On surface la contradiction plutôt que de l'écraser.
    expect(resolution.decision).toBe("needs_human_confirmation")
  })

  it("bloque une entité cessée même parfaitement nommée et localisée", () => {
    const resolution = resolveEntity(
      account({ name: "Interima", legalName: "INTERIMA", hqLocation: "Nice", sector: "Commerce, Distribution & Services spécialisés" }),
      [candidate({ siren: "313977035", legalName: "INTERIMA", nafCode: "78.20Z", nafSection: "N", hqCommune: "NICE", hqPostalCode: "06000", hqDepartment: "06", administrativeState: "C" })],
    )

    expect(resolution.decision).toBe("needs_human_confirmation")
    expect(resolution.blockers.join(" ")).toContain("cessée")
  })

  it("refuse de trancher entre deux candidats trop proches", () => {
    const twins = [
      candidate({ siren: "111111111", legalName: "INTERIMA", nafCode: "78.20Z", nafSection: "N", hqCommune: "NICE", hqPostalCode: "06000", hqDepartment: "06" }),
      candidate({ siren: "222222222", legalName: "INTERIMA", nafCode: "78.20Z", nafSection: "N", hqCommune: "NICE", hqPostalCode: "06000", hqDepartment: "06" }),
    ]
    const resolution = resolveEntity(
      account({ name: "Interima", legalName: "INTERIMA", hqLocation: "Nice", sector: "Commerce, Distribution & Services spécialisés" }),
      twins,
    )

    expect(resolution.decision).toBe("needs_human_confirmation")
    expect(resolution.reasons.join(" ")).toContain("ambigu")
  })
})

describe("entity-resolution — les cas qui doivent passer", () => {
  it("Interima : nom exact, commune concordante, section NAF cohérente", () => {
    const resolution = resolveEntity(
      account({ name: "Interima", legalName: "INTERIMA", hqLocation: "Nice", sector: "Commerce, Distribution & Services spécialisés", employeeCount: 25 }),
      [candidate({ siren: "313977035", legalName: "INTERIMA", nafCode: "78.20Z", nafSection: "N", hqCommune: "NICE", hqPostalCode: "06000", hqDepartment: "06", employeeTrancheCode: "12" })],
    )

    expect(resolution.decision).toBe("resolved")
    expect(resolution.canProposeCanonicalWrites).toBe(true)
    expect(resolution.score).toBeGreaterThanOrEqual(RESOLVED_MIN_SCORE)
  })

  it("un NAF de holding ne pénalise pas un compte industriel (Domusvi, Cogepart, Groupe IDEC)", () => {
    const resolution = resolveEntity(
      account({ name: "Median Technologies", legalName: "Median Technologies", hqLocation: "Valbonne", sector: "Santé, MedTech & Médico-social", employeeCount: 200 }),
      [candidate({ siren: "443676309", legalName: "MEDIAN TECHNOLOGIES", nafCode: "82.99Z", nafSection: "N", hqCommune: "VALBONNE", hqPostalCode: "06560", hqDepartment: "06", employeeTrancheCode: "22" })],
    )

    expect(resolution.decision).toBe("resolved")
    expect(resolution.signals.find((s) => s.key === "activity_section")?.value).toBe(0)
  })
})

describe("entity-resolution — SIREN déjà connu du CRM", () => {
  it("impose l'entité du CRM sans la remettre en cause", () => {
    const resolution = resolveEntity(
      { ...TOURNAIRE_ACCOUNT, knownSiren: "415550110" },
      [TOURNAIRE_LYON, TOURNAIRE_SA],
    )

    expect(resolution.decision).toBe("resolved")
    expect(resolution.method).toBe("crm_siren")
    expect(resolution.chosen?.siren).toBe("415550110")
  })

  it("refuse tout appariement par nom quand le SIREN connu est absent des résultats", () => {
    const resolution = resolveEntity(
      { ...TOURNAIRE_ACCOUNT, knownSiren: "415550110" },
      [TOURNAIRE_LYON],
    )

    expect(resolution.decision).toBe("unresolved")
    expect(resolution.chosen).toBeNull()
    expect(resolution.canProposeCanonicalWrites).toBe(false)
  })

  it("n'autorise aucune écriture canonique si le SIREN connu contredit le CRM", () => {
    const resolution = resolveEntity(
      { ...TOURNAIRE_ACCOUNT, knownSiren: "505063438" },
      [TOURNAIRE_LYON],
    )

    expect(resolution.method).toBe("crm_siren")
    expect(resolution.canProposeCanonicalWrites).toBe(false)
    expect(resolution.reasons.join(" ")).toContain("contredisent")
  })
})

describe("entity-resolution — contrôle du stock (verifyKnownSiren)", () => {
  it("signale un SIREN enregistré incohérent avec le secteur et la géographie du compte", () => {
    const report = verifyKnownSiren(TOURNAIRE_ACCOUNT, TOURNAIRE_LYON)

    expect(report.coherent).toBe(false)
    expect(report.signals.find((s) => s.key === "geography")?.value).toBeLessThan(0)
    expect(report.signals.find((s) => s.key === "activity_section")?.value).toBe(-1)
  })

  it("valide un SIREN enregistré cohérent", () => {
    const report = verifyKnownSiren(TOURNAIRE_ACCOUNT, TOURNAIRE_SA)

    expect(report.coherent).toBe(true)
    expect(report.nameScore).toBeGreaterThanOrEqual(RESOLVED_MIN_NAME_SCORE)
  })
})

describe("entity-resolution — briques de normalisation", () => {
  it("retire les formes juridiques mais conserve groupe et holding", () => {
    expect(nameCore("TOURNAIRE SA")).toEqual(["tournaire"])
    expect(nameCore("Groupe Tournaire")).toEqual(["groupe", "tournaire"])
    expect(nameCore("TOURNAIRE GROUP HOLDING")).toEqual(["tournaire", "group", "holding"])
  })

  it("extrait la raison sociale rangée entre parenthèses par le CRM", () => {
    const variants = nameVariants("Groupe Tournaire (Tournaire SA)")
    expect(variants.map((v) => v.toLowerCase())).toContain("tournaire sa")
  })

  it("sépare aussi les raisons sociales que le CRM joint par une barre oblique", () => {
    const variants = nameVariants("KELLER WILLIAMS FRANCE / SAS TEAM FRANCE")
    expect(variants).toContain("SAS TEAM FRANCE")
  })

  it("note l'identité, le préfixe, l'inclusion et l'absence de rapport", () => {
    expect(scoreNamePair("TOURNAIRE SA", "Tournaire")).toBe(1)
    expect(scoreNamePair("Tournaire", "TOURNAIRE GROUP HOLDING")).toBe(0.8)
    expect(scoreNamePair("Bona", "CIFFREO BONA")).toBe(0.65)
    // Une inclusion très diluée ne prouve plus l'identité (audit du stock, CHU de Nice).
    expect(
      scoreNamePair(
        "Centre Hospitalier Universitaire de Nice",
        "BUREAU DES ETUDIANTS INFIRMIERS DU CENTRE HOSPITALIER UNIVERSITAIRE DE NICE",
      ),
    ).toBe(0.5)
    expect(scoreNamePair("MMV", "DEPIL TECH")).toBe(0)
    expect(scoreNamePair("MMV", "DEPIL TECH")).toBeLessThan(NAME_GATE_MIN)
  })

  it("lit un code postal noyé dans une adresse libre, et n'en invente pas", () => {
    expect(parseLocation("SOPHIA ANTIPOLIS 260 PIN MONTARD 06410 BIOT, 06410, BIOT")).toMatchObject({
      postalCode: "06410",
      department: "06",
    })
    expect(parseLocation("Grasse")).toMatchObject({ postalCode: null, department: null })
    expect(parseLocation(null)).toEqual({ postalCode: null, department: null, tokens: [] })
  })

  it("interroge le registre sur la raison sociale ET sur le nom d'usage", () => {
    const queries = buildRegistrySearchQueries(TOURNAIRE_ACCOUNT)
    expect(queries).toContain("Groupe Tournaire (Tournaire SA)")
    expect(queries).toContain("Tournaire")
  })

  it("convertit les tranches d'effectif INSEE et rejette NN", () => {
    expect(employeeTrancheMidpoint("32")).toBe(375)
    expect(employeeTrancheMidpoint("NN")).toBeNull()
    expect(employeeTrancheMidpoint(null)).toBeNull()
  })

  it("normalise un SIREN et rejette ce qui n'en est pas un", () => {
    expect(normalizeSiren("415 550 110")).toBe("415550110")
    expect(normalizeSiren("41555011")).toBeNull()
    expect(normalizeSiren(null)).toBeNull()
  })

  it("normalise une réponse brute du registre", () => {
    const normalized = normalizeRegistryResult({
      siren: "415550110",
      nom_complet: "TOURNAIRE SA",
      nom_raison_sociale: "TOURNAIRE SA",
      sigle: null,
      activite_principale: "25.92Z",
      section_activite_principale: "C",
      categorie_entreprise: "ETI",
      tranche_effectif_salarie: "32",
      etat_administratif: "A",
      date_creation: "1955-01-01",
      nombre_etablissements: 2,
      finances: { "2022": { ca: 70000000 }, "2023": { ca: 74020031 } },
      siege: {
        libelle_commune: "GRASSE",
        code_postal: "06130",
        departement: "06",
        adresse: "6 BOULEVARD DE L OBSERVATOIRE 06130 GRASSE",
        liste_enseignes: ["TOURNAIRE"],
      },
    })

    expect(normalized).toMatchObject({
      siren: "415550110",
      legalName: "TOURNAIRE SA",
      nafCode: "25.92Z",
      nafSection: "C",
      hqCommune: "GRASSE",
      hqDepartment: "06",
      revenueEur: 74020031,
      revenueYear: "2023",
    })
    expect(normalized?.alternateNames).toContain("TOURNAIRE")
  })

  it("rejette un résultat sans SIREN exploitable", () => {
    expect(normalizeRegistryResult({ nom_complet: "SANS SIREN" })).toBeNull()
  })
})

describe("entity-resolution — trace d'audit", () => {
  it("produit un instantané traçable, borné, et jamais silencieux sur le refus", () => {
    const resolution = resolveEntity(
      account({
        name: "Ciffreo Bona",
        legalName: "Établissements Ciffréo et Bona (Ciffréo Bona)",
        hqLocation: "Carros",
        sector: "BTP, Construction & Immobilier",
        employeeCount: 1300,
      }),
      [candidate({ siren: "487652257", legalName: "CIFFREO BONA", nafCode: "46.73A", nafSection: "G", hqCommune: "CANNES", hqPostalCode: "06150", hqDepartment: "06" })],
    )
    const snapshot = toResolutionSnapshot(resolution)

    expect(snapshot.decision).toBe("needs_human_confirmation")
    expect(snapshot.needs_human_confirmation).toBe(true)
    expect(snapshot.can_propose_canonical_writes).toBe(false)
    expect(snapshot.reasons.length).toBeGreaterThan(0)
    expect(snapshot.candidates.length).toBeLessThanOrEqual(AUDIT_CANDIDATE_LIMIT)
  })

  it("conserve dans la trace les candidats écartés, pas seulement le retenu", () => {
    const resolution = resolveEntity(TOURNAIRE_ACCOUNT, [
      TOURNAIRE_LYON,
      TOURNAIRE_HOLDING,
      TOURNAIRE_SA,
    ])
    const snapshot = toResolutionSnapshot(resolution)

    expect(snapshot.candidates.map((c) => c.siren)).toContain("505063438")
    expect(snapshot.siren).toBe("415550110")
  })
})
