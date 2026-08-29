'use client'

import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { StatusPill } from '@/components/ui/StatusPill'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { RegisterIntelligenceEntity } from '@/components/intelligence/RegisterIntelligenceEntity'
import { CommunicationIntentMenu } from '@/components/communication/CommunicationIntentMenu'
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from '@/components/agenda/AgendaEventDrawer'
import { getPracticeByName } from '@/lib/config/practices'
import {
  computeMetrics,
  type DrawerAbsence,
  type DrawerConsultantData,
  type DrawerSkill,
} from '@/types/consultant-drawer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsultantDrawerProps {
  collaboratorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tab = 'synthese' | 'competences' | 'activite'

const TABS: { id: Tab; label: string }[] = [
  { id: 'synthese',    label: 'Synthèse' },
  { id: 'competences', label: 'Compétences' },
  { id: 'activite',    label: 'Activité' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function fmtDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const e = new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

function monthAbbr(ym: string) {
  const [y, mo] = ym.split('-')
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'short' })
}

function resolveFullName(data: DrawerConsultantData): string {
  if (data.person?.full_name) return data.person.full_name
  const fn = data.person?.first_name ?? ''
  const ln = data.person?.last_name ?? ''
  return `${fn} ${ln}`.trim() || 'Consultant'
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const ABSENCE_LABELS: Record<string, string> = {
  conge_paye:      'Congé payé',
  rtt:             'RTT',
  maladie:         'Maladie',
  sans_solde:      'Sans solde',
  contrainte_perso:'Contrainte perso',
  formation:       'Formation',
  fermeture_client:'Fermeture client',
  autre:           'Autre',
}

function missionStatusVariant(status: string): 'success' | 'neutral' | 'warning' | 'danger' {
  if (status === 'active')    return 'success'
  if (status === 'paused')    return 'warning'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

function missionStatusLabel(status: string): string {
  if (status === 'active')    return 'Active'
  if (status === 'ended')     return 'Terminée'
  if (status === 'paused')    return 'En pause'
  if (status === 'cancelled') return 'Annulée'
  return status
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: 'var(--color-border)' }} />
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      <div className="flex gap-4 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
        <Sk className="h-3 w-20 rounded" />
        <Sk className="h-3 w-16 rounded" />
        <Sk className="h-3 w-24 rounded" />
      </div>
      <Sk className="h-12 rounded-xl w-full" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <Sk key={i} className="h-16 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <Sk key={i} className="h-16 rounded-xl" />)}
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => <Sk key={i} className="h-10 rounded-xl w-full" />)}
      </div>
    </div>
  )
}

// ─── SVG Area Chart ───────────────────────────────────────────────────────────

const CW = 360, CH = 128
const CPL = 34, CPR = 6, CPT = 6, CPB = 26
const cPlotW = CW - CPL - CPR   // 320
const cPlotH = CH - CPT - CPB   // 96

function cXof(i: number, n: number): number {
  if (n <= 1) return CPL + cPlotW / 2
  return CPL + (i / (n - 1)) * cPlotW
}
function cYof(rate: number): number {
  return CPT + cPlotH - Math.max(0, Math.min(100, rate)) / 100 * cPlotH
}

interface ChartPoint { month: string; rate: number }

