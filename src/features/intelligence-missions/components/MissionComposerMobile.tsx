"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/Button"
import type { AccountValue } from "@/components/missions/AccountCombobox"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import {
  defaultMissionMonth,
  resolveInitialAccountSelection,
  type MissionComposerConfig,
  type MissionLaunchInput,
} from "./mission-composer-model"
import { useMissionLauncher } from "./use-mission-launcher"
import { MissionMonthField } from "./MissionMonthField"
import { MissionAccountField } from "./MissionAccountField"

export function MissionComposerMobile({
  config,
  onBack,
}: {
  config: MissionComposerConfig
  onBack: () => void
}) {
  const entityContext = useIntelligenceContext((state) => state.entityContext)
  const [month, setMonth] = useState(defaultMissionMonth)
  const [account, setAccount] = useState<AccountValue | null>(() =>
    resolveInitialAccountSelection(entityContext),
  )

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

  const statusCopy = launcher.status === "queued"
    ? "Analyse placée en file d’attente…"
    : launcher.status === "running"
      ? "Analyse en cours…"
      : launcher.status === "launching"
        ? "Lancement de l’analyse…"
        : null

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-200" aria-labelledby="mission-composer-mobile-title">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
        <span aria-hidden="true">←</span> Retour
      </button>

      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">Mission prédéfinie</p>
        <h3 id="mission-composer-mobile-title" className="text-xl font-bold leading-tight text-white">{config.label}</h3>
        <p className="text-sm leading-5 text-white/70">{config.description}</p>
      </header>

      {config.inputKind === "month" ? (
        <MissionMonthField
          value={month}
          onChange={setMonth}
          disabled={isBusy}
          variant="mobile"
        />
      ) : config.inputKind === "account" ? (
        <MissionAccountField
          value={account}
          onChange={setAccount}
          disabled={isBusy}
          variant="mobile"
        />
      ) : null}

      {statusCopy ? (
        <p role="status" aria-live="polite" className="flex min-h-11 items-center gap-3 rounded-[var(--radius-medium)] bg-white/10 px-4 text-sm font-semibold text-white">
          <span className="size-2.5 animate-pulse rounded-full bg-brand-brass" aria-hidden="true" />
          {statusCopy}
        </p>
      ) : null}

      {launcher.status === "succeeded" ? (
        <div className="animate-in fade-in space-y-4 border-t border-success/40 pt-5 duration-200" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-success">Analyse terminée</p>
          <h4 className="text-lg font-bold leading-tight text-white">{launcher.result?.title ?? "Rapport disponible"}</h4>
          <p className="text-sm leading-6 text-white/70">{launcher.result?.executiveSummary ?? "Le rapport est archivé dans vos productions."}</p>
          <Link href="/reports" className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-medium)] bg-brand-brass px-4 text-sm font-bold text-secondary-fg">
            Ouvrir Rapports &amp; Rédaction
          </Link>
          <button type="button" onClick={launcher.reset} className="min-h-11 w-full text-sm font-semibold text-white/70">Lancer une autre période</button>
        </div>
      ) : (
        <>
          {launcher.status === "failed" ? (
            <div role="alert" className="space-y-2 border-l-2 border-danger pl-4 text-sm leading-5 text-white/75">
              <p>{launcher.errorMessage ?? "L’analyse n’a pas pu aboutir."}</p>
              <button type="button" onClick={launcher.reset} className="min-h-11 font-bold text-white underline underline-offset-2">Réessayer</button>
            </div>
          ) : null}
          {launcher.status === "timeout" ? (
            <div role="status" className="space-y-2 border-l-2 border-warning pl-4 text-sm leading-5 text-white/75">
              <p>{launcher.errorMessage}</p>
              <Link href="/reports" className="inline-flex min-h-11 items-center font-bold text-white underline underline-offset-2">Consulter les rapports</Link>
            </div>
          ) : null}
          <Button
            variant="brass"
            size="lg"
            fullWidth
            loading={launcher.status === "launching"}
            disabled={isBusy || !currentInput}
            onClick={() => {
              if (currentInput) {
                void launcher.launch(currentInput)
              }
            }}
            className="min-h-14 text-base"
          >
            Lancer l’analyse
          </Button>
        </>
      )}
    </section>
  )
}
