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
  category,
  title,
  publishedAt,
  sourceName,
  sourceUrl,
  summary,
  analysis,
  recommendedAction,
  globalScore,
  urgencyScore,
  confidenceScore,
  onDismiss,
}: {
  signalId: string
  companyId: string
  companyName: string
  category: string
  title: string
  publishedAt: string
  sourceName: string
  sourceUrl: string | null
  summary: string | null
  analysis: string | null
  recommendedAction: string | null
  globalScore: number
  urgencyScore: number
  confidenceScore: number
  onDismiss: (signalId: string) => void
}) {
  const actions = useAccountSignalActions({ signalId, companyId, onDismiss })

  return (
    <>
      <article className="border border-border bg-surface px-5 py-4 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-xs">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3">
          <div className="min-w-0">
            <span className="inline-flex border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-primary">
              {category.replaceAll("_", " ")}
            </span>
            <h3 className="mt-2 font-heading text-[17px] font-bold leading-[1.25] text-heading">
              {title}
            </h3>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <span>Source</span>
              <span className="font-semibold text-heading">{sourceName}</span>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center border border-border bg-surface px-2.5 font-bold text-primary transition-colors hover:border-primary/35 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heading"
                >
                  Consulter la source <span className="sr-only">(nouvel onglet)</span>
                </a>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void actions.verify()}
                loading={actions.isVerifying}
                loadingLabel="Vérification…"
                leftIcon={<IntelligenceIcon name="search_news" preferVector />}
                className="!h-7 !min-w-0 px-2.5 text-[10px]"
              >
                Vérifier l’information
              </Button>
            </div>
          </div>

          <aside className="flex w-[12.5rem] shrink-0 flex-col items-end">
            <p className="text-[10px] font-semibold text-muted">Parution : {publishedAt}</p>
            <div className="mt-3 grid w-full grid-cols-1 gap-1.5">
              <ContextualCommunicationButton
                intent="signal_outreach"
                origin="veille_signal"
                companyId={companyId}
                companyName={companyName}
                signalId={signalId}
                refs={{ signalRef: signalId }}
                label="Générer un pitch/mail"
                variant="primary"
                size="sm"
                className="!h-8 w-full px-2.5 text-[10px]"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => actions.setPromotionOpen(true)}
                leftIcon={<IntelligenceIcon name="prioritize" preferVector />}
                className="!h-8 w-full !min-w-0 px-2.5 text-[10px]"
              >
                Promouvoir
              </Button>
            </div>
          </aside>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <section className="min-h-[7.25rem] border border-border bg-edito-canvas/45 px-4 py-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-heading">Résumé</h4>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[12px] leading-[1.55] text-body">
              {summary || "Aucun résumé disponible."}
            </p>
          </section>
          <section className="min-h-[7.25rem] border border-brand-brass/35 bg-brand-brass/[0.045] px-4 py-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-brass">Analyse</h4>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12px] leading-[1.55] text-body">
              {analysis || "Aucune interprétation disponible."}
            </p>
            {recommendedAction ? (
              <p className="mt-2 line-clamp-2 text-[11px] leading-[1.45] text-heading">
                <span className="font-bold">Action suggérée :</span> {recommendedAction}
              </p>
            ) : null}
          </section>
        </div>

        <footer className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
          <dl className="flex items-center divide-x divide-border text-[9px] text-muted">
            <div className="flex items-center gap-1.5 pr-3"><dt>Score</dt><dd className="font-bold text-heading">{Math.round(globalScore * 100)}%</dd></div>
            <div className="flex items-center gap-1.5 px-3"><dt>Urgence</dt><dd className="font-bold text-heading">{Math.round(urgencyScore * 100)}%</dd></div>
            <div className="flex items-center gap-1.5 pl-3"><dt>Confiance</dt><dd className="font-bold text-heading">{Math.round(confidenceScore * 100)}%</dd></div>
          </dl>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void actions.dismiss()}
            loading={actions.isDismissing}
            loadingLabel="Signal ignoré…"
            className="!h-7 !min-w-0 px-2.5 text-[10px]"
          >
            Ignorer
          </Button>
        </footer>

        {actions.feedback ? (
          <div className="mt-3"><AlertBlock variant={actions.feedback.tone === "error" ? "danger" : actions.feedback.tone} title={actions.feedback.message} /></div>
        ) : null}
      </article>

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
