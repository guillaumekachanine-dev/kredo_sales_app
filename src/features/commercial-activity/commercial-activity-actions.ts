"use server"

import { getCommercialActivitySnapshot } from "./get-commercial-activity-snapshot"
import type { CommercialActivityFilters } from "./commercial-activity-types"

export async function loadCommercialActivitySnapshot(filters: CommercialActivityFilters) {
  return getCommercialActivitySnapshot(filters)
}
