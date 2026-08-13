import { describe, expect, it } from "vitest"
import {
  mapKredoPracticeToOfferPractice,
  mapOfferPracticeToKredoPractice,
} from "./practices"

describe("practice mapping (Action A6)", () => {
  it("mappe kredo_practice vers offer_practices.slug", () => {
    expect(mapKredoPracticeToOfferPractice("data_ai")).toBe("data-ia")
    expect(mapKredoPracticeToOfferPractice("cloud_eng")).toBe("digital-cloud")
    expect(mapKredoPracticeToOfferPractice("cyber")).toBe("cybersecurity")
    expect(mapKredoPracticeToOfferPractice("product")).toBe("agile-pm")
    expect(mapKredoPracticeToOfferPractice("multi")).toBeNull()
  })

  it("mappe offer_practices.slug vers kredo_practice (canonique et alias)", () => {
    expect(mapOfferPracticeToKredoPractice("data-ia")).toBe("data_ai")
    expect(mapOfferPracticeToKredoPractice("data-ai")).toBe("data_ai")
    expect(mapOfferPracticeToKredoPractice("digital-cloud")).toBe("cloud_eng")
    expect(mapOfferPracticeToKredoPractice("cloud-engineering")).toBe("cloud_eng")
    expect(mapOfferPracticeToKredoPractice("cybersecurity")).toBe("cyber")
    expect(mapOfferPracticeToKredoPractice("agile-pm")).toBe("product")
    expect(mapOfferPracticeToKredoPractice("qa-testing")).toBe("multi")
  })

  it("gère les cas limites (null, undefined, casse, espaces)", () => {
    expect(mapKredoPracticeToOfferPractice(null)).toBeNull()
    expect(mapKredoPracticeToOfferPractice(undefined)).toBeNull()
    expect(mapKredoPracticeToOfferPractice(" DATA_AI ")).toBe("data-ia")

    expect(mapOfferPracticeToKredoPractice(null)).toBeNull()
    expect(mapOfferPracticeToKredoPractice(undefined)).toBeNull()
    expect(mapOfferPracticeToKredoPractice(" CYBERSECURITY ")).toBe("cyber")
    expect(mapOfferPracticeToKredoPractice("inconnu")).toBeNull()
  })
})
