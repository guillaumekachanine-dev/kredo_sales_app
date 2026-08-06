"use client"

import { useMemo, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { AccountSignalDetailDrawer } from "@/components/accounts-contacts/intelligence/AccountSignalDetailDrawer"
import { cn } from "@/lib/utils"
import type { WatchedAccountSignal } from "@/app/(app)/veille/_data/veille-data"
import { IconChevronLeft, IconChevronRight } from "./icons"
import {
  SIGNAL_MARKER_LABELS,
  buildSignalGroups,
  formatSignalAge,
  resolveSignalMarker,
  type SignalGroupVM,
  type SignalMarker,
} from "./veille-mobile-view-models"

type VeilleSignalsViewProps = {
  signals: WatchedAccountSignal[]
  onBack: () => void
  onDismissSignal: (signalId: string) => void
}

export function VeilleSignalsView({ signals, onBack, onDismissSignal }: VeilleSignalsViewProps) {
  const groups = useMemo(() => buildSignalGroups(signals), [signals])

  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [detailSignal, setDetailSignal] = useState<WatchedAccountSignal | null>(null)
  /** Groupe à rouvrir quand on ferme le détail — permet le retour en arrière. */
  const [returnGroupId, setReturnGroupId] = useState<string | null>(null)
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

  return (
    <div className="veille-scrollbar h-full overflow-y-auto overscroll-contain bg-surface">
      <div className="border-b border-border px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-2 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
        >
          <IconChevronLeft className="size-5" />
          Retour à la lecture
        </button>

        <h2 className="mt-2 font-heading text-[22px] font-bold leading-7 text-heading">
          Signaux des comptes surveillés
        </h2>
        <p className="mt-1.5 text-sm text-muted">Priorité aux changements qui appellent une action.</p>
      </div>

      {groups.length === 0 ? (
        <p className="px-8 py-16 text-center text-sm text-muted">
          Aucun signal de compte surveillé pour le moment.
        </p>
      ) : (
        <>
          <ul aria-label={`${groups.length} comptes surveillés`}>
            {groups.map((group) => (
              <li key={group.companyId} className="border-b border-border">
                <button
                  type="button"
                  onClick={(event) => {
                    groupTriggerRef.current = event.currentTarget
                    setOpenGroupId(group.companyId)
                  }}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                >
                  <span className="mt-0.5 shrink-0">
                    <CompanyLogo
                      name={group.companyName}
                      logoPath={group.logoPath}
                      website={group.website}
                      size="lg"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold leading-6 text-heading">
                      {group.companyName}
                    </span>

                    {group.marker ? <SignalMarkerBadge marker={group.marker} /> : null}

                    <span className="mt-1.5 block text-sm leading-5 text-body">{group.primary.title}</span>

                    <span className="mt-2 flex items-center gap-2 text-xs text-muted">
                      {group.ageLabel ? <span>{group.ageLabel}</span> : null}
                      {group.ageLabel && group.otherCount > 0 ? (
                        <span aria-hidden="true" className="text-border">
                          |
                        </span>
                      ) : null}
                      {group.otherCount > 0 ? (
                        <span className="font-semibold text-primary">
                          {group.otherCount > 1
                            ? `${group.otherCount} autres signaux`
                            : "1 autre signal"}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="mt-1 shrink-0 text-heading">
                    <IconChevronRight className="size-5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="px-4 py-4 text-xs text-muted">Tri : urgence, score global, puis fraîcheur</p>
        </>
      )}

      <AppDrawer
        open={openGroup !== null}
        onOpenChange={(next) => (next ? undefined : closeGroup())}
        side="bottom"
        title={openGroup?.companyName ?? ""}
        description={
          openGroup
            ? openGroup.signals.length > 1
              ? `${openGroup.signals.length} signaux détectés`
              : "1 signal détecté"
            : undefined
        }
      >
        {openGroup ? (
          <>
            {/* `AppDrawer` masque sa `description` en mobile : on la redonne ici. */}
            <p className="mb-4 text-sm leading-6 text-muted">
              {openGroup.signals.length > 1
                ? `${openGroup.signals.length} signaux détectés`
                : "1 signal détecté"}
            </p>
            <GroupSignalList group={openGroup} onSelect={openDetail} />
          </>
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
            // La veille de compte ne porte ni date de parution ni score
            // d'intérêt dédié : même repli que pour les signaux manuels.
            publishedAt: null,
            globalScore: detailSignal.globalScore,
            interestScore: detailSignal.globalScore,
            urgencyScore: detailSignal.urgencyScore,
            confidenceScore: detailSignal.confidenceScore,
            status: detailSignal.status,
            primarySourceId: detailSignal.primarySource?.id ?? null,
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
