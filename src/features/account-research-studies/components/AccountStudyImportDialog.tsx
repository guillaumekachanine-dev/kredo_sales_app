"use client"

// ─── Portail d'import unifié d'étude compte (Desktop & Mobile) ──────────────
//
// Shell / sélecteur d'acquisition :
// - Écran initial : choix du canal (Deep Research PDF vs ChatGPT Work 2 JSON)
// - Flow A : DeepResearchPdfImportFlow (strictement préservé)
// - Flow B : WorkBundleImportFlow (intake direct et déterministe)
// - Réouverture d'une étude en cours / prête : aiguillage direct selon son producteur

import { useState } from "react"

import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"

import type { StudyProducer } from "../domain/study-contracts"
import { DeepResearchPdfImportFlow } from "./DeepResearchPdfImportFlow"
import { ImportModeSelector, type ImportChannel } from "./ImportModeSelector"
import { WorkBundleImportFlow } from "./WorkBundleImportFlow"

export function AccountStudyImportDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  initialStudyId = null,
  initialProducer = null,
  isMobile = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  /** Rouvre le suivi d'une étude déjà importée (conversion en cours, prête ou en échec). */
  initialStudyId?: string | null
  /** Producteur connu de l'étude rouverte (PDF vs Work). */
  initialProducer?: StudyProducer | null
  isMobile?: boolean
}) {
  const [channel, setChannel] = useState<ImportChannel | null>(() => {
    if (!initialStudyId) return null
    return initialProducer === "chatgpt_work" ? "work" : "deep_research"
  })

  const getTitle = () => {
    if (channel === "work") return "Importer une étude ChatGPT Work"
    if (channel === "deep_research") return "Importer une étude ChatGPT Deep Research"
    return "Importer une étude"
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      dataTheme="edito-bright-cockpit"
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
            Étude de l&apos;entreprise — {companyName}
          </p>
          <h2 className="mt-0.5 font-heading text-base font-bold text-edito-navy">
            {getTitle()}
          </h2>
        </div>
      }
      className={cn("bg-edito-surface", isMobile ? "!w-[calc(100vw-1rem)]" : "sm:!max-w-2xl")}
      maxHeightClassName="max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]"
    >
      {!channel ? (
        <ImportModeSelector onSelectMode={(mode) => setChannel(mode)} isMobile={isMobile} />
      ) : channel === "deep_research" ? (
        <DeepResearchPdfImportFlow
          companyId={companyId}
          companyName={companyName}
          initialStudyId={initialStudyId}
          onBack={initialStudyId ? undefined : () => setChannel(null)}
          isMobile={isMobile}
        />
      ) : (
        <WorkBundleImportFlow
          companyId={companyId}
          companyName={companyName}
          initialStudyId={initialStudyId}
          onBack={initialStudyId ? undefined : () => setChannel(null)}
          isMobile={isMobile}
        />
      )}
    </AppDialog>
  )
}
