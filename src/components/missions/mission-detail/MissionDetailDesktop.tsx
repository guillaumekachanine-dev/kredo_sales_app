"use client"

import { MissionOverviewDesktop } from "./MissionOverviewDesktop"
import type { MissionDetailViewModel } from "./mission-detail-types"

interface MissionDetailDesktopProps {
  vm: MissionDetailViewModel
  onRefresh: () => void
}

export function MissionDetailDesktop({ vm, onRefresh }: MissionDetailDesktopProps) {
  void onRefresh

  return <MissionOverviewDesktop vm={vm} />
}
