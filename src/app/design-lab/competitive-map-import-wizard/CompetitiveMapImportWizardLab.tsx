"use client"

import { useMemo, useState } from "react"
import { IconChevron, IconSearch, IconStage } from "@/components/cockpit/mobile/icons"
import { cn } from "@/lib/utils"
import { COMPETITIVE_MAP_CATEGORY_LABELS, type CompetitiveMapCategory } from "@/features/competitive-map/domain/competitive-map-output"

type Proposal = "atlas" | "control"
type DemoState = "prepare-empty" | "prepare-parsed" | "arbitrate-collapsed" | "arbitrate-open" | "confirm"
type StepKey = "prepare" | "arbitrate" | "confirm"
type ResolutionStatus = "resolved" | "ambiguous" | "not_found"
type DecisionMode = "attach" | "create"

type DemoAccount = {
  id: string
  name: string
  status: ResolutionStatus
  category: CompetitiveMapCategory
  caMeur: number | null
  appetenceScore: number | null
  accessibiliteScore: number | null
  confiance: "haute" | "moyenne" | "faible"
  benchmark?: boolean
  selectedSuggestion: string
  candidates: { id: string; label: string }[]
  profile: Record<string, unknown>
}

const steps: { key: StepKey; number: string; label: string }[] = [
  { key: "prepare", number: "01", label: "Préparer" },
  { key: "arbitrate", number: "02", label: "Arbitrer" },
  { key: "confirm", number: "03", label: "Finaliser" },
]

const demoAccounts: DemoAccount[] = [
  {
    id: "eiffage",
    name: "Eiffage Construction",
    status: "resolved",
    category: "leader",
    caMeur: 4820,
    appetenceScore: 29,
    accessibiliteScore: 5,
    confiance: "haute",
    benchmark: true,
    selectedSuggestion: "eiffage-crm",
    candidates: [
      { id: "eiffage-crm", label: "Rattacher à Eiffage" },
      { id: "eiffage-energie", label: "Rattacher à Eiffage Énergie Systèmes" },
      { id: "__create__", label: "Créer un nouveau compte mapped" },
    ],
    profile: {
      metier_chaine_valeur: "Maîtrise d'oeuvre, conduite de grands chantiers et coordination de sous-traitants sur des opérations nationales.",
      couche_esn: {
        voie_entree_probable: "Entrée par industrialisation data chantier, pilotage de portefeuille applicatif et sécurisation des référentiels projets.",
      },
      grilles: {
        avantages: "Forte capacité à cadrer des programmes SI multi-sites et à financer des lots d'intégration structurants.",
        vulnerabilite_principale: "Complexité d'accès liée aux organisations régionales et aux cycles d'achat par entités.",
      },
    },
  },
  {
    id: "nexity",
    name: "Nexity",
    status: "ambiguous",
    category: "challenger",
    caMeur: 920,
    appetenceScore: 24,
    accessibiliteScore: 3,
    confiance: "moyenne",
    selectedSuggestion: "nexity-holding",
    candidates: [
      { id: "nexity-holding", label: "Rattacher à Nexity Holding" },
      { id: "nexity-solutions", label: "Rattacher à Nexity Solutions" },
      { id: "__create__", label: "Créer un nouveau compte mapped" },
    ],
    profile: {
      metier_chaine_valeur: "Promotion, gestion immobilière et services aux collectivités avec forte dépendance aux plateformes métiers.",
      couche_esn: {
        voie_entree_probable: "Entrée par modernisation applicative et consolidation des données patrimoniales.",
      },
      grilles: {
        avantages: "Besoin visible d'outillage transverse et de pilotage plus consolidé.",
        vulnerabilite_principale: "Priorités budgétaires variables selon les branches et arbitrages marché tendus.",
      },
    },
  },
  {
    id: "spie-batignolles",
    name: "Spie batignolles",
    status: "not_found",
    category: "mid_market",
    caMeur: 610,
    appetenceScore: 18,
    accessibiliteScore: 3,
    confiance: "faible",
    selectedSuggestion: "__create__",
    candidates: [{ id: "__create__", label: "Créer un nouveau compte mapped" }],
    profile: {
      metier_chaine_valeur: "Construction, génie civil et maintenance d'infrastructures.",
      couche_esn: {
        voie_entree_probable: "Entrée par qualification des besoins SI terrain et cartographie applicative initiale.",
      },
      grilles: {
        avantages: "Organisation lisible par grands métiers, propice à un premier cadrage ciblé.",
      },
    },
  },
  {
    id: "demathieu",
    name: "Demathieu Bard",
    status: "resolved",
    category: "outsider_niche",
    caMeur: 390,
    appetenceScore: 16,
    accessibiliteScore: null,
    confiance: "moyenne",
    selectedSuggestion: "demathieu-bard",
    candidates: [
      { id: "demathieu-bard", label: "Rattacher à Demathieu Bard" },
      { id: "__create__", label: "Créer un nouveau compte mapped" },
    ],
    profile: {
      metier_chaine_valeur: "Bâtiment, infrastructures et ouvrages fonctionnels en France.",
      couche_esn: {
        voie_entree_probable: "Entrée par mise à niveau des outils de pilotage d'opérations.",
      },
      grilles: {
        avantages: "Périmètre suffisamment concentré pour piloter un premier lot court.",
        vulnerabilite_principale: "Accès commercial à qualifier avant priorisation.",
      },
    },
  },
]

