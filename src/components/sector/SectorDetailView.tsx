"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SectorWithRelations, PracticeKey, Urgency } from '@/types/sector'
import { ScoreBar } from './blocks/ScoreBar'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/formatters'

// ─── Render configuration mappings ──────────────────────────────────────────

const PRACTICE_LABEL: Record<PracticeKey | 'multi', string> = {
  data_ai: 'Data & IA',
  cloud_eng: 'Cloud Eng.',
  product: 'Product',
  cyber: 'Cyber',
  multi: 'Multi',
}

const PRACTICE_COLORS: Record<PracticeKey | 'multi', string> = {
  data_ai: 'bg-primary/10 text-primary border border-primary/15',
  cloud_eng: 'bg-blue-500/10 text-blue-600 border border-blue-500/15',
  product: 'bg-violet-500/10 text-violet-600 border border-violet-500/15',
  cyber: 'bg-danger/10 text-danger border border-danger/15',
  multi: 'bg-body/10 text-body border border-body/15',
}

const URGENCY_STYLE: Record<Urgency, string> = {
  critical: 'bg-danger/10 text-danger border border-danger/15',
  high: 'bg-warning/10 text-warning border border-warning/15',
  medium: 'bg-accent/10 text-accent border border-accent/15',
  low: 'bg-muted/10 text-muted border border-border',
}

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Faible',
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  regulatory: 'Réglementaire',
  market: 'Marché',
  competitor: 'Concurrent',
  appointment: 'RDV',
  tender: "Appel d'offres",
  report: 'Rapport',
  other: 'Autre',
}

const LIFECYCLE_LABEL: Record<string, string> = {
  client_actif: 'Client actif',
  prospect: 'Prospect',
  cible: 'Cible',
  client_dormant: 'Dormant',
  ancien_client: 'Ancien client',
  partenaire: 'Partenaire',
  non_prioritaire: 'Non prio.',
  exclu: 'Exclu',
}

const LIFECYCLE_STYLE: Record<string, string> = {
  client_actif: 'bg-success/10 text-success border border-success/30',
  prospect: 'bg-warning/10 text-warning border border-warning/30',
  cible: 'bg-primary/10 text-primary border border-primary/30',
  client_dormant: 'bg-accent/10 text-accent border border-accent/30',
  ancien_client: 'bg-border/40 text-muted border-border',
  partenaire: 'bg-success/10 text-success border border-success/30',
  non_prioritaire: 'bg-border/40 text-muted border-border',
  exclu: 'bg-danger/10 text-danger border border-danger/30',
}

const MATURITY_LABEL: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
}

