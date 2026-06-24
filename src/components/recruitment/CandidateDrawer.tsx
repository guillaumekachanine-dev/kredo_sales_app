'use client'

import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { AppDrawer } from '@/components/ui/AppDrawer'
import { StatusPill } from '@/components/ui/StatusPill'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawerCandidateSkill {
  id: string
  level: number | null
  years: number | null
  confidence: number | null
  source: string | null
  skill: {
    id: string
    name: string
    category: string | null
  }
}

export interface DrawerCandidateData {
  id: string
  status: string
  seniority: string | null
  availability: string | null
  expected_salary: number | null
  expected_daily_rate: number | null
  summary: string | null
  notes: string | null
  person: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    primary_email: string | null
    phone: string | null
    linkedin_url: string | null
    location: string | null
    notes: string | null
    person_skills?: DrawerCandidateSkill[]
  } | null
}

interface CandidateDrawerProps {
  candidateId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tab = 'synthese' | 'competences'

const TABS: { id: Tab; label: string }[] = [
  { id: 'synthese',    label: 'Synthèse' },
  { id: 'competences', label: 'Compétences' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function resolveFullName(data: DrawerCandidateData): string {
  if (data.person?.full_name) return data.person.full_name
  const fn = data.person?.first_name ?? ''
  const ln = data.person?.last_name ?? ''
  return `${fn} ${ln}`.trim() || 'Candidat'
}

function candidateStatusVariant(status: string): 'success' | 'neutral' | 'warning' | 'danger' {
  if (status === 'actif' || status === 'qualifie') return 'success'
  if (status === 'en_discussion' || status === 'entretien') return 'warning'
  if (status === 'refuse' || status === 'blacklist') return 'danger'
  return 'neutral'
}

function candidateStatusLabel(status: string): string {
  if (status === 'actif') return 'Actif'
  if (status === 'qualifie') return 'Qualifié'
  if (status === 'en_discussion') return 'En discussion'
  if (status === 'entretien') return 'En entretien'
  if (status === 'refuse') return 'Refusé'
  if (status === 'blacklist') return 'Exclu'
  return status.replace(/_/g, ' ')
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
      </div>
      <Sk className="h-12 rounded-xl w-full" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => <Sk key={i} className="h-16 rounded-xl" />)}
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
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className="border rounded-xl p-3 flex flex-col gap-0.5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
        {label}
      </p>
      <p
        className="text-[14px] font-bold leading-snug"
        style={{ color: accent ? 'var(--color-accent)' : 'var(--color-heading)' }}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Tab Synthèse ──────────────────────────────────────────────────────────

function TabSynthese({ data }: { data: DrawerCandidateData }) {
  return (
    <div className="space-y-4">
      {/* Profil métier */}
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-border)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)' }}>
          Statut Candidat
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-heading)' }}>
            Candidat externe
          </span>
          <StatusPill
            label={candidateStatusLabel(data.status)}
            variant={candidateStatusVariant(data.status)}
            dot={false}
          />
        </div>
      </div>

