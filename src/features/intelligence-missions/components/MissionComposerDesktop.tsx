"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { defaultMissionMonth, type MissionComposerStatus } from "./mission-composer-model"
import { useMissionLauncher } from "./use-mission-launcher"

const STATUS_COPY: Record<Exclude<MissionComposerStatus, "idle" | "succeeded" | "failed" | "timeout">, string> = {
  launching: "Lancement de l’analyse…",
  queued: "Analyse placée en file d’attente…",
  running: "Analyse en cours…",
}

export function MissionComposerDesktop() {
  const [month, setMonth] = useState(defaultMissionMonth)
  const launcher = useMissionLauncher()
  const isBusy = ["launching", "queued", "running"].includes(launcher.status)

  return (
    <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-200" aria-labelledby="mission-composer-desktop-title">
      <header className="space-y-2 border-b border-primary-fg/12 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-brass">Mission prédéfinie</p>
        <h3 id="mission-composer-desktop-title" className="text-base font-bold leading-tight text-primary-fg">
          Analyse mensuelle de la veille
        </h3>
        <p className="text-[11px] leading-5 text-primary-fg/65">
          Identifier les tendances, signaux faibles, évolutions réglementaires, opportunités, risques et actions prioritaires d’une période de veille.
        </p>
      </header>

      <div className="space-y-2">
        <label htmlFor="mission-period-desktop" className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-fg/55">
          Période analysée
        </label>
        <Input
          id="mission-period-desktop"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          disabled={isBusy}
          fullWidth
          className="border-primary-fg/15 bg-primary-fg/[0.06] text-primary-fg [color-scheme:dark]"
        />
      </div>

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
          <Button variant="brass" fullWidth loading={launcher.status === "launching"} disabled={isBusy || !month} onClick={() => void launcher.launch(month)}>
            Lancer l’analyse
          </Button>
        </>
      )}
    </section>
  )
}
