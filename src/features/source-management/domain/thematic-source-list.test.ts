import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  MIN_THEMATIC_SOURCES,
  THEMATIC_SOURCE_LIST_FORMAT,
  buildIngestThematicCorpusPayload,
  buildThematicSourceItemPreview,
  isThematicSourceListDocument,
  parseThematicSourceList,
  type ParsedThematicSourceList,
  type ThematicSourceInput,
} from "./thematic-source-list"

const CORPORA_DIR = join(process.cwd(), "docs/FEATURES/veille_digest_thematique/corpora")

function source(overrides: Record<string, unknown> = {}) {
  return {
    name: "OpenAI — News",
    rssUrl: "https://openai.com/news/rss.xml",
    homepage: "https://openai.com/news/",
    newsEligible: true,
    ...overrides,
  }
}

function doc(overrides: Record<string, unknown> = {}) {
  return {
    format: THEMATIC_SOURCE_LIST_FORMAT,
    name: "Corpus démo",
    slug: "corpus-demo",
    snapshot_date: "2026-09-06",
    sources: [
      source(),
      source({ name: "B", rssUrl: "https://b.example.com/feed/", homepage: "https://b.example.com/" }),
      source({ name: "C", rssUrl: "https://c.example.com/feed/", homepage: "https://c.example.com/" }),
    ],
    ...overrides,
  }
}

