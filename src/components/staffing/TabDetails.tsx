"use client"

import { CandidateReferenceProfile } from "@/components/recruitment/CandidateReferenceProfile"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

interface TabDetailsProps {
  data: StaffingDrawerViewModel
}

export function TabDetails({ data }: TabDetailsProps) {
  return <CandidateReferenceProfile data={data.candidate} />
}
