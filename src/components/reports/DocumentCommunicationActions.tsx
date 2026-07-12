"use client"

import { useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { PitchMailDrawerContent } from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import {
  prepareCommunicationReuse,
} from "@/app/(app)/reports/_data/reports-actions"
import type {
  CommunicationReuseMode,
  CommunicationReusePreparation,
  DocumentDetail,
} from "@/app/(app)/reports/_data/reports-types"

type DocumentCommunicationActionsProps = {
  document: DocumentDetail
  layout?: "grid" | "stack"
  presentation?: "section" | "buttons"
  buttonClassName?: string
}

const ACTIONS: Array<{ mode: CommunicationReuseMode; label: string }> = [
  { mode: "variant", label: "Créer une variante" },
  { mode: "reuse_account", label: "Réutiliser pour ce compte" },
  { mode: "adapt_contact", label: "Adapter à un autre contact" },
  { mode: "follow_up", label: "Relancer à partir du message" },
]

function isCommunicationDocument(document: DocumentDetail) {
  return ["communication", "commercial_pitch", "prise_de_parole", "campaign", "internal_note"].includes(document.documentType)
}

export function DocumentCommunicationActions({
  document,
  layout = "grid",
  presentation = "section",
  buttonClassName,
}: DocumentCommunicationActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [activeMode, setActiveMode] = useState<CommunicationReuseMode | null>(null)
  const [prepared, setPrepared] = useState<CommunicationReusePreparation | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isCommunicationDocument(document)) return null

  function handlePrepare(mode: CommunicationReuseMode) {
    setError(null)
    setActiveMode(mode)
    startTransition(async () => {
      const result = await prepareCommunicationReuse(document.id, mode)
      if ("error" in result) {
        setPrepared(null)
        setError(result.error ?? "Impossible de préparer la reprise")
        return
      }

      setPrepared(result.data)
    })
  }

  const isDrawerOpen = Boolean(activeMode)
  const buttons = ACTIONS.map((action) => (
    <Button
      key={action.mode}
      variant="secondary"
      size="sm"
      onClick={() => handlePrepare(action.mode)}
      loading={isPending && activeMode === action.mode}
      fullWidth={layout === "stack"}
      className={buttonClassName}
    >
      {action.label}
    </Button>
  ))

  if (presentation === "buttons") {
    return (
      <>
        {error ? <p className="sm:col-span-2 text-sm text-danger">{error}</p> : null}
        {buttons}

        <AppDrawer
          open={isDrawerOpen}
          onOpenChange={(open) => {
            if (!open) {
              setActiveMode(null)
              setPrepared(null)
              setError(null)
            }
          }}
          title={prepared?.title ?? "Préparation de la reprise"}
          subtitle={prepared?.description}
          loading={isPending && !prepared}
          error={error ? { title: "Impossible de préparer la reprise", description: error } : null}
          width="wide"
        >
          {prepared ? (
            <PitchMailDrawerContent
              key={`${document.id}-${activeMode ?? "reuse"}`}
              data={prepared.data}
              initialBrief={prepared.initialBrief}
              contextMetaLabel="brief source + message précédent"
            />
          ) : null}
        </AppDrawer>
      </>
    )
  }

  return (
    <>
      <section className="space-y-3 border-t border-border pt-4">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Reprendre cette communication
          </h3>
          <p className="mt-1 text-xs text-muted">
            Brief source repris depuis le run IA; le texte courant sert de comparaison.
          </p>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className={layout === "grid" ? "grid gap-2 sm:grid-cols-2" : "flex flex-col gap-2"}>
          {buttons}
        </div>
      </section>

      <AppDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setActiveMode(null)
            setPrepared(null)
            setError(null)
          }
        }}
        title={prepared?.title ?? "Préparation de la reprise"}
        subtitle={prepared?.description}
        loading={isPending && !prepared}
        error={error ? { title: "Impossible de préparer la reprise", description: error } : null}
        width="wide"
      >
        {prepared ? (
          <PitchMailDrawerContent
            key={`${document.id}-${activeMode ?? "reuse"}`}
            data={prepared.data}
            initialBrief={prepared.initialBrief}
            contextMetaLabel="brief source + message précédent"
          />
        ) : null}
      </AppDrawer>
    </>
  )
}
