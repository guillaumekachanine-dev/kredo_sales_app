"use client"

import { useState, Fragment, type ReactNode } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { DashboardQuickActions } from "@/components/dashboard/layout/DashboardQuickActions"
import type { DashboardAction } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceData, IntelligenceSource } from "@/lib/intelligence/intelligence-data"
import {
  ComingSoon,
  Field,
  lifecycleLabel,
  ProvenanceBadge,
  ScorePill,
  SectionBlock,
  SignalList,
  TagList,
} from "./intelligence-parts"
import { IntelligenceRightRail } from "./IntelligenceRightRail"
import { PitchMailDrawerContent, SummaryDrawerContent, CampaignDrawerContent } from "./IntelligenceActionDrawers"
import {
  type TabKey,
  type ProcessStepKey,
  INTELLIGENCE_PROCESS_STEPS,
  getProcessStepStatus,
} from "./intelligence-process"

const TABS: { key: TabKey; label: string; lot?: string }[] = [
  { key: "accueil", label: "Accueil" },
  { key: "analyses", label: "Analyses" },
  { key: "enjeux", label: "Enjeux", lot: "lot F" },
  { key: "scoring", label: "Scoring", lot: "lot E" },
  { key: "strategie", label: "Stratégie", lot: "lot H" },
  { key: "roadmap", label: "Roadmap", lot: "lot G" },
]

export function ClientIntelligenceDesktopView({ data }: { data: ClientIntelligenceData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("accueil")
  const [activeAction, setActiveAction] = useState<"pitch" | "summary" | "campaign" | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { company, client, freshness, presence, contacts } = data

  const quickActions: DashboardAction[] = [
    {
      id: "scan-contacts",
      label: "Scan contacts",
      onClick: () => setMessage("Scan des contacts à connecter"),
      icon: <ScanContactsIcon className="h-3.5 w-3.5" />,
      variant: "secondary",
    },
    {
      id: "campaign",
      label: "+ campagne",
      onClick: () => {
        setActiveAction("campaign")
        setMessage(null)
      },
      icon: <CampaignIcon className="h-3.5 w-3.5" />,
      variant: "secondary",
    },
    {
      id: "summary",
      label: "Synthèse client",
      onClick: () => {
        setActiveAction("summary")
        setMessage(null)
      },
      icon: <SummaryIcon className="h-3.5 w-3.5" />,
      variant: "secondary",
    },
    {
      id: "pitch",
      label: "Pitch/mail",
      onClick: () => {
        setActiveAction("pitch")
        setMessage(null)
      },
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="brain-cutout">
              <rect width="200" height="200" fill="white" />
              <rect x="96" y="0" width="8" height="200" fill="black" />
              <rect x="65" y="65" width="70" height="70" rx="10" fill="black" />
              <path d="M 65 65 Q 45 55 40 75" stroke="black" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M 65 135 Q 45 145 40 125" stroke="black" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M 135 65 Q 155 55 160 75" stroke="black" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M 135 135 Q 155 145 160 125" stroke="black" strokeWidth="8" strokeLinecap="round" fill="none" />
            </mask>
          </defs>
          <g mask="url(#brain-cutout)" fill="currentColor">
            <path d="M 96 25 C 70 20 45 40 40 60 C 20 65 15 85 20 100 C 10 115 15 140 35 145 C 45 170 75 180 96 170 Z" />
            <path d="M 104 25 C 130 20 155 40 160 60 C 180 65 185 85 180 100 C 190 115 185 140 165 145 C 155 170 125 180 104 170 Z" />
          </g>
          <text x="100" y="113" fontFamily="Arial, Helvetica, sans-serif" fontSize="38" fontWeight="bold" fill="currentColor" textAnchor="middle">AI</text>
        </svg>
      ),
      variant: "secondary",
    },
  ]
  const analysisSource: IntelligenceSource = client?.source ?? "none"

  return (
    <div data-theme="cockpit" className="flex h-full overflow-hidden bg-canvas">
      {/* ── Colonne gauche : header + onglets + contenu ──────────────────────────
          Le rail droit est pleine hauteur : le header ne fait donc que la largeur
          de cette colonne (= la section principale juste en dessous). ─────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Header (compact) ─────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-border bg-surface px-6 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Link
              href={`/prospection/accounts?drawer=${company.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition-colors hover:text-primary"
            >
              ← Comptes &amp; contacts
            </Link>
            <button
              type="button"
              onClick={() => setMessage("Workflow à connecter")}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-body hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              Mettre à jour
            </button>
          </div>
          <h2 className="font-heading text-xl font-bold text-heading">
            Cockpit intelligence
          </h2>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <CompanyLogo name={company.name} logoPath={company.logoPath} website={company.website} size="xl" className="bg-white p-1" />
                <div>
                  <h1 className="font-heading text-xl font-bold text-heading">{company.name}</h1>
                  <p className="mt-1 text-xs text-body">
                    {company.sector} · {company.segment} · {company.hqLocation}
                  </p>
                  <div className="mt-1.5">
                    <span className="inline-block rounded border border-border bg-canvas/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-body">
                      {lifecycleLabel(company.lifecycleStatus)}
                    </span>
                  </div>
                </div>
              </div>
              <ScorePill score={company.aiScore} />
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-start gap-1 min-w-[340px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Actions rapides
                  </span>
                  <DashboardQuickActions
                    actions={quickActions}
                    showHeader={false}
                    className="p-0 gap-0 shadow-none border-0 bg-transparent w-full"
                  />
                </div>
              </div>
              {message && (
                <p className="text-[11px] text-muted font-medium mr-1.5 transition-opacity">
                  {message}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* ── Onglets ───────────────────────────────────────────────────────── */}
        <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative -mb-px border-b-2 px-3 py-3 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:text-primary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-body",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Contenu de l'onglet actif ─────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {activeTab === "accueil" && (
            <AccueilTab
              data={data}
              onOpenTab={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === "analyses" && <AnalyseTab data={data} />}
          {activeTab === "enjeux" && (
            <ComingSoon lot="lot F">Cartographie enjeux × offres ESN</ComingSoon>
          )}
          {activeTab === "scoring" && (
            <ComingSoon lot="lot E">Breakdown du score déterministe et expliqué</ComingSoon>
          )}
          {activeTab === "strategie" && (
            <ComingSoon lot="lot H">Stratégie commerciale : angles d’approche, interlocuteurs, messages clés</ComingSoon>
          )}
          {activeTab === "roadmap" && (
            <ComingSoon lot="lot G">Roadmap commerciale → opportunités, tâches et relances</ComingSoon>
          )}
        </main>
      </div>

      {/* Drawer Action IA */}
      {activeAction && (
        <div className="w-[460px] shrink-0 border-l border-border bg-surface flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Assistant IA
            </span>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              aria-label="Fermer le panneau"
              className="text-xs font-semibold text-muted hover:text-body cursor-pointer p-1 rounded hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
            >
              Fermer ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activeAction === "pitch" && <PitchMailDrawerContent data={data} />}
            {activeAction === "summary" && <SummaryDrawerContent data={data} />}
            {activeAction === "campaign" && <CampaignDrawerContent data={data} />}
          </div>
        </div>
      )}

      {/* ── Tour de contrôle : rail droit pleine hauteur (tranche sur le cockpit clair) ── */}
      <IntelligenceRightRail
        freshness={freshness}
        presence={presence}
        contacts={contacts}
        analysisSource={analysisSource}
      />
    </div>
  )
}

