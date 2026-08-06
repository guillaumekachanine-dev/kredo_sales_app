import { describe, expect, it } from "vitest"
import type {
  VeilleArticle,
  VeilleDigest,
  WatchedAccountSignal,
} from "@/app/(app)/veille/_data/veille-data"
import type { StrategicWatchAnalysis } from "../veille-desktop-contracts"
import {
  buildAnalysisIndex,
  buildArchiveEntries,
  buildDigestPeriods,
  buildNewsRows,
  buildSignalGroups,
  categoryAccentSlot,
  collectCategoryOptions,
  filterArchiveEntries,
  filterNewsRows,
  formatSignalAge,
  groupArchiveEntriesByMonth,
  isoWeekNumber,
  normalizeCategory,
  resolveSignalMarker,
} from "./veille-mobile-view-models"

function makeArticle(overrides: Partial<VeilleArticle> & { id: string }): VeilleArticle {
  return {
    id: overrides.id,
    digest_id: overrides.digest_id ?? "digest-1",
    workspace_id: "ws-1",
    selection_rank: overrides.selection_rank ?? 1,
    titre_fr: overrides.titre_fr ?? "Titre",
    source_name: overrides.source_name ?? "ChannelNews",
    url: overrides.url ?? "https://example.test",
    url_hash: "hash",
    published_at: overrides.published_at ?? "2026-07-29T08:00:00Z",
    resume: overrides.resume ?? "Résumé",
    analyse_kredo: overrides.analyse_kredo ?? "Analyse",
    action_commerciale: overrides.action_commerciale ?? "Action",
    secteur_principal: "transverse",
    secteur_secondaire: "",
    categorie: overrides.categorie ?? "Réglementation",
    tags: [],
    created_at: "2026-07-29T08:00:00Z",
    updated_at: "2026-07-29T08:00:00Z",
  } as VeilleArticle
}

function makeSignal(overrides: Partial<WatchedAccountSignal> & { id: string; companyId: string }): WatchedAccountSignal {
  return {
    id: overrides.id,
    title: overrides.title ?? "Signal",
    summary: overrides.summary ?? null,
    globalScore: overrides.globalScore ?? 0.2,
    urgencyScore: overrides.urgencyScore ?? 0,
    confidenceScore: 0.5,
    detectedAt: overrides.detectedAt ?? "2026-08-01T00:00:00Z",
    status: "new",
    category: "business",
    type: "news",
    recommendedAction: overrides.recommendedAction ?? null,
    recommendedPracticeId: null,
    companyId: overrides.companyId,
    company: overrides.company ?? {
      id: overrides.companyId,
      name: `Compte ${overrides.companyId}`,
      website: null,
      logoPath: null,
    },
    primarySource: null,
  }
}

describe("normalizeCategory", () => {
  it("replie les variantes réglementaires sur une seule famille", () => {
    const variants = ["Réglementaire", "Réglementation", "Réglementation / Gouvernance IA", "Réglementation / Souveraineté"]
    const keys = new Set(variants.map((value) => normalizeCategory(value)?.key))
    expect(keys).toEqual(new Set(["reglementation"]))
    expect(normalizeCategory("Réglementaire")?.label).toBe("Réglementation")
  })

  it("conserve un libellé inconnu tel quel au lieu de le forcer dans une famille", () => {
    expect(normalizeCategory("Quantique")).toEqual({ key: "autre:quantique", label: "Quantique" })
  })

  it("renvoie null pour une catégorie absente ou vide", () => {
    expect(normalizeCategory(null)).toBeNull()
    expect(normalizeCategory("   ")).toBeNull()
  })
})

