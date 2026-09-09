"use client"

import { CandidateReferenceProfile } from "@/features/consultants/candidates/components/CandidateReferenceProfile"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

interface TabDetailsProps {
  data: StaffingDrawerViewModel
  isCollaborator?: boolean
}

export function TabDetails({ data }: TabDetailsProps) {
  return <CandidateReferenceProfile data={data.candidate} />
}
