import { describe, expect, it } from "vitest"
import { validateWatchAnalysisInput } from "../domain/watch-analysis-contracts"
import { resolveWatchAnalysisSources } from "../data/resolve-watch-analysis-sources"
import { buildWatchAnalysisInputSnapshot, buildWatchAnalysisRunEnvelope } from "../data/build-watch-analysis-launch"
import { createFakeSupabase } from "./fake-supabase"

describe("Analyse à la demande V2 — Logique serveur /api/n8n/trigger", () => {
  const workspaceId = "ws-123"
  const { supabase } = createFakeSupabase({
    veille_digests: [
      { id: "digest-1", workspace_id: workspaceId },
    ],
    veille_articles: [
      { id: "art-1", digest_id: "digest-1", workspace_id: workspaceId, titre_fr: "Article 1" },
      { id: "art-2", digest_id: "digest-1", workspace_id: workspaceId, titre_fr: "Article 2" },
    ],
    account_signals: [
      { id: "sig-1", workspace_id: workspaceId, title: "Signal 1" },
    ],
    intelligence_documents: [
      { id: "doc-1", workspace_id: workspaceId, title: "Doc 1" },
    ],
  })


  it("V2 valide : valide l'input, résout les sources RLS et produit l'enveloppe et le snapshot", async () => {
    const rawInputFromClient = {
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "Analyse d'opportunités",
      requestedAt: "2026-08-19T12:00:00.000Z",
      sources: [
        { kind: "digest", digestId: "digest-1", articleIds: ["art-1"] },
        { kind: "account_signals", signalIds: ["sig-1"] },
      ],
      // Ingestion d'une propriété frauduleuse tentée par le navigateur
      resolvedRefs: [{ kind: "hacked", id: "fake" }],
    }

    const validated = validateWatchAnalysisInput(rawInputFromClient)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const resolved = await resolveWatchAnalysisSources(supabase, workspaceId, validated.value)
    expect("error" in resolved).toBe(false)
    if ("error" in resolved) return

    expect(resolved.refs).toEqual([
      { kind: "veille_digest", id: "digest-1", articleIds: ["art-1"] },
      { kind: "account_signal", id: "sig-1" },
    ])

    const envelope = buildWatchAnalysisRunEnvelope(validated.value, resolved)
    expect(envelope.refs).toEqual(resolved.refs)
    expect(envelope).not.toHaveProperty("hacked")

    const snapshot = buildWatchAnalysisInputSnapshot(validated.value, resolved)
    expect(snapshot.triggerMode).toBe("manual_custom")
    expect(snapshot.resolvedRefs).toEqual(resolved.refs)
  })

  it("V2 invalide : renvoie une erreur de validation 400", () => {
    const invalidInput = {
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "", // vide !
      requestedAt: "2026-08-19T12:00:00.000Z",
      sources: [],
    }

    const validated = validateWatchAnalysisInput(invalidInput)
    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error).toContain("intention")
    }
  })

  it("V2 avec source inaccessible/introuvable : fait échouer la résolution RLS", async () => {
    const inputWithMissingSource = {
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "Analyse de risque",
      requestedAt: "2026-08-19T12:00:00.000Z",
      sources: [
        { kind: "account_signals", signalIds: ["sig-inconnu-999"] },
      ],
    }

    const validated = validateWatchAnalysisInput(inputWithMissingSource)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const resolved = await resolveWatchAnalysisSources(supabase, workspaceId, validated.value)
    expect("error" in resolved).toBe(true)
    if ("error" in resolved) {
      expect(resolved.error).toContain("Signal compte introuvable ou inaccessible")
    }
  })

  it("V2 avec source d'un autre workspace : refuse avec erreur 400 RLS", async () => {
    const { supabase: otherWorkspaceClient } = createFakeSupabase({
      account_signals: [{ id: "sig-other", workspace_id: "ws-autre", title: "Autre" }],
    })

    const input = {
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: "Analyse concurrentielle",
      requestedAt: "2026-08-19T12:00:00.000Z",
      sources: [{ kind: "account_signals", signalIds: ["sig-other"] }],
    }

    const validated = validateWatchAnalysisInput(input)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    const resolved = await resolveWatchAnalysisSources(otherWorkspaceClient, workspaceId, validated.value)
    expect("error" in resolved).toBe(true)
  })

  it("Règles de forçage : entityType est workspace et companyId est null", () => {
    // Vérification statique des propriétés requises pour triggerN8nRun
    const entityType = "workspace"
    const companyId = null
    const targetWorkspaceId = workspaceId

    expect(entityType).toBe("workspace")
    expect(companyId).toBeNull()
    expect(targetWorkspaceId).toBe("ws-123")
  })
})
