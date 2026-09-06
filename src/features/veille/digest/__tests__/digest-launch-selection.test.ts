import { describe, expect, it } from "vitest"
import type { DigestLaunchOptions } from "../data/get-digest-launch-options"

// Pure state machine simulation matching DigestLaunchDialogDesktop and DigestLaunchSheetMobile
class DigestSelectionManager {
  topicKey = "global"
  corpusId: string | null = null
  hasUserSelectedCorpus = false

  constructor(private options: DigestLaunchOptions) {}

  selectTopic(newTopicKey: string) {
    this.topicKey = newTopicKey

    if (!this.hasUserSelectedCorpus) {
      const topicOption = this.options.topics.find((t) => t.topicKey === newTopicKey)
      if (topicOption?.defaultCorpusSlug) {
        const recommended = this.options.corpora.find(
          (c) => c.slug === topicOption.defaultCorpusSlug && c.selectable,
        )
        if (recommended) {
          this.corpusId = recommended.id
          return
        }
      }
      this.corpusId = null
    }
  }

  selectCorpus(newCorpusId: string | null) {
    if (newCorpusId !== null) {
      const target = this.options.corpora.find((c) => c.id === newCorpusId)
      if (target && !target.selectable) return
    }
    this.corpusId = newCorpusId
    this.hasUserSelectedCorpus = true
  }
}

describe("Digest Topic × Corpus selection state invariant (ADR-0022)", () => {
  const mockOptions: DigestLaunchOptions = {
    topics: [
      { topicKey: "global", label: "Veille IA & Marché", group: "thematique", defaultCorpusSlug: null },
      { topicKey: "ia", label: "Intelligence artificielle", group: "thematique", defaultCorpusSlug: "folio-ai-tech" },
      { topicKey: "llm", label: "LLM & modèles", group: "thematique", defaultCorpusSlug: "folio-ai-tech" },
      { topicKey: "seg-voyage", label: "Voyage", group: "segment", defaultCorpusSlug: null },
    ],
    corpora: [
      {
        id: "corpus-folio-tech",
        slug: "folio-ai-tech",
        label: "Folio AI Tech",
        group: "thematique",
        scopeKind: "thematic",
        selectable: true,
        sourcesCount: 8,
        unavailableReason: null,
      },
      {
        id: "corpus-folio-biz",
        slug: "folio-ai-business",
        label: "Folio AI Business",
        group: "thematique",
        scopeKind: "thematic",
        selectable: true,
        sourcesCount: 12,
        unavailableReason: null,
      },
      {
        id: "corpus-draft",
        slug: "folio-draft",
        label: "Folio Draft",
        group: "thematique",
        scopeKind: "thematic",
        selectable: false,
        sourcesCount: 5,
        unavailableReason: "Corpus en brouillon",
      },
    ],
    defaultSourcesCount: 15,
  }

  it("1. initial state has topic = global and corpusId = null", () => {
    const manager = new DigestSelectionManager(mockOptions)
    expect(manager.topicKey).toBe("global")
    expect(manager.corpusId).toBeNull()
    expect(manager.hasUserSelectedCorpus).toBe(false)
  })

  it("2. selecting IA preselects Folio AI Tech when user has not manually chosen a corpus", () => {
    const manager = new DigestSelectionManager(mockOptions)
    manager.selectTopic("ia")

    expect(manager.topicKey).toBe("ia")
    expect(manager.corpusId).toBe("corpus-folio-tech")
    expect(manager.hasUserSelectedCorpus).toBe(false)
  })

  it("3. switching back to global clears preselection if user has not chosen manually", () => {
    const manager = new DigestSelectionManager(mockOptions)
    manager.selectTopic("ia")
    expect(manager.corpusId).toBe("corpus-folio-tech")

    manager.selectTopic("global")
    expect(manager.topicKey).toBe("global")
    expect(manager.corpusId).toBeNull()
  })

  it("4. manual corpus choice is NOT overwritten by subsequent topic changes", () => {
    const manager = new DigestSelectionManager(mockOptions)
    // User explicitly selects Folio AI Business
    manager.selectCorpus("corpus-folio-biz")
    expect(manager.corpusId).toBe("corpus-folio-biz")
    expect(manager.hasUserSelectedCorpus).toBe(true)

    // User switches to IA -> should KEEP Folio AI Business, NOT Folio AI Tech!
    manager.selectTopic("ia")
    expect(manager.topicKey).toBe("ia")
    expect(manager.corpusId).toBe("corpus-folio-biz")

    // User switches to segment -> should still KEEP Folio AI Business
    manager.selectTopic("seg-voyage")
    expect(manager.topicKey).toBe("seg-voyage")
    expect(manager.corpusId).toBe("corpus-folio-biz")

    // User switches to global -> still keeps manual selection
    manager.selectTopic("global")
    expect(manager.corpusId).toBe("corpus-folio-biz")
  })

  it("5. manual selection of default socle (null) is also respected and not overwritten", () => {
    const manager = new DigestSelectionManager(mockOptions)
    manager.selectTopic("ia")
    expect(manager.corpusId).toBe("corpus-folio-tech")

    // User manually clicks "Sources KREDO par défaut" (null)
    manager.selectCorpus(null)
    expect(manager.corpusId).toBeNull()
    expect(manager.hasUserSelectedCorpus).toBe(true)

    // Switching to LLM should NOT re-apply Folio AI Tech recommendation
    manager.selectTopic("llm")
    expect(manager.topicKey).toBe("llm")
    expect(manager.corpusId).toBeNull()
  })

  it("6. cannot select a disabled/unselectable corpus", () => {
    const manager = new DigestSelectionManager(mockOptions)
    manager.selectCorpus("corpus-draft")

    expect(manager.corpusId).toBeNull()
    expect(manager.hasUserSelectedCorpus).toBe(false)
  })

  it("7. Topic and Corpus remain strictly orthogonal and independent", () => {
    const manager = new DigestSelectionManager(mockOptions)

    // Any valid combination is possible:
    // LLM x Sources par défaut
    manager.selectTopic("llm")
    manager.selectCorpus(null)
    expect(manager.topicKey).toBe("llm")
    expect(manager.corpusId).toBeNull()

    // Segment Voyage x Folio AI Business
    manager.selectTopic("seg-voyage")
    manager.selectCorpus("corpus-folio-biz")
    expect(manager.topicKey).toBe("seg-voyage")
    expect(manager.corpusId).toBe("corpus-folio-biz")

    // IA x Folio AI Business
    manager.selectTopic("ia")
    expect(manager.topicKey).toBe("ia")
    expect(manager.corpusId).toBe("corpus-folio-biz")
  })
})