describe("buildNewsRows / filterNewsRows", () => {
  const rows = buildNewsRows([
    makeArticle({ id: "a", titre_fr: "Ancien", published_at: "2026-07-13T08:00:00Z", categorie: "Investissement" }),
    makeArticle({ id: "b", titre_fr: "Récent", published_at: "2026-07-30T08:00:00Z", categorie: "Réglementaire" }),
  ])

  it("trie du plus récent au plus ancien", () => {
    expect(rows.map((row) => row.id)).toEqual(["b", "a"])
  })

  it("ne propose que les familles réellement présentes", () => {
    expect(collectCategoryOptions(rows).map((option) => option.label)).toEqual([
      "Investissement",
      "Réglementation",
    ])
  })

  it("filtre par catégorie normalisée", () => {
    const filtered = filterNewsRows(rows, { search: "", categoryKeys: ["reglementation"] })
    expect(filtered.map((row) => row.id)).toEqual(["b"])
  })

  it("accepte plusieurs catégories simultanément", () => {
    const filtered = filterNewsRows(rows, {
      search: "",
      categoryKeys: ["reglementation", "investissement"],
    })
    expect(filtered.map((row) => row.id)).toEqual(["b", "a"])
  })

  it("ne restreint rien quand aucune catégorie n'est sélectionnée", () => {
    expect(filterNewsRows(rows, { search: "", categoryKeys: [] })).toHaveLength(2)
  })

  it("recherche sans tenir compte des accents ni de la casse", () => {
    const filtered = filterNewsRows(rows, { search: "RECENT", categoryKeys: [] })
    expect(filtered.map((row) => row.id)).toEqual(["b"])
  })
})

describe("categoryAccentSlot", () => {
  it("donne un slot stable aux familles connues", () => {
    expect(categoryAccentSlot("reglementation")).toBe(1)
    expect(categoryAccentSlot("tendance")).toBe(2)
  })

  it("dérive un slot déterministe et valide pour une catégorie inconnue", () => {
    const first = categoryAccentSlot("autre:quantique")
    expect(first).toBe(categoryAccentSlot("autre:quantique"))
    expect(first).toBeGreaterThanOrEqual(1)
    expect(first).toBeLessThanOrEqual(7)
  })
})

describe("buildDigestPeriods", () => {
  it("calcule le numéro de semaine ISO", () => {
    expect(isoWeekNumber(new Date("2026-07-27T00:00:00Z"))).toBe(31)
    expect(isoWeekNumber(new Date("2026-01-01T00:00:00Z"))).toBe(1)
  })

  it("décrit la couverture réelle des articles, pas la semaine du digest", () => {
    // Digest publié le 3 août mais qui analyse des articles du 27 au 30 juillet.
    const periods = buildDigestPeriods(
      [{ id: "d1", digest_date: "2026-08-03", titre_digest: "Briefing", nb_sources_actives: 14 }] as VeilleDigest[],
      [
        makeArticle({ id: "a", digest_id: "d1", published_at: "2026-07-27T08:00:00Z" }),
        makeArticle({ id: "b", digest_id: "d1", published_at: "2026-07-30T08:00:00Z" }),
      ],
    )
    expect(periods[0].weekLabel).toBe("Semaine 31")
    expect(periods[0].rangeLabel).toBe("27 au 30 juillet")
    expect(periods[0].articleCount).toBe(2)
  })

  it("écrit les deux mois quand la couverture est à cheval", () => {
    const periods = buildDigestPeriods(
      [{ id: "d1", digest_date: "2026-08-05", titre_digest: "Briefing", nb_sources_actives: 1 }] as VeilleDigest[],
      [
        makeArticle({ id: "a", digest_id: "d1", published_at: "2026-07-27T08:00:00Z" }),
        makeArticle({ id: "b", digest_id: "d1", published_at: "2026-08-02T08:00:00Z" }),
      ],
    )
    expect(periods[0].rangeLabel).toBe("27 juillet au 2 août")
  })

  it("retombe sur la date du digest quand aucun article n'est daté", () => {
    const periods = buildDigestPeriods(
      [{ id: "d1", digest_date: "2026-08-03", titre_digest: "Briefing", nb_sources_actives: 0 }] as VeilleDigest[],
      [],
    )
    expect(periods[0].rangeLabel).toBe("3 août")
    expect(periods[0].articleCount).toBe(0)
  })

  it("trie du briefing le plus récent au plus ancien", () => {
    const periods = buildDigestPeriods(
      [
        { id: "old", digest_date: "2026-07-07", titre_digest: "A", nb_sources_actives: 1 },
        { id: "new", digest_date: "2026-08-03", titre_digest: "B", nb_sources_actives: 1 },
      ] as VeilleDigest[],
      [],
    )
    expect(periods.map((period) => period.digestId)).toEqual(["new", "old"])
  })
})

