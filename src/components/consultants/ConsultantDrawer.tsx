'use client'

import { useState, useEffect, useMemo } from 'react'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  computeMetrics,
  type DrawerConsultantData,
} from '@/types/consultant-drawer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsultantDrawerProps {
  collaboratorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tab = 'synthese' | 'activite' | 'competences'

const TABS: { id: Tab; label: string }[] = [
  { id: 'synthese',     label: 'Synthèse' },
  { id: 'activite',    label: 'Activité' },
  { id: 'competences', label: 'Compétences' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
  span2,
}: {
  label: string
  value: string
  accent?: boolean
  span2?: boolean
}) {
  return (
    <div
      className={cn('border rounded-xl p-3 flex flex-col gap-0.5', span2 && 'col-span-2')}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
        {label}
      </p>
      <p
        className="text-[15px] font-bold tabular-nums leading-snug"
        style={{ color: accent ? 'var(--color-accent)' : 'var(--color-heading)' }}
      >
        {value}
      </p>
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
        Aucune donnée d'activité.
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
  // Chaque zone de capture couvre un "segment" centré sur le point
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
            {/* Ligne verticale */}
            <line
              x1={hovPt.x} y1={CPT}
              x2={hovPt.x} y2={bottom}
              stroke="var(--color-primary)"
              strokeWidth={0.75} strokeDasharray="3 3"
            />
            {/* Bulle */}
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
    <div className="space-y-3">
      {/* Intitulé de poste */}
      {data.current_title && (
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)' }}>
            Intitulé du poste
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-heading)' }}>
            {data.current_title}
          </p>
        </div>
      )}

      {/* Ligne 1 : identité */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Entrée" value={fmtDate(data.entry_date)} />
        <KpiCard label="Séniorité" value={data.seniority ?? '—'} />
        <KpiCard
          label="Salaire brut"
          value={metrics.activeGrossAnnual !== null ? fmtEur(metrics.activeGrossAnnual) : '—'}
        />
      </div>

      {/* Ligne 2 : financier (CA sur 2 cols + TJM) */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard
          label="CA généré"
          value={metrics.caGenere > 0 ? fmtEur(metrics.caGenere) : '—'}
          accent
          span2
        />
        <KpiCard
          label="TJM moyen"
          value={metrics.tjmMoyenFacture !== null ? fmtEur(metrics.tjmMoyenFacture) : '—'}
        />
      </div>

      {/* Missions */}
      {data.missions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Missions ({data.missions.length})
          </p>
          {data.missions.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <p className="truncate text-xs font-medium" style={{ color: 'var(--color-body)' }}>
                {m.title}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {m.gross_margin_pct !== null && (
                  <span className="tabular-nums text-[10px] font-bold" style={{ color: 'var(--color-accent)' }}>
                    {m.gross_margin_pct} %
                  </span>
                )}
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                  style={
                    m.status === 'active'
                      ? { background: '#d1fae5', color: '#065f46' }
                      : { background: 'var(--color-canvas)', color: 'var(--color-muted)' }
                  }
                >
                  {m.status === 'active' ? 'Active' : m.status === 'ended' ? 'Terminée' : m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Onglet Activité ──────────────────────────────────────────────────────────

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

  // Consolidation par mois (chevauchements multi-missions)
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
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <KpiCard
          label="Taux moyen"
          value={
            metrics.avgActivityRate !== null
              ? `${metrics.avgActivityRate.toFixed(0)} %`
              : '—'
          }
          accent
        />
        <KpiCard label="Jours facturés" value={`${metrics.totalBillableDays} j`} />
        <KpiCard label="Mois couverts" value={String(chartPoints.length)} />
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Taux d'activité mensuel
        </p>
        <AreaChart points={chartPoints} />
      </div>
    </div>
  )
}

// ─── Onglet Compétences ───────────────────────────────────────────────────────

function TabCompetences() {
  const groups = [
    { category: 'Frameworks & Langages', items: ['Next.js', 'React', 'TypeScript', 'Python'] },
    { category: 'Cloud & Infra',         items: ['AWS', 'Azure', 'Docker', 'Terraform'] },
    { category: 'Méthodes',              items: ['Agile', 'Scrum', 'SAFe'] },
  ]

  return (
    <div className="space-y-4">
      <div
        className="flex items-start gap-2 rounded-xl border px-3 py-2.5"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-canvas)' }}
      >
        <svg
          className="mt-px h-3.5 w-3.5 shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          style={{ color: 'var(--color-muted)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Données réelles disponibles après ajout de{' '}
          <code className="font-mono text-[10px]">person_skills</code> dans la requête Supabase.
          Les badges ci-dessous sont des placeholders structurés.
        </p>
      </div>

      {groups.map(({ category, items }) => (
        <div key={category} className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            {category}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item}
                className="rounded-lg border px-2.5 py-1 text-[11px] font-medium opacity-40"
                style={{
                  background: 'var(--color-canvas)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-body)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ConsultantDrawer({ collaboratorId, open, onOpenChange }: ConsultantDrawerProps) {
  const [drawerData, setDrawerData] = useState<DrawerConsultantData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>('synthese')

  // Fetch dès que le drawer s'ouvre ou que l'ID change (async-parallel rule : une seule requête)
  useEffect(() => {
    if (!open || !collaboratorId) return

    setLoading(true)
    setFetchError(null)
    setActiveTab('synthese')
    setDrawerData(null)

    const supabase = createClient()

    supabase
      .from('collaborators')
      .select(`
        id, entry_date, exit_date, status, current_title, seniority,
        person:persons ( full_name, first_name, last_name ),
        compensation:collaborator_compensation ( gross_annual, effective_to ),
        missions (
          id, title, status, start_date, end_date, tjm, cjm, gross_margin_pct,
          activity_reports:mission_activity_reports (
            period_start, billable_days, business_days, tjm_snapshot, activity_rate_percent
          )
        )
      `)
      .eq('id', collaboratorId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setFetchError('Impossible de charger le profil consultant.')
        } else {
          setDrawerData(data as unknown as DrawerConsultantData)
        }
        setLoading(false)
      })
  }, [open, collaboratorId])

  const name     = drawerData ? resolveFullName(drawerData) : '…'
  const subtitle = drawerData?.current_title ?? undefined

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      subtitle={subtitle}
      className="max-w-[480px]"
    >
      {/* ── Barre d'onglets ──────────────────────────────────────────── */}
      {!loading && drawerData && (
        <div
          className="-mt-4 mb-4 flex gap-0 border-b"
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
                className="px-3 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none"
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
          {activeTab === 'synthese'    && <TabSynthese    data={drawerData} />}
          {activeTab === 'activite'    && <TabActivite    data={drawerData} />}
          {activeTab === 'competences' && <TabCompetences />}
        </div>
      )}
    </AppDrawer>
  )
}
