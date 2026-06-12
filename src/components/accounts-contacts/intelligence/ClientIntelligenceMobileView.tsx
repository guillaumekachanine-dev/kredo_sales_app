"use client"

import { useState, Fragment } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { DashboardQuickActions } from "@/components/dashboard/layout/DashboardQuickActions"
import type { DashboardAction } from "@/lib/dashboard/dashboard-types"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import {
  lifecycleLabel,
  ProvenanceBadge,
  ScorePill,
  SectionBlock,
  SignalList,
} from "./intelligence-parts"
import { PitchMailDrawerContent, SummaryDrawerContent, CampaignDrawerContent } from "./IntelligenceActionDrawers"
import {
  type TabKey,
  INTELLIGENCE_PROCESS_STEPS,
} from "./intelligence-process"

type MobilePanelKey = TabKey | "pitch" | "summary" | "campaign"

export function ClientIntelligenceMobileView({ data }: { data: ClientIntelligenceData }) {
  const { company, client, sector, signals } = data

  const [activePanel, setActivePanel] = useState<MobilePanelKey>("accueil")
  const [message, setMessage] = useState<string | null>(null)

  const quickActions: DashboardAction[] = [
    {
      id: "scan-contacts",
      label: "Scan contacts",
      onClick: () => setMessage("Scan des contacts à connecter"),
      icon: <ScanContactsIcon className="h-4 w-4" />,
      variant: "secondary",
    },
    {
      id: "campaign",
      label: "+ campagne",
      onClick: () => {
        setActivePanel("campaign")
        setMessage(null)
      },
      icon: <CampaignIcon className="h-4 w-4" />,
      variant: "secondary",
    },
    {
      id: "summary",
      label: "Synthèse",
      onClick: () => {
        setActivePanel("summary")
        setMessage(null)
      },
      icon: <SummaryIcon className="h-4 w-4" />,
      variant: "secondary",
    },
    {
      id: "pitch",
      label: "Pitch/mail",
      onClick: () => {
        setActivePanel("pitch")
        setMessage(null)
      },
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
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

  if (activePanel !== "accueil") {
    const stepDetails = {
      analyses: {
        title: "Analyses",
        description: "Comprendre le compte, son secteur, ses signaux et son contexte.",
      },
      enjeux: {
        title: "Cartographie des enjeux",
        description: "Transformer les constats en problématiques client.",
      },
      scoring: {
        title: "Scoring IA",
        description: "Prioriser le compte avec un score expliqué.",
      },
      strategie: {
        title: "Stratégie commerciale",
        description: "Définir l’angle d’approche et les messages clés.",
      },
      roadmap: {
        title: "Roadmap commerciale",
        description: "Convertir la stratégie en prochaines actions.",
      },
      pitch: {
        title: "Construire un pitch/mail",
        description: "Préparer un message commercial contextualisé.",
      },
      summary: {
        title: "Synthèse client",
        description: "Créer une fiche de synthèse consolidée.",
      },
      campaign: {
        title: "Créer une campagne",
        description: "Configurer une campagne de prospection multi-canal.",
      },
    }[activePanel]

    return (
      <div data-theme="cockpit" className="flex min-h-full flex-col gap-4 bg-canvas p-4 pb-24">
        <button
          type="button"
          onClick={() => {
            setActivePanel("accueil")
            setMessage(null)
          }}
          className="self-start text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded px-1.5 py-0.5 cursor-pointer min-h-[44px] flex items-center"
        >
          ← Retour à l&apos;accueil
        </button>

        <div className="border-b border-border pb-3">
          <h1 className="font-heading text-base font-bold text-heading uppercase tracking-wide">
            {stepDetails.title}
          </h1>
          <p className="text-[11px] text-body mt-0.5">
            {stepDetails.description}
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-1">
          {activePanel === "analyses" && (
            <>
              {client ? (
                <SectionBlock reading title="Synthèse IA" action={<ProvenanceBadge source={client.source} />}>
                  <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-body">
                    {client.data.synthese || "Aucune synthèse disponible."}
                  </p>
                </SectionBlock>
              ) : (
                <p className="text-xs text-muted italic">Aucune synthèse client disponible.</p>
              )}

              {sector ? (
                <SectionBlock title="Étude sectorielle" action={<ProvenanceBadge source={sector.source} />}>
                  <p className="line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-body">{sector.data.synthese}</p>
                </SectionBlock>
              ) : (
                <p className="text-xs text-muted italic">Aucune étude sectorielle disponible.</p>
              )}
            </>
          )}

          {activePanel === "enjeux" && (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-4 py-8 text-center min-h-[140px]">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Cartographie des enjeux à connecter.
              </span>
              <span className="text-[11px] text-muted/70">Disponible au lot F</span>
            </div>
          )}

          {activePanel === "scoring" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <ScorePill score={company.aiScore} />
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-4 py-8 text-center min-h-[140px]">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Breakdown du score à connecter.
                </span>
                <span className="text-[11px] text-muted/70">Disponible au lot E</span>
              </div>
            </div>
          )}

          {activePanel === "strategie" && (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-4 py-8 text-center min-h-[140px]">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Stratégie commerciale et messages clés à connecter.
              </span>
              <span className="text-[11px] text-muted/70">Disponible au lot H</span>
            </div>
          )}

          {activePanel === "roadmap" && (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-4 py-8 text-center min-h-[140px]">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Roadmap commerciale à connecter.
              </span>
              <span className="text-[11px] text-muted/70">Disponible au lot G</span>
            </div>
          )}

          {activePanel === "pitch" && (
            <PitchMailDrawerContent data={data} variant="mobile" />
          )}

          {activePanel === "summary" && (
            <SummaryDrawerContent data={data} variant="mobile" />
          )}

          {activePanel === "campaign" && (
            <CampaignDrawerContent data={data} variant="mobile" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div data-theme="cockpit" className="flex min-h-full flex-col gap-4 bg-canvas p-4 pb-24">
      <div className="flex items-center justify-between">
        <Link href={`/prospection/accounts?drawer=${company.id}`} className="text-[11px] font-semibold text-muted block">
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

      {/* Header compact */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo name={company.name} logoPath={company.logoPath} website={company.website} size="xl" className="bg-white p-1 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-bold text-heading">{company.name}</h1>
            <p className="text-[11px] text-body">
              {company.sector}
            </p>
            <div className="mt-1">
              <span className="inline-block rounded border border-border bg-canvas/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-body">
                {lifecycleLabel(company.lifecycleStatus)}
              </span>
            </div>
          </div>
        </div>
        <ScorePill score={company.aiScore} className="shrink-0" />
      </div>

      {/* Priorité */}
      <div className="rounded-lg border border-border bg-surface p-2.5">
        <p className="text-xs font-semibold text-heading text-center">Priorité : {company.priority}</p>
      </div>

      {/* Actions rapides mobile */}
      <div className="flex flex-col gap-2 border-t border-b border-border/50 py-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Actions rapides
        </span>
        <DashboardQuickActions
          actions={quickActions}
          showHeader={false}
          className="p-0 gap-0 shadow-none border-0 bg-transparent"
        />
        {message && (
          <p className="text-[11px] text-muted text-center font-medium mt-1">
            {message}
          </p>
        )}
      </div>

      {/* Timeline verticale mobile */}
      <div className="flex flex-col gap-0 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">
          Processus commercial
        </span>
        {INTELLIGENCE_PROCESS_STEPS.map((step, idx) => (
          <Fragment key={step.key}>
            <button
              type="button"
              onClick={() => setActivePanel(step.key)}
              aria-label={`Étape ${idx + 1} : ${step.label}. ${step.description}`}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border border-border bg-surface text-left min-h-[48px]",
                "transition-all hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-heading text-xs font-bold text-heading leading-tight">
                    {step.label}
                  </div>
                  <div className="text-[10px] text-body mt-0.5 leading-tight">
                    {step.description}
                  </div>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-muted shrink-0 ml-2" />
            </button>
            {idx < INTELLIGENCE_PROCESS_STEPS.length - 1 && (
              <div className="w-0.5 h-3.5 bg-border/50 ml-[25px]" />
            )}
          </Fragment>
        ))}
      </div>


      {/* Signaux */}
      <SectionBlock title="Signaux récents">
        <SignalList signals={signals} />
      </SectionBlock>

      {sector && (
        <SectionBlock title="Secteur" action={<ProvenanceBadge source={sector.source} />}>
          <p className="line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-body">{sector.data.synthese}</p>
        </SectionBlock>
      )}
    </div>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

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

