import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { getTopicBadgeLabel } from "../domain/digest-presets"
import { buildArchiveEntries, buildDigestPeriods } from "@/components/veille/mobile/veille-mobile-view-models"
import type { VeilleDigest, VeilleArticle } from "@/app/(app)/veille/_data/veille-data"

const root = process.cwd()

describe("Veille Reading by Topic & DEF-4 deterministic sort (ADR-0022)", () => {
  const veilleDataCode = readFileSync(
    resolve(root, "src/app/(app)/veille/_data/veille-data.ts"),
    "utf8",
  )
  const veillePageCode = readFileSync(
    resolve(root, "src/app/(app)/veille/page.tsx"),
    "utf8",
  )

  describe("DEF-4 Deterministic Sort and Monthly Analysis Scope in veille-data.ts", () => {
    it("sorts getLatestVeilleDigest deterministically by digest_date DESC, created_at DESC, id DESC", () => {
      expect(veilleDataCode).toMatch(
        /getLatestVeilleDigest[\s\S]*?\.order\("digest_date",\s*\{\s*ascending:\s*false\s*\}\)[\s\S]*?\.order\("created_at",\s*\{\s*ascending:\s*false\s*\}\)[\s\S]*?\.order\("id",\s*\{\s*ascending:\s*false\s*\}\)/,
      )
    })

    it("sorts getPastVeilleDigests deterministically by digest_date DESC, created_at DESC, id DESC", () => {
      expect(veilleDataCode).toMatch(
        /getPastVeilleDigests[\s\S]*?\.order\("digest_date",\s*\{\s*ascending:\s*false\s*\}\)[\s\S]*?\.order\("created_at",\s*\{\s*ascending:\s*false\s*\}\)[\s\S]*?\.order\("id",\s*\{\s*ascending:\s*false\s*\}\)/,
      )
    })

    it("restricts getMonthlyWatchGenerationContext strictly to topic_key = global", () => {
      expect(veilleDataCode).toMatch(
        /getMonthlyWatchGenerationContext[\s\S]*?\.eq\("topic_key",\s*"global"\)/,
      )
    })
  })

  describe("Topic Resolution and Deep-linking in page.tsx", () => {
    it("uses ?topic query parameter with fallback to global", () => {
      expect(veillePageCode).toContain('resolvedParams.topic?.trim() || "global"')
    })

    it("prioritizes selectedDigest.topic_key when digestId is provided", () => {
      expect(veillePageCode).toContain('if (digestId)')
      expect(veillePageCode).toContain('effectiveTopic = selectedDigest.topic_key || "global"')
    })

    it("filters topicDigests for feed and period navigation while preserving allPastDigests for archives", () => {
      expect(veillePageCode).toContain(
        'const topicDigests = allPastDigests.filter(\n    (d) => (d.topic_key || "global") === effectiveTopic,\n  )',
      )
      expect(veillePageCode).toContain("pastDigests={topicDigests}")
      expect(veillePageCode).toContain("allPastDigests={allPastDigests}")
    })
  })

  describe("Topic badges and Transverse Archives", () => {
    it("getTopicBadgeLabel resolves human labels for static and dynamic topics", () => {
      const topicOptions = [
        { topicKey: "global", label: "Veille IA & Marché" },
        { topicKey: "ia", label: "Intelligence artificielle" },
        { topicKey: "llm", label: "LLM & modèles" },
        { topicKey: "seg-voyage", label: "Voyage d'affaires" },
      ]

      expect(getTopicBadgeLabel("ia", topicOptions)).toBe("IA")
      expect(getTopicBadgeLabel("llm", topicOptions)).toBe("LLM")
      expect(getTopicBadgeLabel("global", topicOptions)).toBe("Veille IA & Marché")
      expect(getTopicBadgeLabel("seg-voyage", topicOptions)).toBe("Voyage d'affaires")
      expect(getTopicBadgeLabel(null, topicOptions)).toBe("Veille IA & Marché")
      expect(getTopicBadgeLabel("unknown-topic", topicOptions)).toBe("Unknown Topic")
    })

    it("buildArchiveEntries labels each digest with a humanized topicBadgeLabel", () => {
      const mockDigests: VeilleDigest[] = [
        {
          id: "d1",
          digest_date: "2026-09-01",
          titre_digest: "Digest IA #1",
          resume_hebdo: "Résumé IA",
          super_short_summary: "Court résumé",
          topic_key: "ia",
          nb_sources_actives: 8,
          nb_candidats_evalues: 20,
        },
        {
          id: "d2",
          digest_date: "2026-09-01",
          titre_digest: "Digest LLM #1",
          resume_hebdo: "Résumé LLM",
          super_short_summary: "Court résumé LLM",
          topic_key: "llm",
          nb_sources_actives: 6,
          nb_candidats_evalues: 15,
        },
        {
          id: "d3",
          digest_date: "2026-08-25",
          titre_digest: "Digest Global #10",
          resume_hebdo: "Résumé Global",
          super_short_summary: "Court résumé Global",
          topic_key: "global",
          nb_sources_actives: 15,
          nb_candidats_evalues: 40,
        },
      ]

      const entries = buildArchiveEntries({
        digests: mockDigests,
        analyses: [],
        articleCountByDigest: new Map([["d1", 5], ["d2", 4], ["d3", 8]]),
        topicOptions: [
          { topicKey: "global", label: "Veille IA & Marché" },
          { topicKey: "ia", label: "Intelligence artificielle" },
          { topicKey: "llm", label: "LLM & modèles" },
        ],
      })

      expect(entries).toHaveLength(3)
      const iaEntry = entries.find((e) => e.id === "d1")!
      expect(iaEntry.topicBadgeLabel).toBe("IA")
      expect(iaEntry.topicKey).toBe("ia")

      const llmEntry = entries.find((e) => e.id === "d2")!
      expect(llmEntry.topicBadgeLabel).toBe("LLM")
      expect(llmEntry.topicKey).toBe("llm")

      const globalEntry = entries.find((e) => e.id === "d3")!
      expect(globalEntry.topicBadgeLabel).toBe("Veille IA & Marché")
      expect(globalEntry.topicKey).toBe("global")
    })

    it("buildDigestPeriods creates chronological periods for the given active digests", () => {
      const activeDigests: VeilleDigest[] = [
        {
          id: "d1",
          digest_date: "2026-09-01",
          titre_digest: "Digest IA #2",
          resume_hebdo: "Résumé IA 2",
          super_short_summary: "Court",
          topic_key: "ia",
          nb_sources_actives: 8,
          nb_candidats_evalues: 20,
        },
        {
          id: "d2",
          digest_date: "2026-08-25",
          titre_digest: "Digest IA #1",
          resume_hebdo: "Résumé IA 1",
          super_short_summary: "Court",
          topic_key: "ia",
          nb_sources_actives: 8,
          nb_candidats_evalues: 18,
        },
      ]

      const mockArticles: VeilleArticle[] = [
        {
          id: "a1",
          digest_id: "d1",
          titre_fr: "Article 1",
          resume: "Résumé 1",
          selection_rank: 1,
          published_at: "2026-09-01",
        } as VeilleArticle,
      ]

      const periods = buildDigestPeriods(activeDigests, mockArticles)
      expect(periods).toHaveLength(2)
      expect(periods[0].digestId).toBe("d1")
      expect(periods[1].digestId).toBe("d2")
    })
  })
})