const MATURITY_STYLE: Record<string, string> = {
  low: 'bg-danger/10 text-danger border border-danger/30',
  medium: 'bg-warning/10 text-warning border border-warning/30',
  high: 'bg-success/10 text-success border border-success/30',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  development: 'En développement',
  watch: 'Sous veille',
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-success/10 text-success border border-success/30',
  development: 'bg-warning/10 text-warning border border-warning/30',
  watch: 'bg-border/40 text-muted border-border',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Props {
  sector: SectorWithRelations
}

export default function SectorDetailView({ sector }: Props) {
  const router = useRouter()

  // B. Interactivité - Sections dépliables
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['sec-pfit', 'sec-pain']) // ces deux ouvertes par défaut
  )

  // B. Interactivité - Tabs playbook
  const [activeTab, setActiveTab] = useState(0)

  // Mobile navigation bottom sheet drawer
  const [playbookOpen, setPlaybookOpen] = useState(false)

  // Trigger event optimism actions
  const [eventStatuses, setEventStatuses] = useState<
    Record<string, 'pending' | 'acted' | 'dismissed'>
  >(Object.fromEntries(sector.events.map((e) => [e.id, e.status])))

  const pendingEvents = sector.events.filter(
    (e) => (eventStatuses[e.id] ?? e.status) === 'pending'
  )

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const markEvent = (id: string, status: 'acted' | 'dismissed') => {
    setEventStatuses((prev) => ({ ...prev, [id]: status }))
  }

  // C. Boutons d'action (choice bar)
  const handleAction = (label: string, route: string) => {
    if (label.includes("Plan d'approche")) {
      router.push('/prospection/accounts/544f9112-893c-4e1f-92f0-658aa308f458')
    } else if (label.includes('Email')) {
      router.push(
        '/prospection/accounts/544f9112-893c-4e1f-92f0-658aa308f458?action=email'
      )
    } else if (label.includes('Nouveau compte')) {
      router.push(`/prospection/accounts?newSector=${sector.slug}`)
    } else {
      router.push(route)
    }
  }

  const maturityLabel = sector.digital_maturity
    ? MATURITY_LABEL[sector.digital_maturity]
    : 'Non renseignée'

  const practiceKeys: PracticeKey[] = [
    'data_ai',
    'cloud_eng',
    'product',
    'cyber',
  ]

  // Sort companies: Robertet in lead, then sorted by name
  const sortedCompanies = [...sector.companies].sort((a, b) => {
    if (a.name.toLowerCase().includes('robertet')) return -1
    if (b.name.toLowerCase().includes('robertet')) return 1
    return a.name.localeCompare(b.name)
  })

  // Playbook tabs config
  const playbookTabs = [
    { label: 'Personas cibles' },
    { label: 'Arguments ROI' },
    { label: 'Objections & réponses' },
    { label: "Points d'entrée" },
  ]

  // Render playbook tab content
  const renderPlaybookContent = () => {
    switch (activeTab) {
      case 0: // Personas
        return (
          <div className="space-y-3.5">
            {sector.playbook.personas.length === 0 ? (
              <p className="text-xs text-muted italic">Aucun persona renseigné.</p>
            ) : (
              sector.playbook.personas.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-canvas/50 border border-border p-3.5 rounded-xl flex flex-col gap-2"
                >
                  <h4 className="text-xs font-bold text-heading uppercase tracking-wider">
                    {p.role}
                  </h4>
                  <div className="text-xs space-y-2">
                    <p className="text-body leading-relaxed">
                      <span className="font-bold text-[9px] text-muted uppercase tracking-wider block mb-0.5">
                        Enjeu :
                      </span>
                      {p.enjeu}
                    </p>
                    <p className="text-danger leading-relaxed">
                      <span className="font-bold text-[9px] text-danger/80 uppercase tracking-wider block mb-0.5">
                        Peur :
                      </span>
                      {p.peur}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      case 1: // ROI arguments
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sector.playbook.roi_arguments.length === 0 ? (
              <p className="text-xs text-muted italic col-span-full">
                Aucun argument ROI renseigné.
              </p>
            ) : (
              sector.playbook.roi_arguments.map((arg, idx) => (
                <div
                  key={idx}
                  className="bg-success/5 border border-success/20 p-4 flex flex-col items-center justify-center text-center gap-1.5 rounded-xl"
                >
                  <span className="text-xl font-black text-success leading-none">
                    #{idx + 1}
                  </span>
                  <p className="text-[11px] font-semibold text-success leading-snug">
                    {arg}
                  </p>
                </div>
              ))
            )}
          </div>
        )
      case 2: // Objections
        return (
          <div className="space-y-4 divide-y divide-border/60">
            {sector.playbook.objections.length === 0 ? (
              <p className="text-xs text-muted italic">Aucune objection répertoriée.</p>
            ) : (
              sector.playbook.objections.map((obj, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex flex-col gap-2.5">
                  <div className="bg-danger/5 border-l-3 border-danger p-3 text-xs rounded-r-xl">
                    <span className="font-bold text-[9px] text-danger uppercase tracking-wider block mb-1">
                      Objection client
                    </span>
                    <p className="italic text-heading font-medium">
                      « {obj.objection} »
                    </p>
                  </div>
                  <div className="bg-success/5 border-l-3 border-success p-3 text-xs rounded-r-xl">
                    <span className="font-bold text-[9px] text-success uppercase tracking-wider block mb-1">
                      Réponse Kredo
                    </span>
                    <p className="text-body leading-relaxed">{obj.reponse}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      case 3: // Entry points
        return (
          <div className="space-y-2.5">
            {sector.playbook.entry_points.length === 0 ? (
              <p className="text-xs text-muted italic">Aucun point d&apos;entrée renseigné.</p>
            ) : (
              sector.playbook.entry_points.map((ep, idx) => {
                let badgeLabel = 'Réseau'
                let badgeClass = 'bg-blue-500/10 text-blue-600 border border-blue-500/15'

                const lowerEp = ep.toLowerCase()
                if (lowerEp.includes('urgent') || lowerEp.includes('prioritaire')) {
                  badgeLabel = 'Urgent'
                  badgeClass = 'bg-danger/10 text-danger border border-danger/15'
                } else if (lowerEp.includes('quick') || lowerEp.includes('facile')) {
                  badgeLabel = 'Quick-win'
                  badgeClass = 'bg-success/10 text-success border border-success/15'
                } else if (
                  lowerEp.includes('patrimoine') ||
                  lowerEp.includes('historique')
                ) {
                  badgeLabel = 'Patrimoine'
                  badgeClass = 'bg-warning/10 text-warning border border-warning/15'
                }

                return (
                  <div
                    key={idx}
                    className="bg-surface border border-border p-3.5 flex items-center justify-between gap-4 rounded-xl"
                  >
                    <span className="text-xs font-semibold text-body">{ep}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-black text-heading leading-tight font-heading">
              {sector.name}
            </h1>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border shrink-0', STATUS_STYLE[sector.status] ?? STATUS_STYLE.watch)}>
              {STATUS_LABEL[sector.status] ?? sector.status}
            </span>
            {sector.digital_maturity && (
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border shrink-0', MATURITY_STYLE[sector.digital_maturity])}>
                Maturité : {maturityLabel}
              </span>
            )}
          </div>
          {sector.description && (
            <p className="text-xs text-body leading-relaxed max-w-3xl">
              {sector.description}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          {sector.attractiveness_score !== null && (
            <div className="flex flex-col items-center bg-surface border border-border rounded-xl px-4 py-2.5 min-w-[80px]">
              {/* Removed */}
              <span className="text-2xl font-black text-primary leading-none">
                {sector.attractiveness_score.toFixed(1)}
              </span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-1.5">
                Attractivité
              </span>
            </div>
          )}
          {sector.market_size_eur_bn !== null && (
            <div className="flex flex-col items-center bg-surface border border-border rounded-xl px-4 py-2.5 min-w-[80px]">
              {/* Removed */}
              <span className="text-2xl font-black text-heading leading-none">
                {sector.market_size_eur_bn.toFixed(1)}
              </span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider mt-1.5">
                Marché (Md€)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── CHOICE BAR / ACTION BUTTONS ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-surface border border-border rounded-2xl">
        <button
          onClick={() =>
            handleAction(
              "Plan d'approche PARFEX",
              '/prospection/comptes/544f9112-893c-4e1f-92f0-658aa308f458'
            )
          }
          className="text-xs font-bold px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-deep text-primary-fg transition-all active:scale-98 cursor-pointer outline-none"
        >
          Plan d&apos;approche PARFEX
        </button>
        <button
          onClick={() =>
            handleAction(
              'Email PARFEX',
              '/prospection/comptes/544f9112-893c-4e1f-92f0-658aa308f458?action=email'
            )
          }
          className="text-xs font-bold px-4 py-2.5 rounded-xl bg-surface border border-border text-heading hover:bg-surface-hover transition-all active:scale-98 cursor-pointer outline-none"
        >
          Email PARFEX
        </button>
        <button
          onClick={() =>
            handleAction(
              'Pitch DSI 15 min',
              `/ressources/playbook/${sector.slug}`
            )
          }
          className="text-xs font-bold px-4 py-2.5 rounded-xl bg-surface border border-border text-heading hover:bg-surface-hover transition-all active:scale-98 cursor-pointer outline-none"
        >
          Pitch DSI 15 min
        </button>
        {sector.slug === 'banque-finance-assurance' && (
          <button
            onClick={() => router.push(`/ressources/playbook/${sector.slug}`)}
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-surface border border-border text-heading hover:bg-surface-hover transition-all active:scale-98 cursor-pointer outline-none"
          >
            Pitch Conformité GAFI
          </button>
        )}
        <button
          onClick={() =>
            handleAction(
              '+ Nouveau compte',
              `/prospection/comptes/nouveau?sector=${sector.slug}`
            )
          }
          className="text-xs font-bold px-4 py-2.5 rounded-xl bg-surface border border-border text-heading hover:bg-surface-hover transition-all active:scale-98 cursor-pointer outline-none ml-auto"
        >
          + Nouveau compte
        </button>
      </div>

      {/* ── RESPONSIVE GRID LAYOUT ─────────────────────────────────────────── */}
      <div className="space-y-6">
        
        {/* TOP ROW: Practices Fit and Market Metrics Card side by side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Section: Practices Fit (2/3 width) */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('sec-pfit')}
              className="w-full flex items-center justify-between p-5 text-left font-heading text-xs font-bold text-heading uppercase tracking-wider cursor-pointer hover:bg-surface-hover/20 outline-none"
            >
              <span>Adéquation practices Kredo</span>
              <svg
                className={cn('w-4 h-4 transition-transform duration-200 text-muted', openSections.has('sec-pfit') && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.has('sec-pfit') && (
              <div className="p-5 pt-0 border-t border-border/40 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {practiceKeys.map((key) => {
                    const score = sector.practices_fit?.[key] ?? 0
                    let barColor = 'bg-primary'
                    if (key === 'cloud_eng') barColor = 'bg-blue-500'
                    if (key === 'product') barColor = 'bg-violet-500'
                    if (key === 'cyber') barColor = 'bg-danger'

                    return (
                      <div
                        key={key}
                        className="bg-canvas/30 border border-border/50 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-heading">
                            {PRACTICE_LABEL[key]}
                          </span>
                          {/* Removed */}
                          <span className="text-xs font-bold text-primary">
                            {score.toFixed(1)}/5
                          </span>
                        </div>
                        <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', barColor)}
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Attractiveness & Details metrics card (1/3 width, hidden on mobile) */}
          <div className="hidden lg:block bg-surface border border-border rounded-2xl p-5 space-y-4 self-stretch">
            <h3 className="text-[10px] font-bold text-heading font-heading uppercase tracking-wider">
              Détails du Marché & Indicateurs
            </h3>
            <div className="divide-y divide-border/40 text-xs">
              {sector.market_size_eur_bn !== null && (
                <div className="flex items-center justify-between py-2.5 first:pt-0">
                  <span className="text-muted font-medium">Marché</span>
                  {/* Removed */}
                  <span className="font-bold text-heading">
                    {sector.market_size_eur_bn.toFixed(1)} Md€
                    {sector.market_growth_pct !== null && (
                      <span className="text-success font-semibold ml-1">
                        (+{sector.market_growth_pct.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted font-medium">Maturité digitale</span>
                <span className="font-bold text-heading">{maturityLabel}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted font-medium">TJM moyen</span>
                {/* Removed */}
                <span className="font-bold text-heading">
                  {sector.avg_tjm_min !== null && sector.avg_tjm_max !== null
                    ? `${sector.avg_tjm_min} - ${sector.avg_tjm_max} €`
                    : sector.avg_tjm_min !== null
                    ? `>= ${sector.avg_tjm_min} €`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <span className="text-muted font-medium">Comptes liés</span>
                {/* Removed */}
                <span className="font-bold text-heading">
                  {sector.companies.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: Pain Points and Playbook Panel side by side on Desktop (50% / 50% split) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Section: Pain Points (50% width) */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('sec-pain')}
              className="w-full flex items-center justify-between p-5 text-left font-heading text-xs font-bold text-heading uppercase tracking-wider cursor-pointer hover:bg-surface-hover/20 outline-none"
            >
              <span>Points de douleur identifiés (Pain Points) ({sector.pain_points.length})</span>
              <svg
                className={cn('w-4 h-4 transition-transform duration-200 text-muted', openSections.has('sec-pain') && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.has('sec-pain') && (
              <div className="p-5 pt-0 border-t border-border/40 divide-y divide-border/60">
                {sector.pain_points.length === 0 ? (
                  <p className="text-xs text-muted italic pt-4">
                    Aucun point de douleur identifié.
                  </p>
                ) : (
                  sector.pain_points.map((pp) => {
                    const practiceLabel = pp.kredo_practice
                      ? PRACTICE_LABEL[pp.kredo_practice]
                      : null
                    const practiceClass = pp.kredo_practice
                      ? PRACTICE_COLORS[pp.kredo_practice]
                      : 'bg-muted/10 text-muted'

                    return (
                      <div key={pp.id} className="py-4 first:pt-4 last:pb-0 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-xs font-bold text-heading leading-snug">
                            {pp.title}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {practiceLabel && (
                              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', practiceClass)}>
                                {practiceLabel}
                              </span>
                            )}
                            {/* Removed */}
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                              Fréquence : {pp.frequency_count}/7
                            </span>
                          </div>
                        </div>

                        {pp.description && (
                          <p className="text-xs text-body leading-relaxed">
                            {pp.description}
                          </p>
                        )}

                        <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${(pp.frequency_count / 7) * 100}%` }}
                          />
                        </div>

                        {pp.verbatim && (
                          <div className="mt-2 bg-canvas/30 border-l-2 border-border/80 pl-3 py-1.5 text-[11px] text-body italic rounded-r-lg">
                            &quot;{pp.verbatim}&quot;
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Section: Playbook Panel (50% width, Desktop inline, hidden on mobile) */}
          <div className="hidden lg:block bg-surface border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-[10px] font-bold text-heading font-heading uppercase tracking-wider border-b border-border/40 pb-2">
              Playbook commercial
            </h3>
            <div className="flex border-b border-border/60 overflow-x-auto pb-px gap-1">
              {playbookTabs.map((tab, idx) => {
                const isActive = activeTab === idx
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={cn(
                      'text-[10px] font-bold px-2.5 py-1.5 border-b-2 transition-all whitespace-nowrap outline-none cursor-pointer',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-heading'
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className="pt-2 min-h-[200px]">{renderPlaybookContent()}</div>
          </div>
        </div>

        {/* BOTTOM ROW: Calendar, Trigger Events, and Accounts List side by side on Desktop (3 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Section: Regulatory Calendar */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('sec-reg')}
              className="w-full flex items-center justify-between p-5 text-left font-heading text-xs font-bold text-heading uppercase tracking-wider cursor-pointer hover:bg-surface-hover/20 outline-none"
            >
              <span>Calendrier réglementaire ({sector.regulatory_items.length})</span>
              <svg
                className={cn('w-4 h-4 transition-transform duration-200 text-muted', openSections.has('sec-reg') && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.has('sec-reg') && (
              <div className="p-5 pt-0 border-t border-border/40 space-y-4 pt-4">
                {sector.regulatory_items.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    Aucune réglementation enregistrée.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {sector.regulatory_items.map((reg) => (
                      <div
                        key={reg.id}
                        className="bg-canvas/20 border border-border/50 p-4 rounded-xl flex flex-col gap-2 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-heading leading-snug">
                              {reg.name}
                            </h4>
                            {reg.authority && (
                              <p className="text-[10px] text-muted mt-0.5">
                                Autorité : {reg.authority}
                              </p>
                            )}
                          </div>
                          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded shrink-0', URGENCY_STYLE[reg.urgency])}>
                            {URGENCY_LABEL[reg.urgency]}
                          </span>
                        </div>
                        {reg.deadline_date && (
                          /* Removed */
                          <p className="text-xs font-bold text-heading">
                            Échéance : {formatDate(reg.deadline_date)}
                          </p>
                        )}
                        {reg.description && (
                          <p className="text-xs text-body leading-relaxed">
                            {reg.description}
                          </p>
                        )}
                        {reg.commercial_angle && (
                          <p className="text-xs text-primary italic leading-relaxed">
                            {reg.commercial_angle}
                          </p>
                        )}
                        {reg.is_commercial_window && (
                          <span className="text-[9px] font-bold text-secondary-fg bg-secondary border border-secondary/20 rounded px-2 py-0.5 w-fit">
                            Fenêtre commerciale active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Trigger Events */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('sec-events')}
              className="w-full flex items-center justify-between p-5 text-left font-heading text-xs font-bold text-heading uppercase tracking-wider cursor-pointer hover:bg-surface-hover/20 outline-none"
            >
              <span>Événements déclencheurs ({sector.events.length})</span>
              <svg
                className={cn('w-4 h-4 transition-transform duration-200 text-muted', openSections.has('sec-events') && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.has('sec-events') && (
              <div className="p-5 pt-0 border-t border-border/40 space-y-4 pt-4">
                {sector.events.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    Aucun événement déclencheur détecté.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {sector.events.map((ev) => {
                      const status = eventStatuses[ev.id] ?? ev.status
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            'border p-4 rounded-xl flex flex-col gap-2.5 transition-all',
                            status === 'dismissed' && 'opacity-40',
                            status === 'acted'
                              ? 'border-success/30 bg-success/5'
                              : status === 'pending'
                              ? 'border-warning/30 bg-warning/5'
                              : 'border-border/60 bg-canvas/30'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-xs font-bold text-heading leading-snug flex-1">
                              {ev.title}
                            </h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted/10 text-muted border border-border shrink-0">
                              {EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}
                            </span>
                          </div>
                          {ev.event_date && (
                            /* Removed */
                            <p className="text-[10px] text-muted">
                              Date : {formatDate(ev.event_date)}
                            </p>
                          )}
                          {ev.description && (
                            <p className="text-[11px] text-body leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                          {ev.commercial_opportunity && (
                            <p className="text-[11px] text-primary italic leading-relaxed">
                              {ev.commercial_opportunity}
                            </p>
                          )}

                          {status === 'pending' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => markEvent(ev.id, 'acted')}
                                className="flex-1 h-8 text-[10px] font-bold bg-primary text-primary-fg rounded-lg hover:bg-primary-deep transition-colors cursor-pointer"
                              >
                                Traiter
                              </button>
                              <button
                                onClick={() => markEvent(ev.id, 'dismissed')}
                                className="flex-1 h-8 text-[10px] font-semibold bg-surface text-muted border border-border rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                              >
                                Ignorer
                              </button>
                            </div>
                          )}
                          {status === 'acted' && (
                            <span className="text-[10px] font-bold text-success flex items-center gap-1.5">
                              ✓ Traité avec succès
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Accounts list */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection('sec-accounts')}
              className="w-full flex items-center justify-between p-5 text-left font-heading text-xs font-bold text-heading uppercase tracking-wider cursor-pointer hover:bg-surface-hover/20 outline-none"
            >
              <span>Comptes rattachés ({sector.companies.length})</span>
              <svg
                className={cn('w-4 h-4 transition-transform duration-200 text-muted', openSections.has('sec-accounts') && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.has('sec-accounts') && (
              <div className="p-5 pt-0 border-t border-border/40 divide-y divide-border/30">
                {sortedCompanies.length === 0 ? (
                  <p className="text-xs text-muted italic pt-4">Aucun compte lié.</p>
                ) : (
                  sortedCompanies.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 first:pt-4 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <Link
                        href={`/prospection/accounts/${c.id}`}
                        className="text-xs font-bold text-heading hover:text-primary transition-colors truncate flex-1"
                      >
                        {c.name}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', LIFECYCLE_STYLE[c.lifecycle_status] ?? 'bg-border/40 text-muted border-border')}>
                          {LIFECYCLE_LABEL[c.lifecycle_status] ?? c.lifecycle_status}
                        </span>
                        {c.ai_score !== null && (
                          /* Removed */
                          <span className="text-xs font-black text-heading">
                            {c.ai_score.toFixed(1)}/5
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── STICKY BOTTOM BUTTON & DRAWER (Mobile) ─────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-canvas via-canvas/95 to-transparent border-t border-border/30 z-40">
        <button
          onClick={() => setPlaybookOpen(true)}
          className="w-full bg-primary hover:bg-primary-deep text-primary-fg font-bold text-xs py-3.5 px-4 rounded-xl transition-all active:scale-98 duration-100 cursor-pointer outline-none shadow-lg"
        >
          Playbook commercial
        </button>
      </div>

      {/* Playbook drawer for mobile viewport */}
      <AppDrawer
        open={playbookOpen}
        onOpenChange={setPlaybookOpen}
        title="Playbook Commercial"
        subtitle={sector.name}
        side="bottom"
      >
        <div className="px-1 py-4 space-y-4">
          {/* Mobile tabs */}
          <div className="flex border-b border-border/60 overflow-x-auto pb-px gap-1">
            {playbookTabs.map((tab, idx) => {
              const isActive = activeTab === idx
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={cn(
                    'text-[10px] font-bold px-3.5 py-2 border-b-2 transition-all whitespace-nowrap outline-none cursor-pointer',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-heading'
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="min-h-[250px] max-h-[60vh] overflow-y-auto pb-6">
            {renderPlaybookContent()}
          </div>
        </div>
      </AppDrawer>
    </div>
  )
}
