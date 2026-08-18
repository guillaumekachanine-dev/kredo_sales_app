import { describe, expect, it } from "vitest"
import {
  VEILLE_DIGEST_QUERY_LIMIT,
  veillePeriodProvider,
} from "../data/corpus/veille-period-provider"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"

const DATASET: FakeDataset = {
  veille_digests: [
    {
      id: "digest-juillet",
      workspace_id: WORKSPACE,
      titre_digest: "Semaine du 7 juillet",
      resume_hebdo: "Trois mouvements notables.",
      digest_date: "2026-07-07",
    },
    {
      id: "digest-hors-periode",
      workspace_id: WORKSPACE,
      titre_digest: "Semaine du 1er septembre",
      resume_hebdo: "Hors période.",
      digest_date: "2026-09-01",
    },
    {
      id: "digest-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      titre_digest: "Digest voisin",
      resume_hebdo: "Ne doit jamais sortir.",
      digest_date: "2026-07-08",
    },
  ],
  veille_articles: [
    {
      id: "article-1",
      workspace_id: WORKSPACE,
      digest_id: "digest-juillet",
      titre_fr: "Directive NIS2",
      resume: "Entrée en application.",
      analyse_kredo: "Fenêtre cyber.",
      action_commerciale: "Contacter les RSSI.",
      published_at: "2026-07-09",
      source_name: "Les Echos",
    },
    {
      id: "article-sans-date",
      workspace_id: WORKSPACE,
      digest_id: "digest-juillet",
      titre_fr: "Brève sans date",
      resume: "Contenu court.",
      analyse_kredo: "",
      action_commerciale: "",
      published_at: null,
      source_name: "",
    },
    {
      id: "article-vide",
      workspace_id: WORKSPACE,
      digest_id: "digest-juillet",
      titre_fr: "Entrée vide",
      resume: "",
      analyse_kredo: "",
      action_commerciale: "",
      published_at: "2026-07-10",
      source_name: "AFP",
    },
    {
      id: "article-autre-workspace",
      workspace_id: OTHER_WORKSPACE,
      digest_id: "digest-juillet",
      titre_fr: "Article voisin",
      resume: "Ne doit jamais sortir.",
      analyse_kredo: "",
      action_commerciale: "",
      published_at: "2026-07-11",
      source_name: "X",
    },
  ],
}

const SELECTOR = {
  kind: "veille_period",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
} as const

describe("veillePeriodProvider", () => {
  it("déclare une exécution sous RLS utilisateur", () => {
    expect(veillePeriodProvider.execution).toBe("user_rls")
    expect(veillePeriodProvider.kind).toBe("veille_period")
  })

  it("hydrate le contenu du digest et de ses articles sur la période", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await veillePeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const ids = result.items.map((item) => item.ref.id)
    expect(ids).toEqual(["digest-juillet", "article-1", "article-sans-date"])

    const digest = result.items[0]
    expect(digest.ref.table).toBe("veille_digests")
    expect(digest.content).toBe("Synthèse de la période : Trois mouvements notables.")
    expect(digest.date).toBe("2026-07-07")

    const article = result.items[1]
    expect(article.provenance).toBe("veille_articles · Les Echos")
    expect(article.content).toContain("Résumé : Entrée en application.")
    expect(article.content).toContain("Analyse Kredo : Fenêtre cyber.")
    expect(article.content).toContain("Action commerciale : Contacter les RSSI.")
    expect(article.chars).toBe(article.content.length)
  })

  it("ne remonte jamais une ligne d'un autre workspace, ni hors période", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await veillePeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("Ne doit jamais sortir")
    expect(serialized).not.toContain("Hors période")
    for (const call of fake.calls) {
      expect(call.eq).toContainEqual(["workspace_id", WORKSPACE])
    }
  })

  it("retombe sur la date du digest quand l'article n'est pas daté", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await veillePeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )
    const undated = result.items.find((item) => item.ref.id === "article-sans-date")
    expect(undated?.date).toBe("2026-07-07")
    expect(undated?.provenance).toBe("veille_articles")
  })

  it("écarte les lignes sans aucun contenu plutôt que d'envoyer un item vide au LLM", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await veillePeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )
    expect(result.items.map((item) => item.ref.id)).not.toContain("article-vide")
  })

  it("n'interroge pas les articles quand la période n'a aucun digest", async () => {
    const fake = createFakeSupabase(DATASET)
    const result = await veillePeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      { kind: "veille_period", periodStart: "2026-01-01", periodEnd: "2026-01-31" },
    )
    expect(result.items).toEqual([])
    expect(fake.tablesRead()).toEqual(["veille_digests"])
  })

  it("trace l'atteinte de la borne de requête au lieu de tronquer en silence", async () => {
    const saturated: FakeDataset = {
      veille_digests: Array.from({ length: VEILLE_DIGEST_QUERY_LIMIT + 5 }, (_unused, index) => ({
        id: `digest-${index}`,
        workspace_id: WORKSPACE,
        titre_digest: `Digest ${index}`,
        resume_hebdo: "Contenu.",
        digest_date: "2026-07-07",
      })),
      veille_articles: [],
    }
    const fake = createFakeSupabase(saturated)
    const result = await veillePeriodProvider.resolve(
      { workspaceId: WORKSPACE, supabase: fake.supabase },
      SELECTOR,
    )
    expect(result.items).toHaveLength(VEILLE_DIGEST_QUERY_LIMIT)
    expect(result.exclusions).toHaveLength(1)
    expect(result.exclusions[0].reason).toBe("provider_limit")
  })

  it("lève plutôt que de rendre un corpus amputé si la lecture échoue", async () => {
    const fake = createFakeSupabase(DATASET, { errors: { veille_articles: "connexion perdue" } })
    await expect(
      veillePeriodProvider.resolve({ workspaceId: WORKSPACE, supabase: fake.supabase }, SELECTOR),
    ).rejects.toThrow(/articles de veille/i)
  })
})