      {/* Ligne 1 : identité */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label="Séniorité" value={data.seniority ?? '—'} />
        <KpiCard label="Disponibilité" value={data.availability ?? '—'} />
      </div>

      {/* Ligne 2 : financier — TJM | Salaire Souhaité */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Prétentions Salariales"
          value={data.expected_salary !== null ? `${fmtEur(data.expected_salary)} / an` : '—'}
        />
        <KpiCard
          label="TJM Souhaité"
          value={data.expected_daily_rate !== null ? `${data.expected_daily_rate} €` : '—'}
          accent
        />
      </div>

      {/* Coordonnées */}
      {data.person && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Coordonnées
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.person.primary_email && (
              <a
                href={`mailto:${data.person.primary_email}`}
                className="p-3 bg-surface rounded-xl border flex items-center gap-3 hover:bg-canvas/50 transition-colors group"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase block leading-none mb-1" style={{ color: 'var(--color-muted)' }}>E-mail</span>
                  <span className="text-xs font-semibold truncate block group-hover:underline" style={{ color: 'var(--color-heading)' }}>{data.person.primary_email}</span>
                </div>
              </a>
            )}
            {data.person.phone && (
              <a
                href={`tel:${data.person.phone}`}
                className="p-3 bg-surface rounded-xl border flex items-center gap-3 hover:bg-canvas/50 transition-colors group"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase block leading-none mb-1" style={{ color: 'var(--color-muted)' }}>Téléphone</span>
                  <span className="text-xs font-semibold truncate block group-hover:underline" style={{ color: 'var(--color-heading)' }}>{data.person.phone}</span>
                </div>
              </a>
            )}
            {data.person.linkedin_url && (
              <a
                href={data.person.linkedin_url.startsWith('http') ? data.person.linkedin_url : `https://${data.person.linkedin_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-surface rounded-xl border flex items-center gap-3 hover:bg-canvas/50 transition-colors group sm:col-span-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase block leading-none mb-1" style={{ color: 'var(--color-muted)' }}>LinkedIn</span>
                  <span className="text-xs font-semibold truncate block group-hover:underline text-primary">Profil LinkedIn</span>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Notes / Synthèse */}
      {(data.summary || data.notes || data.person?.notes) && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Notes & Synthèse
          </p>
          {data.summary && (
            <div className="text-xs leading-relaxed border rounded-xl p-3 bg-blue-500/[0.04] text-body" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold text-[9px] uppercase tracking-wider block mb-1 text-primary">Résumé IA / Matching</span>
              {data.summary}
            </div>
          )}
          {(data.notes || data.person?.notes) && (
            <div className="text-xs leading-relaxed border rounded-xl p-3 bg-surface text-body whitespace-pre-wrap" style={{ borderColor: 'var(--color-border)' }}>
              {data.notes || data.person?.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab Compétences ──────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  1: 'Notions', 2: 'Débutant', 3: 'Intermédiaire', 4: 'Avancé', 5: 'Expert',
}

function TabCompetences({ skills }: { skills: DrawerCandidateSkill[] }) {
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

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <div
          className="flex h-32 items-center justify-center rounded-xl border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
            Aucune compétence renseignée
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((ps) => (
            <div
              key={ps.id}
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-heading)' }}>
                  {ps.skill.name}
                </span>
                {ps.skill.category && (
                  <span className="text-[10px] capitalize" style={{ color: 'var(--color-muted)' }}>
                    {ps.skill.category}
                  </span>
                )}
              </div>

              <span
                className="flex shrink-0 items-center gap-0.5"
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
                  className="shrink-0 text-[10px] font-medium"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {ps.years} an{ps.years > 1 ? 's' : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CandidateDrawer({ candidateId, open, onOpenChange }: CandidateDrawerProps) {
  const [drawerData, setDrawerData] = useState<DrawerCandidateData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>('synthese')

  const loadDrawerData = useEffectEvent(async (nextCandidateId: string) => {
    setLoading(true)
    setFetchError(null)
    setActiveTab('synthese')
    setDrawerData(null)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('candidates')
      .select(`
        id, status, seniority, availability, expected_salary, expected_daily_rate, summary, notes,
        person:persons (
          id, full_name, first_name, last_name, primary_email, phone, linkedin_url, location, notes,
          person_skills (
            id, level, years, confidence, source,
            skill:skills ( id, name, category )
          )
        )
      `)
      .eq('id', nextCandidateId)
      .single()

    if (error || !data) {
      setFetchError('Impossible de charger le profil candidat.')
    } else {
      setDrawerData(data as unknown as DrawerCandidateData)
    }
    setLoading(false)
  })

  useEffect(() => {
    if (!open || !candidateId) return
    queueMicrotask(() => {
      void loadDrawerData(candidateId)
    })
  }, [open, candidateId])

  const name     = drawerData ? resolveFullName(drawerData) : '…'
  const subtitle = drawerData?.seniority ? `Candidat · ${drawerData.seniority}` : 'Candidat externe'

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      subtitle={subtitle}
      className="max-w-[480px]"
    >
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

      {loading && <DrawerSkeleton />}

      {fetchError && !loading && (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          <p className="text-sm font-semibold">Erreur de chargement</p>
          <p className="text-xs">{fetchError}</p>
          <button
            onClick={() => open && candidateId && setLoading(true)}
            className="mt-1 text-xs underline underline-offset-2"
            style={{ color: 'var(--color-primary)' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !fetchError && drawerData && (
        <div role="tabpanel">
          {activeTab === 'synthese' && <TabSynthese data={drawerData} />}
          {activeTab === 'competences' && (
            <TabCompetences
              skills={drawerData.person?.person_skills ?? []}
            />
          )}
        </div>
      )}
    </AppDrawer>
  )
}
