/**
 * Critère de sortie du lot L1, joué de bout en bout sur le preset pilote.
 *
 * Depuis les briques de la gateway — preset du catalogue, providers réels, budget,
 * assembleur —, une période de veille produit un prompt assemblé et un `ResolvedCorpus`
 * tracé et borné, sans qu'aucune ligne d'un autre workspace ne soit lue.
 */

import { describe, expect, it } from "vitest"
import { assembleMissionPrompt } from "../data/assemble-mission-prompt"
import {
  buildMissionEnvelope,
  buildMissionInputSnapshot,
  buildMissionRunConfig,
  resolveMissionRunEntity,
} from "../data/build-mission-launch"
import { resolveMissionCorpus } from "../data/resolve-mission-corpus"
import { findMissionSpec } from "../domain/mission-catalog"
import { buildMissionRunType } from "../domain/mission-run-type"
import type { CorpusSelector, MissionSpec, ResolvedCorpus, SourceRef } from "../domain/mission-contracts"
import { createFakeSupabase, type FakeDataset } from "./fake-supabase"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const OTHER_WORKSPACE = "22222222-2222-2222-2222-222222222222"
const SPEC = findMissionSpec("veille-analyse-mensuelle") as MissionSpec
const REQUESTED_AT = "2026-08-18T08:00:00.000Z"

const PERIOD: CorpusSelector = {
  kind: "veille_period",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
}

const DATASET: FakeDataset = {
  veille_digests: [
    {
      id: "digest-1",
      workspace_id: WORKSPACE,
      titre_digest: "Semaine du 7 juillet",
      resume_hebdo: "Consolidation du marché cyber.",
      digest_date: "2026-07-07",
    },
    {
      id: "digest-voisin",
      workspace_id: OTHER_WORKSPACE,
      titre_digest: "Digest voisin",
      resume_hebdo: "CONFIDENTIEL-VOISIN",
      digest_date: "2026-07-07",
    },
  ],
  veille_articles: [
    {
      id: "article-1",
      workspace_id: WORKSPACE,
      digest_id: "digest-1",
      titre_fr: "NIS2 entre en application",
      resume: "Les obligations démarrent.",
      analyse_kredo: "Fenêtre de 18 mois.",
      action_commerciale: "Cibler les RSSI industriels.",
      published_at: "2026-07-09",
      source_name: "Les Echos",
    },
    {
      id: "article-2",
      workspace_id: WORKSPACE,
      digest_id: "digest-1",
      titre_fr: "Pénurie d'architectes cloud",
      resume: "Tension sur les profils.",
      analyse_kredo: "Pression sur les TJM.",
      action_commerciale: "Anticiper le sourcing.",
      published_at: "2026-07-14",
      source_name: "Usine Digitale",
    },
  ],
}

async function resolvePilotCorpus(budget = SPEC.corpus.budget) {
  const fake = createFakeSupabase(DATASET)
  const corpus = await resolveMissionCorpus(
    { workspaceId: WORKSPACE, supabase: fake.supabase },
    { ...SPEC, corpus: { ...SPEC.corpus, budget } },
    [PERIOD],
  )
  if ("error" in corpus) throw new Error(corpus.error)
  return { corpus, fake }
}

describe("pilote veille-analyse-mensuelle — corpus", () => {
  it("hydrate la période et n'atteint jamais le workspace voisin", async () => {
    const { corpus } = await resolvePilotCorpus()

    expect(corpus.items.map((item) => item.ref.id)).toEqual(["article-2", "article-1", "digest-1"])
    expect(corpus.stats).toMatchObject({ requested: 3, kept: 3, dropped: 0 })
    expect(corpus.stats.totalChars).toBe(
      corpus.items.reduce((total, item) => total + item.chars, 0),
    )
    expect(JSON.stringify(corpus)).not.toContain("CONFIDENTIEL-VOISIN")
  })

  it("reste borné par le budget du preset et trace chaque écart", async () => {
    const { corpus } = await resolvePilotCorpus({
      maxTotalChars: 120_000,
      maxCharsPerItem: 4_000,
      maxItems: 1,
    })

    expect(corpus.items).toHaveLength(1)
    expect(corpus.stats.dropped).toBe(2)
    expect(corpus.trace).toHaveLength(3)
    expect(corpus.trace.filter((entry) => !entry.kept).every((entry) => entry.reason)).toBe(true)
  })
})

