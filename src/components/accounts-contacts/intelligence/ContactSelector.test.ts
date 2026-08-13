import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import { ContactSelector, formatContactOptionLabel } from "./ContactSelector"

const contact = {
  id: "contact-1",
  fullName: "Ada Lovelace",
  jobTitle: "Directrice des systèmes d’information",
} as ClientIntelligenceContact

describe("ContactSelector", () => {
  it("formats the contact and job title as an informative text label", () => {
    expect(formatContactOptionLabel(contact)).toBe(
      "Ada Lovelace — Directrice des systèmes d’information",
    )
  })

  it("renders text-only native options without nested elements", () => {
    const html = renderToStaticMarkup(
      createElement(ContactSelector, {
        contacts: [contact],
        value: undefined,
        onChange: () => {},
        isMobile: true,
      }),
    )

    expect(html).toContain(
      '<option value="contact-1">Ada Lovelace — Directrice des systèmes d’information</option>',
    )
    expect(html).not.toMatch(/<option[^>]*>\s*</)
  })
})
