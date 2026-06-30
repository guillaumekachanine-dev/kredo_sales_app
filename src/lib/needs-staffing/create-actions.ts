import type { NeedsStaffingScope } from "./url-state"

export function getCreateActionLabel(scope: NeedsStaffingScope) {
  return scope === "staffing" ? "+ Nouveau staffing" : "+ Nouvelle opportunité"
}
