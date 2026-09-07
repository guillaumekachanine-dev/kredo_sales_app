"use client"

import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import { WorkflowExecutionIndicatorDesktop } from "./WorkflowExecutionIndicatorDesktop"
import { WorkflowExecutionIndicatorMobile } from "./WorkflowExecutionIndicatorMobile"

export interface WorkflowExecutionIndicatorHostProps {
  device: DashboardDevice
}

export function WorkflowExecutionIndicatorHost({ device }: WorkflowExecutionIndicatorHostProps) {
  if (device === "mobile") {
    return <WorkflowExecutionIndicatorMobile />
  }
  return <WorkflowExecutionIndicatorDesktop />
}
