import { describe, expect, it } from "vitest"
import {
  CANDIDATE_LIFECYCLE_STATUSES,
  CANDIDATE_LIFECYCLE_STATUS_KEYS,
  getCandidateLifecycleLabel,
  isCandidateLifecycleStatus,
  isTerminalCandidateLifecycle,
} from "./candidate-lifecycle"

// Doit rester aligné sur `VALID_STATUSES` de
// src/app/(app)/recruitment/_actions/update-candidate-status.ts (C-26).
const VALID_STATUSES = [
  "nouveau",
  "qualifie",
  "vivier",
  "propose",
  "en_process",
  "recrute",
  "refuse",
  "indisponible",
  "archive",
  "ko_manager",
]

describe("candidate-lifecycle", () => {
  it("couvre exactement la whitelist de la Server Action", () => {
    expect([...CANDIDATE_LIFECYCLE_STATUS_KEYS].sort()).toEqual([...VALID_STATUSES].sort())
  })

  it("marque les statuts de fin de cycle comme terminaux", () => {
    const terminal = CANDIDATE_LIFECYCLE_STATUSES.filter((s) => s.terminal).map((s) => s.key)
    expect(terminal.sort()).toEqual(["archive", "ko_manager", "recrute", "refuse"])
    expect(isTerminalCandidateLifecycle("vivier")).toBe(false)
    expect(isTerminalCandidateLifecycle("recrute")).toBe(true)
  })

  it("reconnaît un statut valide et rejette le reste", () => {
    expect(isCandidateLifecycleStatus("vivier")).toBe(true)
    expect(isCandidateLifecycleStatus("inconnu")).toBe(false)
    expect(isCandidateLifecycleStatus(null)).toBe(false)
  })

  it("rend un libellé lisible, même hors whitelist", () => {
    expect(getCandidateLifecycleLabel("ko_manager")).toBe("KO manager")
    expect(getCandidateLifecycleLabel("statut_libre")).toBe("statut libre")
    expect(getCandidateLifecycleLabel(null)).toBe("—")
  })
})
