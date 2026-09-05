import { describe, expect, it } from "vitest"

import {
  DIGEST_LAUNCH_SCHEMA_VERSION,
  parseDigestLaunchInput,
} from "../domain/digest-launch-contracts"

const CORPUS_ID = "4566aa03-35a2-46c4-97c0-4273a3a0adb3"

function base(overrides: Record<string, unknown> = {}) {
  return { schemaVersion: 2, triggerMode: "manual", topicKey: "ia", corpusId: CORPUS_ID, ...overrides }
}

describe("parseDigestLaunchInput", () => {
  it("accepte un lancement complet", () => {
    const result = parseDigestLaunchInput(base())

    expect(result).toEqual({
      ok: true,
      value: {
        schemaVersion: DIGEST_LAUNCH_SCHEMA_VERSION,
        triggerMode: "manual",
        topicKey: "ia",
        corpusId: CORPUS_ID,
      },
    })
  })

  it("traite corpusId absent, null ou vide comme le mode par defaut", () => {
    for (const corpusId of [undefined, null, ""]) {
      const result = parseDigestLaunchInput(base({ corpusId }))
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.corpusId).toBeNull()
    }
  })

  it("refuse une autre version de schema : v1 doit rester traite par la branche historique", () => {
    expect(parseDigestLaunchInput(base({ schemaVersion: 1 }))).toEqual({
      ok: false,
      error: `schemaVersion doit valoir ${DIGEST_LAUNCH_SCHEMA_VERSION}.`,
    })
  })

  it("refuse un triggerMode autre que manual", () => {
    const result = parseDigestLaunchInput(base({ triggerMode: "scheduled" }))
    expect(result.ok).toBe(false)
  })

  it("refuse un topicKey manquant, vide ou de forme invalide", () => {
    for (const topicKey of [undefined, "", "   ", "Sujet IA", "IA", "-ia", "a".repeat(82)]) {
      expect(parseDigestLaunchInput(base({ topicKey })).ok).toBe(false)
    }
  })

  it("accepte indifferemment une cle de registre et un slug de segment", () => {
    for (const topicKey of ["global", "ia", "llm", "seg-parfumerie-compositions-b2b"]) {
      const result = parseDigestLaunchInput(base({ topicKey }))
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.topicKey).toBe(topicKey)
    }
  })

  it("ne verifie PAS l'existence du sujet : c'est le role du resolveur, sous RLS", () => {
    expect(parseDigestLaunchInput(base({ topicKey: "sujet-qui-n-existe-pas" })).ok).toBe(true)
  })

  it("refuse un corpusId qui n'est pas un identifiant", () => {
    for (const corpusId of ["socle-sources-editoriales", "42", { id: CORPUS_ID }]) {
      expect(parseDigestLaunchInput(base({ corpusId })).ok).toBe(false)
    }
  })

  it("refuse un payload qui n'est pas un objet", () => {
    for (const raw of [null, undefined, "manual", 2, []]) {
      expect(parseDigestLaunchInput(raw).ok).toBe(false)
    }
  })

  it("normalise les espaces autour du topicKey", () => {
    const result = parseDigestLaunchInput(base({ topicKey: "  llm  " }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.topicKey).toBe("llm")
  })
})
