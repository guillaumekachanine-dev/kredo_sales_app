import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  buildIngestSourceCorpusPayload,
  buildSourceCorpusItemPreview,
  deriveImportCollectionUrl,
  mapE3VerdictToCorpusQualityVerdict,
  parseSourceRegistryOutput,
  type SourceCorpusItemArbitration,
  type SourceRegistrySourceInput,
} from "./source-registry-output"

const PARFUMERIE_CORPUS_PATH = "docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/03-sources.json"
const parfumerieRaw = readFileSync(PARFUMERIE_CORPUS_PATH, "utf8")

/** 8 sources minimales, chaque invariant du Lot 4 §5 satisfait — sert de base aux tests d'invalidité. */
function minimalSource(overrides: Partial<Record<string, unknown>> = {}, index: number) {
  const n = String(index).padStart(3, "0")
  return {
    src_id: `SRC-${n}`,
    publisher: `Publisher ${n}`,
    domain: `publisher${n}.example`,
    url: `https://publisher${n}.example/`,
    tier: 1,
    primary_role: "proof",
    utility_score: 80,
    utility_score_detail: { pertinence_sectorielle: 15, couverture_besoins: 15, valeur_commerciale: 10, fraicheur: 10, autorite_editoriale: 20, automation_access: 10 },
    automation_fit: "high",
    collection_url: null,
    search_domain: `publisher${n}.example`,
    content_temporality: "periodic",
    usage_scopes: ["study"],
    pack: index <= 4 ? "minimal" : "enrichi",
    atteste: "Fait attesté",
    familles_couvertes: ["identite_juridique"],
    consulted_at: "2026-08-14",
    validation_status: "verified",
    ...overrides,
  }
}

function minimalRegistry(overrides: { meta?: Record<string, unknown>; sources?: unknown[] } = {}) {
  const sources = overrides.sources ?? Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
  const ids = (sources as { src_id: string }[]).map((s) => s.src_id)
  return {
    meta: {
      segment_slug: "seg-test-b2b",
      secteur: "Secteur de test",
      geographie: "France",
      date_snapshot: "2026-08-14",
      version: "1.1",
      validation_status: "pending",
      ...overrides.meta,
    },
    besoins_information: [],
    familles_sectorielles_obligatoires: {
      presse_professionnelle: ids[4],
      federation: ids[5],
      regulateur: ids[6],
    },
    sources,
    pack_minimal: ids.slice(0, 4),
    pack_enrichi: ids.slice(4),
    matrice_couverture: [{ famille: "identite_juridique", src_ids: ids }],
    gaps: [],
    compteurs: { sources: sources.length, pack_minimal: 4, pack_enrichi: sources.length - 4, requetes: 0 },
  }
}

