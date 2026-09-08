import { describe, expect, it } from "vitest"
import {
  buildKnowledgeHubViewHref,
  parseKnowledgeHubView,
} from "./knowledge-hub-desktop-navigation"

describe("knowledge-hub-desktop-navigation parseKnowledgeHubView", () => {
  it("null/null → categories", () => {
    expect(parseKnowledgeHubView(null, null)).toEqual({ type: "categories" })
    expect(parseKnowledgeHubView(undefined, undefined)).toEqual({ type: "categories" })
  })

  it("section sans domain → categories", () => {
    expect(parseKnowledgeHubView(null, "jobs")).toEqual({ type: "categories" })
    expect(parseKnowledgeHubView("", "practices")).toEqual({ type: "categories" })
  })

  it("domain inconnu → categories", () => {
    expect(parseKnowledgeHubView("unknown", null)).toEqual({ type: "categories" })
    expect(parseKnowledgeHubView("foobar", "jobs")).toEqual({ type: "categories" })
  })

  it("clients-markets sans section → domain clients-markets sans section", () => {
    expect(parseKnowledgeHubView("clients-markets", null)).toEqual({
      type: "domain",
      domainId: "clients-markets",
    })
  })

  it("clients-markets + section-0 → section-0", () => {
    expect(parseKnowledgeHubView("clients-markets", "section-0")).toEqual({
      type: "domain",
      domainId: "clients-markets",
      sectionId: "section-0",
    })
  })

  it("clients-markets + section invalide → domaine sans section", () => {
    expect(parseKnowledgeHubView("clients-markets", "invalid-section")).toEqual({
      type: "domain",
      domainId: "clients-markets",
    })
  })

  it("expertise-kredo sans section → practices", () => {
    expect(parseKnowledgeHubView("expertise-kredo", null)).toEqual({
      type: "domain",
      domainId: "expertise-kredo",
      sectionId: "practices",
    })
  })

  it("expertise-kredo + jobs → jobs", () => {
    expect(parseKnowledgeHubView("expertise-kredo", "jobs")).toEqual({
      type: "domain",
      domainId: "expertise-kredo",
      sectionId: "jobs",
    })
  })

  it("expertise-kredo + invalide → practices", () => {
    expect(parseKnowledgeHubView("expertise-kredo", "invalid-section")).toEqual({
      type: "domain",
      domainId: "expertise-kredo",
      sectionId: "practices",
    })
  })

  it("talents sans section → team", () => {
    expect(parseKnowledgeHubView("talents", null)).toEqual({
      type: "domain",
      domainId: "talents",
      sectionId: "team",
    })
  })

  it("talents + alumni → alumni", () => {
    expect(parseKnowledgeHubView("talents", "alumni")).toEqual({
      type: "domain",
      domainId: "talents",
      sectionId: "alumni",
    })
  })

  it("talents + invalide → team", () => {
    expect(parseKnowledgeHubView("talents", "invalid-section")).toEqual({
      type: "domain",
      domainId: "talents",
      sectionId: "team",
    })
  })
})

describe("knowledge-hub-desktop-navigation buildKnowledgeHubViewHref", () => {
  const pathname = "/knowledge"

  it("categories → supprime domain + section", () => {
    const params = new URLSearchParams("domain=expertise-kredo&section=jobs")
    const href = buildKnowledgeHubViewHref(pathname, params, { type: "categories" })
    expect(href).toBe("/knowledge")
  })

  it("domaine générique → ajoute domain seulement", () => {
    const params = new URLSearchParams()
    const href = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "clients-markets",
    })
    expect(href).toBe("/knowledge?domain=clients-markets")
  })

  it("domaine + section → ajoute domain + section", () => {
    const params = new URLSearchParams()
    const href = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "clients-markets",
      sectionId: "section-0",
    })
    expect(href).toBe("/knowledge?domain=clients-markets&section=section-0")
  })

  it("Expertise / practices → ajoute domain=expertise-kredo + section=practices", () => {
    const params = new URLSearchParams()
    const href = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "expertise-kredo",
      sectionId: "practices",
    })
    expect(href).toBe("/knowledge?domain=expertise-kredo&section=practices")
  })

  it("Talents / team → ajoute domain=talents + section=team", () => {
    const params = new URLSearchParams()
    const href = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "talents",
      sectionId: "team",
    })
    expect(href).toBe("/knowledge?domain=talents&section=team")
  })

  it("query params tiers → préservés", () => {
    const params = new URLSearchParams("foo=bar&baz=1&domain=talents&section=alumni")
    const hrefDomain = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "talents",
      sectionId: "skills",
    })
    expect(hrefDomain).toBe("/knowledge?foo=bar&baz=1&domain=talents&section=skills")

    const hrefRoot = buildKnowledgeHubViewHref(pathname, params, { type: "categories" })
    expect(hrefRoot).toBe("/knowledge?foo=bar&baz=1")
  })

  it("empêche la génération de couples domaine/section invalides grâce à la normalisation", () => {
    const params = new URLSearchParams()
    const hrefInvalidDomain = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "invalid-domain",
      sectionId: "jobs",
    })
    expect(hrefInvalidDomain).toBe("/knowledge")

    const hrefInvalidSection = buildKnowledgeHubViewHref(pathname, params, {
      type: "domain",
      domainId: "expertise-kredo",
      sectionId: "invalid-section",
    })
    expect(hrefInvalidSection).toBe("/knowledge?domain=expertise-kredo&section=practices")
  })
})
