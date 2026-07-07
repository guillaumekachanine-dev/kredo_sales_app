import { describe, expect, it } from "vitest"
import {
  getMailAnalyticsSnapshot,
  getSupportedMailAnalyticsAccountLabels,
} from "@/components/accounts-contacts/intelligence/company-documents-mail-analytics"

describe("company-documents-mail-analytics", () => {
  it("resolves the supported demo accounts with normalized names", () => {
    expect(getMailAnalyticsSnapshot("Robertet")).not.toBeNull()
    expect(getMailAnalyticsSnapshot("ARKOPHARMA")).not.toBeNull()
    expect(getMailAnalyticsSnapshot("Voyage Privé")).not.toBeNull()
  })

  it("returns null for unsupported accounts", () => {
    expect(getMailAnalyticsSnapshot("LVMH")).toBeNull()
  })

  it("exposes the supported demo labels", () => {
    expect(getSupportedMailAnalyticsAccountLabels()).toEqual(["ROBERTET", "ARKOPHARMA", "VOYAGE PRIVE"])
  })
})