describe("parseSourceRegistryOutput — cas valides", () => {
  it("accepte un objet déjà parsé", () => {
    const result = parseSourceRegistryOutput(minimalRegistry())
    expect(result.ok).toBe(true)
  })

  it("accepte un texte JSON", () => {
    const result = parseSourceRegistryOutput(JSON.stringify(minimalRegistry()))
    expect(result.ok).toBe(true)
  })

  it("expose collectableCount/staticCount cohérents", () => {
    const sources = Array.from({ length: 8 }, (_, i) =>
      minimalSource({ content_temporality: i < 2 ? "static" : "periodic" }, i + 1),
    )
    const result = parseSourceRegistryOutput(minimalRegistry({ sources }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.staticCount).toBe(2)
    expect(result.data.collectableCount).toBe(6)
  })
})

describe("parseSourceRegistryOutput — jamais d'exception non contrôlée", () => {
  it("un texte qui n'est pas du JSON devient une erreur contrôlée", () => {
    const result = parseSourceRegistryOutput("{ not json")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("un objet racine qui n'est pas un objet JSON est rejeté proprement", () => {
    expect(parseSourceRegistryOutput([1, 2, 3]).ok).toBe(false)
    expect(parseSourceRegistryOutput(42).ok).toBe(false)
    expect(parseSourceRegistryOutput(null).ok).toBe(false)
  })
})

describe("parseSourceRegistryOutput — invariants bloquants (Lot 4 §5)", () => {
  it("rejette une version différente de 1.1", () => {
    const result = parseSourceRegistryOutput(minimalRegistry({ meta: { version: "1.0" } }))
    expect(result.ok).toBe(false)
  })

  it("rejette un segment_slug absent", () => {
    const registry = minimalRegistry()
    // @ts-expect-error suppression volontaire pour le test
    delete registry.meta.segment_slug
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("rejette moins de 8 sources", () => {
    const sources = Array.from({ length: 5 }, (_, i) => minimalSource({}, i + 1))
    const result = parseSourceRegistryOutput(minimalRegistry({ sources }))
    expect(result.ok).toBe(false)
  })

  it("rejette un src_id dupliqué", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[1] = { ...sources[1], src_id: sources[0].src_id }
    const result = parseSourceRegistryOutput(minimalRegistry({ sources }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.message.includes("dupliqué"))).toBe(true)
  })

  it("rejette un src_id hors format SRC-XXX", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], src_id: "SRC-7" }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette une source sans search_domain", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], search_domain: "" }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un content_temporality hors domaine", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], content_temporality: "sometimes" }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un usage_scopes hors domaine", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], usage_scopes: ["gossip"] }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un pack hors minimal|enrichi", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], pack: "premium" }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un tier hors 1-4", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], tier: 5 }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un utility_score hors 0-100", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], utility_score: 150 }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un automation_fit hors domaine", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], automation_fit: "turbo" }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette un primary_role hors domaine", () => {
    const sources = Array.from({ length: 8 }, (_, i) => minimalSource({}, i + 1))
    sources[0] = { ...sources[0], primary_role: "champion" }
    expect(parseSourceRegistryOutput(minimalRegistry({ sources })).ok).toBe(false)
  })

  it("rejette des packs non disjoints", () => {
    const registry = minimalRegistry()
    registry.pack_enrichi = [...registry.pack_enrichi, registry.pack_minimal[0]]
    const result = parseSourceRegistryOutput(registry)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.message.includes("disjoints"))).toBe(true)
  })

  it("rejette une source manquante dans les packs (union incomplète)", () => {
    const registry = minimalRegistry()
    registry.pack_enrichi = registry.pack_enrichi.slice(1)
    const result = parseSourceRegistryOutput(registry)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.path.includes("pack_minimal ∪ pack_enrichi"))).toBe(true)
  })

  it("rejette un src_id de pack qui ne résout vers aucune source", () => {
    const registry = minimalRegistry()
    registry.pack_enrichi = [...registry.pack_enrichi.slice(0, -1), "SRC-999"]
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("rejette des compteurs faux (sources)", () => {
    const registry = minimalRegistry()
    registry.compteurs.sources = 999
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("rejette des compteurs faux (pack_minimal)", () => {
    const registry = minimalRegistry()
    registry.compteurs.pack_minimal = 999
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("rejette des compteurs faux (pack_enrichi)", () => {
    const registry = minimalRegistry()
    registry.compteurs.pack_enrichi = 999
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("rejette une référence de matrice_couverture qui ne résout vers aucune source", () => {
    const registry = minimalRegistry()
    registry.matrice_couverture = [{ famille: "identite_juridique", src_ids: ["SRC-999"] }]
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("rejette une famille sectorielle obligatoire qui ne résout vers aucune source", () => {
    const registry = minimalRegistry()
    registry.familles_sectorielles_obligatoires.regulateur = "aucune identifiee"
    expect(parseSourceRegistryOutput(registry).ok).toBe(false)
  })

  it("jamais de troncature silencieuse : une erreur bloquante liste toujours au moins un message exploitable", () => {
    const result = parseSourceRegistryOutput(minimalRegistry({ meta: { version: "2.0" } }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    for (const error of result.errors) {
      expect(error.message.length).toBeGreaterThan(0)
    }
  })
})

describe("parseSourceRegistryOutput — corpus parfumerie (recette canonique, Lot 4 §6)", () => {
  it("parse avec succès depuis le texte brut du fichier", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
  })

  it("conserve les 31 sources sans troncature", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.sources).toHaveLength(31)
  })

  it("compte 23 sources collectables et 8 statiques", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.collectableCount).toBe(23)
    expect(result.data.staticCount).toBe(8)
  })

  it("conserve une source manual_only non exclue (SRC-005, ECHA)", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const echa = result.data.sources.find((s) => s.srcId === "SRC-005")
    expect(echa?.automationFit).toBe("manual_only")
  })

  it("meta.validation_status 'pending' se mappe vers usable_with_caveats", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.meta.validationStatus).toBe("pending")
    expect(mapE3VerdictToCorpusQualityVerdict(result.data.meta.validationStatus)).toBe("usable_with_caveats")
  })

  it("les packs minimal/enrichi sont disjoints, couvrants, et de taille conforme au fichier", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.packMinimal).toHaveLength(12)
    expect(result.data.packEnrichi).toHaveLength(19)
  })
})

