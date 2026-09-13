"use client"

// ─── Panneau « Étude de l'entreprise » (Desktop) ────────────────────────────
// En tête de l'onglet Connaissance : l'étude publiée, la dernière étude en cours de
// traitement, et l'unique action d'acquisition — importer une étude ChatGPT Deep
// Research. Il remplace l'ancien « Mettre à jour l'entreprise » (INTEL-030, supprimé).

import { useState } from "react"

import { formatDayMonthYear } from "@/lib/formatting/date-fr"
import { cn } from "@/lib/utils"

import type { AccountStudyState } from "../data/study-read"
import type { StudyProducer } from "../domain/study-contracts"
import { AccountStudyImportDialog } from "./AccountStudyImportDialog"

const STATUS_LABELS: Record<string, string> = {
  extracted: "Texte extrait — conversion à lancer",
  converting: "Conversion en cours",
  ready: "Convertie — à vérifier et publier",
  failed: "Conversion en échec",
}

export function AccountStudyPanel({
  state,
  companyId,
  companyName,
  isMobile = false,
}: {
  state: AccountStudyState
  companyId: string
  companyName: string
  isMobile?: boolean
}) {
  const [dialog, setDialog] = useState<{ studyId: string | null; producer?: string | null } | null>(null)
  const pending = state.recent.find((study) => !study.publishedAt) ?? null
  const current = state.current

  return (
    <>
      <div className={cn(
        "flex gap-3 rounded-lg border border-edito-border bg-edito-surface px-4 py-3",
        isMobile ? "flex-col" : "flex-wrap items-center justify-between",
      )}>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-edito-heading">Étude de l&apos;entreprise</p>
          {current ? (
            <p className="text-xs text-edito-body">
              <span className="font-semibold">{current.title}</span> — publiée le {formatDayMonthYear(current.publishedAt)}
            </p>
          ) : (
            <p className="text-xs text-edito-muted">
              Aucune étude publiée : l&apos;onglet affiche les données FOLIO historiques du compte.
            </p>
          )}
          {state.currentUnreadable ? (
            <p role="alert" className="text-[11px] font-semibold text-danger">
              L&apos;étude publiée est illisible ({state.currentUnreadable.issues[0]}) — republiez une étude.
            </p>
          ) : null}
          {pending ? (
            <p className={cn("text-[11px]", pending.status === "failed" ? "font-semibold text-danger" : "text-edito-muted")}>
              Dernière étude : {pending.title} — {STATUS_LABELS[pending.status] ?? pending.status}
              <button
                type="button"
                onClick={() => setDialog({ studyId: pending.id, producer: pending.producer })}
                className="ml-2 font-bold text-edito-heading underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
              >
                Ouvrir
              </button>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDialog({ studyId: null })}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded border border-edito-navy bg-edito-navy px-4 text-xs font-bold text-edito-surface transition-colors hover:bg-edito-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
            isMobile ? "min-h-[44px] w-full" : "min-h-9",
          )}
        >
          Importer une étude
        </button>
      </div>

      {dialog ? (
        <AccountStudyImportDialog
          key={dialog.studyId ?? "new"}
          open
          onOpenChange={(open) => { if (!open) setDialog(null) }}
          companyId={companyId}
          companyName={companyName}
          initialStudyId={dialog.studyId}
          initialProducer={dialog.producer as StudyProducer | null | undefined}
          isMobile={isMobile}
        />
      ) : null}
    </>
  )
}

export function AccountStudyMobilePanel(props: Omit<Parameters<typeof AccountStudyPanel>[0], "isMobile">) {
  return <AccountStudyPanel {...props} isMobile />
}
