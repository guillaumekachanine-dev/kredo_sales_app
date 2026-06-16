'use client'

import { Badge } from '@/components/ui/Badge'
import { StatusPill } from '@/components/ui/StatusPill'
import {
  MobileDataList,
  MobileEntitySummary,
  MobileHeroInsight,
  MobilePageHeader,
} from '@/components/ui/mobile'
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

const AVATAR_TONES = [
  'bg-primary/[0.12] text-primary',
  'bg-success/[0.12] text-success',
  'bg-warning/[0.14] text-[var(--color-status-warning-ink)]',
  'bg-info/[0.12] text-info',
]

function avatarTone(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return AVATAR_TONES[code % AVATAR_TONES.length]
}

function isEnMission(row: CollaborateurRow): boolean {
  return row.missions.some((m) => m.status === 'active')
}

interface Props { data: CollaborateurRow[] }

export function ConsultantsSyntheseMobile({ data }: Props) {
  const enMission    = data.filter(isEnMission).length
  const interContrat = data.length - enMission
  const hasInterContrat = interContrat > 0

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <MobilePageHeader
        eyebrow="Consultants"
        title="Synthèse d’équipe"
        description="Vision rapide des disponibilités et des missions actives."
      />

      <MobileHeroInsight
        eyebrow="Décision prioritaire"
        title={
          hasInterContrat
            ? `${interContrat} consultant${interContrat > 1 ? 's' : ''} à repositionner`
            : 'Capacité sécurisée'
        }
        value={`${interContrat}/${data.length}`}
        summary={
          hasInterContrat
            ? 'Arbitrez les profils disponibles avant la prochaine vague de staffing.'
            : 'Tous les profils suivis sont engagés sur une mission active.'
        }
        tone={hasInterContrat ? 'warning' : 'success'}
        confidence={`${enMission} en mission`}
        sourceLabel="Vue consultants"
      />

      <MobileDataList
        ariaLabel="Liste mobile des consultants"
        items={data}
        getItemId={(collab) => collab.id}
        header={(
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-[length:var(--font-size-label-sm)] font-semibold uppercase tracking-[0.08em] text-muted">
              Collaborateurs
            </h2>
            <Badge variant="neutral" size="md">
              {data.length}
            </Badge>
          </div>
        )}
        renderItem={(collab) => {
          const name = getFullName(collab)
          const initials = getInitials(collab)
          const tone = avatarTone(name)
          const mission = collab.missions.find((m) => m.status === 'active') ?? null
          const inMission = Boolean(mission)

          return (
            <MobileEntitySummary
              href={`/consultants/${collab.id}`}
              visual={(
                <span className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-round)] text-sm font-semibold ${tone}`}>
                  {initials}
                </span>
              )}
              title={name}
              subtitle={
                mission
                  ? `${mission.title}${mission.company ? ` · ${mission.company.name}` : ''}`
                  : collab.current_title ?? 'Aucune mission active'
              }
              status={(
                <StatusPill
                  label={inMission ? 'En mission' : 'Disponible'}
                  variant={inMission ? 'success' : 'warning'}
                />
              )}
              facts={[
                { label: 'Statut', value: inMission ? 'Actif' : 'À affecter' },
                { label: 'Practice', value: collab.practice ?? 'Non renseignée' },
                {
                  label: 'TJM',
                  value: mission ? `${mission.tjm.toLocaleString('fr-FR')} €` : 'N/A',
                },
                {
                  label: 'Séniorité',
                  value: collab.seniority ?? 'Non renseignée',
                },
              ]}
            />
          )
        }}
      />
    </div>
  )
}