describe("deriveImportCollectionUrl — Lot 4 §10", () => {
  it("retourne null pour une collection_url absente", () => {
    expect(deriveImportCollectionUrl(null)).toBeNull()
  })

  it("conserve une URL qui ressemble réellement à un flux RSS/Atom", () => {
    expect(deriveImportCollectionUrl("https://example.com/rss")).toBe("https://example.com/rss")
    expect(deriveImportCollectionUrl("https://example.com/feed.xml")).toBe("https://example.com/feed.xml")
    expect(deriveImportCollectionUrl("https://example.com/blog/atom")).toBe("https://example.com/blog/atom")
  })

  it("rejette une URL d'API/documentation/formulaire vers null (site_search)", () => {
    expect(deriveImportCollectionUrl("https://data.inpi.fr/content/editorial/Acces_API_Entreprises")).toBeNull()
    expect(deriveImportCollectionUrl("https://eur-lex.europa.eu/advanced-search-form.html")).toBeNull()
    expect(deriveImportCollectionUrl("https://ted.europa.eu/en/about-ted")).toBeNull()
  })

  it("aucune des 29 collection_url du corpus parfumerie n'est injectée comme flux direct", () => {
    const result = parseSourceRegistryOutput(parfumerieRaw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const source of result.data.sources) {
      expect(deriveImportCollectionUrl(source.collectionUrl)).toBeNull()
    }
  })
})

function fakeSource(overrides: Partial<SourceRegistrySourceInput> = {}): SourceRegistrySourceInput {
  return {
    srcId: "SRC-001",
    publisher: "Acme Press",
    domain: "acme-press.example",
    url: "https://acme-press.example/",
    tier: 2,
    primaryRole: "corroboration",
    utilityScore: 70,
    automationFit: "manual_only",
    collectionUrl: null,
    searchDomain: "acme-press.example",
    contentTemporality: "periodic",
    usageScopes: ["news", "account_watch"],
    pack: "minimal",
    atteste: "Fait attesté",
    famillesCouvertes: [],
    consultedAt: "2026-08-14",
    validationStatus: "verified",
    conditionsUtilisation: null,
    ...overrides,
  }
}

