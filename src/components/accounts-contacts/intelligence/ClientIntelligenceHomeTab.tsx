"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { AccountIntelligenceHomeTemplate } from "./home/AccountIntelligenceHomeTemplate"
import { buildAccountIntelligenceHomeTemplateData } from "./home/account-intelligence-home-template.adapter"
import { CompanyDocumentsModal } from "./CompanyDocumentsModal"
import { saveAccountWatchSettings } from "./save-account-watch-settings"
import type { ProcessStepKey } from "./intelligence-process"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountIntelligenceHomeFinancials } from "@/lib/intelligence/account-intelligence-home-financials"

interface ClientIntelligenceHomeTabProps {
  data: ClientIntelligenceData
  onOpenTab: (tab: ProcessStepKey) => void
  financials: AccountIntelligenceHomeFinancials | null
  playbookSlug: string | null
}

export function ClientIntelligenceHomeTab({
  data,
  onOpenTab,
  financials,
  playbookSlug,
}: ClientIntelligenceHomeTabProps) {
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [watchEnabled, setWatchEnabled] = useState(data.accountWatch.isEnabled)
  const [isWatchSaving, startWatchSaving] = useTransition()

  useEffect(() => {
    setWatchEnabled(data.accountWatch.isEnabled)
  }, [data.company.id, data.accountWatch.isEnabled])

  const baseModel = useMemo(
    () => buildAccountIntelligenceHomeTemplateData(data, financials, playbookSlug),
    [data, financials, playbookSlug],
  )

  function handleWatchToggle() {
    const nextEnabled = !watchEnabled

    startWatchSaving(async () => {
      const result = await saveAccountWatchSettings(data.company.id, {
        isEnabled: nextEnabled,
        watchLevel: data.accountWatch.watchLevel,
      })

      if (!result.error && result.data) {
        setWatchEnabled(result.data.isEnabled)
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

  const toolbox = baseModel.toolbox.map((item) => {
    if (item.id === "documents") {
      return { ...item, onClick: () => setDocumentsOpen(true) }
    }
    return item
  }) as typeof baseModel.toolbox

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

      <CompanyDocumentsModal
        open={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        companyId={data.company.id}
        companyName={data.company.name}
        isMobile={false}
      />
    </div>
  )
}