describe("pilote veille-analyse-mensuelle — prompt et enveloppe", () => {
  it("assemble un prompt citant chaque source par son triplet", async () => {
    const { corpus } = await resolvePilotCorpus()
    const { systemPrompt, userPrompt } = assembleMissionPrompt(SPEC, corpus)

    expect(systemPrompt).toContain("Réponds UNIQUEMENT par l'objet JSON brut.")
    expect(userPrompt).toContain("Analyse mensuelle de la veille")
    expect(userPrompt).toContain("id: article-1")
    expect(userPrompt).toContain("Cibler les RSSI industriels.")
  })

  it("envoie les prompts à n8n mais ne persiste QUE la trace (P2)", async () => {
    const { corpus } = await resolvePilotCorpus()
    const prompts = assembleMissionPrompt(SPEC, corpus)

    const envelope = buildMissionEnvelope(SPEC, corpus, prompts, REQUESTED_AT)
    expect(envelope.userPrompt).toContain("Cibler les RSSI industriels.")
    expect(envelope.missionSlug).toBe("veille-analyse-mensuelle")
    expect(envelope.budget).toEqual(SPEC.corpus.budget)

    const snapshot = buildMissionInputSnapshot(SPEC, corpus, [PERIOD], REQUESTED_AT)
    const serialized = JSON.stringify(snapshot)
    // Aucun contenu de corpus, ni directement ni via le prompt.
    for (const item of corpus.items) {
      expect(serialized).not.toContain(item.content)
    }
    expect(serialized).not.toContain("systemPrompt")
    expect(serialized).not.toContain("userPrompt")
  })

  it("la trace persistée suffit à reconstituer un SourceRef depuis le seul identifiant", async () => {
    const { corpus } = await resolvePilotCorpus()
    const snapshot = buildMissionInputSnapshot(SPEC, corpus, [PERIOD], REQUESTED_AT)

    // Ce que fera le callback en L3 : le LLM ne rend qu'un identifiant, la trace doit
    // porter tout le reste du SourceRef.
    const trace = snapshot.trace as ResolvedCorpus["trace"]
    const entry = trace.find((candidate) => candidate.ref.id === "article-1")
    expect(entry).toBeDefined()

    const rebuilt: SourceRef = {
      ref: entry!.ref,
      title: entry!.title,
      provenance: entry!.provenance,
    }
    expect(rebuilt).toEqual({
      ref: { kind: "veille_period", table: "veille_articles", id: "article-1" },
      title: "NIS2 entre en application",
      provenance: "veille_articles · Les Echos",
    })
  })

  it("porte le run_type et la config de mission attendus (M-3, ADR §3)", async () => {
    const { corpus } = await resolvePilotCorpus()

    expect(buildMissionRunType(SPEC.slug)).toBe("mission:veille-analyse-mensuelle")
    expect(buildMissionRunConfig(SPEC)).toEqual({
      missionSlug: "veille-analyse-mensuelle",
      missionVersion: SPEC.version,
      corpusBudget: SPEC.corpus.budget,
    })
    expect(resolveMissionRunEntity(corpus, WORKSPACE)).toEqual({
      entityType: "workspace",
      entityId: WORKSPACE,
      companyId: null,
    })
  })
})

describe("resolveMissionRunEntity", () => {
  it("rattache le run au compte SEULEMENT si le corpus résolu le contient", () => {
    const withCompany: ResolvedCorpus = {
      items: [
        {
          ref: { kind: "account_context", table: "companies", id: "company-1" },
          title: "Concurrent SA",
          date: null,
          provenance: "companies",
          content: "…",
          chars: 1,
        },
      ],
      stats: { requested: 1, kept: 1, dropped: 0, totalChars: 1 },
      trace: [],
    }
    expect(resolveMissionRunEntity(withCompany, WORKSPACE)).toEqual({
      entityType: "company",
      entityId: "company-1",
      companyId: "company-1",
    })

    // Un compte refusé par la garde ne laisse aucun item : le run reste au workspace,
    // et un `companyId` envoyé par le navigateur n'a jamais eu voix au chapitre.
    const refused: ResolvedCorpus = {
      items: [],
      stats: { requested: 1, kept: 0, dropped: 1, totalChars: 0 },
      trace: [],
    }
    expect(resolveMissionRunEntity(refused, WORKSPACE)).toEqual({
      entityType: "workspace",
      entityId: WORKSPACE,
      companyId: null,
    })
  })
})