function parseOk(raw: unknown): ParsedThematicSourceList {
  const result = parseThematicSourceList(raw)
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path} ${e.message}`).join(" | "))
  return result.data
}

function errorsOf(raw: unknown): string[] {
  const result = parseThematicSourceList(raw)
  if (result.ok) throw new Error("Attendu un échec de parsing")
  return result.errors.map((e) => `${e.path} — ${e.message}`)
}

describe("isThematicSourceListDocument", () => {
  it("reconnait le format sans le valider", () => {
    expect(isThematicSourceListDocument({ format: THEMATIC_SOURCE_LIST_FORMAT })).toBe(true)
    expect(isThematicSourceListDocument(JSON.stringify(doc()))).toBe(true)
  })

  it("ne reconnait pas un livrable E3, qui n'a pas de cle format", () => {
    expect(isThematicSourceListDocument({ meta: { segment_slug: "seg-x", version: "1.1" } })).toBe(false)
    expect(isThematicSourceListDocument("pas du json")).toBe(false)
  })
})

describe("parseThematicSourceList", () => {
  it("accepte un document minimal et derive le domaine de recherche", () => {
    const parsed = parseOk(doc())

    expect(parsed.slug).toBe("corpus-demo")
    expect(parsed.sources).toHaveLength(3)
    expect(parsed.newsEligibleCount).toBe(3)
    expect(parsed.excludedCount).toBe(0)
    expect(parsed.sources[0].searchDomain).toBe("openai.com")
  })

  it("retire le www du domaine, pour dedoublonner contre un socle qui ne le porte pas", () => {
    const parsed = parseOk(
      doc({
        sources: [
          source({ homepage: "https://www.oneusefulthing.org/", rssUrl: "https://www.oneusefulthing.org/feed" }),
          source({ name: "B", homepage: "https://b.example.com/", rssUrl: "https://b.example.com/feed/" }),
          source({ name: "C", homepage: "https://c.example.com/", rssUrl: "https://c.example.com/feed/" }),
        ],
      }),
    )

    expect(parsed.sources[0].searchDomain).toBe("oneusefulthing.org")
  })

  it("refuse un format inconnu", () => {
    expect(errorsOf(doc({ format: "autre-chose" })).join()).toContain("format doit valoir")
  })

  it("refuse un slug absent ou mal forme", () => {
    expect(errorsOf(doc({ slug: undefined })).join()).toContain("slug est obligatoire")
    expect(errorsOf(doc({ slug: "Folio AI Tech" })).join()).toContain("minuscules")
  })

  it("refuse une date de snapshot absente ou mal formee", () => {
    expect(errorsOf(doc({ snapshot_date: undefined })).join()).toContain("obligatoire")
    expect(errorsOf(doc({ snapshot_date: "06/09/2026" })).join()).toContain("AAAA-MM-JJ")
  })

  it("refuse une URL qui n'est pas http(s)", () => {
    expect(errorsOf(doc({ sources: [source({ homepage: "ftp://x.example.com" }), source(), source()] })).join()).toContain(
      "n'est pas une URL http(s)",
    )
  })

  it("refuse une source ecartee sans motif : une decision non tracee", () => {
    const raw = doc({
      sources: [source(), source({ name: "B", homepage: "https://b.example.com/" }), source({ name: "C", homepage: "https://c.example.com/" }), source({ name: "D", homepage: "https://d.example.com/", rssUrl: null, newsEligible: false })],
    })
    expect(errorsOf(raw).join()).toContain("exclusionReason")
  })

  it("refuse un motif d'exclusion sur une source active : une contradiction", () => {
    const raw = doc({
      sources: [source({ exclusionReason: "au cas où" }), source({ name: "B", homepage: "https://b.example.com/" }), source({ name: "C", homepage: "https://c.example.com/" })],
    })
    expect(errorsOf(raw).join()).toContain("ne doit pas porter d'exclusionReason")
  })

  it("refuse deux entrees sur le meme domaine : la seconde ecraserait la premiere", () => {
    const raw = doc({
      sources: [source(), source({ name: "Doublon", homepage: "https://openai.com/blog" }), source({ name: "C", homepage: "https://c.example.com/" })],
    })
    expect(errorsOf(raw).join()).toContain("Domaine(s) en double")
  })

  it("refuse un corpus sous le plancher de sources eligibles", () => {
    const raw = doc({
      sources: [
        source(),
        source({ name: "B", homepage: "https://b.example.com/", rssUrl: null, newsEligible: false, exclusionReason: "flux mort" }),
        source({ name: "C", homepage: "https://c.example.com/", rssUrl: null, newsEligible: false, exclusionReason: "flux mort" }),
      ],
    })
    expect(errorsOf(raw).join()).toContain(`au moins ${MIN_THEMATIC_SOURCES} sources éligibles`)
  })

  it("refuse une categorie KREDO hors domaine", () => {
    expect(errorsOf(doc({ sources: [source({ kredoCategory: "inventee" }), source({ name: "B", homepage: "https://b.example.com/" }), source({ name: "C", homepage: "https://c.example.com/" })] })).join()).toContain(
      "hors domaine",
    )
  })

  it("rend une erreur propre sur un JSON illisible, jamais une exception", () => {
    expect(errorsOf("{ pas du json")[0]).toContain("n'est pas un JSON valide")
  })
})

describe("buildThematicSourceItemPreview", () => {
  const input: ThematicSourceInput = {
    name: "OpenAI — News",
    rssUrl: "https://openai.com/news/rss.xml",
    homepage: "https://openai.com/news/",
    searchDomain: "openai.com",
    kredoCategory: "frontier",
    newsEligible: true,
    exclusionReason: null,
  }

  it("cree une source neuve quand le domaine est inconnu du catalogue", () => {
    const preview = buildThematicSourceItemPreview(input, { corpusName: "Folio AI Tech", existingMatch: null })

    expect(preview.isNewSource).toBe(true)
    expect(preview.sourceKey).toBe("corpus:openai.com")
    expect(preview.srcId).toBe("openai.com")
    expect(preview.mappedFamily).toBe("Folio AI Tech")
  })

  it("reutilise la source deja cataloguee plutot que de creer un doublon", () => {
    const preview = buildThematicSourceItemPreview(input, {
      corpusName: "Folio AI Tech",
      existingMatch: { id: "id-1", sourceKey: "OpenAI News", origin: "system", isLocked: false, name: "OpenAI News" },
    })

    expect(preview.isNewSource).toBe(false)
    expect(preview.sourceKey).toBe("OpenAI News")
    expect(preview.mappedName).toBe("OpenAI News")
  })

  it("prend l'URL de flux telle quelle : ce format la declare, il n'y a rien a deviner", () => {
    const preview = buildThematicSourceItemPreview(
      { ...input, rssUrl: "https://exemple.fr/atom-du-jour" },
      { corpusName: "X", existingMatch: null },
    )

    expect(preview.mappedCollectionUrl).toBe("https://exemple.fr/atom-du-jour")
    expect(preview.automationFit).toBe("high")
  })

  it("classe une source sans flux en repli site: donc automation faible", () => {
    const preview = buildThematicSourceItemPreview(
      { ...input, rssUrl: null, newsEligible: false, exclusionReason: "flux mort" },
      { corpusName: "X", existingMatch: null },
    )

    expect(preview.mappedCollectionUrl).toBeNull()
    expect(preview.automationFit).toBe("low")
    expect(preview.isEnabledDefault).toBe(false)
    expect(preview.exclusionReasonDefault).toBe("flux mort")
  })
})

describe("buildIngestThematicCorpusPayload", () => {
  const parsed = parseOk(
    doc({
      sources: [
        source(),
        source({ name: "B", homepage: "https://b.example.com/", rssUrl: "https://b.example.com/feed/" }),
        source({ name: "C", homepage: "https://c.example.com/", rssUrl: "https://c.example.com/feed/" }),
        source({ name: "Mort", homepage: "https://d.example.com/", rssUrl: null, newsEligible: false, exclusionReason: "flux 404" }),
      ],
    }),
  )

  const payload = buildIngestThematicCorpusPayload(
    parsed,
    parsed.sources.map((input) => {
      const preview = buildThematicSourceItemPreview(input, { corpusName: parsed.name, existingMatch: null })
      return { preview, isEnabled: preview.isEnabledDefault, exclusionReason: null }
    }),
    { sourceDocumentPath: "corpus.json", sourceDocumentHash: "abc", sourceFileName: "corpus.json" },
  )

  it("n'active jamais le corpus a l'import", () => {
    expect(payload.activation_state).toBe("draft")
  })

  it("porte le slug du document, sans prefixe sectoriel", () => {
    expect(payload.slug).toBe("corpus-demo")
  })

  it("laisse a null les notions de preuve E3, plutot que d'inventer un tier ou un score", () => {
    for (const item of payload.sources) {
      expect(item.tier).toBeNull()
      expect(item.utility_score).toBeNull()
      expect(item.primary_role).toBe("watch")
    }
  })

  it("n'ouvre jamais un corpus thematique a la veille compte", () => {
    for (const item of payload.sources) {
      expect(item.account_watch_eligible).toBe(false)
    }
  })

  it("donne le scope news et le pack minimal aux seules sources actives", () => {
    const active = payload.sources.filter((item) => item.news_eligible)
    const inactive = payload.sources.filter((item) => !item.news_eligible)

    expect(active).toHaveLength(3)
    expect(active.every((item) => item.usage_scopes.includes("news") && item.pack === "minimal")).toBe(true)
    expect(inactive).toHaveLength(1)
    expect(inactive[0].usage_scopes).toEqual([])
    expect(inactive[0].pack).toBe("enrichi")
    expect(inactive[0].exclusion_reason).toBe("flux 404")
    expect(inactive[0].is_enabled).toBe(false)
  })

  it("declare les sources en continuous : jamais static, qui serait refuse par l'action", () => {
    expect(payload.sources.every((item) => item.content_temporality === "continuous")).toBe(true)
  })
})

describe("corpus Folio versionnés dans le dépôt", () => {
  it("folio-ai-tech se parse et compte 8 sources éligibles sur 11", () => {
    const parsed = parseOk(readFileSync(join(CORPORA_DIR, "folio-ai-tech.sources.json"), "utf8"))

    expect(parsed.slug).toBe("folio-ai-tech")
    expect(parsed.sources).toHaveLength(11)
    expect(parsed.newsEligibleCount).toBe(8)
    expect(parsed.excludedCount).toBe(3)
  })

  it("folio-ai-business se parse et compte 4 sources éligibles sur 14", () => {
    const parsed = parseOk(readFileSync(join(CORPORA_DIR, "folio-ai-business.sources.json"), "utf8"))

    expect(parsed.slug).toBe("folio-ai-business")
    expect(parsed.sources).toHaveLength(14)
    expect(parsed.newsEligibleCount).toBe(4)
    expect(parsed.excludedCount).toBe(10)
  })

  it("toute source éligible porte un flux, et toute source écartée porte un motif", () => {
    for (const file of ["folio-ai-tech.sources.json", "folio-ai-business.sources.json"]) {
      const parsed = parseOk(readFileSync(join(CORPORA_DIR, file), "utf8"))
      for (const src of parsed.sources) {
        if (src.newsEligible) {
          expect(src.rssUrl, `${file} — ${src.name}`).not.toBeNull()
          expect(src.exclusionReason, `${file} — ${src.name}`).toBeNull()
        } else {
          expect(src.exclusionReason, `${file} — ${src.name}`).toBeTruthy()
        }
      }
    }
  })
})