describe("buildSourceCorpusItemPreview — mapping E3 -> source_catalog/source_corpus_items (Lot 4 §9-§11)", () => {
  it("une source static n'est jamais collectable ni éligible, quels que soient ses usage_scopes", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource({ contentTemporality: "static" }), {
      secteur: "Test",
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(preview.isCollectable).toBe(false)
    expect(preview.newsEligible).toBe(false)
    expect(preview.accountWatchEligible).toBe(false)
    expect(preview.isEnabledDefault).toBe(false)
    expect(preview.exclusionReasonDefault).toBe("Contenu statique — hors veille récurrente")
  })

  it("news_eligible exige contentTemporality != static ET usage_scopes contient 'news'", () => {
    const eligible = buildSourceCorpusItemPreview(fakeSource({ usageScopes: ["news"] }), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(eligible.newsEligible).toBe(true)

    const notEligible = buildSourceCorpusItemPreview(fakeSource({ usageScopes: ["study"] }), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(notEligible.newsEligible).toBe(false)
  })

  it("account_watch_eligible exige contentTemporality != static ET usage_scopes contient 'account_watch'", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource({ usageScopes: ["account_watch"] }), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(preview.accountWatchEligible).toBe(true)
  })

  it("manual_only reste éligible — il n'est jamais spécial-casé en exclusion", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource({ automationFit: "manual_only", usageScopes: ["news"] }), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(preview.newsEligible).toBe(true)
    expect(preview.isEnabledDefault).toBe(true)
  })

  it("nouvelle source : source_key déterministe, jamais le src_id local à l'étude", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource({ srcId: "SRC-007" }), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(preview.isNewSource).toBe(true)
    expect(preview.sourceKey).toBe("corpus:acme-press.example")
    expect(preview.sourceKey).not.toBe("SRC-007")
  })

  it("source existante : le source_key est réutilisé, jamais un doublon", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource(), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: { id: "existing-id", sourceKey: "manual:acme-press.example", origin: "manual", isLocked: false, name: "Acme (manuel)" },
    })
    expect(preview.isNewSource).toBe(false)
    expect(preview.sourceKey).toBe("manual:acme-press.example")
  })

  it("source système verrouillée : même comportement de réutilisation forcée, exposé au wizard", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource({ domain: "premiumbeautynews.com", searchDomain: "premiumbeautynews.com" }), {
      secteur: null,
      normalizedDomain: "premiumbeautynews.com",
      normalizedSearchDomain: "premiumbeautynews.com",
      existingMatch: { id: "system-id", sourceKey: "Premium Beauty News", origin: "system", isLocked: true, name: "Premium Beauty News" },
    })
    expect(preview.existingMatch?.origin).toBe("system")
    expect(preview.existingMatch?.isLocked).toBe(true)
    expect(preview.sourceKey).toBe("Premium Beauty News")
    expect(preview.isNewSource).toBe(false)
  })

  it("family = meta.secteur si présent, sinon 'Sectoriel'", () => {
    const withSecteur = buildSourceCorpusItemPreview(fakeSource(), {
      secteur: "Parfumerie",
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(withSecteur.mappedFamily).toBe("Parfumerie")

    const withoutSecteur = buildSourceCorpusItemPreview(fakeSource(), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(withoutSecteur.mappedFamily).toBe("Sectoriel")
  })

  it("kredo_category est toujours 'vertical'", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource(), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(preview.mappedKredoCategory).toBe("vertical")
  })

  it("collection_url non-RSS devient null (site_search), jamais copié aveuglément", () => {
    const preview = buildSourceCorpusItemPreview(fakeSource({ collectionUrl: "https://acme-press.example/api/docs" }), {
      secteur: null,
      normalizedDomain: "acme-press.example",
      normalizedSearchDomain: "acme-press.example",
      existingMatch: null,
    })
    expect(preview.mappedCollectionUrl).toBeNull()
  })
})

