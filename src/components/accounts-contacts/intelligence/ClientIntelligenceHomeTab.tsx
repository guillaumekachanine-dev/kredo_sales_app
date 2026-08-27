"use client"

import { useMemo, useState, useTransition } from "react"
import { AccountIntelligenceHomeTemplate } from "./home/AccountIntelligenceHomeTemplate"
import { useAccountIntelligenceHomeRuntime } from "./home/AccountIntelligenceHomeRuntimeContext"
import { buildAccountIntelligenceHomeTemplateData } from "./home/account-intelligence-home-template.adapter"
import { CompanyDocumentsModal } from "./CompanyDocumentsModal"
import { saveAccountWatchSettings } from "./save-account-watch-settings"
import type { ProcessStepKey } from "./intelligence-process"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"

interface ClientIntelligenceHomeTabProps {
  data: ClientIntelligenceData
  onOpenTab: (tab: ProcessStepKey) => void
  onOpenContactDirectory?: () => void
  onOpenDocuments?: () => void
}

export function ClientIntelligenceHomeTab({
  data,
  onOpenTab,
  onOpenContactDirectory,
  onOpenDocuments,
}: ClientIntelligenceHomeTabProps) {
  const { financials, playbookSlug } = useAccountIntelligenceHomeRuntime()
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [userWatchEnabled, setUserWatchEnabled] = useState<boolean | null>(null)
  const [prevCompanyId, setPrevCompanyId] = useState(data.company.id)
  const [isWatchSaving, startWatchSaving] = useTransition()

  if (data.company.id !== prevCompanyId) {
    setPrevCompanyId(data.company.id)
    setUserWatchEnabled(null)
  }

  const watchEnabled = userWatchEnabled ?? data.accountWatch.isEnabled

  const baseModel = useMemo(
    () => buildAccountIntelligenceHomeTemplateData(data, financials, playbookSlug),
    [data, financials, playbookSlug],
  )

  function handleWatchToggle() {
    const nextEnabled = !watchEnabled
    setUserWatchEnabled(nextEnabled)

    startWatchSaving(async () => {
      const result = await saveAccountWatchSettings(data.company.id, {
        isEnabled: nextEnabled,
        watchLevel: data.accountWatch.watchLevel,
      })

      if (!result.error && result.data) {
        setUserWatchEnabled(result.data.isEnabled)
      } else {
        setUserWatchEnabled(null)
      }
    })
  }

  const processSteps = baseModel.processSteps.map((step) => {
    const onClick = (() => {
      switch (step.id) {
        case "profile":
          return () => onOpenTab("connaissance")
        case "news":
          return () => document.getElementById("actualites-compte")?.scrollIntoView({ behavior: "smooth", block: "start" })
        case "sector":
          return () => onOpenTab("secteur")
        case "issues":
          return () => onOpenTab("enjeux")
        case "strategy":
          return () => onOpenTab("strategie")
        case "roadmap":
          return () => onOpenTab("roadmap")
        default:
          return undefined
      }
    })()

    return { ...step, onClick }
  })

  const handleOpenDocuments = onOpenDocuments ?? (() => setDocumentsOpen(true))

  const toolbox = [
    { ...baseModel.toolbox[0], onClick: onOpenContactDirectory, disabled: !onOpenContactDirectory },
    { ...baseModel.toolbox[1], onClick: handleOpenDocuments },
    baseModel.toolbox[2],
  ] as const

  return (
    <div className="py-6">
      <AccountIntelligenceHomeTemplate
        {...baseModel}
        processSteps={processSteps}
        watch={{
          enabled: watchEnabled,
          label: watchEnabled ? "Veille active" : "Activer la veille",
          onToggle: handleWatchToggle,
          pending: isWatchSaving,
        }}
        toolbox={toolbox}
      />

      {!onOpenDocuments && (
        <CompanyDocumentsModal
          open={documentsOpen}
          onClose={() => setDocumentsOpen(false)}
          companyId={data.company.id}
          companyName={data.company.name}
          isMobile={false}
        />
      )}
    </div>
  )
}