const segmentOptions = [
  "BTP › Travaux publics et infrastructures",
  "BTP › Promotion et immobilier",
  "Industrie › Équipements et services",
]

const stateLabels: Record<DemoState, string> = {
  "prepare-empty": "Étape 1 · avant analyse",
  "prepare-parsed": "Étape 1 · après analyse",
  "arbitrate-collapsed": "Étape 2 · comptes repliés",
  "arbitrate-open": "Étape 2 · compte ouvert",
  confirm: "Étape 3 · finalisée",
}

const proposalLabels: Record<Proposal, string> = {
  atlas: "Proposition A",
  control: "Proposition B",
}

function stepForState(state: DemoState): StepKey {
  if (state.startsWith("prepare")) return "prepare"
  if (state.startsWith("arbitrate")) return "arbitrate"
  return "confirm"
}

function moneyLabel(value: number | null): string {
  if (value === null) return "-"
  if (value >= 1000) return `${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md€`
  return `${value.toLocaleString("fr-FR")} M€`
}

function readProfileText(profile: unknown, path: string[]): string {
  let current: unknown = profile
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return "Non renseigné"
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === "string" && current.trim() ? current : "Non renseigné"
}

function statusLabel(status: ResolutionStatus): string {
  if (status === "resolved") return "Résolu"
  if (status === "ambiguous") return "Ambigu"
  return "Introuvable"
}

function proposalSummary(proposal: Proposal) {
  return proposal === "atlas"
    ? {
        title: "Atlas éditorial compact",
        body: "Fiche analytique premium, structurée par le rail Navy, les filets Brass et une hiérarchie de lecture très éditoriale.",
      }
    : {
        title: "Cobalt Control Room",
        body: "Console de contrôle sobre, plus contrastée, avec zones fonctionnelles lisibles et action d'analyse placée au centre du workflow.",
      }
}

