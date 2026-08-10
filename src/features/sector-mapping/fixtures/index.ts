export { BANK_SECTOR_MAP } from "./bank"
export { BTP_SECTOR_MAP } from "./btp"
export { TOURISM_SECTOR_MAP } from "./tourism"

import { BANK_SECTOR_MAP } from "./bank"
import { BTP_SECTOR_MAP } from "./btp"
import { TOURISM_SECTOR_MAP } from "./tourism"

export const SECTOR_MAP_FIXTURES = [
  BTP_SECTOR_MAP,
  BANK_SECTOR_MAP,
  TOURISM_SECTOR_MAP,
] as const