function AreaChart({ points }: { points: ChartPoint[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  if (points.length === 0) {
    return (
      <div
        className="flex h-28 items-center justify-center text-[11px] rounded-xl border border-dashed"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
      >
        Aucune donnée d&apos;activité.
      </div>
    )
  }

  const n = points.length
  const pts = points.map((p, i) => ({ x: cXof(i, n), y: cYof(p.rate) }))
  const bottom = CPT + cPlotH

  const linePts = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const areaD = [
    `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`,
    ...pts.slice(1).map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${pts[n - 1].x.toFixed(1)},${bottom}`,
    `L ${pts[0].x.toFixed(1)},${bottom}`,
    'Z',
  ].join(' ')

  const labelStep = n <= 6 ? 1 : n <= 12 ? 2 : 3
  const halfSeg = n <= 1 ? cPlotW / 2 : (cPlotW / (n - 1)) / 2

  const hov = hovIdx !== null ? points[hovIdx] : null
  const hovPt = hovIdx !== null ? pts[hovIdx] : null

  return (
    <svg
      viewBox={`0 0 ${CW} ${CH}`}
      width="100%"
      style={{ overflow: 'visible' }}
      role="img"
      aria-label="Évolution du taux d'activité"
    >
      <defs>
        <linearGradient id="cdr-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grille Y */}
      {[0, 50, 100].map((t) => (
        <g key={t}>
          <line
            x1={CPL} y1={cYof(t)} x2={CW - CPR} y2={cYof(t)}
            stroke="var(--color-border)"
            strokeWidth={t === 0 ? 1 : 0.5}
            strokeDasharray={t === 0 ? undefined : '3 3'}
          />
          <text
            x={CPL - 5} y={cYof(t)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={8.5} fill="var(--color-muted)"
          >
            {t}%
          </text>
        </g>
      ))}

      {/* Aire */}
      <path d={areaD} fill="url(#cdr-area)" />

      {/* Ligne */}
      <polyline
        points={linePts}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Points */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y}
          r={hovIdx === i ? 4 : 2.5}
          fill={hovIdx === i ? 'var(--color-primary)' : 'var(--color-surface)'}
          stroke="var(--color-primary)"
          strokeWidth={hovIdx === i ? 2 : 1.5}
          style={{ transition: 'r 0.1s, fill 0.1s' }}
        />
      ))}

      {/* Labels X */}
      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={cXof(i, n)} y={CH - 5}
            textAnchor="middle" fontSize={8.5} fill="var(--color-muted)"
          >
            {monthAbbr(p.month)}
          </text>
        ) : null
      )}

      {/* Zones de capture */}
      {pts.map((_, i) => (
        <rect
          key={i}
          x={pts[i].x - halfSeg} y={CPT}
          width={halfSeg * 2} height={cPlotH + CPB}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseEnter={() => setHovIdx(i)}
          onMouseLeave={() => setHovIdx(null)}
        />
      ))}

      {/* Tooltip */}
      {hov && hovPt && (() => {
        const tx = Math.max(CPL + 28, Math.min(hovPt.x, CW - CPR - 28))
        const ty = Math.max(CPT + 2, hovPt.y - 40)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={hovPt.x} y1={CPT}
              x2={hovPt.x} y2={bottom}
              stroke="var(--color-primary)"
              strokeWidth={0.75} strokeDasharray="3 3"
            />
            <rect
              x={tx - 28} y={ty} width={56} height={30} rx={4}
              fill="var(--color-heading)"
            />
            <text x={tx} y={ty + 12} textAnchor="middle" fontSize={11}
              fontWeight="700" fill="#FFFFFF">
              {hov.rate}%
            </text>
            <text x={tx} y={ty + 24} textAnchor="middle" fontSize={8.5}
              fill="rgba(255,255,255,0.55)">
              {monthAbbr(hov.month)}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ─── Onglet Synthèse ──────────────────────────────────────────────────────────

function TabSynthese({ data }: { data: DrawerConsultantData }) {
  const reports = useMemo(
    () => data.missions.flatMap((m) => m.activity_reports),
    [data.missions],
  )
  const metrics = useMemo(
    () => computeMetrics(reports, data.compensation),
    [reports, data.compensation],
  )

  return (
    <div className="space-y-4">
      {/* Profil métier (mise en avant distinctive) */}
      {data.current_title && (
        <div
          className="rounded-xl border px-3.5 py-3"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)' }}>
            Profil métier
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-heading)' }}>
            {data.current_title}
          </p>
        </div>
      )}

      {/* KPI — Sections ouvertes sans cadres individuels */}
      <div className="grid grid-cols-3 gap-y-4 gap-x-3 py-2 border-t border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Intégration
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
            {fmtDate(data.entry_date)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Séniorité
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
            {data.seniority ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Salaire brut
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
            {metrics.activeGrossAnnual !== null ? fmtEur(metrics.activeGrossAnnual) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            TJM moyen
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
            {metrics.tjmMoyenFacture !== null ? fmtEur(metrics.tjmMoyenFacture) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Rentabilité YTD
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-accent)' }}>
            {metrics.realMarginPct !== null ? `${metrics.realMarginPct} %` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            CA généré YTD
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
            {metrics.caGenere > 0 ? fmtEur(metrics.caGenere) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Compétences ───────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  1: 'Notions', 2: 'Débutant', 3: 'Intermédiaire', 4: 'Avancé', 5: 'Expert',
}

function TabCompetences({
  skills,
  practice,
}: {
  skills: DrawerSkill[]
  practice: string | null
}) {
  const sorted = useMemo(() =>
    [...skills].sort((a, b) => {
      const aMain = (a.level ?? 0) >= 4 ? 0 : 1
      const bMain = (b.level ?? 0) >= 4 ? 0 : 1
      if (aMain !== bMain) return aMain - bMain
      const diff = (b.level ?? -1) - (a.level ?? -1)
      if (diff !== 0) return diff
      return a.skill.name.localeCompare(b.skill.name, 'fr')
    }),
  [skills])

  const practiceConfig = useMemo(() => getPracticeByName(practice), [practice])

  return (
    <div className="space-y-4">
      {/* Practice de rattachement (mise en avant distinctive selon couleur canonique) */}
      {practice && (
        <div
          className="rounded-xl border px-3.5 py-3"
          style={{
            background: practiceConfig?.color ? `${practiceConfig.color}0F` : 'var(--color-canvas)',
            borderColor: practiceConfig?.color ? `${practiceConfig.color}35` : 'var(--color-border)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)' }}>
            Practice de rattachement
          </p>
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: practiceConfig?.color ?? 'var(--color-heading)' }}
          >
            {practice}
          </p>
        </div>
      )}

      {/* Liste des compétences — Sans lignes intercalaires, avec puces discrètes */}
      {sorted.length === 0 ? (
        <div
          className="flex h-32 items-center justify-center rounded-xl border border-dashed"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          <p className="text-xs">Aucune compétence renseignée</p>
        </div>
      ) : (
        <div className="space-y-1 py-1">
          {sorted.map((ps) => (
            <div key={ps.id} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0 flex-1 flex items-center gap-2.5 flex-wrap">
                <span
                  className="inline-block size-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--color-muted)' }}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-heading)' }}>
                  {ps.skill.name}
                </span>
                {ps.skill.category && (
                  <span className="text-[10px] capitalize" style={{ color: 'var(--color-muted)' }}>
                    {ps.skill.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="flex items-center gap-0.5"
                  title={ps.level !== null ? LEVEL_LABELS[ps.level] : undefined}
                >
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        background:
                          ps.level !== null && dot <= ps.level
                            ? 'var(--color-primary)'
                            : 'var(--color-border)',
                      }}
                    />
                  ))}
                </span>

                {ps.years !== null && (
                  <span
                    className="text-[10px] font-medium w-12 text-right"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {ps.years} an{ps.years > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Onglet Activité ──────────────────────────────────────────────────────────

function AbsencesList({ absences }: { absences: DrawerAbsence[] }) {
  const sorted = useMemo(
    () => [...absences].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [absences],
  )

  if (sorted.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: 'var(--color-muted)' }}>
        Aucune absence ou congé enregistré.
      </p>
    )
  }

  return (
    <div className="space-y-0 divide-y" style={{ '--tw-divide-color': 'var(--color-border)' } as React.CSSProperties}>
      {sorted.map((ab) => (
        <div key={ab.id} className="flex items-center justify-between gap-2 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-body)' }}>
              {ABSENCE_LABELS[ab.absence_type] ?? ab.absence_type}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
              {fmtDateRange(ab.start_date, ab.end_date)}
            </p>
          </div>
          <span
            className="shrink-0 text-xs font-medium"
            style={{ color: 'var(--color-muted)' }}
          >
            {ab.duration_days} j
          </span>
        </div>
      ))}
    </div>
  )
}

function TabActivite({ data }: { data: DrawerConsultantData }) {
  const reports = useMemo(
    () =>
      data.missions
        .flatMap((m) => m.activity_reports)
        .sort((a, b) => a.period_start.localeCompare(b.period_start)),
    [data.missions],
  )

  const metrics = useMemo(
    () => computeMetrics(reports, data.compensation),
    [reports, data.compensation],
  )

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const byMonth = new Map<string, { billable: number; business: number }>()
    for (const r of reports) {
      const key = r.period_start.slice(0, 7)
      const cur = byMonth.get(key) ?? { billable: 0, business: 0 }
      byMonth.set(key, {
        billable: cur.billable + r.billable_days,
        business: cur.business + r.business_days,
      })
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { billable, business }]) => ({
        month,
        rate: business > 0 ? Math.round((billable / business) * 100) : 0,
      }))
  }, [reports])

  return (
    <div className="space-y-5">
      {/* Missions (Remonté tout en haut de l'onglet Activité) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Missions {data.missions.length > 0 && `(${data.missions.length})`}
        </p>
        {data.missions.length === 0 ? (
          <div
            className="rounded-xl border px-3.5 py-3 text-xs font-medium"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            Aucune mission enregistrée
          </div>
        ) : (
          <div className="divide-y border-t border-b" style={{ '--tw-divide-color': 'var(--color-border)', borderColor: 'var(--color-border)' } as React.CSSProperties}>
            {data.missions.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-bold" style={{ color: 'var(--color-heading)' }}>
                      {m.title || m.company?.name || 'Mission sans titre'}
                    </span>
                    {(m.start_date || m.end_date) && (
                      <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                        {fmtDateShort(m.start_date)} → {m.end_date ? fmtDateShort(m.end_date) : 'en cours'}
                      </span>
                    )}
                  </div>
                  {m.company?.name && m.title && (
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                      Client : {m.company.name}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {m.gross_margin_pct !== null && (
                    <span className="text-[10px] font-bold" style={{ color: 'var(--color-accent)' }}>
                      {m.gross_margin_pct} %
                    </span>
                  )}
                  <StatusPill
                    label={missionStatusLabel(m.status)}
                    variant={missionStatusVariant(m.status)}
                    dot={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activité (KPIs + Graphique Taux d'activité) */}
      <div className="space-y-3 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Activité
        </p>

        <div className="grid grid-cols-3 gap-y-2 gap-x-3 py-2 border-t border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Productivité YTD
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-accent)' }}>
              {metrics.avgActivityRate !== null ? `${metrics.avgActivityRate.toFixed(0)} %` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Jours facturés
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
              {metrics.totalBillableDays} j
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Mois couverts
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-heading)' }}>
              {chartPoints.length}
            </p>
          </div>
        </div>

        <div
          className="rounded-xl border p-3.5"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Taux d&apos;activité mensuel
          </p>
          <AreaChart points={chartPoints} />
        </div>
      </div>

      {/* Congés & planning */}
      <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Congés &amp; planning
          {data.absences.length > 0 && ` (${data.absences.length})`}
        </p>
        <AbsencesList absences={data.absences} />
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ConsultantDrawer({ collaboratorId, open, onOpenChange }: ConsultantDrawerProps) {
  const [drawerData, setDrawerData] = useState<DrawerConsultantData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>('synthese')

  // Planning Event Drawer state
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues | undefined>()

  const loadDrawerData = useEffectEvent(async (nextCollaboratorId: string) => {
    setLoading(true)
    setFetchError(null)
    setActiveTab('synthese')
    setDrawerData(null)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('collaborators')
      .select(`
        id, entry_date, exit_date, status, current_title, seniority, practice,
        person:persons (
          full_name, first_name, last_name,
          person_skills (
            id, level, years, confidence, source,
            skill:skills ( id, name, category )
          )
        ),
        compensation:collaborator_compensation ( gross_annual, effective_to ),
        missions (
          id, title, status, start_date, end_date, tjm, cjm, gross_margin_pct,
          company:companies ( name ),
          activity_reports:mission_activity_reports (
            period_start, billable_days, business_days, tjm_snapshot, cjm_snapshot,
            activity_rate_percent
          )
        ),
        absences:collaborator_absences ( id, start_date, end_date, duration_days, absence_type )
      `)
      .eq('id', nextCollaboratorId)
      .single()

    if (error || !data) {
      setFetchError('Impossible de charger le profil consultant.')
    } else {
      setDrawerData(data as unknown as DrawerConsultantData)
    }
    setLoading(false)
  })

  useEffect(() => {
    if (!open || !collaboratorId) return
    queueMicrotask(() => {
      void loadDrawerData(collaboratorId)
    })
  }, [open, collaboratorId])

  const name = drawerData ? resolveFullName(drawerData) : '…'
  const initials = getInitials(name)
  const activeMissions = drawerData?.missions.filter((mission) => mission.status === 'active') ?? []
  const reliableMission = activeMissions.length === 1 ? activeMissions[0] : null
  const consultantContextLines = drawerData
    ? [
        `Collaborateur : ${name}`,
        drawerData.current_title ? `Poste : ${drawerData.current_title}` : null,
        drawerData.practice ? `Practice : ${drawerData.practice}` : null,
        drawerData.seniority ? `Séniorité : ${drawerData.seniority}` : null,
        reliableMission ? `Mission explicitement connue : ${reliableMission.title}` : null,
      ].filter(Boolean).join('\n')
    : undefined

  return (
    <>
      <AppDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={
          <div className="flex flex-col items-center text-center pt-2 pb-1 w-full">
            {/* Grand cercle d'avatar centré */}
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-extrabold select-none border mb-2"
              style={{
                background: 'var(--color-canvas)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-heading)',
              }}
            >
              {initials}
            </div>

            {/* Identité centrée : Nom + Poste */}
            <h2 className="font-heading text-lg sm:text-xl font-bold leading-tight" style={{ color: 'var(--color-heading)' }}>
              {name}
            </h2>
            {drawerData?.current_title && (
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                {drawerData.current_title}
              </p>
            )}
          </div>
        }
        className="max-w-[480px]"
        footer={
          !loading && drawerData && collaboratorId ? (
            <div className="flex items-center justify-between w-full">
              {/* Action Planifier (à gauche) */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEventInitialValues({
                    title: `Point · ${name}`,
                    event_type: 'suivi_collaborateur',
                    company: reliableMission?.company?.name ? { id: '', name: reliableMission.company.name, isNew: false } : null,
                  })
                  setEventDrawerOpen(true)
                }}
                className="bg-[var(--color-cockpit-cobalt-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/10 font-semibold"
              >
                Planifier
              </Button>

              {/* Action Rédiger / préparer (à droite) */}
              <CommunicationIntentMenu
                label="Rédiger / préparer"
                variant="brass"
                origin="consultant"
                scope="collaborator"
                collaboratorId={collaboratorId}
                collaboratorName={name}
                primaryEntity={{ type: 'collaborator', id: collaboratorId }}
                missionId={reliableMission?.id ?? null}
                missionTitle={reliableMission?.title ?? null}
                mustInclude={consultantContextLines}
                menuClassName="bottom-full top-auto mb-2 right-0"
                items={[
                  { intent: 'consultant_message', label: 'Message' },
                  { intent: 'consultant_recognition', label: 'Reconnaissance' },
                  { intent: 'consultant_one_to_one', label: 'Point 1:1' },
                  { intent: 'consultant_feedback_follow_up', label: 'Feedback écrit' },
                  { intent: 'consultant_feedback_talk_track', label: 'Feedback oral' },
                  { intent: 'consultant_assignment_change', label: 'Changement mission' },
                  { intent: 'consultant_intercontract_message', label: 'Plan intercontrat' },
                  { intent: 'consultant_retention_briefing', label: 'Rétention' },
                  { intent: 'consultant_annual_review', label: 'Entretien annuel' },
                  { intent: 'consultant_sensitive_meeting', label: 'Échange sensible' },
                ]}
              />
            </div>
          ) : undefined
        }
      >
        {open && collaboratorId && drawerData && (
          <RegisterIntelligenceEntity
            entityType="collaborator"
            entityId={collaboratorId}
            label={name}
          />
        )}

        {/* ── Barre d'onglets (33.3% chacun, ordre: Synthèse, Compétences, Activité) ── */}
        {!loading && drawerData && (
          <div
            className="-mt-2 mb-4 flex w-full border-b"
            style={{ borderColor: 'var(--color-border)' }}
            role="tablist"
          >
            {TABS.map(({ id, label }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(id)}
                  className="flex-1 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline-none"
                  style={{
                    color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
                    borderBottom: isActive
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                    marginBottom: '-1px',
                    background: 'transparent',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── États ────────────────────────────────────────────────────── */}
        {loading && <DrawerSkeleton />}

        {fetchError && !loading && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            <p className="text-sm font-semibold">Erreur de chargement</p>
            <p className="text-xs">{fetchError}</p>
            <button
              onClick={() => open && collaboratorId && setLoading(true)}
              className="mt-1 text-xs underline underline-offset-2"
              style={{ color: 'var(--color-primary)' }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ── Contenu ──────────────────────────────────────────────────── */}
        {!loading && !fetchError && drawerData && (
          <div role="tabpanel">
            {activeTab === 'synthese' && <TabSynthese data={drawerData} />}
            {activeTab === 'competences' && (
              <TabCompetences
                skills={drawerData.person?.person_skills ?? []}
                practice={drawerData.practice}
              />
            )}
            {activeTab === 'activite' && <TabActivite data={drawerData} />}
          </div>
        )}
      </AppDrawer>

      {/* Modal / Drawer création d'événement (Planifier) */}
      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        onSaved={() => {}}
        initialValues={eventInitialValues}
      />
    </>
  )
}
