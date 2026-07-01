"use client"

import React from "react"
import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  formatMobileDateLabel,
  formatMobileTimeLabel,
  getMobileBusinessStatusLabel,
  getMobilePriorityLabel,
  getMobilePrimaryDeepLinks,
  getMobileSourceLabel,
  getMobileTemporalStateLabel,
} from "./agenda-mobile-model"
import type { AgendaGroupedItem, AgendaItem } from "@/lib/agenda/agenda-types"

interface MobileAgendaItemSheetProps {
  open: boolean
  item: AgendaItem | null
  relatedGroup?: AgendaGroupedItem | null
  timezone: string
  onOpenChange: (open: boolean) => void
  onHideForSession: (itemId: string) => void
}

export function MobileAgendaItemSheet({
  open,
  item,
  relatedGroup,
  timezone,
  onOpenChange,
  onHideForSession,
}: MobileAgendaItemSheetProps) {
  if (!item) {
    return (
      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Détails"
        side="bottom"
      >
        <div />
      </AppDrawer>
    )
  }

  const links = getMobilePrimaryDeepLinks(item)
  const relatedItems = relatedGroup?.items.filter((related) => related.id !== item.id) ?? []

  const handleHide = () => {
    onHideForSession(item.id)
    onOpenChange(false)
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={item.title}
      subtitle={item.subtitle ?? undefined}
      description={item.description ?? undefined}
      eyebrow={item.domain}
      contentClassName="pb-safe"
    >
      <div className="space-y-5">
        {/* Badges metadata row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={item.temporalState === "overdue" ? "danger" : "brand"} size="sm">
            {getMobileTemporalStateLabel(item)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getMobileBusinessStatusLabel(item)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getMobilePriorityLabel(item.priority)}
          </Badge>
          <Badge variant="neutral" size="sm">
            {getMobileSourceLabel(item.sourceType)}
          </Badge>
        </div>

        {/* Temporal details */}
        <section className="rounded-xl border border-border bg-canvas/40 p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Temporalité
          </h3>
          <div className="mt-2.5 space-y-1 text-sm font-medium">
            <p className="text-heading">{formatMobileDateLabel(item, timezone)}</p>
            <p className="text-body text-xs">{formatMobileTimeLabel(item, timezone)}</p>
          </div>
        </section>

        {/* Context details */}
        {(item.companyLabel || item.ownerLabel || item.personLabel) && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Contexte
            </h3>
            <div className="mt-2.5 space-y-1.5 text-xs text-body font-medium">
              {item.companyLabel && (
                <p>
                  <span className="text-muted">Compte :</span>{" "}
                  <span className="text-heading font-semibold">{item.companyLabel}</span>
                </p>
              )}
              {item.personLabel && (
                <p>
                  <span className="text-muted">Personne :</span>{" "}
                  <span className="text-heading font-semibold">{item.personLabel}</span>
                </p>
              )}
              {item.ownerLabel && (
                <p>
                  <span className="text-muted">Propriétaire :</span>{" "}
                  <span className="text-heading">{item.ownerLabel}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Quick Links */}
        {links.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2.5">
              Liens associés
            </h3>
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-border/80 px-3 py-2.5 text-xs font-semibold text-heading flex items-center justify-between transition-colors hover:bg-surface-hover active:bg-surface-hover/80"
                >
                  <span>{link.label}</span>
                  <svg className="size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Linked Objects */}
        {relatedItems.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Objets liés
            </h3>
            <div className="mt-2.5 space-y-2">
              {relatedItems.map((related) => (
                <div key={related.id} className="rounded-lg border border-border bg-canvas/40 px-3 py-2 text-xs">
                  <p className="font-semibold text-heading">{related.title}</p>
                  <p className="mt-1 text-[10px] text-muted">{formatMobileTimeLabel(related, timezone)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Global actions */}
        <section className="pt-2 flex flex-col gap-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={handleHide}
            className="text-danger hover:text-danger-hover hover:bg-danger-muted/5 font-semibold text-xs h-11"
          >
            Masquer pour cette session
          </Button>
        </section>
      </div>
    </AppDrawer>
  )
}
