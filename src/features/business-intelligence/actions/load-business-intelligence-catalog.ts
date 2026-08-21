"use server"

import "server-only"

import { getBusinessIntelligenceCatalog } from "../data/get-business-intelligence-catalog"
import type { BusinessIntelligenceCatalog } from "../data/business-intelligence-workspace-types"

export type LoadBusinessIntelligenceCatalogResult =
  | { success: true; data: BusinessIntelligenceCatalog }
  | { success: false; error: string }

export async function loadBusinessIntelligenceCatalogAction(): Promise<LoadBusinessIntelligenceCatalogResult> {
  const catalog = await getBusinessIntelligenceCatalog()
  if (catalog.state === "error") {
    return { success: false, error: catalog.error ?? "Le catalogue Business Intelligence est indisponible." }
  }
  return { success: true, data: catalog }
}
