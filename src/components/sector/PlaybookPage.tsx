'use client'

import Link from 'next/link'
import type { SectorWithRelations } from '@/types/sector'
import { PlaybookPanel } from './blocks/PlaybookPanel'

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

interface Props {
  sector: SectorWithRelations
}

export default function PlaybookPage({ sector }: Props) {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-4">
        <Link
          href={`/prospection/approche-sectorielle/${sector.slug}`}
          className="text-xs font-bold text-muted hover:text-heading transition-colors flex items-center gap-1.5 w-fit"
        >
          ← Fiche sectorielle
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-black text-heading leading-tight font-heading">
            Playbook commercial — {sector.name}
          </h1>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
              STATUS_STYLE[sector.status] ?? STATUS_STYLE.watch
            }`}
          >
            {STATUS_LABEL[sector.status] ?? sector.status}
          </span>
        </div>
        {sector.description && (
          <p className="text-xs text-body leading-relaxed max-w-3xl">
            {sector.description}
          </p>
        )}
      </div>

      {/* PlaybookPanel pleine largeur */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <PlaybookPanel playbook={sector.playbook} />
      </div>

      {/* Retour bas de page */}
      <div>
        <Link
          href={`/prospection/approche-sectorielle/${sector.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-surface border border-border text-heading hover:bg-surface-hover transition-all"
        >
          ← Retour à la fiche sectorielle
        </Link>
      </div>
    </div>
  )
}
