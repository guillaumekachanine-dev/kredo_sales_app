"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/Button"
import { WorkflowExecutionConfirmDialog } from "@/components/ui/WorkflowExecutionConfirmDialog"
import type { AccountValue } from "@/components/missions/AccountCombobox"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import {
  defaultMissionMonth,
  resolveInitialAccountSelection,
  type MissionComposerConfig,
  type MissionComposerStatus,
  type MissionLaunchInput,
} from "./mission-composer-model"
import { useMissionLauncher } from "./use-mission-launcher"
import { MissionMonthField } from "./MissionMonthField"
import { MissionAccountField } from "./MissionAccountField"

const STATUS_COPY: Record<Exclude<MissionComposerStatus, "idle" | "succeeded" | "failed" | "timeout">, string> = {
  launching: "Lancement de l’analyse…",
  queued: "Analyse placée en file d’attente…",
  running: "Analyse en cours…",
}

export function MissionComposerDesktop({ config }: { config: MissionComposerConfig }) {
  const entityContext = useIntelligenceContext((state) => state.entityContext)
  const [month, setMonth] = useState(defaultMissionMonth)
  const [account, setAccount] = useState<AccountValue | null>(() =>
    resolveInitialAccountSelection(entityContext),
  )
  const [confirmOpen, setConfirmOpen] = useState(false)

  const launcher = useMissionLauncher(config)
  const isBusy = ["launching", "queued", "running"].includes(launcher.status)

  const currentInput = useMemo<MissionLaunchInput | null>(() => {
    switch (config.inputKind) {
      case "month":
        return month ? { kind: "month", month } : null
      case "account":
        return account?.id ? { kind: "account", companyId: account.id } : null
      default:
        return null
    }
  }, [config.inputKind, month, account])

  return (
    <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-200" aria-labelledby="mission-composer-desktop-title">
      <header className="space-y-2 border-b border-primary-fg/12 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">Mission prédéfinie</p>
        <h3 id="mission-composer-desktop-title" className="text-base font-bold leading-tight text-primary-fg">
          {config.label}
        </h3>
        <p className="text-[11px] leading-5 text-primary-fg/65">
          {config.description}
        </p>
      </header>

      {config.inputKind === "month" ? (
        <MissionMonthField
          value={month}
          onChange={setMonth}
          disabled={isBusy}
          variant="desktop"
        />
      ) : config.inputKind === "account" ? (
        <MissionAccountField
          value={account}
          onChange={setAccount}
          disabled={isBusy}
          variant="desktop"
        />
      ) : null}

      <div className="border-l-2 border-brand-brass pl-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-brass">Livrable</p>
        <p className="mt-1 text-[11px] leading-5 text-primary-fg/60">
          Un rapport synthétique avec constats sourcés, recommandations et actions prioritaires, archivé dans Rapports &amp; Rédaction.
        </p>
      </div>

      {launcher.status === "succeeded" ? (
        <div className="animate-in fade-in space-y-3 border-t border-success/30 pt-4 duration-200" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-success">Analyse terminée</p>
          <h4 className="text-sm font-bold text-primary-fg">{launcher.result?.title ?? "Rapport de mission disponible"}</h4>
          <p className="text-[11px] leading-5 text-primary-fg/65">
            {launcher.result?.executiveSummary ?? "Le rapport a été archivé et peut être consulté dans vos productions."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/reports" className="inline-flex min-h-9 items-center rounded-[var(--radius-medium)] bg-brand-brass px-3 text-[11px] font-bold text-secondary-fg transition-colors hover:bg-brand-brass-hover">
              Voir dans Rapports &amp; Rédaction
            </Link>
            <button type="button" onClick={launcher.reset} className="min-h-9 px-2 text-[11px] font-semibold text-primary-fg/60 hover:text-primary-fg">
              Nouvelle analyse
            </button>
          </div>
        </div>
      ) : (
        <>
          {isBusy ? (
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-[11px] font-semibold text-primary-fg/70">
              <span className="size-2 animate-pulse rounded-full bg-brand-brass" aria-hidden="true" />
              {STATUS_COPY[launcher.status as keyof typeof STATUS_COPY]}
            </p>
          ) : null}
          {launcher.status === "failed" ? (
            <div role="alert" className="space-y-2 border-l-2 border-danger pl-3 text-[11px] text-primary-fg/70">
              <p>{launcher.errorMessage ?? "L’analyse n’a pas pu aboutir."}</p>
              <button type="button" onClick={launcher.reset} className="font-bold text-primary-fg underline underline-offset-2">Réessayer</button>
            </div>
          ) : null}
          {launcher.status === "timeout" ? (
            <div role="status" className="space-y-2 border-l-2 border-warning pl-3 text-[11px] text-primary-fg/70">
              <p>{launcher.errorMessage}</p>
              <Link href="/reports" className="font-bold text-primary-fg underline underline-offset-2">Consulter les rapports</Link>
            </div>
          ) : null}
          <Button
            variant="brass"
            fullWidth
            loading={launcher.status === "launching"}
            disabled={isBusy || !currentInput}
            onClick={() => setConfirmOpen(true)}
          >
            Lancer l’analyse
          </Button>

          <WorkflowExecutionConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            actionLabel="Lancer l’analyse"
            runType={`mission:${config.missionSlug}`}
            onConfirm={() => {
              if (currentInput) {
                void launcher.launch(currentInput)
              }
            }}
            pending={isBusy}
          />
        </>
      )}
    </section>
  )
}
