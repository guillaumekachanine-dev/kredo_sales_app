"use client"

import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import type {
  CockpitMobileSnapshot,
  CockpitSignalItem,
} from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import {
  buildCockpitSignalComposerRequest,
  getCockpitSignalVisualLevel,
} from "./cockpit-mobile-module-presenters"

const SIGNAL_LEVEL_LABELS = {
  strong: "Signal fort",
  active: "Signal actif",
  veille: "Veille générale",
} as const

function formatEvidenceDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function SignalCard({
  signal,
  onComposerOpen,
}: {
  signal: CockpitSignalItem
  onComposerOpen: () => void
}) {
  const level = getCockpitSignalVisualLevel(signal)
  const composerRequest = buildCockpitSignalComposerRequest(signal)

  return (
    <li className="cockpit-signal-card" data-level={level}>
      <div className="cockpit-signal-card__heading">
        <span className="cockpit-signal-level">{SIGNAL_LEVEL_LABELS[level]}</span>
        <time dateTime={signal.lastEvidenceAt}>Preuve du {formatEvidenceDate(signal.lastEvidenceAt)}</time>
      </div>
      <h3>{signal.title}</h3>
      <p className="cockpit-signal-card__context">
        {signal.companyName ?? "Veille générale"} · {signal.category}
      </p>
      {signal.summary ? <p className="cockpit-sheet-summary">{signal.summary}</p> : null}
      {signal.scoreJustification ? (
        <p className="cockpit-signal-card__detail">
          <strong>Pourquoi ce niveau</strong>
          {signal.scoreJustification}
        </p>
      ) : null}
      {signal.recommendedAction ? (
        <p className="cockpit-signal-card__detail">
          <strong>Action recommandée</strong>
          {signal.recommendedAction}
        </p>
      ) : null}
      {signal.suggestedContactName ? (
        <p className="cockpit-signal-card__contact">Contact suggéré : {signal.suggestedContactName}</p>
      ) : null}

      <div className="cockpit-signal-card__actions">
        {composerRequest ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onComposerOpen()
              openCommunicationComposer(composerRequest)
            }}
          >
            Rédiger une approche
          </Button>
        ) : null}
        {signal.companyId ? (
          <Link className="cockpit-inline-action" href={signal.href}>Ouvrir le compte</Link>
        ) : null}
        {signal.source === "veille_article" && signal.sourceUrl ? (
          <a
            className="cockpit-inline-action"
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Lire la source <span className="sr-only">(nouvel onglet)</span>
          </a>
        ) : null}
      </div>
    </li>
  )
}

export function CockpitSignalsModule({
  snapshot,
  onComposerOpen,
}: {
  snapshot: CockpitMobileSnapshot
  onComposerOpen: () => void
}) {
  const signals = snapshot.signals.items.slice(0, 3)
  if (signals.length === 0) {
    return (
      <p className="cockpit-sheet-empty">
        Aucun signal compte ni article de veille exploitable pour le moment.
      </p>
    )
  }

  return (
    <ul className="cockpit-signals-module">
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} onComposerOpen={onComposerOpen} />
      ))}
    </ul>
  )
}
