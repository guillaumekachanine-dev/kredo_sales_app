"use client"

import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { AccountSignalPromotionDialog } from "./AccountSignalPromotionDialog"
import { useAccountSignalActions } from "./use-account-signal-actions"

export function AccountSignalDesktopActions({
  signalId,
  companyId,
  companyName,
  onDismiss,
}: {
  signalId: string
  companyId: string
  companyName: string
  onDismiss: (signalId: string) => void
}) {
  const actions = useAccountSignalActions({ signalId, companyId, onDismiss })

  return (
    <>
      <div className="space-y-3">
        {actions.feedback ? (
          <AlertBlock
            variant={actions.feedback.tone === "error" ? "danger" : actions.feedback.tone}
            title={actions.feedback.message}
          />
        ) : null}
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void actions.verify()}
            loading={actions.isVerifying}
            loadingLabel="Vérification…"
            leftIcon={<IntelligenceIcon name="search_news" preferVector />}
          >
            Vérifier
          </Button>
          <ContextualCommunicationButton
            intent="signal_outreach"
            origin="veille_signal"
            companyId={companyId}
            companyName={companyName}
            signalId={signalId}
            refs={{ signalRef: signalId }}
            label="Générer un mail/pitch"
            variant="primary"
            size="sm"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => actions.setPromotionOpen(true)}
            leftIcon={<IntelligenceIcon name="prioritize" preferVector />}
          >
            Promouvoir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void actions.dismiss()}
            loading={actions.isDismissing}
            loadingLabel="Signal ignoré…"
            className="text-muted hover:bg-danger/[0.05] hover:text-danger"
          >
            Ignorer le signal
          </Button>
        </div>
      </div>

      <AccountSignalPromotionDialog
        open={actions.promotionOpen}
        onOpenChange={actions.setPromotionOpen}
        companyId={companyId}
        isPromoting={actions.isPromoting}
        onPromote={actions.promote}
      />
    </>
  )
}
