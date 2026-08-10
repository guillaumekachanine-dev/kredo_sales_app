import { describe, expect, it } from "vitest"
import { isAccountDepthLevel, isPromotion } from "./depth-level"

describe("isAccountDepthLevel", () => {
  it("accepte les quatre paliers du domaine", () => {
    expect(isAccountDepthLevel("mapped")).toBe(true)
    expect(isAccountDepthLevel("noted")).toBe(true)
    expect(isAccountDepthLevel("qualified")).toBe(true)
    expect(isAccountDepthLevel("active")).toBe(true)
  })

  it("rejette toute valeur hors domaine", () => {
    expect(isAccountDepthLevel("cible")).toBe(false)
    expect(isAccountDepthLevel("")).toBe(false)
  })
})

describe("isPromotion", () => {
  it("autorise une transition vers un palier supérieur", () => {
    expect(isPromotion("noted", "qualified")).toBe(true)
    expect(isPromotion("mapped", "active")).toBe(true)
  })

  it("refuse un palier identique — un no-op n'est pas une promotion", () => {
    expect(isPromotion("qualified", "qualified")).toBe(false)
  })

  it("refuse toute démotion — ADR-0019 D-1, la profondeur ne redescend jamais automatiquement", () => {
    expect(isPromotion("active", "noted")).toBe(false)
    expect(isPromotion("qualified", "mapped")).toBe(false)
  })
})
