import { describe, expect, it } from "vitest"

import { arkopharmaSourceCorpusFixture } from "../../account-research-studies/fixtures/work"
import {
  buildAccountCorpusSlug,
  buildAccountCorpusVersion,
  buildAccountIngestCorpusPayload,
  extractWorkAuthorityCandidates,
  validateNewSourceArbitration,
  type CatalogLookupEntry,
} from "./account-source-corpus"
import type { ExistingSourceMatch } from "./source-registry-output"

describe("Account Source Corpus — Lot 3", () => {
  describe("A. Mapping Work → Account Source Corpus (Fixture Arkopharma)", () => {
    it("projette exactement 16 autorités pour 27 documents utilisés", () => {
      const emptyLookup = new Map<string, CatalogLookupEntry>()
      const candidates = extractWorkAuthorityCandidates(arkopharmaSourceCorpusFixture, emptyLookup)

      // 16 autorités dédupliquées par domaine
      expect(candidates.length).toBe(16)

      // 27 documents conservés en provenance
      const totalDocs = candidates.reduce((sum, c) => sum + c.documentsCount, 0)
      expect(totalDocs).toBe(27)

      // Aucun document individuel ne devient une source de catalogue
      for (const c of candidates) {
        expect(c.domain).not.toContain("/")
        expect(c.domain).not.toContain("http")
        expect(c.domain.length).toBeGreaterThan(0)
        expect(c.documentsUsed.length).toBe(c.documentsCount)
      }

      // Vérifie les domaines normalisés
      const domains = candidates.map((c) => c.domain)
      expect(domains).toContain("arkopharma.com")
      expect(domains).toContain("pappers.fr")
      expect(domains).toContain("lemonde.fr")
      expect(domains).toContain("synadiet.org")
    })
  })

  describe("B. Résolution & Dédoublonnage Catalogue", () => {
    it("distingue les sources déjà cataloguées et les nouvelles sources", () => {
      const lookup = new Map<string, CatalogLookupEntry>([
        [
          "lemonde.fr",
          {
            id: "src-lemonde",
            sourceKey: "lemonde",
            origin: "system",
            isLocked: true,
            name: "Le Monde",
            domain: "lemonde.fr",
            searchDomain: "lemonde.fr",
            collectionUrl: "https://www.lemonde.fr/rss/une.xml",
            homepageUrl: "https://www.lemonde.fr",
            kredoCategory: "strategie",
            family: "Presse générale",
            contentTemporality: "continuous",
            usageScopes: ["news"],
          },
        ],
        [
          "pappers.fr",
          {
            id: "src-pappers",
            sourceKey: "pappers",
            origin: "corpus",
            isLocked: false,
            name: "Pappers",
            domain: "pappers.fr",
            searchDomain: "pappers.fr",
            collectionUrl: null,
            homepageUrl: "https://www.pappers.fr",
            kredoCategory: "reglementaire",
            family: "Registre légal",
            contentTemporality: "periodic",
            usageScopes: ["news"],
          },
        ],
      ])

      const candidates = extractWorkAuthorityCandidates(arkopharmaSourceCorpusFixture, lookup)

      const leMonde = candidates.find((c) => c.domain === "lemonde.fr")
      expect(leMonde).toBeDefined()
      expect(leMonde?.isNewSource).toBe(false)
      expect(leMonde?.existingMatch?.origin).toBe("system")
      expect(leMonde?.existingMatch?.isLocked).toBe(true)
      expect(leMonde?.existingCategory).toBe("strategie")
      expect(leMonde?.existingTemporality).toBe("continuous")

      const pappers = candidates.find((c) => c.domain === "pappers.fr")
      expect(pappers).toBeDefined()
      expect(pappers?.isNewSource).toBe(false)
      expect(pappers?.existingMatch?.origin).toBe("corpus")

      const arko = candidates.find((c) => c.domain === "arkopharma.com")
      expect(arko).toBeDefined()
      expect(arko?.isNewSource).toBe(true)
      expect(arko?.existingMatch).toBeNull()
    })

    it("fusionne deux entrées qui pointent sur le même nom d'hôte", () => {
      const sourceCorpusWithDupes = {
        sources: [
          {
            name: "Arkopharma Corporate",
            domain: "https://www.arkopharma.com/fr-FR/corporate",
            documents_used: [{ title: "Doc 1", url: "https://arkopharma.com/doc1" }],
          },
          {
            name: "Arkopharma Shop",
            domain: "shop.arkopharma.com",
            documents_used: [{ title: "Doc 2", url: "https://shop.arkopharma.com/doc2" }],
          },
          {
            name: "Arkopharma FR",
            domain: "arkopharma.com",
            documents_used: [{ title: "Doc 3", url: "https://arkopharma.com/doc3" }],
          },
        ],
      }

      const lookup = new Map<string, CatalogLookupEntry>()
      const candidates = extractWorkAuthorityCandidates(sourceCorpusWithDupes, lookup)

      // www.arkopharma.com et arkopharma.com normalisent vers arkopharma.com
      const arkoBase = candidates.find((c) => c.domain === "arkopharma.com")
      expect(arkoBase).toBeDefined()
      expect(arkoBase?.documentsCount).toBe(2) // Doc 1 + Doc 3
    })
  })

  describe("C. Préservation de l'existant & Union des Scopes", () => {
    it("conserve RSS, category, temporality et union avec study dans le payload", () => {
      const existingMatch: ExistingSourceMatch = {
        id: "src-1",
        sourceKey: "lesechos",
        origin: "system",
        isLocked: true,
        name: "Les Échos",
      }

      const candidate = {
        name: "Les Echos Work",
        publisher: "LVMH",
        domain: "lesechos.fr",
        searchDomain: "lesechos.fr",
        sourceType: "press",
        documentsCount: 3,
        documentsUsed: [],
        confidence: 0.9,
        existingMatch,
        isNewSource: false,
        existingCategory: "strategie" as const,
        existingTemporality: "continuous" as const,
        existingUsageScopes: ["news"],
        existingCollectionUrl: "https://www.lesechos.fr/rss.xml",
        existingHomepageUrl: "https://www.lesechos.fr",
      }

      const payload = buildAccountIngestCorpusPayload({
        studyId: "11111111-1111-1111-1111-111111111111",
        companyId: "22222222-2222-2222-2222-222222222222",
        companyName: "Arkopharma",
        studyTitle: "Étude Arkopharma 2026",
        snapshotDate: "2026-09-13",
        schemaVersion: 1,
        candidates: [candidate],
        arbitrations: [{ domain: "lesechos.fr", selected: true }],
      })

      expect(payload.sources.length).toBe(1)
      const src = payload.sources[0]

      // Identité canonique préservée
      expect(src.name).toBe("Les Échos")
      expect(src.collection_url).toBe("https://www.lesechos.fr/rss.xml")
      expect(src.kredo_category).toBe("strategie")
      expect(src.content_temporality).toBe("continuous")

      // Union des scopes : ['news', 'study'], JAMAIS écrasé par ['study']
      expect(src.usage_scopes).toEqual(["news", "study"])
    })
  })

  describe("D. Qualification des nouvelles sources", () => {
    it("refuse une nouvelle source sélectionnée sans catégorie ou sans temporalité", () => {
      const candidate = {
        name: "New Source",
        publisher: null,
        domain: "newsource.org",
        searchDomain: "newsource.org",
        sourceType: "specialized_source",
        documentsCount: 1,
        documentsUsed: [],
        confidence: 0.8,
        existingMatch: null,
        isNewSource: true,
        existingCategory: null,
        existingTemporality: null,
        existingUsageScopes: [],
        existingCollectionUrl: null,
        existingHomepageUrl: null,
      }

      // Sans décision -> refus
      const check1 = validateNewSourceArbitration(candidate, undefined)
      expect(check1.ok).toBe(false)

      // Avec seulement catégorie -> refus
      const check2 = validateNewSourceArbitration(candidate, {
        domain: "newsource.org",
        selected: true,
        kredoCategory: "vertical",
      })
      expect(check2.ok).toBe(false)

      // Avec seulement temporalité -> refus
      const check3 = validateNewSourceArbitration(candidate, {
        domain: "newsource.org",
        selected: true,
        contentTemporality: "static",
      })
      expect(check3.ok).toBe(false)

      // Avec les deux -> accepté
      const check4 = validateNewSourceArbitration(candidate, {
        domain: "newsource.org",
        selected: true,
        kredoCategory: "vertical",
        contentTemporality: "static",
      })
      expect(check4.ok).toBe(true)

      // Source non sélectionnée -> acceptée (car exclue)
      const check5 = validateNewSourceArbitration(candidate, {
        domain: "newsource.org",
        selected: false,
      })
      expect(check5.ok).toBe(true)
    })

    it("accepte les 3 temporalités opérationnelles : static, periodic, continuous", () => {
      const candidate = {
        name: "New Source",
        publisher: null,
        domain: "newsource.org",
        searchDomain: "newsource.org",
        sourceType: "specialized_source",
        documentsCount: 1,
        documentsUsed: [],
        confidence: 0.8,
        existingMatch: null,
        isNewSource: true,
        existingCategory: null,
        existingTemporality: null,
        existingUsageScopes: [],
        existingCollectionUrl: null,
        existingHomepageUrl: null,
      }

      for (const temp of ["static", "periodic", "continuous"] as const) {
        const check = validateNewSourceArbitration(candidate, {
          domain: "newsource.org",
          selected: true,
          kredoCategory: "ia-appliquee",
          contentTemporality: temp,
        })
        expect(check.ok).toBe(true)
      }
    })
  })

  describe("E. Payload Account & Absence d'invention E3", () => {
    it("produit un payload avec scopeKind 'account', study_id, activation 'draft', et champs E3 à null", () => {
      const candidate = {
        name: "Nouvelle source pharma",
        publisher: "Pharma Hebdo",
        domain: "pharmahebdo.fr",
        searchDomain: "pharmahebdo.fr",
        sourceType: "specialized_source",
        documentsCount: 2,
        documentsUsed: [],
        confidence: 0.85,
        existingMatch: null,
        isNewSource: true,
        existingCategory: null,
        existingTemporality: null,
        existingUsageScopes: [],
        existingCollectionUrl: null,
        existingHomepageUrl: null,
      }

      const payload = buildAccountIngestCorpusPayload({
        studyId: "33333333-3333-3333-3333-333333333333",
        companyId: "44444444-4444-4444-4444-444444444444",
        companyName: "Arkopharma Laboratoires",
        studyTitle: "Étude Approfondie Arkopharma",
        snapshotDate: "2026-09-13",
        schemaVersion: 1,
        candidates: [candidate],
        arbitrations: [
          {
            domain: "pharmahebdo.fr",
            selected: true,
            kredoCategory: "vertical",
            contentTemporality: "periodic",
          },
        ],
        sourceFileName: "source-corpus.json",
        sourceFileHash: "abcdef123456",
      })

      // Rattachement de l'étude et statut draft
      expect(payload.study_id).toBe("33333333-3333-3333-3333-333333333333")
      expect(payload.activation_state).toBe("draft")

      // Slug et version stables
      expect(payload.slug).toBe(
        buildAccountCorpusSlug({ id: "44444444-4444-4444-4444-444444444444", name: "Arkopharma Laboratoires" }),
      )
      expect(payload.version).toBe(
        buildAccountCorpusVersion("33333333-3333-3333-3333-333333333333", "2026-09-13"),
      )

      // Métadonnées sans duplication des documents
      expect(payload.metadata).toMatchObject({
        origin: "account_intelligence",
        producer: "chatgpt_work",
        study_id: "33333333-3333-3333-3333-333333333333",
        company_name: "Arkopharma Laboratoires",
        source_authorities_total: 1,
        source_file_name: "source-corpus.json",
        source_file_sha256: "abcdef123456",
      })

      // Items du corpus : AUCUNE invention E3 (tier, utility_score, automation_fit à null)
      expect(payload.sources.length).toBe(1)
      const src = payload.sources[0]
      expect(src.pack).toBe("minimal")
      expect(src.tier).toBeNull()
      expect(src.utility_score).toBeNull()
      expect(src.automation_fit).toBeNull()
      expect(src.news_eligible).toBe(false)
      expect(src.account_watch_eligible).toBe(false)
      expect(src.is_enabled).toBe(false)
      expect(src.familles_couvertes).toEqual([])
      expect(src.atteste).toContain("Étude Approfondie Arkopharma")

      // Données de catalogue
      expect(src.name).toBe("Nouvelle source pharma")
      expect(src.kredo_category).toBe("vertical")
      expect(src.content_temporality).toBe("periodic")
      expect(src.usage_scopes).toEqual(["study"])
      expect(src.collection_url).toBeNull()
      expect(src.homepage_url).toBe("https://pharmahebdo.fr")
      expect(src.family).toBe("Account Intelligence — Arkopharma Laboratoires")
    })
  })
})
