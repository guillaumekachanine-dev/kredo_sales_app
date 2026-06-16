'use client'

import { useState, useMemo } from 'react'
import type { Consultant, ConsultantSkill } from '@/types/consultant'

// ─── Types internes ───────────────────────────────────────────────────────────

type Tab = 'synthese' | 'activite' | 'competences'

interface MonthPoint {
  month: string       // "YYYY-MM"
  rate: number        // 0–100
  billable: number
  business: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function missionLabel(s: string) {
  const m: Record<string, string> = {
    active: 'Active', paused: 'Suspendue',
    ended: 'Terminée', cancelled: 'Annulée',
  }
  return m[s] ?? s
}

function monthAbbr(ym: string) {
  const [y, mo] = ym.split('-')
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'short' })
}

// ─── Graphique SVG — taux d'activité mensuel ─────────────────────────────────

const W = 600, H = 200
const PT = 20, PR = 24, PB = 44, PL = 52
const plotW = W - PL - PR
const plotH = H - PT - PB
const Y_TICKS = [0, 25, 50, 75, 100]

function yOf(rate: number) { return PT + plotH - (rate / 100) * plotH }

function ActivityChart({ points }: { points: MonthPoint[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-muted)' }}>
        Aucun CRA enregistré.
      </div>
    )
  }

  const n = points.length
  const gap = plotW / n
  const barW = Math.min(gap * 0.55, 28)
  const xOf = (i: number) => PL + gap * i + gap / 2

  const hov = hovIdx !== null ? points[hovIdx] : null
  const hovX = hovIdx !== null ? xOf(hovIdx) : 0
  const hovY = hov ? yOf(hov.rate) : 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ overflow: 'visible' }}
      role="img"
      aria-label="Taux d'activité mensuel"
    >
      {/* ── Grille Y ─────────────────────────────────────────────── */}
      {Y_TICKS.map((t) => (
        <g key={t}>
          <line
            x1={PL} y1={yOf(t)} x2={W - PR} y2={yOf(t)}
            stroke="var(--color-border)"
            strokeWidth={t === 0 ? 1.5 : 0.75}
            strokeDasharray={t === 0 ? undefined : '4 4'}
          />
          <text
            x={PL - 8} y={yOf(t)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={10} fill="var(--color-muted)"
          >
            {t}%
          </text>
        </g>
      ))}

      {/* ── Barres ───────────────────────────────────────────────── */}
      {points.map((pt, i) => {
        const x = xOf(i)
        const barH = Math.max((pt.rate / 100) * plotH, 2)
        const isHov = hovIdx === i
        return (
          <g
            key={pt.month}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
            style={{ cursor: 'default' }}
          >
            {/* Zone de capture élargie */}
            <rect
              x={x - gap / 2} y={PT}
              width={gap} height={plotH + PB}
              fill="transparent"
            />
            {/* Barre */}
            <rect
              x={x - barW / 2}
              y={PT + plotH - barH}
              width={barW} height={barH}
              rx={3}
              fill={isHov ? 'var(--color-primary)' : 'var(--color-primary-deep)'}
              opacity={isHov ? 1 : 0.75}
              style={{ transition: 'fill 0.12s, opacity 0.12s' }}
            />
            {/* Label X */}
            <text
              x={x} y={PT + plotH + 16}
              textAnchor="middle" fontSize={10}
              fill="var(--color-muted)"
            >
              {monthAbbr(pt.month)}
            </text>
          </g>
        )
      })}

      {/* ── Tooltip ──────────────────────────────────────────────── */}
      {hov && hovIdx !== null && (() => {
        const tx = Math.min(Math.max(hovX, PL + 44), W - PR - 44)
        const ty = Math.max(hovY - 44, PT)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tx - 44} y={ty}
              width={88} height={34}
              rx={5}
              fill="var(--color-heading)"
            />
            {/* Triangle */}
            <polygon
              points={`${hovX - 5},${ty + 34} ${hovX + 5},${ty + 34} ${hovX},${ty + 41}`}
              fill="var(--color-heading)"
            />
            <text
              x={tx} y={ty + 13}
              textAnchor="middle" fontSize={12} fontWeight="700"
              fill="#FFFFFF"
            >
              {hov.rate} %
            </text>
            <text
              x={tx} y={ty + 26}
              textAnchor="middle" fontSize={10}
              fill="rgba(255,255,255,0.65)"
            >
              {hov.billable} / {hov.business} j
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ─── Onglet Synthèse ──────────────────────────────────────────────────────────

function TabSynthese({ data }: { data: Consultant }) {
  const active = data.missions.filter((m) => m.status === 'active')
  const avgTjm = active.length
    ? active.reduce((s, m) => s + m.tjm, 0) / active.length
    : null
  const avgCjm = active.length
    ? active.reduce((s, m) => s + m.cjm, 0) / active.length
    : null
  const avgMargin = active.length
    ? active.reduce((s, m) => s + (m.gross_margin_pct ?? 0), 0) / active.length
    : null

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'TJM moyen (actives)', value: avgTjm !== null ? fmtEur(avgTjm) : '—' },
          { label: 'CJM moyen (actives)', value: avgCjm !== null ? fmtEur(avgCjm) : '—' },
          {
            label: 'Marge brute moy.',
            value: avgMargin !== null ? `${avgMargin.toFixed(1)} %` : '—',
            accent: true,
          },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="border rounded-xl p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
              {label}
            </p>
            <p
              className="text-xl font-semibold tabular-nums"
              style={{ color: accent ? 'var(--color-accent)' : 'var(--color-heading)' }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Tableau missions */}
      <div
        className="border rounded-xl overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b text-xs uppercase tracking-wide"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            >
              {['Mission', 'Statut', 'Période', 'TJM', 'CJM', 'Marge', 'Jours facturés'].map((h, i) => (
                <th
                  key={h}
                  className={`py-3 font-medium ${i === 0 ? 'px-5 text-left' : i >= 3 ? 'pr-5 text-right' : 'pr-4 text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.missions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center" style={{ color: 'var(--color-muted)' }}>
                  Aucune mission.
                </td>
              </tr>
            ) : (
              data.missions.map((m) => {
                const billed = m.activity_reports.reduce((s, r) => s + r.billable_days, 0)
                return (
                  <tr
                    key={m.id}
                    className="border-b last:border-0 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-canvas)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-heading)' }}>
                      {m.title}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-canvas)', color: 'var(--color-body)' }}
                      >
                        {missionLabel(m.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums" style={{ color: 'var(--color-body)' }}>
                      {fmtDate(m.start_date)} → {fmtDate(m.end_date)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums" style={{ color: 'var(--color-heading)' }}>
                      {fmtEur(m.tjm)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums" style={{ color: 'var(--color-body)' }}>
                      {fmtEur(m.cjm)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-medium" style={{ color: 'var(--color-accent)' }}>
                      {m.gross_margin_pct !== null ? `${m.gross_margin_pct} %` : '—'}
                    </td>
                    <td className="py-3 pr-5 text-right tabular-nums" style={{ color: 'var(--color-body)' }}>
                      {billed} j
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Onglet Activité ──────────────────────────────────────────────────────────

function TabActivite({ data }: { data: Consultant }) {
  const points = useMemo<MonthPoint[]>(() => {
    const byMonth = new Map<string, { billable: number; business: number }>()
    data.missions.forEach((m) =>
      m.activity_reports.forEach((r) => {
        const key = r.period_start.slice(0, 7)
        const cur = byMonth.get(key) ?? { billable: 0, business: 0 }
        byMonth.set(key, {
          billable: cur.billable + r.billable_days,
          business: cur.business + r.business_days,
        })
      })
    )
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { billable, business }]) => ({
        month,
        rate: business > 0 ? Math.round((billable / business) * 100) : 0,
        billable,
        business,
      }))
  }, [data.missions])

  const avgRate = points.length
    ? Math.round(points.reduce((s, p) => s + p.rate, 0) / points.length)
    : null
  const totalBillable = points.reduce((s, p) => s + p.billable, 0)

  return (
    <div className="space-y-6">
      {/* Stats résumées */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Taux moyen', value: avgRate !== null ? `${avgRate} %` : '—' },
          { label: 'Jours facturés (total)', value: `${totalBillable} j` },
          { label: 'Mois couverts', value: `${points.length}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="border rounded-xl p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
              {label}
            </p>
            <p className="text-xl font-semibold tabular-nums" style={{ color: 'var(--color-heading)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Graphique */}
      <div
        className="border rounded-xl p-5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-xs uppercase tracking-wide mb-4" style={{ color: 'var(--color-muted)' }}>
          Taux d&apos;activité — jours facturables / jours ouvrés
        </p>
        <ActivityChart points={points} />
      </div>
    </div>
  )
}

// ─── Onglet Compétences ───────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  1: 'Notions', 2: 'Débutant', 3: 'Intermédiaire', 4: 'Avancé', 5: 'Expert',
}

function TabCompetences({ skills }: { skills: ConsultantSkill[] }) {
  const sorted = useMemo(() =>
    [...skills].sort((a, b) => {
      // 1. Principales (level ≥ 4) en premier
      const aMain = (a.level ?? 0) >= 4 ? 0 : 1
      const bMain = (b.level ?? 0) >= 4 ? 0 : 1
      if (aMain !== bMain) return aMain - bMain
      // 2. Niveau décroissant (nulls en dernier)
      const diff = (b.level ?? -1) - (a.level ?? -1)
      if (diff !== 0) return diff
      // 3. Alphabétique
      return a.skill.name.localeCompare(b.skill.name, 'fr')
    }),
  [skills])

  if (sorted.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-48 border rounded-xl"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Aucune compétence renseignée
        </p>
      </div>
    )
  }

  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            className="border-b text-xs uppercase tracking-wide"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            <th className="px-5 py-3 text-left font-medium">Compétence</th>
            <th className="px-4 py-3 text-left font-medium">Catégorie</th>
            <th className="px-4 py-3 text-center font-medium">Niveau</th>
            <th className="px-5 py-3 text-right font-medium">Expérience</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ps) => (
            <tr
              key={ps.id}
              className="border-b last:border-0 transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-canvas)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              <td className="px-5 py-3">
                <span className="font-medium" style={{ color: 'var(--color-heading)' }}>
                  {ps.skill.name}
                </span>
                {(ps.level ?? 0) >= 4 && (
                  <span
                    className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--color-primary-deep)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    Principal
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--color-muted)' }}>
                {ps.skill.category ?? '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className="inline-flex items-center gap-1"
                  title={ps.level !== null ? LEVEL_LABELS[ps.level] : undefined}
                >
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className="inline-block w-2 h-2 rounded-full"
                      style={{
                        background:
                          ps.level !== null && dot <= ps.level
                            ? 'var(--color-primary)'
                            : 'var(--color-border)',
                      }}
                    />
                  ))}
                </span>
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--color-body)' }}>
                {ps.years !== null ? `${ps.years} an${ps.years > 1 ? 's' : ''}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props { data: Consultant }

const TABS: { id: Tab; label: string }[] = [
  { id: 'synthese',    label: 'Synthèse' },
  { id: 'activite',   label: 'Activité' },
  { id: 'competences', label: 'Compétences' },
]

export function DesktopConsultantProfile({ data }: Props) {
  const [active, setActive] = useState<Tab>('synthese')

  const fullName =
    data.person.full_name ??
    `${data.person.first_name ?? ''} ${data.person.last_name ?? ''}`.trim()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">

      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-heading)' }}>
            {fullName}
          </h1>
          {data.current_title && (
            <p className="mt-0.5 text-sm" style={{ color: 'var(--color-body)' }}>
              {data.current_title}
            </p>
          )}
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          {data.status}
        </span>
      </div>

      {/* ── Barre d'onglets ────────────────────────────────────────── */}
      <div
        className="border-b flex gap-0"
        style={{ borderColor: 'var(--color-border)' }}
        role="tablist"
      >
        {TABS.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(id)}
              className="px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none"
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

      {/* ── Contenu de l'onglet actif ──────────────────────────────── */}
      <div role="tabpanel">
        {active === 'synthese'    && <TabSynthese    data={data} />}
        {active === 'activite'    && <TabActivite    data={data} />}
        {active === 'competences' && <TabCompetences skills={data.person.person_skills} />}
      </div>
    </div>
  )
}
