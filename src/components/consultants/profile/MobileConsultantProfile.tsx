'use client'

import type { Consultant, ConsultantMission } from '@/types/consultant'

interface Props {
  data: Consultant
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function missionStatusColor(status: string): string {
  switch (status) {
    case 'active':    return 'bg-emerald-500/15 text-emerald-600'
    case 'paused':    return 'bg-amber-500/15 text-amber-600'
    case 'ended':     return 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'
    case 'cancelled': return 'bg-red-500/10 text-red-500'
    default:          return 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'
  }
}

function missionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    paused: 'Suspendue',
    ended: 'Terminée',
    cancelled: 'Annulée',
  }
  return map[status] ?? status
}

function MissionCard({ mission }: { mission: ConsultantMission }) {
  const totalBillable = mission.activity_reports.reduce(
    (sum, r) => sum + r.billable_days,
    0
  )

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-[var(--color-text-primary)] leading-snug">
          {mission.title}
        </p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${missionStatusColor(mission.status)}`}>
          {missionStatusLabel(mission.status)}
        </span>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {formatDate(mission.start_date)} → {formatDate(mission.end_date)}
      </p>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <div>
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">TJM</p>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
            {mission.tjm.toLocaleString('fr-FR')} €
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">Marge</p>
          <p className="text-sm font-semibold text-[var(--color-accent)] tabular-nums">
            {mission.gross_margin_pct !== null ? `${mission.gross_margin_pct} %` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">Facturé</p>
          <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
            {totalBillable} j
          </p>
        </div>
      </div>
    </div>
  )
}

export function MobileConsultantProfile({ data }: Props) {
  const activeMissions = data.missions.filter((m) => m.status === 'active')

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

      {/* ── Identité ──────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {data.person.full_name ??
            `${data.person.first_name ?? ''} ${data.person.last_name ?? ''}`.trim()}
        </h1>
        {data.current_title && (
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {data.current_title}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Depuis {formatDate(data.entry_date)}
        </p>
      </div>

      {/* ── Jauges rapides ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
            Missions actives
          </p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {activeMissions.length}
          </p>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
            Marge moy.
          </p>
          <p className="text-2xl font-bold text-[var(--color-accent)]">
            {activeMissions.length > 0
              ? `${(
                  activeMissions.reduce((s, m) => s + (m.gross_margin_pct ?? 0), 0) /
                  activeMissions.length
                ).toFixed(0)} %`
              : '—'}
          </p>
        </div>
      </div>

      {/* ── Liste missions ────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2 px-1">
          Missions ({data.missions.length})
        </h2>
        {data.missions.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-center text-sm text-[var(--color-text-secondary)]">
            Aucune mission enregistrée.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
