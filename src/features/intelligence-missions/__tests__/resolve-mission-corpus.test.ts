import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusSelector,
  MissionSpec,
} from "../domain/mission-contracts"

const calls = vi.hoisted(() => ({ selectors: [] as CorpusSelector[] }))
const behaviour = vi.hoisted(() => ({ throwOn: null as string | null }))

function stubItem(kind: CorpusItem["ref"]["kind"], id: string): CorpusItem {
  return {
    ref: { kind, table: `table_${kind}`, id },
    title: `Titre ${id}`,
    date: "2026-07-01",
    provenance: kind,
    content: `contenu ${id}`,
    chars: `contenu ${id}`.length,
  }
}

function stubProvider(kind: CorpusItem["ref"]["kind"], weight: number): CorpusProvider {
  return {
    kind,
    execution: "user_rls",
    weight,
    async resolve(_ctx, selector): Promise<CorpusProviderResult> {
      calls.selectors.push(selector)
      if (behaviour.throwOn === kind) throw new Error(`lecture ${kind} impossible`)
      const suffix =
        selector.kind === "intelligence_document"
          ? selector.ids.join("+")
          : selector.kind === "account_context"
            ? selector.companyId
            : `${selector.periodStart}`
      return { items: [stubItem(kind, `${kind}:${suffix}`)], exclusions: [] }
    },
  }
}

vi.mock("../data/corpus/corpus-provider-registry", () => ({
  CORPUS_PROVIDERS: {
    veille_period: stubProvider("veille_period", 50),
    intelligence_document: stubProvider("intelligence_document", 70),
    account_context: stubProvider("account_context", 90),
  },
}))

import { allowedCorpusKinds, MAX_SELECTORS_PER_LAUNCH, resolveMissionCorpus } from "../data/resolve-mission-corpus"

const CTX = { workspaceId: "ws-1", supabase: {} as never }

function spec(overrides: Partial<MissionSpec["corpus"]> = {}): MissionSpec {
  return {
    slug: "test-mission",
    version: 1,
    label: "Mission de test",
    description: "",
    corpus: {
      base: [],
      requiredAtLaunch: [],
      userAddition: { allowed: false, kinds: [] },
      budget: { maxTotalChars: 10_000, maxCharsPerItem: 1_000, maxItems: 50 },
      ...overrides,
    },
    intent: { preset: "intention", userEditable: false },
    constraints: { rules: ["règle"] },
    promptTemplate: "consigne",
    model: { provider: "anthropic", model: "claude-sonnet-5", maxOutputTokens: 1_000 },
  }
}

const PERIOD: CorpusSelector = {
  kind: "veille_period",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
}

beforeEach(() => {
  calls.selectors = []
  behaviour.throwOn = null
})

describe("allowedCorpusKinds", () => {
  it("n'ouvre `userAddition.kinds` que si l'ajout utilisateur est autorisé", () => {
    const closed = spec({ userAddition: { allowed: false, kinds: ["account_context"] } })
    expect(allowedCorpusKinds(closed).has("account_context")).toBe(false)

    const open = spec({ userAddition: { allowed: true, kinds: ["account_context"] } })
    expect(allowedCorpusKinds(open).has("account_context")).toBe(true)
  })
})

describe("resolveMissionCorpus — allowlist stricte", () => {
  it("refuse un corpus que le preset n'autorise pas, au lieu de l'ignorer", async () => {
    const result = await resolveMissionCorpus(CTX, spec({ requiredAtLaunch: ["veille_period"] }), [
      PERIOD,
      { kind: "account_context", companyId: "company-1" },
    ])

    expect(result).toEqual({
      error: "Corpus « account_context » non autorisé par la mission « test-mission ».",
    })
    // Rien n'a été hydraté : le refus précède toute lecture.
    expect(calls.selectors).toEqual([])
  })

  it("refuse le lancement si un corpus exigé au lancement manque", async () => {
    const result = await resolveMissionCorpus(CTX, spec({ requiredAtLaunch: ["veille_period"] }), [])
    expect(result).toEqual({
      error: "La mission « test-mission » exige un sélecteur « veille_period » au lancement.",
    })
  })

  it("borne le nombre de sélecteurs d'un lancement", async () => {
    const many = Array.from({ length: MAX_SELECTORS_PER_LAUNCH + 1 }, () => PERIOD)
    const result = await resolveMissionCorpus(CTX, spec({ requiredAtLaunch: ["veille_period"] }), many)
    expect(result).toEqual({
      error: `Trop de sélecteurs de corpus (maximum ${MAX_SELECTORS_PER_LAUNCH}).`,
    })
  })

  it("accepte un corpus ouvert par `base`", async () => {
    const withBase = spec({ base: [{ kind: "intelligence_document", ids: ["doc-1"] }] })
    const result = await resolveMissionCorpus(CTX, withBase, [
      { kind: "intelligence_document", ids: ["doc-2"] },
    ])
    expect("error" in result).toBe(false)
  })
})

describe("resolveMissionCorpus — composition", () => {
  it("hydrate `base` et le lancement, et déduplique le sélecteur commun", async () => {
    const withBase = spec({
      base: [PERIOD],
      requiredAtLaunch: ["veille_period"],
    })
    const result = await resolveMissionCorpus(CTX, withBase, [PERIOD])

    expect(calls.selectors).toHaveLength(1)
    if ("error" in result) throw new Error(result.error)
    expect(result.items).toHaveLength(1)
  })

  it("classe les items par poids de provider décroissant", async () => {
    const open = spec({
      base: [PERIOD, { kind: "intelligence_document", ids: ["doc-1"] }],
      userAddition: { allowed: true, kinds: ["account_context"] },
    })
    const result = await resolveMissionCorpus(CTX, open, [
      { kind: "account_context", companyId: "company-1" },
    ])

    if ("error" in result) throw new Error(result.error)
    expect(result.items.map((item) => item.ref.kind)).toEqual([
      "account_context",
      "intelligence_document",
      "veille_period",
    ])
  })

  it("applique le budget du preset et trace ce qu'il écarte", async () => {
    const tight = spec({
      base: [PERIOD, { kind: "intelligence_document", ids: ["doc-1"] }],
      budget: { maxTotalChars: 10_000, maxCharsPerItem: 1_000, maxItems: 1 },
    })
    const result = await resolveMissionCorpus(CTX, tight, [])

    if ("error" in result) throw new Error(result.error)
    expect(result.stats).toMatchObject({ requested: 2, kept: 1, dropped: 1 })
    expect(result.trace.at(-1)).toMatchObject({ kept: false, reason: "budget_items" })
  })

  it("convertit l'échec d'un provider en erreur de lancement, jamais en corpus partiel", async () => {
    behaviour.throwOn = "veille_period"
    const result = await resolveMissionCorpus(CTX, spec({ base: [PERIOD] }), [])
    expect(result).toEqual({ error: "lecture veille_period impossible" })
  })
})