describe("resolveSignalMarker", () => {
  it("marque « à traiter » au-dessus du seuil d'urgence de 0,70", () => {
    expect(resolveSignalMarker(makeSignal({ id: "s", companyId: "c", urgencyScore: 0.7 }))).toBe("action")
    expect(resolveSignalMarker(makeSignal({ id: "s", companyId: "c", urgencyScore: 0.85 }))).toBe("action")
  })

  it("marque « à surveiller » sous le seuil quand une action est recommandée", () => {
    expect(
      resolveSignalMarker(makeSignal({ id: "s", companyId: "c", urgencyScore: 0.4, recommendedAction: "Rappeler" })),
    ).toBe("watch")
  })

  it("ne marque rien sans urgence ni action recommandée", () => {
    expect(resolveSignalMarker(makeSignal({ id: "s", companyId: "c", urgencyScore: 0.4 }))).toBeNull()
    expect(
      resolveSignalMarker(makeSignal({ id: "s", companyId: "c", urgencyScore: 0.1, recommendedAction: "   " })),
    ).toBeNull()
  })
})

describe("buildSignalGroups", () => {
  const now = new Date("2026-08-06T00:00:00Z")

  it("regroupe par entreprise et compte les signaux secondaires", () => {
    const groups = buildSignalGroups(
      [
        makeSignal({ id: "1", companyId: "voyage", globalScore: 0.658, urgencyScore: 0.85, title: "Cyberattaque" }),
        makeSignal({ id: "2", companyId: "voyage", globalScore: 0.648, urgencyScore: 0.8, title: "Phishing" }),
        makeSignal({ id: "3", companyId: "robertet", globalScore: 0.485, urgencyScore: 0.4, title: "SASE" }),
      ],
      now,
    )
    expect(groups).toHaveLength(2)
    expect(groups[0].companyId).toBe("voyage")
    expect(groups[0].otherCount).toBe(1)
    expect(groups[1].otherCount).toBe(0)
  })

  it("fusionne les lignes strictement redondantes du même compte", () => {
    const groups = buildSignalGroups(
      [
        makeSignal({ id: "1", companyId: "nice", title: "Saturation de l'aéroport", globalScore: 0.325 }),
        makeSignal({ id: "2", companyId: "nice", title: "saturation de l'aéroport", globalScore: 0.32 }),
        makeSignal({ id: "3", companyId: "nice", title: "Nouveau patron", globalScore: 0.31 }),
      ],
      now,
    )
    expect(groups[0].signals).toHaveLength(2)
    expect(groups[0].otherCount).toBe(1)
  })

  it("trie par priorité, puis score global, puis fraîcheur", () => {
    const groups = buildSignalGroups(
      [
        makeSignal({ id: "watch", companyId: "b", globalScore: 0.9, urgencyScore: 0.4, recommendedAction: "Agir" }),
        makeSignal({ id: "urgent", companyId: "a", globalScore: 0.3, urgencyScore: 0.9 }),
        makeSignal({ id: "plain", companyId: "c", globalScore: 0.95, urgencyScore: 0.1 }),
      ],
      now,
    )
    expect(groups.map((group) => group.companyId)).toEqual(["a", "b", "c"])
  })

  it("départage deux signaux de même priorité et même score par la fraîcheur", () => {
    const groups = buildSignalGroups(
      [
        makeSignal({ id: "old", companyId: "a", globalScore: 0.5, detectedAt: "2026-07-01T00:00:00Z" }),
        makeSignal({ id: "new", companyId: "b", globalScore: 0.5, detectedAt: "2026-08-01T00:00:00Z" }),
      ],
      now,
    )
    expect(groups.map((group) => group.companyId)).toEqual(["b", "a"])
  })

  it("calcule une ancienneté compacte", () => {
    expect(formatSignalAge("2026-07-09T00:00:00Z", now)).toBe("28 j")
    expect(formatSignalAge("2026-08-05T20:00:00Z", now)).toBe("4 h")
    expect(formatSignalAge(null, now)).toBeNull()
  })
})

