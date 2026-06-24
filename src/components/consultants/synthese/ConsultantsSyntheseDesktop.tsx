'use client'

import { useState } from 'react'
import { useDrawerState } from '@/hooks/use-drawer-state'
import { formatEuro } from '@/lib/formatters'
import { getPracticeByName } from '@/lib/config/practices'
import { cn } from '@/lib/utils'
import { ConsultantDrawer } from '@/components/consultants/ConsultantDrawer'
import { StructuredList, type StructuredListColumn } from '@/components/ui/StructuredList'
import { StatusPill } from '@/components/ui/StatusPill'

// ─── Type exporté — utilisé par page.tsx ─────────────────────────────────────

export interface CollaborateurRow {
  id: string
  status: string
  current_title: string | null
  seniority: string | null
  practice: string | null
  exit_date: string | null
  person: {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  } | null
  missions: Array<{
    id: string
    title: string
    status: string
    start_date: string | null
    end_date: string | null
    tjm: number
    cjm: number
    gross_margin_pct: number | null
    company: { name: string } | null
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_CSS_VARS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-dataviz-2)',
  'var(--color-danger)',
  'var(--color-dataviz-3)',
  'var(--color-accent)',
  'var(--color-info)',
]

function avatarColor(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return AVATAR_CSS_VARS[code % AVATAR_CSS_VARS.length]
}

function getInitials(row: CollaborateurRow): string {
  const fn = row.person?.first_name ?? ''
  const ln = row.person?.last_name ?? ''
  return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || '?'
}

function getFullName(row: CollaborateurRow): string {
  return (
    (row.person?.full_name ??
    `${row.person?.first_name ?? ''} ${row.person?.last_name ?? ''}`.trim()) ||
    'Inconnu'
  )
}

function getActiveMission(row: CollaborateurRow) {
  return row.missions.find((m) => m.status === 'active') ?? null
}

function isEnMission(row: CollaborateurRow): boolean {
  return row.missions.some((m) => m.status === 'active')
}

const fmtEur = (n: number) => formatEuro(n)

function getDaysInfo(endDate: string | null): {
  label: string
  pct: number
  barColor: string
} {
  if (!endDate) return { label: 'Indéterminé', pct: 100, barColor: 'bg-emerald-500' }
  const diff = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (diff <= 0)   return { label: 'Terminée',  pct: 100, barColor: 'bg-slate-300' }
  if (diff <= 15)  return { label: '15 jours',  pct: 15,  barColor: 'bg-amber-500' }
  if (diff <= 30)  return { label: '30 jours',  pct: 35,  barColor: 'bg-amber-500' }
  if (diff <= 60)  return { label: '2 mois',    pct: 55,  barColor: 'bg-blue-500'  }
  return               { label: '3 mois +',  pct: 85,  barColor: 'bg-emerald-500' }
}

// ─── KPI instruments ─────────────────────────────────────────────────────────

type KpiTone = 'primary' | 'success' | 'warning' | 'accent'

