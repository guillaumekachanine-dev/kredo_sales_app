"use client"

import { useMemo, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { AccountSignalDetailDrawer } from "@/components/accounts-contacts/intelligence/AccountSignalDetailDrawer"
import { AccountWatchHeaderActions } from "@/components/accounts-contacts/intelligence/AccountWatchHeaderActions"
import { cn } from "@/lib/utils"
import type { WatchedAccountSignal } from "@/app/(app)/veille/_data/veille-data"
import { IconChevronRight } from "./icons"
import {
  SIGNAL_MARKER_LABELS,
  buildSignalGroups,
  formatProducedDate,
  formatSignalAge,
  resolveSignalMarker,
  type SignalGroupVM,
  type SignalMarker,
} from "./veille-mobile-view-models"

type VeilleSignalsViewProps = {
  signals: WatchedAccountSignal[]
  companies?: Array<{ id: string; name: string }>
  onDismissSignal: (signalId: string) => void
  onFeedback?: (message: string) => void
  initialCompanyId?: string
}

export function VeilleSignalsView({
  signals,
  onDismissSignal,
  onFeedback,
  initialCompanyId,
}: VeilleSignalsViewProps) {
  const groups = useMemo(() => buildSignalGroups(signals), [signals])

  const [openGroupId, setOpenGroupId] = useState<string | null>(initialCompanyId ?? null)
  const [detailSignal, setDetailSignal] = useState<WatchedAccountSignal | null>(null)
  const [returnGroupId, setReturnGroupId] = useState<string | null>(null)
  const [updateFeedback, setUpdateFeedback] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null)
  const groupTriggerRef = useRef<HTMLButtonElement | null>(null)

  const openGroup = useMemo(
    () => groups.find((group) => group.companyId === openGroupId) ?? null,
    [groups, openGroupId],
  )

  const closeGroup = () => {
    setOpenGroupId(null)
    window.requestAnimationFrame(() => groupTriggerRef.current?.focus())
  }

  const openDetail = (signal: WatchedAccountSignal, fromGroupId: string) => {
    setReturnGroupId(fromGroupId)
    setOpenGroupId(null)
    setDetailSignal(signal)
  }

  const closeDetail = () => {
    setDetailSignal(null)
    if (returnGroupId) {
      setOpenGroupId(returnGroupId)
      setReturnGroupId(null)
    }
  }

  const totalAccounts = groups.length
  const totalSignals = signals.length

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="shrink-0 border-b border-border px-4 py-4">
        <h2 className="text-[17px] font-bold leading-6 text-heading">
          Signaux & actualités
        </h2>
        <p className="mt-1 text-xs text-muted">
          {totalAccounts} {totalAccounts > 1 ? "comptes surveillés" : "compte surveillé"} - {totalSignals} {totalSignals > 1 ? "signaux détectés" : "signal détecté"}
        </p>
      </header>

      <div className="veille-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface">
        {groups.length === 0 ? (
          <p className="px-8 py-16 text-center text-sm text-muted">
            Aucun signal de compte surveillé pour le moment.
          </p>
        ) : (
          <div>
            <ul aria-label={`${groups.length} comptes surveillés`}>
              {groups.map((group) => (
                <li key={group.companyId} className="border-b border-border">
                  <button
                    type="button"
                    onClick={(event) => {
                      groupTriggerRef.current = event.currentTarget
                      setOpenGroupId(group.companyId)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                  >
                    <span className="shrink-0">
                      <CompanyLogo
                        name={group.companyName}
                        logoPath={group.logoPath}
                        website={group.website}
                        size="lg"
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-bold leading-6 text-heading">
                        {group.companyName}
                      </span>
                      <span className="block text-xs font-semibold text-primary">
                        {group.signals.length} {group.signals.length > 1 ? "signaux" : "signal"}
                      </span>
                    </span>

                    <span className="shrink-0 text-heading">
                      <IconChevronRight className="size-5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="px-4 py-4 text-xs text-muted">Tri : urgence, score global, puis fraîcheur</p>
          </div>
        )}
      </div>

      <AppDrawer
        open={openGroup !== null}
        onOpenChange={(next) => (next ? undefined : closeGroup())}
        side="bottom"
        title={openGroup?.companyName ?? "Signaux"}
      >
        {openGroup ? (
          <div className="space-y-4">
            <div className="space-y-3 border-b border-border pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-[22px] font-bold leading-7 text-heading truncate">
                  {openGroup.companyName}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {openGroup.signals.length > 1
                    ? `${openGroup.signals.length} signaux détectés`
                    : "1 signal détecté"}
                  {" · mis à jour le "}
                  {formatProducedDate(new Date().toISOString())}
                </p>
              </div>
              <AccountWatchHeaderActions
                key={openGroup.companyId}
                companyId={openGroup.companyId}
                companyName={openGroup.companyName}
                companyLogoPath={openGroup.logoPath}
                companyWebsite={openGroup.website}
                onFeedback={(message, tone) => {
                  setUpdateFeedback({ message, tone })
                  onFeedback?.(message)
                }}
              />
              {updateFeedback ? (
                <p
                  role={updateFeedback.tone === "error" ? "alert" : "status"}
                  className={cn(
                    "border px-3 py-2 text-xs",
                    updateFeedback.tone === "error"
                      ? "border-danger/20 bg-danger/[0.04] text-danger"
                      : updateFeedback.tone === "success"
                        ? "border-success/20 bg-success/[0.04] text-success"
                        : "border-info/20 bg-info/[0.04] text-info",
                  )}
                >
                  {updateFeedback.message}
                </p>
              ) : null}
            </div>
            <GroupSignalList group={openGroup} onSelect={openDetail} />
          </div>
        ) : null}
      </AppDrawer>

      {detailSignal ? (
        <AccountSignalDetailDrawer
          open
          onOpenChange={(next) => (next ? undefined : closeDetail())}
          signal={{
            id: detailSignal.id,
            category: detailSignal.category,
            type: detailSignal.type,
            title: detailSignal.title,
            summary: detailSignal.summary,
            detectedAt: detailSignal.detectedAt,
            expiresAt: null,
            publishedAt: null,
            interestScore: detailSignal.globalScore,
            urgencyScore: detailSignal.urgencyScore,
            confidenceScore: detailSignal.confidenceScore,
            status: detailSignal.status,
            primarySourceId: detailSignal.primarySourceId ?? detailSignal.primarySource?.source_name ?? null,
            recommendedAction: detailSignal.recommendedAction,
            recommendedPracticeId: detailSignal.recommendedPracticeId,
            primarySource: detailSignal.primarySource,
          }}
          companyId={detailSignal.company.id}
          companyName={detailSignal.company.name}
          onDismiss={(signalId) => {
            setReturnGroupId(null)
            onDismissSignal(signalId)
          }}
        />
      ) : null}
    </div>
  )
}

function GroupSignalList({
  group,
  onSelect,
}: {
  group: SignalGroupVM
  onSelect: (signal: WatchedAccountSignal, fromGroupId: string) => void
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {group.signals.map((signal) => {
        const marker = resolveSignalMarker(signal)
        const age = formatSignalAge(signal.detectedAt)
        return (
          <li key={signal.id}>
            <button
              type="button"
              onClick={() => onSelect(signal, group.companyId)}
              className="flex min-h-16 w-full items-start gap-3 px-1 py-3 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                {marker ? <SignalMarkerBadge marker={marker} /> : null}
                <span className="block text-sm font-semibold leading-5 text-heading">{signal.title}</span>
                {age ? <span className="mt-1 block text-xs text-muted">{age}</span> : null}
              </span>
              <span className="mt-1 shrink-0 text-heading">
                <IconChevronRight className="size-5" />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function SignalMarkerBadge({ marker }: { marker: Exclude<SignalMarker, null> }) {
  return (
    <span className="mt-1 flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          marker === "action" ? "bg-brand-brass" : "bg-primary",
        )}
      />
      <span
        className={cn(
          "text-sm font-semibold",
          marker === "action" ? "text-brand-brass" : "text-primary",
        )}
      >
        {SIGNAL_MARKER_LABELS[marker]}
      </span>
    </span>
  )
}