function DemoToolbar({
  proposal,
  demoState,
  onProposalChange,
  onStateChange,
}: {
  proposal: Proposal
  demoState: DemoState
  onProposalChange: (proposal: Proposal) => void
  onStateChange: (state: DemoState) => void
}) {
  return (
    <header className="border-b border-edito-border bg-edito-surface px-5 py-4">
      <div className="mx-auto flex max-w-[1420px] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-black tracking-tight text-edito-navy">
            Design Lab · Importer une cartographie
          </h1>
          <p className="mt-1 text-xs leading-5 text-edito-muted">
            Deux directions desktop interactives. Le sélecteur reste hors de la modale de démonstration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-edito-border bg-edito-canvas p-1" aria-label="Choisir une proposition">
            {(["atlas", "control"] as Proposal[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onProposalChange(item)}
                className={cn(
                  "min-h-8 px-3 text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
                  proposal === item ? "bg-edito-navy text-white" : "text-edito-muted hover:bg-white hover:text-edito-navy",
                )}
              >
                {proposalLabels[item]}
              </button>
            ))}
          </div>
          <select
            value={demoState}
            onChange={(event) => onStateChange(event.target.value as DemoState)}
            className="h-10 min-w-[230px] border border-edito-border bg-white px-3 text-xs font-bold text-edito-navy outline-none focus:border-edito-brass"
          >
            {(Object.keys(stateLabels) as DemoState[]).map((state) => (
              <option key={state} value={state}>
                {stateLabels[state]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}

function WizardRail({ proposal, activeStep }: { proposal: Proposal; activeStep: StepKey }) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep)
  return (
    <aside
      className={cn(
        "flex min-h-0 w-[240px] shrink-0 flex-col overflow-hidden text-white",
        proposal === "atlas" ? "bg-edito-navy" : "bg-primary-deep",
      )}
    >
      <div className="px-7 pt-7">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Importer</p>
        <h2 className="mt-2 font-heading text-[19px] font-black leading-tight text-white">Cartographie</h2>
      </div>
      <ol className="mx-auto mt-10 w-[150px] space-y-7" aria-label="Étapes de l'import">
        {steps.map((step, index) => {
          const active = step.key === activeStep
          const complete = index < activeIndex
          return (
            <li key={step.key} className="relative">
              {index < steps.length - 1 ? (
                <span className="absolute left-5 top-11 h-9 w-px bg-white/16" aria-hidden="true" />
              ) : null}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center border text-[10px] font-black",
                    active && "border-edito-brass bg-edito-brass text-edito-navy",
                    complete && "border-white/35 bg-white/10 text-white",
                    !active && !complete && "border-white/20 text-white/45",
                  )}
                >
                  {complete ? "✓" : step.number}
                </span>
                <span className={cn("text-[13px] font-black", active || complete ? "text-white" : "text-white/52")}>
                  {step.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="mx-6 mt-10 border-t border-white/12 pt-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Historique</p>
          <span className="text-[10px] text-white/35">5 max.</span>
        </div>
        <ul className="mt-4 space-y-2" aria-label="Emplacements d'historique">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
              <span className="h-2 bg-white/15" aria-hidden="true" />
              <span className="h-2 bg-white/10" aria-hidden="true" />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-4 text-white/42">Structure prête pour date, secteur et importId.</p>
      </div>
      <div className="mx-6 mt-auto border-t border-white/12 py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Format attendu</p>
        <p className="mt-2 text-[10px] leading-4 text-white/62">Export JSON de cartographie sectorielle KREDO.</p>
      </div>
    </aside>
  )
}

function ModalHeader({ proposal, demoState }: { proposal: Proposal; demoState: DemoState }) {
  const summary = proposalSummary(proposal)
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-edito-border bg-white px-5 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-edito-brass">{proposalLabels[proposal]}</p>
        <h2 className="mt-0.5 truncate font-heading text-[18px] font-black text-edito-navy">{summary.title}</h2>
      </div>
      <p className="max-w-[520px] text-right text-[11px] leading-4 text-edito-muted">{summary.body}</p>
      <span className="flex size-9 shrink-0 items-center justify-center border border-edito-border text-edito-navy" aria-hidden="true">
        <IconStage />
      </span>
      <span className="sr-only">{stateLabels[demoState]}</span>
    </header>
  )
}

function InputBlock({ kind, proposal }: { kind: "file" | "paste"; proposal: Proposal }) {
  return (
    <section className="min-h-[132px] border border-edito-border bg-white">
      <div className="flex items-center justify-between border-b border-edito-border px-4 py-2">
        <h3 className="text-xs font-black text-edito-navy">{kind === "file" ? "Déposer un export JSON" : "Coller le contenu"}</h3>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">
          {kind === "file" ? "fichier" : "texte"}
        </span>
      </div>
      {kind === "file" ? (
        <label
          className={cn(
            "m-3 flex min-h-[78px] cursor-pointer items-center justify-center border border-dashed px-4 text-center transition-colors",
            proposal === "atlas"
              ? "border-edito-brass/50 bg-edito-canvas hover:bg-edito-chip"
              : "border-primary/35 bg-primary/[0.04] hover:bg-primary/[0.07]",
          )}
        >
          <span>
            <span className="block text-sm font-black text-edito-navy">btp-cartographie.json</span>
            <span className="mt-1 block text-[11px] text-edito-muted">Déposer ou parcourir</span>
          </span>
          <input className="sr-only" type="file" accept="application/json" />
        </label>
      ) : (
        <textarea
          rows={3}
          defaultValue={'{"meta":{"secteur":"BTP France","segment":"Travaux publics"},"comptes":[...]}'}
          className="m-3 min-h-[78px] w-[calc(100%-1.5rem)] resize-y border border-edito-border bg-edito-canvas p-3 font-mono text-[11px] leading-4 text-edito-body outline-none focus:border-edito-brass"
        />
      )}
    </section>
  )
}

function AnalyzeButton({ proposal, onAnalyze }: { proposal: Proposal; onAnalyze: () => void }) {
  return (
    <button
      type="button"
      onClick={onAnalyze}
      className={cn(
        "group flex min-h-12 items-center justify-between self-start border px-4 text-left transition-colors",
        proposal === "atlas"
          ? "border-edito-brass bg-edito-navy text-white hover:bg-edito-heading"
          : "border-brand-brass bg-primary-deep text-white hover:bg-primary",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center border border-brand-brass bg-brand-brass text-secondary-fg">
          <IconSearch className="size-4" />
        </span>
        <span>
          <span className="block text-xs font-black">Analyser le fichier</span>
          <span className="mt-0.5 block text-[10px] text-white/65">Parser le JSON et préparer la résolution</span>
        </span>
      </span>
      <span className="h-px w-10 bg-brand-brass transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </button>
  )
}

function ParsedSummary({ proposal, onResolve }: { proposal: Proposal; onResolve: () => void }) {
  return (
    <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] border border-edito-border bg-white">
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(90px,0.28fr))] items-stretch border-b border-edito-border",
          proposal === "control" && "bg-primary/[0.035]",
        )}
      >
        <div className={cn("border-r border-edito-border px-4 py-3", proposal === "control" && "bg-primary-deep")}>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted", proposal === "control" && "text-white/55")}>Secteur détecté</p>
          <h3 className={cn("mt-1 font-heading text-[22px] font-black leading-none text-edito-navy", proposal === "control" && "text-white")}>BTP France</h3>
        </div>
        {[
          ["Comptes", "24"],
          ["Étalon", "Eiffage"],
          ["Warnings", "2"],
        ].map(([label, value]) => (
          <div key={label} className={cn("border-r border-edito-border px-3 py-3 last:border-r-0", proposal === "control" && "bg-primary/[0.04]")}>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">{label}</p>
            <p className="mt-1 truncate text-[16px] font-black text-edito-navy">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 border-b border-edito-border p-3">
        <label className="grid gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">Segment cible</span>
          <select className="h-9 border border-edito-border bg-edito-canvas px-2 text-xs font-bold text-edito-navy outline-none focus:border-edito-brass" defaultValue={segmentOptions[0]}>
            {segmentOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">Date de référence</span>
          <input type="date" defaultValue="2026-08-14" className="h-9 border border-edito-border bg-edito-canvas px-2 text-xs font-bold text-edito-navy outline-none focus:border-edito-brass" />
        </label>
      </div>
      <div className="min-h-0 p-3">
        <div className="border-l-2 border-warning bg-warning/5 px-3 py-2 text-[11px] leading-4 text-edito-body">
          Score d&apos;appétence recalculé sur 3 comptes. Un identifiant national absent sera résolu par dénomination.
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-edito-border px-3 py-3">
        <p className="text-[11px] text-edito-muted">Tous les éléments nécessaires avant résolution sont visibles.</p>
        <button type="button" onClick={onResolve} className="inline-flex h-9 items-center gap-2 border border-primary bg-primary px-3 text-xs font-black text-primary-fg hover:bg-primary-deep">
          Lancer la résolution
          <span className="rotate-0" aria-hidden="true"><IconChevron /></span>
        </button>
      </footer>
    </section>
  )
}

function PrepareStep({ proposal, parsed, onAnalyze, onResolve }: { proposal: Proposal; parsed: boolean; onAnalyze: () => void; onResolve: () => void }) {
  return (
    <div className={cn("grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 p-5", proposal === "control" && "bg-primary/[0.035]")}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-[22px] font-black text-edito-navy">Préparer le fichier</h2>
          <p className="mt-1 text-xs text-edito-muted">Entrée JSON compacte, analyse visible, puis résolution.</p>
        </div>
        <p className="text-[11px] font-bold text-edito-muted">Source · JSON collé</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputBlock kind="file" proposal={proposal} />
        <InputBlock kind="paste" proposal={proposal} />
      </div>
      <div className="grid min-h-0 grid-cols-[minmax(270px,0.34fr)_minmax(0,1fr)] items-start gap-3">
        <AnalyzeButton proposal={proposal} onAnalyze={onAnalyze} />
        {parsed ? (
          <ParsedSummary proposal={proposal} onResolve={onResolve} />
        ) : (
          <section className="flex min-h-0 items-center justify-center border border-edito-border bg-white px-5 text-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-edito-muted">Résultat d&apos;analyse</p>
              <p className="mt-2 max-w-md text-xs leading-5 text-edito-body">
                Le bandeau secteur, les métadonnées, les warnings et l&apos;action de résolution apparaissent ici après analyse.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function MetricLine({ account }: { account: DemoAccount }) {
  const metrics = [
    ["CATÉGORIE", COMPETITIVE_MAP_CATEGORY_LABELS[account.category]],
    ["CA", moneyLabel(account.caMeur)],
    ["APPÉTENCE", account.appetenceScore === null ? "-" : `${account.appetenceScore}/35`],
    ["ACCÈS", account.accessibiliteScore === null ? "Non positionné" : `${account.accessibiliteScore}/5`],
    ["CONFIANCE", account.confiance],
  ]
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {metrics.map(([label, value]) => (
        <span key={label} className="inline-flex items-baseline gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-edito-muted">{label}</span>
          <span className="font-bold text-edito-body">{value}</span>
        </span>
      ))}
    </div>
  )
}

function AccountAccordion({
  account,
  proposal,
  open,
  onToggle,
  mode,
  onModeChange,
}: {
  account: DemoAccount
  proposal: Proposal
  open: boolean
  onToggle: () => void
  mode: DecisionMode
  onModeChange: (mode: DecisionMode) => void
}) {
  const [suggestion, setSuggestion] = useState(account.selectedSuggestion)
  const statusTone = account.status === "resolved"
    ? "border-success/35 bg-success/[0.08] text-success"
    : account.status === "ambiguous"
      ? "border-warning/40 bg-warning/[0.08] text-status-warning-ink"
      : "border-edito-border bg-edito-chip text-edito-muted"

  return (
    <article className={cn("border bg-white transition-colors", open ? "border-edito-navy" : "border-edito-border", proposal === "control" && "border-primary/25", proposal === "control" && open && "bg-primary/[0.025]")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_32px] gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-edito-brass focus-visible:ring-inset"
      >
        <span className="min-w-0 space-y-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-black text-edito-navy">{account.name}</span>
            <span className={cn("shrink-0 border px-2 py-0.5 text-[10px] font-black", statusTone)}>{statusLabel(account.status)}</span>
            {account.benchmark ? <span className="text-[10px] font-bold text-edito-brass">Compte étalon</span> : null}
          </span>
          <MetricLine account={account} />
          <span className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-2">
            <span className="text-[11px] font-black text-edito-navy">Rattachement :</span>
            <select
              value={suggestion}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const next = event.target.value
                setSuggestion(next)
                onModeChange(next === "__create__" ? "create" : "attach")
              }}
              className="h-8 min-w-0 border border-edito-border bg-edito-canvas px-2 text-[11px] font-bold text-edito-body outline-none focus:border-edito-brass"
            >
              {account.candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
              ))}
            </select>
          </span>
        </span>
        <span className={cn("mt-1 flex size-8 items-center justify-center text-edito-navy transition-transform", open && "rotate-90")} aria-hidden="true">
          <IconChevron />
        </span>
      </button>
      {open ? (
        <div className="border-t border-edito-border px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_210px] gap-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-edito-border bg-edito-border">
              {[
                ["Activités", readProfileText(account.profile, ["metier_chaine_valeur"])],
                ["Angle d'approche", readProfileText(account.profile, ["couche_esn", "voie_entree_probable"])],
                ["Forces", readProfileText(account.profile, ["grilles", "avantages"])],
                ["Faiblesses", readProfileText(account.profile, ["grilles", "vulnerabilite_principale"])],
              ].map(([title, body]) => (
                <section key={title} className={cn("min-h-[94px] bg-white p-3", title === "Forces" && "bg-success/5", title === "Faiblesses" && "bg-warning/5")}>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">{title}</h4>
                  <p className="mt-1.5 text-[11px] leading-4 text-edito-body">{body}</p>
                </section>
              ))}
            </div>
            <aside className="border-l border-edito-border pl-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">Actions</p>
              <div className="mt-3 grid gap-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-edito-body">
                  <input type="radio" name={`mode-${account.id}`} checked={mode === "attach"} onChange={() => onModeChange("attach")} className="size-3.5 accent-primary" />
                  Rattacher à un compte
                </label>
                <label className="flex items-center gap-2 text-[11px] font-bold text-edito-body">
                  <input type="radio" name={`mode-${account.id}`} checked={mode === "create"} onChange={() => onModeChange("create")} className="size-3.5 accent-primary" />
                  Créer si nécessaire
                </label>
                <label className="mt-1 flex items-center gap-2 text-[11px] font-bold text-edito-muted">
                  <input type="checkbox" className="size-3.5 accent-primary" />
                  Exclure cette ligne
                </label>
              </div>
              <label className="mt-4 grid gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">Nom éditable</span>
                <input defaultValue={account.name} className="h-8 border border-edito-border bg-white px-2 text-[11px] font-bold text-edito-body outline-none focus:border-edito-brass" />
              </label>
            </aside>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function ArbitrateStep({ proposal, initiallyOpen, onConfirm }: { proposal: Proposal; initiallyOpen: boolean; onConfirm: () => void }) {
  const [openId, setOpenId] = useState<string | null>(initiallyOpen ? demoAccounts[0].id : null)
  const [modes, setModes] = useState<Record<string, DecisionMode>>(() => Object.fromEntries(demoAccounts.map((account) => [account.id, account.selectedSuggestion === "__create__" ? "create" : "attach"])))
  const counts = useMemo(() => ({
    resolved: demoAccounts.filter((account) => account.status === "resolved").length,
    ambiguous: demoAccounts.filter((account) => account.status === "ambiguous").length,
    missing: demoAccounts.filter((account) => account.status === "not_found").length,
  }), [])

  return (
    <div className={cn("grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-5", proposal === "control" && "bg-primary/[0.035]")}>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div>
          <h2 className="font-heading text-[22px] font-black text-edito-navy">Résoudre les comptes</h2>
          <p className="mt-1 text-xs text-edito-muted">Tous les comptes sont repliés par défaut. Le header ouvre le détail sans perturber le select.</p>
        </div>
        <div className={cn("grid grid-cols-3 border border-edito-border bg-white", proposal === "control" && "border-primary/30")}>
          {[
            ["Résolus", counts.resolved],
            ["Ambigus", counts.ambiguous],
            ["Introuvables", counts.missing],
          ].map(([label, value]) => (
            <div key={label} className="border-r border-edito-border px-3 py-2 last:border-r-0">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-edito-muted">{label}</p>
              <p className="mt-0.5 text-lg font-black text-edito-navy">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-y-auto pr-1">
        <div className="space-y-2">
          {demoAccounts.map((account) => (
            <AccountAccordion
              key={account.id}
              account={account}
              proposal={proposal}
              open={openId === account.id}
              onToggle={() => setOpenId((current) => current === account.id ? null : account.id)}
              mode={modes[account.id] ?? "attach"}
              onModeChange={(mode) => setModes((current) => ({ ...current, [account.id]: mode }))}
            />
          ))}
        </div>
      </div>
      <footer className="flex items-center justify-between border-t border-edito-border pt-3">
        <button type="button" className="text-[11px] font-black uppercase tracking-[0.12em] text-edito-muted hover:text-edito-navy">Retour</button>
        <button type="button" onClick={onConfirm} className="h-9 border border-primary bg-primary px-4 text-xs font-black text-primary-fg hover:bg-primary-deep">
          Confirmer l&apos;import (4)
        </button>
      </footer>
    </div>
  )
}

function ConfirmStep({ proposal }: { proposal: Proposal }) {
  return (
    <div className={cn("grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-5", proposal === "control" && "bg-primary/[0.035]")}>
      <div>
        <h2 className="font-heading text-[22px] font-black text-edito-navy">Fiche de clôture d&apos;import</h2>
        <p className="mt-1 text-xs text-edito-muted">Synthèse compacte, sans écran de succès générique.</p>
      </div>
      <section className={cn("grid min-h-0 grid-cols-[minmax(0,1fr)_280px] border border-edito-border bg-white", proposal === "control" && "border-primary/30")}>
        <div className="grid grid-rows-[auto_minmax(0,1fr)]">
          <div className="grid grid-cols-4 border-b border-edito-border">
            {[
              ["Secteur", "BTP France"],
              ["Référence", "14/08/2026"],
              ["Traités", "4 comptes"],
              ["Statut", "Import confirmé"],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-edito-border px-4 py-3 last:border-r-0">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">{label}</p>
                <p className="mt-1 text-sm font-black text-edito-navy">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-px bg-edito-border">
            {[
              ["Créés", "1", "Spie batignolles"],
              ["Rattachés", "3", "Eiffage, Nexity, Demathieu Bard"],
              ["Exclus", "0", "Aucune ligne exclue"],
              ["Erreurs", "0", "Aucune erreur retournée"],
            ].map(([label, value, detail]) => (
              <section key={label} className="bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">{label}</p>
                <p className="mt-2 font-heading text-3xl font-black text-edito-navy">{value}</p>
                <p className="mt-2 text-xs leading-5 text-edito-body">{detail}</p>
              </section>
            ))}
          </div>
        </div>
        <aside className={cn("border-l border-edito-border p-5", proposal === "atlas" ? "bg-edito-canvas" : "bg-primary/[0.04]")}>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">Archives</p>
          <h3 className="mt-2 font-heading text-lg font-black text-edito-navy">Rapport d&apos;import créé</h3>
          <p className="mt-3 text-xs leading-5 text-edito-body">Les comptes sont reliés au segment cible et prêts pour l&apos;environnement concurrentiel.</p>
          <div className="mt-6 border-t border-edito-border pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-edito-muted">Prochaine action</p>
            <button type="button" className="mt-3 h-9 w-full border border-edito-border bg-white px-3 text-xs font-black text-edito-navy hover:bg-edito-chip">
              Revenir aux comptes
            </button>
          </div>
        </aside>
      </section>
      <footer className="flex items-center justify-between border-t border-edito-border pt-3">
        <p className="text-[11px] text-edito-muted">Métriques limitées aux données du résultat métier simulé.</p>
        <button type="button" className="h-9 border border-edito-border bg-white px-4 text-xs font-black text-edito-navy hover:bg-edito-chip">Fermer</button>
      </footer>
    </div>
  )
}

function DemoModal({
  proposal,
  demoState,
  onStateChange,
}: {
  proposal: Proposal
  demoState: DemoState
  onStateChange: (state: DemoState) => void
}) {
  const activeStep = stepForState(demoState)
  return (
    <section
      className={cn(
        "mx-auto flex h-[min(calc(100dvh-116px),760px)] min-h-[620px] max-w-[1240px] overflow-hidden border border-edito-border bg-edito-canvas",
        proposal === "control" && "border-primary/30 bg-primary/[0.025]",
      )}
      aria-label={`Modale de démonstration ${proposalLabels[proposal]}`}
    >
      <WizardRail proposal={proposal} activeStep={activeStep} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ModalHeader proposal={proposal} demoState={demoState} />
        <main className="min-h-0 flex-1 overflow-hidden">
          {activeStep === "prepare" ? (
            <PrepareStep
              proposal={proposal}
              parsed={demoState === "prepare-parsed"}
              onAnalyze={() => onStateChange("prepare-parsed")}
              onResolve={() => onStateChange("arbitrate-collapsed")}
            />
          ) : activeStep === "arbitrate" ? (
            <ArbitrateStep
              key={demoState}
              proposal={proposal}
              initiallyOpen={demoState === "arbitrate-open"}
              onConfirm={() => onStateChange("confirm")}
            />
          ) : (
            <ConfirmStep proposal={proposal} />
          )}
        </main>
      </div>
    </section>
  )
}

export function CompetitiveMapImportWizardLab() {
  const [proposal, setProposal] = useState<Proposal>("atlas")
  const [demoState, setDemoState] = useState<DemoState>("prepare-parsed")

  return (
    <div className="min-h-dvh bg-edito-canvas text-edito-body">
      <DemoToolbar
        proposal={proposal}
        demoState={demoState}
        onProposalChange={setProposal}
        onStateChange={setDemoState}
      />
      <main className="px-5 py-4">
        <DemoModal proposal={proposal} demoState={demoState} onStateChange={setDemoState} />
      </main>
    </div>
  )
}
