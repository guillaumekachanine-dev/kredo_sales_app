"use client"

import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { AccountSignalPromotionDialog } from "./AccountSignalPromotionDialog"
import { useAccountSignalActions } from "./use-account-signal-actions"

export function AccountSignalMobileActions({
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
      <div className="space-y-2 border-t border-border pt-5">
        {actions.feedback ? (
          <AlertBlock
            variant={actions.feedback.tone === "error" ? "danger" : actions.feedback.tone}
            title={actions.feedback.message}
            className="mb-3"
          />
        ) : null}
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => void actions.verify()}
          loading={actions.isVerifying}
          loadingLabel="Vérification…"
          leftIcon={<IntelligenceIcon name="search_news" preferVector />}
          className="min-h-11 justify-center"
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
          size="md"
          fullWidth
          stopPropagation={false}
          className="min-h-11 justify-center"
        />
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => actions.setPromotionOpen(true)}
          leftIcon={<IntelligenceIcon name="prioritize" preferVector />}
          className="min-h-11 justify-center"
        >
          Promouvoir
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => void actions.dismiss()}
          loading={actions.isDismissing}
          loadingLabel="Signal ignoré…"
          className="min-h-11 justify-center text-muted hover:bg-danger/[0.05] hover:text-danger"
        >
          Ignorer le signal
        </Button>
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
