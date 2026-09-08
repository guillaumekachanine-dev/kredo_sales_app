"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import type { ProfileMatchingViewModel } from "../data/profile-matching.types"
import { ProfileMatchingProfileList } from "./ProfileMatchingProfileList"
import { ProfileMatchingDetail } from "./ProfileMatchingDetail"

export interface ProfileMatchingDesktopProps {
  vm: ProfileMatchingViewModel
  closeHref: string
  onClose?: () => void
  initialPersonId?: string | null
}

export function ProfileMatchingDesktop({
  vm,
  closeHref,
  onClose,
  initialPersonId,
}: ProfileMatchingDesktopProps) {
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    // Non-router context (e.g. tests)
  }

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(() => {
    if (initialPersonId && vm.profiles.some((p) => p.personId === initialPersonId)) {
      return initialPersonId
    }
    return vm.profiles.length > 0 ? vm.profiles[0].personId : null
  })

  const selectedProfile = useMemo(() => {
    return vm.profiles.find((p) => p.personId === selectedPersonId) ?? null
  }, [vm.profiles, selectedPersonId])

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (router) {
      router.push(closeHref)
    } else if (typeof window !== "undefined") {
      window.location.assign(closeHref)
    }
  }

  return (
    <IntelligenceSplitModalShell
      open
      title="Matching profil"
      subtitle="Projection des besoins compatibles par profil · Moteur déterministe unique"
      onClose={handleClose}
      leftPaneWidth="34%"
      leftPane={
        <ProfileMatchingProfileList
          profiles={vm.profiles}
          selectedPersonId={selectedPersonId}
          onSelectProfile={setSelectedPersonId}
        />
      }
      rightPane={
        <ProfileMatchingDetail
          profile={selectedProfile}
          openOpportunityCount={vm.openOpportunityCount}
          evaluatedOpportunityCount={vm.evaluatedOpportunityCount}
        />
      }
    />
  )
}
