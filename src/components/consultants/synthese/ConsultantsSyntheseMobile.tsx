'use client'

import Link from 'next/link'
import type { CollaborateurRow } from './ConsultantsSyntheseDesktop'

function getFullName(row: CollaborateurRow): string {
  return (
    (row.person?.full_name ??
    `${row.person?.first_name ?? ''} ${row.person?.last_name ?? ''}`.trim()) ||
    'Inconnu'
  )
}

function getInitials(row: CollaborateurRow): string {
  const fn = row.person?.first_name ?? ''
  const ln = row.person?.last_name ?? ''
  return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || '?'
}

const AVATAR_PALETTE = [
  '#2554B8', '#2C7D5C', '#D97020', '#C08A20',
  '#BE3E3E', '#526074', '#7B5EA7', '#1B7FA0',
]
function avatarColor(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}

function isEnMission(row: CollaborateurRow): boolean {
  return row.missions.some((m) => m.status === 'active')
}

interface Props { data: CollaborateurRow[] }

export function ConsultantsSyntheseMobile({ data }: Props) {
  const enMission    = data.filter(isEnMission).length
  const interContrat = data.length - enMission

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">

      {/* KPIs compacts */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="border rounded-xl p-3"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            En mission
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
            {enMission}
          </p>
        </div>
        <div
          className="border rounded-xl p-3"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            Inter-contrat
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: interContrat > 0 ? 'var(--color-accent)' : 'var(--color-heading)' }}
          >
            {interContrat}
          </p>
        </div>
      </div>

      {/* Liste */}
      <h2 className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--color-muted)' }}>
        Collaborateurs ({data.length})
      </h2>

      <div className="flex flex-col gap-2">
        {data.map((collab) => {
          const name     = getFullName(collab)
          const initials = getInitials(collab)
          const color    = avatarColor(name)
          const mission  = collab.missions.find((m) => m.status === 'active') ?? null
          const inMission = Boolean(mission)

          return (
            <Link
              key={collab.id}
              href={`/consultants/${collab.id}`}
              className="flex items-center gap-3 border rounded-xl p-3 transition-colors active:opacity-70"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              {/* Avatar */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: color }}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--color-heading)' }}>
                  {name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                  {mission
                    ? `${mission.title}${mission.company ? ` · ${mission.company.name}` : ''}`
                    : collab.current_title ?? 'Aucune mission active'}
                </p>
              </div>

              {/* TJM + statut */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                {mission && (
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-heading)' }}>
                    {mission.tjm.toLocaleString('fr-FR')} €
                  </span>
                )}
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={
                    inMission
                      ? { background: '#d1fae5', color: '#065f46' }
                      : { background: '#fef3c7', color: '#92400e' }
                  }
                >
                  {inMission ? 'Mission' : 'Dispo'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
