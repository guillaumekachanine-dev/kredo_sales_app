import type { MissionPlanningRow } from "./mission-planning-types"
import { MissionPlanningDesktop } from "./MissionPlanningDesktop"
import { MissionPlanningMobile } from "./MissionPlanningMobile"

interface MissionPlanningViewProps {
  rows: MissionPlanningRow[]
  isMobile: boolean
}

export function MissionPlanningView({ rows, isMobile }: MissionPlanningViewProps) {
  if (isMobile) {
    return <MissionPlanningMobile rows={rows} />
  }

  return <MissionPlanningDesktop rows={rows} />
}