const KPI_TONES: Record<KpiTone, {
  rail: string
  text: string
  dot: string
  glow: string
}> = {
  primary: {
    rail: 'bg-primary',
    text: 'text-primary',
    dot: 'bg-primary',
    glow: 'from-primary/12',
  },
  success: {
    rail: 'bg-success',
    text: 'text-success',
    dot: 'bg-success',
    glow: 'from-success/12',
  },
  warning: {
    rail: 'bg-warning',
    text: 'text-warning',
    dot: 'bg-warning',
    glow: 'from-warning/14',
  },
  accent: {
    rail: 'bg-accent',
    text: 'text-accent',
    dot: 'bg-accent',
    glow: 'from-accent/12',
  },
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function KpiCard({
  label,
  value,
  sub,
  progress,
  tone = 'primary',
  stamp,
}: {
  label: string
  value: string
  sub?: string
  progress: number
  tone?: KpiTone
  stamp: string
}) {
  const toneClasses = KPI_TONES[tone]
  const safeProgress = clampPct(progress)

  return (
    <div
      className={cn(
        'group relative min-h-[100px] overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-3',
        'shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35'
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-24 bg-gradient-to-r to-transparent', toneClasses.glow)} />
      <div className={cn('absolute inset-x-0 top-0 h-0.5', toneClasses.rail)} />

      <div className="relative flex h-full flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {label}
            </p>
            {sub && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-body">
                {sub}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-canvas px-2 py-0.5 text-[10px] font-semibold text-muted">
            <span className={cn('h-1.5 w-1.5 rounded-full', toneClasses.dot)} />
            {stamp}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <p className={cn('font-heading text-[28px] font-black leading-none tracking-tight', toneClasses.text)}>
            {value}
          </p>
          <div className="mb-1 h-1.5 w-24 overflow-hidden rounded-full bg-border">
            <div
              className={cn('h-full rounded-full transition-[width] duration-500 ease-out', toneClasses.rail)}
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Select filtre ────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-[var(--radius-medium)] border px-3 py-1.5 pr-8 text-xs font-medium focus:outline-none"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-body)',
        }}
      >
        {children}
      </select>
      <div
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--color-muted)' }}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props { data: CollaborateurRow[] }

export function ConsultantsSyntheseDesktop({ data }: Props) {
  const [statusFilter, setStatusFilter]     = useState('all')
  const [practiceFilter, setPracticeFilter] = useState('all')
  const { open: drawerOpen, selectedId, openDrawer, setOpen: setDrawerOpen } = useDrawerState()

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeMissions = data.flatMap((c) => c.missions.filter((m) => m.status === 'active'))
  const avgTjm = activeMissions.length
    ? Math.round(activeMissions.reduce((s, m) => s + m.tjm, 0) / activeMissions.length)
    : 0
  const enMission     = data.filter(isEnMission).length
  const interContrat  = data.length - enMission
  const tauxOccup     = data.length ? Math.round((enMission / data.length) * 100) : 0

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const practices = Array.from(new Set(data.map((c) => c.practice).filter(Boolean))).sort() as string[]

  const filtered = data.filter((c) => {
    if (practiceFilter !== 'all' && c.practice !== practiceFilter) return false
    if (statusFilter === 'en_mission' && !isEnMission(c)) return false
    if (statusFilter === 'inter_contrat' && isEnMission(c)) return false
    return true
  })

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="TJM moyen agence"
          value={avgTjm ? fmtEur(avgTjm) : '—'}
          sub={`sur ${activeMissions.length} mission${activeMissions.length > 1 ? 's' : ''} active${activeMissions.length > 1 ? 's' : ''}`}
          progress={avgTjm ? (avgTjm / 1200) * 100 : 0}
          stamp="TJM"
        />
        <KpiCard
          label="Taux d'occupation"
          value={`${tauxOccup} %`}
          sub={`${enMission} / ${data.length} consultants en mission`}
          progress={tauxOccup}
          tone={tauxOccup < 80 ? 'warning' : 'success'}
          stamp={tauxOccup < 80 ? 'à suivre' : 'OK'}
        />
        <KpiCard
          label="Inter-contrat"
          value={String(interContrat)}
          sub={interContrat === 0 ? 'Aucun consultant disponible' : `consultant${interContrat > 1 ? 's' : ''} disponible${interContrat > 1 ? 's' : ''}`}
          progress={data.length ? (interContrat / data.length) * 100 : 0}
          tone={interContrat > 0 ? 'accent' : 'success'}
          stamp={interContrat > 0 ? 'pool' : 'plein'}
        />
      </div>

      {/* ── Liste collaborateurs ─────────────────────────────────────── */}
      <section
        className="border rounded-[var(--radius-medium)] flex flex-col gap-4 p-5"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Header + filtres */}
        <div
          className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-heading)' }}>
            Synthèse Consultants ({data.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="all">Tous les statuts</option>
              <option value="en_mission">En mission</option>
              <option value="inter_contrat">Inter-contrat</option>
            </FilterSelect>

            <FilterSelect value={practiceFilter} onChange={setPracticeFilter}>
              <option value="all">Toutes les practices</option>
              {practices.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </FilterSelect>
          </div>
        </div>

        {/* Table */}
        <StructuredList
          density="default"
          items={filtered}
          getItemId={(c) => c.id}
          onItemClick={(c) => openDrawer(c.id)}
          ariaLabel="Synthèse consultants"
          emptyState="Aucun collaborateur ne correspond aux filtres sélectionnés."
          columns={[
            {
              id: 'consultant',
              header: 'Consultant',
              render: (collab) => {
                const name     = getFullName(collab)
                const initials = getInitials(collab)
                const color    = avatarColor(name)
                return (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>
                    <span className="font-semibold text-heading">{name}</span>
                  </div>
                )
              },
            },
            {
              id: 'profil',
              header: 'Profil / Séniorité',
              render: (collab) => (
                <div className="flex flex-col gap-0.5">
                  {collab.current_title && (
                    <span className="text-body">{collab.current_title}</span>
                  )}
                  {collab.seniority && (
                    <span className="text-[10px] text-muted">{collab.seniority}</span>
                  )}
                  {!collab.current_title && !collab.seniority && (
                    <span className="text-muted">—</span>
                  )}
                </div>
              ),
            },
            {
              id: 'practice',
              header: 'Practice',
              render: (collab) =>
                collab.practice ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: getPracticeByName(collab.practice)?.color || 'var(--color-muted)' }}
                    />
                    <span className="text-body">{collab.practice}</span>
                  </div>
                ) : (
                  <span className="text-muted">—</span>
                ),
            },
            {
              id: 'client',
              header: 'Client actuel',
              render: (collab) => {
                const mission = getActiveMission(collab)
                return mission?.company ? (
                  <span className="font-medium text-body">{mission.company.name}</span>
                ) : (
                  <span className="text-muted">—</span>
                )
              },
            },
            {
              id: 'fin-mission',
              header: 'Fin de mission',
              width: '9rem',
              render: (collab) => {
                const mission  = getActiveMission(collab)
                const daysInfo = mission ? getDaysInfo(mission.end_date) : null
                if (!daysInfo) return <span className="text-muted">—</span>
                return (
                  <div className="flex w-32 flex-col gap-1">
                    <span className="text-[10px] text-body">{daysInfo.label}</span>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full"
                      style={{ background: 'var(--color-border)' }}
                    >
                      <div className={`h-full ${daysInfo.barColor}`} style={{ width: `${daysInfo.pct}%` }} />
                    </div>
                  </div>
                )
              },
            },
            {
              id: 'tjm',
              header: 'TJM',
              align: 'right',
              width: '5rem',
              render: (collab) => {
                const mission = getActiveMission(collab)
                return <span className="font-semibold text-heading">{mission ? fmtEur(mission.tjm) : '—'}</span>
              },
            },
            {
              id: 'cjm',
              header: 'CJM',
              align: 'right',
              width: '5rem',
              render: (collab) => {
                const mission = getActiveMission(collab)
                return <span className="text-body">{mission ? fmtEur(mission.cjm) : '—'}</span>
              },
            },
            {
              id: 'marge',
              header: 'Marge',
              align: 'right',
              width: '4.5rem',
              render: (collab) => {
                const mission = getActiveMission(collab)
                return (
                  <span className="font-medium text-accent">
                    {mission?.gross_margin_pct != null ? `${mission.gross_margin_pct} %` : '—'}
                  </span>
                )
              },
            },
            {
              id: 'statut',
              header: 'Statut',
              align: 'center',
              width: '7.5rem',
              render: (collab) => {
                const enMission = Boolean(getActiveMission(collab))
                return (
                  <StatusPill
                    label={enMission ? 'En mission' : 'Inter-contrat'}
                    variant={enMission ? 'success' : 'warning'}
                  />
                )
              },
            },
          ] satisfies StructuredListColumn<CollaborateurRow>[]}
        />
      </section>

      {/* ── Drawer profil consultant ──────────────────────────────────── */}
      <ConsultantDrawer
        collaboratorId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