// ─── Onglet Accueil — synthèse exécutive ──────────────────────────────────────

function AccueilTab({
  data,
  onOpenTab,
}: {
  data: ClientIntelligenceData
  onOpenTab: (tab: Exclude<TabKey, "accueil">) => void
}) {
  const { signals } = data
  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ── Frise process horizontal ── */}
      <div className="flex items-stretch gap-2 py-2">
        {INTELLIGENCE_PROCESS_STEPS.map((step, idx) => {
          const status = getProcessStepStatus(step.key, data)
          const Icon = STEP_ICONS[step.key]
          const toneCls = {
            success: "text-success bg-success/10 border-success/20",
            warning: "text-warning bg-warning/10 border-warning/20",
            neutral: "text-muted bg-surface-hover border-border",
          }[status.tone]

          return (
            <Fragment key={step.key}>
              <button
                type="button"
                onClick={() => onOpenTab(step.key)}
                aria-label={`Étape ${idx + 1} : ${step.label}. Statut : ${status.label}`}
                className={cn(
                  "flex flex-1 flex-col items-start text-left p-4 rounded-lg border border-border bg-surface",
                  "transition-all hover:border-primary/40 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  "cursor-pointer shadow-none min-h-[170px]"
                )}
              >
                <div className="mb-3 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xs font-bold text-heading mb-1 uppercase tracking-wide leading-tight flex-1">
                  {step.label}
                </h3>
                <p className="text-[11px] text-body mb-3 leading-normal line-clamp-3">
                  {step.description}
                </p>
                <div className="mt-auto shrink-0">
                  <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", toneCls)}>
                    {status.label}
                  </span>
                </div>
              </button>
              {idx < INTELLIGENCE_PROCESS_STEPS.length - 1 && (
                <ChevronRightIcon className="h-5 w-5 text-muted shrink-0 mx-0.5 self-center" />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* ── Signaux récents ── */}
      {signals && signals.length > 0 && (
        <SectionBlock title="Signaux récents">
          <SignalList signals={signals} />
        </SectionBlock>
      )}
    </div>
  )
}

// ─── Onglet Analyse — fond documentaire ───────────────────────────────────────

function AnalyseTab({ data }: { data: ClientIntelligenceData }) {
  const { client, sector } = data

  if (!client && !sector) {
    return <ComingSoon lot="lot A+">Aucune analyse client ni sectorielle pour ce compte</ComingSoon>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {client && (
        <SectionBlock reading title="Analyse client" action={<ProvenanceBadge source={client.source} />}>
          {client.data.synthese && (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-body">{client.data.synthese}</p>
          )}

          {Object.keys(client.data.identite).length > 0 && (
            <div className="mb-4">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-muted">
                Identité &amp; chiffres clés
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(client.data.identite).map(([key, value]) => (
                  <Field key={key} label={key.replace(/_/g, " ")} value={value} />
                ))}
              </div>
            </div>
          )}

          {Object.keys(client.data.positionnement).length > 0 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(client.data.positionnement).map(([key, value]) => (
                <Field key={key} label={key.replace(/_/g, " ")} value={value} />
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {client.data.signaux.tendanceCroissance && (
              <Field label="Tendance de croissance" value={client.data.signaux.tendanceCroissance} />
            )}
            {client.data.signaux.maturiteDigitale && (
              <Field label="Maturité digitale" value={client.data.signaux.maturiteDigitale} />
            )}
            {client.data.signaux.recrutementsRecents && (
              <Field label="Recrutements récents" value={client.data.signaux.recrutementsRecents} />
            )}
            {client.data.contexteSectoriel.tendances && (
              <Field label="Tendances sectorielles" value={client.data.contexteSectoriel.tendances} />
            )}
          </div>

          {client.data.contexteSectoriel.concurrents.length > 0 && (
            <div className="mt-4">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-muted">
                Concurrents identifiés
              </span>
              <TagList items={client.data.contexteSectoriel.concurrents} />
            </div>
          )}
        </SectionBlock>
      )}

      {sector ? (
        <SectionBlock reading title="Étude sectorielle" action={<ProvenanceBadge source={sector.source} />}>
          <div className="space-y-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-body">{sector.data.synthese}</p>
            
            {!!sector.data.volumeMarche && (
              <div className="rounded border border-border/60 bg-canvas/40 p-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Volume de Marché</span>
                <div className="text-xs text-body leading-relaxed">{renderJsonValue(sector.data.volumeMarche)}</div>
              </div>
            )}
            
            {!!sector.data.segmentClientele && (
              <div className="rounded border border-border/60 bg-canvas/40 p-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Segments Clients</span>
                <div className="text-xs text-body leading-relaxed">{renderJsonValue(sector.data.segmentClientele)}</div>
              </div>
            )}
            
            {!!sector.data.acteursCles && (
              <div className="rounded border border-border/60 bg-canvas/40 p-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Acteurs Clés</span>
                {Array.isArray(sector.data.acteursCles) && (sector.data.acteursCles as unknown[]).every(a => typeof a === "string") ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(sector.data.acteursCles as string[]).map((actor, idx) => (
                      <span key={idx} className="rounded border border-border bg-canvas/50 px-2 py-0.5 text-[11px] font-medium text-body">
                        {actor}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-body leading-relaxed">{renderJsonValue(sector.data.acteursCles)}</div>
                )}
              </div>
            )}
            
            {!!sector.data.analyseConcurrentielle && (
              <div className="rounded border border-border bg-canvas/40 p-4">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-muted">Analyse Concurrentielle</span>
                <div className="text-xs text-body leading-relaxed">{renderJsonValue(sector.data.analyseConcurrentielle)}</div>
              </div>
            )}
            
            {!!sector.data.environnementNormatif && (
              <div className="rounded border border-border/60 bg-canvas/40 p-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Environnement Normatif</span>
                <div className="text-xs text-body leading-relaxed">{renderJsonValue(sector.data.environnementNormatif)}</div>
              </div>
            )}
          </div>
        </SectionBlock>
      ) : (
        <ComingSoon lot="lot D">Étude sectorielle (mutualisée par secteur)</ComingSoon>
      )}

      <ComingSoon lot="lot I">Veille & signaux (feeders n8n) · Scan contacts</ComingSoon>
    </div>
  )
}

function renderJsonValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (value.every(i => typeof i === "string" || typeof i === "number")) {
      return <span>{(value as (string | number)[]).join(", ")}</span>
    }
    return (
      <ul className="space-y-1.5 mt-0.5">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-muted shrink-0 mt-1.5" />
            <span className="flex-1 leading-relaxed">{renderJsonValue(item, depth + 1)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === "object") {
    return (
      <div className={depth > 0 ? "space-y-1" : "space-y-2"}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-[9px] text-muted/70 font-semibold uppercase tracking-wide block mb-0.5">
              {k.replace(/_/g, " ")}
            </span>
            <div className="leading-relaxed">{renderJsonValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    )
  }
  return String(value)
}



function AnalyseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="13" r="2" />
      <path d="m16 19-3.5-3.5" />
    </svg>
  )
}

function IssuesMapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function ScoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M12 14l5-5" />
    </svg>
  )
}

function StrategyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function RoadmapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

const STEP_ICONS: Record<ProcessStepKey, (props: { className?: string }) => ReactNode> = {
  analyses: AnalyseIcon,
  enjeux: IssuesMapIcon,
  scoring: ScoreIcon,
  strategie: StrategyIcon,
  roadmap: RoadmapIcon,
}

// ─── Actions Rapides du Header ──────────────────────────────────────────────

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}

function CampaignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  )
}

function SummaryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  )
}

function ScanContactsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 3" />
    </svg>
  )
}



