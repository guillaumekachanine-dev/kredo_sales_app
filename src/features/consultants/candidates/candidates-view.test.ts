import { describe, expect, it } from "vitest"
import {
  AVAILABILITY_BUCKET_META,
  HIRING_STEP_LABEL,
  LIFECYCLE_EDIT_OPTIONS,
  LIFECYCLE_LABEL,
  PIPELINE_STATE_META,
  candidateInitials,
  formatSalaryK,
} from "./candidates-view"

describe("candidates-view — helpers de présentation", () => {
  it("couvre les 3 états de pipeline et les 3 buckets de disponibilité", () => {
    expect(Object.keys(PIPELINE_STATE_META).sort()).toEqual(["closed", "in_process", "pool"])
    expect(Object.keys(AVAILABILITY_BUCKET_META).sort()).toEqual([
      "immediate",
      "scheduled",
      "unknown",
    ])
  })

  it("étiquette les 6 étapes de process de recrutement", () => {
    expect(HIRING_STEP_LABEL.prequalification).toBe("Préqualification")
    expect(HIRING_STEP_LABEL.integration).toBe("Intégration")
    expect(Object.keys(HIRING_STEP_LABEL)).toHaveLength(6)
  })

  it("propose un libellé pour chaque option éditable du lifecycle", () => {
    for (const option of LIFECYCLE_EDIT_OPTIONS) {
      expect(LIFECYCLE_LABEL[option]).toBeTruthy()
    }
  })

  it("formatSalaryK arrondit au millier et gère l'absence", () => {
    expect(formatSalaryK(48000)).toBe("48k")
    expect(formatSalaryK(52500)).toBe("52,5k")
    expect(formatSalaryK(null)).toBe("—")
    expect(formatSalaryK(0)).toBe("—")
  })

  it("candidateInitials prend la première et la dernière initiale", () => {
    expect(candidateInitials("Alice Martin")).toBe("AM")
    expect(candidateInitials("Jean-Paul Dubois Léon")).toBe("JL")
    expect(candidateInitials("Cher")).toBe("C")
    expect(candidateInitials("  ")).toBe("?")
  })
})