describe("buildAnalysisIndex", () => {
  const analysis: StrategicWatchAnalysis = {
    id: "an-1",
    title: "Analyse stratégique de la veille — Juillet 2026",
    status: "ready",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    versionNumber: 1,
    content: {
      schemaVersion: 1,
      period: { start: "2026-07-01", end: "2026-07-31", label: "Juillet 2026" },
      executiveSummary: "Synthèse.",
      majorTrends: [
        { title: "Passage à l'échelle", synthesis: "Industrialiser.", articleIds: [], sectors: [], confidence: 0.8 },
      ],
      weakSignals: [],
      regulatoryDevelopments: [],
      commercialOpportunities: [
        { title: "Audit", rationale: "Cadre.", recommendedAction: "Proposer", practices: [], articleIds: [] },
        { title: "POC au run", rationale: "Méthode.", recommendedAction: "Proposer", practices: [], articleIds: [] },
      ],
      risksAndWatchpoints: [{ title: "Dépendance", explanation: "Verrouillage.", articleIds: [] }],
      priorityActions: [],
      coverage: { digestsCount: 2, articlesCount: 20, sourcesCount: 5 },
    },
  }

  it("expose des compteurs réels et une couverture lisible", () => {
    const vm = buildAnalysisIndex(analysis)
    expect(vm.periodLabel).toBe("Juillet 2026")
    expect(vm.analysisTitle).toBe("Analyse Juillet 2026")
    expect(vm.producedAtLabel).toBe("produite le 01/08")
    expect(vm.periodRange).toBe("1–31 juillet")
    expect(vm.statusLabel).toBe("Prête")
    expect(vm.coverageLabel).toBe("20 articles · 5 sources")
    expect(vm.sections.map((section) => section.count)).toEqual([1, 2, 1])
  })

  it("dégrade proprement quand le contenu généré est illisible", () => {
    const vm = buildAnalysisIndex({ ...analysis, content: null })
    expect(vm.executiveSummary).toBe("")
    expect(vm.coverageLabel).toBeNull()
    expect(vm.sections.every((section) => section.count === 0)).toBe(true)
  })
})

describe("archives", () => {
  const digests = [
    { id: "d1", digest_date: "2026-08-03", titre_digest: "Briefing août", nb_sources_actives: 14 },
    { id: "d2", digest_date: "2026-07-13", titre_digest: "Briefing juillet", nb_sources_actives: 14 },
  ] as VeilleDigest[]

  const analyses = [
    {
      id: "an-1",
      title: "Analyse stratégique de la veille — Juillet 2026",
      status: "ready",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      versionNumber: 1,
      content: null,
    },
  ] as StrategicWatchAnalysis[]

  const entries = buildArchiveEntries({
    digests,
    analyses,
    articleCountByDigest: new Map([
      ["d1", 5],
      ["d2", 5],
    ]),
  })

  it("mêle briefings et analyses en chronologie décroissante", () => {
    expect(entries.map((entry) => entry.id)).toEqual(["d1", "an-1", "d2"])
    expect(entries[0].metaLabel).toBe("5 articles · 14 sources")
  })

  it("regroupe par mois en conservant l'ordre", () => {
    const groups = groupArchiveEntriesByMonth(entries)
    expect(groups.map((group) => group.monthKey)).toEqual(["2026-08", "2026-07"])
    expect(groups[1].entries.map((entry) => entry.id)).toEqual(["an-1", "d2"])
  })

  it("filtre par type et par période", () => {
    expect(
      filterArchiveEntries(entries, { search: "", kind: "analysis", period: "all" }).map((entry) => entry.id),
    ).toEqual(["an-1"])

    const recent = filterArchiveEntries(
      entries,
      { search: "", kind: "all", period: "3m" },
      new Date("2026-08-06T00:00:00Z"),
    )
    expect(recent).toHaveLength(3)

    // Au 15/10/2026, la fenêtre « 3 derniers mois » démarre au 15/07 :
    // le briefing du 13/07 en sort, les deux entrées plus récentes restent.
    const narrow = filterArchiveEntries(
      entries,
      { search: "", kind: "all", period: "3m" },
      new Date("2026-10-15T00:00:00Z"),
    )
    expect(narrow.map((entry) => entry.id)).toEqual(["d1", "an-1"])
  })

  it("recherche sur le titre sans tenir compte des accents", () => {
    expect(
      filterArchiveEntries(entries, { search: "aout", kind: "all", period: "all" }).map((entry) => entry.id),
    ).toEqual(["d1"])
  })
})
