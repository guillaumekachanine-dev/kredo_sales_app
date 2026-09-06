import { describe, expect, it } from "vitest"
import {
  humanizeCorpusSlug,
  extractCorpusMetadataName,
  resolveCorpusLabel,
  getDigestLaunchOptions,
} from "../data/get-digest-launch-options"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

describe("getDigestLaunchOptions and corpus labeling", () => {
  describe("humanizeCorpusSlug", () => {
    it("humanizes slugs with uppercase acronyms (AI, IA, LLM, B2B, Tech)", () => {
      expect(humanizeCorpusSlug("folio-ai-tech")).toBe("Folio AI Tech")
      expect(humanizeCorpusSlug("folio-ai-business")).toBe("Folio AI Business")
      expect(humanizeCorpusSlug("corpus-llm-b2b")).toBe("Corpus LLM B2B")
      expect(humanizeCorpusSlug("secteur-sante-rh")).toBe("Secteur Sante RH")
    })

    it("handles empty or single-word slugs gracefully", () => {
      expect(humanizeCorpusSlug("")).toBe("")
      expect(humanizeCorpusSlug("ia")).toBe("IA")
      expect(humanizeCorpusSlug("general")).toBe("General")
    })
  })

  describe("resolveCorpusLabel", () => {
    it("prefers metadata.meta.name if present", () => {
      const label = resolveCorpusLabel({
        slug: "folio-ai-tech",
        metadata: { meta: { name: "Folio Tech & IA Avancée" } },
      })
      expect(label).toBe("Folio Tech & IA Avancée")
    })

    it("prefers metadata.name if meta.name is missing", () => {
      const label = resolveCorpusLabel({
        slug: "folio-ai-tech",
        metadata: { name: "Folio IA Direct" },
      })
      expect(label).toBe("Folio IA Direct")
    })

    it("falls back to humanized slug when metadata has no name", () => {
      const label = resolveCorpusLabel({
        slug: "folio-ai-tech",
        metadata: {},
      })
      expect(label).toBe("Folio AI Tech")
    })

    it("falls back to raw slug if humanize results in empty string", () => {
      const label = resolveCorpusLabel({
        slug: "custom_corpus",
        metadata: null,
      })
      expect(label).toBe("Custom Corpus")
    })
  })

  describe("extractCorpusMetadataName", () => {
    it("extracts name from meta.name or direct name", () => {
      expect(extractCorpusMetadataName({ meta: { name: "Nested Meta" } })).toBe("Nested Meta")
      expect(extractCorpusMetadataName({ name: "Direct Meta" })).toBe("Direct Meta")
      expect(extractCorpusMetadataName(null)).toBeNull()
      expect(extractCorpusMetadataName({})).toBeNull()
    })
  })

  describe("getDigestLaunchOptions mock execution", () => {
    it("returns static presets, dynamic segments, and classified corpora", async () => {
      const workspaceId = "ws-test-123"

      const fakeSupabase = {
        from: (table: string) => {
          if (table === "sector_intelligence") {
            return {
              select: () => ({
                eq: (_col1: string, _val1: string) => ({
                  eq: (_col2: string, _val2: string) => ({
                    order: () => Promise.resolve({
                      data: [
                        { id: "seg-1", slug: "cybersecurite-b2b", name: "Cybersécurité B2B" },
                        { id: "seg-2", slug: "voyage-affaires", name: "Voyage d'affaires" },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === "source_corpora") {
            return {
              select: () => ({
                eq: (_col1: string, _val1: string) => ({
                  eq: (_col2: string, _val2: boolean) => ({
                    order: () => ({
                      order: () => Promise.resolve({
                        data: [
                          {
                            id: "corp-active-1",
                            slug: "folio-ai-tech",
                            scope_kind: "thematic",
                            activation_state: "active",
                            is_current: true,
                            metadata: { meta: { name: "Folio AI Tech" } },
                          },
                          {
                            id: "corp-draft-2",
                            slug: "folio-draft",
                            scope_kind: "thematic",
                            activation_state: "draft",
                            is_current: true,
                            metadata: null,
                          },
                          {
                            id: "corp-empty-3",
                            slug: "folio-empty",
                            scope_kind: "thematic",
                            activation_state: "active",
                            is_current: true,
                            metadata: null,
                          },
                          {
                            id: "corp-sector-4",
                            slug: "secteur-banque",
                            scope_kind: "sector",
                            activation_state: "active",
                            is_current: true,
                            metadata: { name: "Banque & Finance" },
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === "v_corpus_news_sources") {
            return {
              select: () => Promise.resolve({
                data: [
                  { corpus_id: "corp-active-1" },
                  { corpus_id: "corp-active-1" },
                  { corpus_id: "corp-active-1" },
                  { corpus_id: "corp-sector-4" },
                ],
                error: null,
              }),
            }
          }
          if (table === "v_effective_watch_sources") {
            return {
              select: () => ({
                eq: () => Promise.resolve({
                  data: [{ source_id: "s1" }, { source_id: "s2" }, { source_id: "s3" }, { source_id: "s4" }],
                  error: null,
                }),
              }),
            }
          }
          throw new Error(`Unexpected table ${table}`)
        },
      } as unknown as SupabaseClient<Database>

      const result = await getDigestLaunchOptions(fakeSupabase, workspaceId)

      // 1. Topics: static presets + dynamic segments
      expect(result.topics).toEqual([
        {
          topicKey: "global",
          label: "Veille IA & Marché",
          group: "thematique",
          defaultCorpusSlug: null,
        },
        {
          topicKey: "ia",
          label: "Intelligence artificielle",
          group: "thematique",
          defaultCorpusSlug: "folio-ai-tech",
        },
        {
          topicKey: "llm",
          label: "LLM & modèles",
          group: "thematique",
          defaultCorpusSlug: "folio-ai-tech",
        },
        {
          topicKey: "cybersecurite-b2b",
          label: "Cybersécurité B2B",
          group: "segment",
          defaultCorpusSlug: null,
        },
        {
          topicKey: "voyage-affaires",
          label: "Voyage d'affaires",
          group: "segment",
          defaultCorpusSlug: null,
        },
      ])

      // 2. Default sources count
      expect(result.defaultSourcesCount).toBe(4)

      // 3. Corpora options
      expect(result.corpora).toHaveLength(4)

      // Active with sources -> selectable
      const activeCorpus = result.corpora.find((c) => c.id === "corp-active-1")!
      expect(activeCorpus.label).toBe("Folio AI Tech")
      expect(activeCorpus.selectable).toBe(true)
      expect(activeCorpus.sourcesCount).toBe(3)
      expect(activeCorpus.unavailableReason).toBeNull()

      // Draft -> visible but disabled with explicit reason
      const draftCorpus = result.corpora.find((c) => c.id === "corp-draft-2")!
      expect(draftCorpus.label).toBe("Folio Draft")
      expect(draftCorpus.selectable).toBe(false)
      expect(draftCorpus.unavailableReason).toBe("Corpus en brouillon : à activer avant utilisation.")

      // Empty sources -> visible but disabled with explicit reason
      const emptyCorpus = result.corpora.find((c) => c.id === "corp-empty-3")!
      expect(emptyCorpus.label).toBe("Folio Empty")
      expect(emptyCorpus.selectable).toBe(false)
      expect(emptyCorpus.sourcesCount).toBe(0)
      expect(emptyCorpus.unavailableReason).toBe("Aucune source collectable dans ce corpus.")

      // Sector corpus -> group sectoriel
      const sectorCorpus = result.corpora.find((c) => c.id === "corp-sector-4")!
      expect(sectorCorpus.label).toBe("Banque & Finance")
      expect(sectorCorpus.group).toBe("sectoriel")
      expect(sectorCorpus.selectable).toBe(true)
      expect(sectorCorpus.sourcesCount).toBe(1)
    })
  })
})