describe("buildIngestSourceCorpusPayload — assemblage du payload RPC (Lot 4 §12-§18)", () => {
  const parsedResult = parseSourceRegistryOutput(parfumerieRaw)
  if (!parsedResult.ok) throw new Error("fixture parfumerie invalide")
  const parsed = parsedResult.data

  function previewFor(srcId: string) {
    const source = parsed.sources.find((s) => s.srcId === srcId)!
    return buildSourceCorpusItemPreview(source, {
      secteur: parsed.meta.secteur,
      normalizedDomain: source.domain,
      normalizedSearchDomain: source.searchDomain,
      existingMatch: null,
    })
  }

  it("slug = sources-<segment_slug>", () => {
    const payload = buildIngestSourceCorpusPayload(parsed, [], { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })
    expect(payload.slug).toBe(`sources-${parsed.meta.segmentSlug}`)
  })

  it("activation_state est toujours 'draft', jamais 'active' — le corpus ne s'active jamais tout seul", () => {
    const payload = buildIngestSourceCorpusPayload(parsed, [], { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })
    expect(payload.activation_state).toBe("draft")
  })

  it("quality_verdict est le verdict E3 mappé (pending -> usable_with_caveats)", () => {
    const payload = buildIngestSourceCorpusPayload(parsed, [], { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })
    expect(payload.quality_verdict).toBe("usable_with_caveats")
  })

  it("une source static est forcée is_enabled=false et non-éligible, même si l'arbitrage dit le contraire", () => {
    const staticPreview = previewFor("SRC-007") // PRODAROM, static
    expect(staticPreview.isCollectable).toBe(false)
    const arbitration: SourceCorpusItemArbitration = { preview: staticPreview, isEnabled: true, exclusionReason: null }
    const payload = buildIngestSourceCorpusPayload(parsed, [arbitration], { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })
    const item = payload.sources[0]
    expect(item.is_enabled).toBe(false)
    expect(item.news_eligible).toBe(false)
    expect(item.account_watch_eligible).toBe(false)
    expect(item.exclusion_reason).toBe("Contenu statique — hors veille récurrente")
  })

  it("tier est sérialisé en chaîne (colonne text côté base)", () => {
    const preview = previewFor("SRC-001")
    const arbitration: SourceCorpusItemArbitration = { preview, isEnabled: true, exclusionReason: null }
    const payload = buildIngestSourceCorpusPayload(parsed, [arbitration], { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })
    expect(typeof payload.sources[0].tier).toBe("string")
    expect(payload.sources[0].tier).toBe(String(preview.input.tier))
  })

  it("le metadata conserve besoins_information, familles obligatoires, matrice de couverture et compteurs", () => {
    const payload = buildIngestSourceCorpusPayload(parsed, [], { sourceDocumentPath: "03-sources.json", sourceDocumentHash: "abc123", sourceFileName: "03-sources.json" })
    expect(payload.metadata.besoins_information).toBe(parsed.besoinsInformation)
    expect(payload.metadata.familles_sectorielles_obligatoires).toEqual(parsed.famillesSectoriellesObligatoires)
    expect(payload.metadata.matrice_couverture).toBe(parsed.matriceCouverture)
    expect(payload.metadata.compteurs).toEqual(parsed.compteurs)
    expect(payload.metadata.source_file_name).toBe("03-sources.json")
  })

  it("gaps est transmis tel quel (passthrough vers source_corpora.gaps)", () => {
    const payload = buildIngestSourceCorpusPayload(parsed, [], { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })
    expect(payload.gaps).toBe(parsed.gaps)
  })

  it("source_document_hash et source_document_path sont conservés tels que fournis", () => {
    const payload = buildIngestSourceCorpusPayload(parsed, [], { sourceDocumentPath: "03-sources.json", sourceDocumentHash: "deadbeef", sourceFileName: "03-sources.json" })
    expect(payload.source_document_path).toBe("03-sources.json")
    expect(payload.source_document_hash).toBe("deadbeef")
  })

  it("sur le corpus parfumerie complet : 23 sources actives par défaut, 8 exclues, éligibilités cohérentes", () => {
    const arbitrations: SourceCorpusItemArbitration[] = parsed.sources.map((source) => {
      const preview = buildSourceCorpusItemPreview(source, {
        secteur: parsed.meta.secteur,
        normalizedDomain: source.domain,
        normalizedSearchDomain: source.searchDomain,
        existingMatch: null,
      })
      return { preview, isEnabled: preview.isEnabledDefault, exclusionReason: preview.exclusionReasonDefault }
    })
    const payload = buildIngestSourceCorpusPayload(parsed, arbitrations, { sourceDocumentPath: null, sourceDocumentHash: null, sourceFileName: null })

    expect(payload.sources).toHaveLength(31)
    expect(payload.sources.filter((s) => s.is_enabled)).toHaveLength(23)
    expect(payload.sources.filter((s) => s.content_temporality === "static")).toHaveLength(8)
    for (const item of payload.sources.filter((s) => s.content_temporality === "static")) {
      expect(item.is_enabled).toBe(false)
      expect(item.news_eligible).toBe(false)
      expect(item.account_watch_eligible).toBe(false)
    }
  })
})
