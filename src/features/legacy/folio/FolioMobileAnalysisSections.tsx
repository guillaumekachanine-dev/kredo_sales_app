"use client"

import React from "react"
import { BarChart2, Users, Link2, Shield, Swords, Target, Compass } from "./icons"
import type { SectorAnalysisData } from "./types"
import { cn } from "@/lib/utils"
import { asText, asTextList, parseNarrativeBlocks } from "./utils"

type SectionProps = {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

type SectionRowsProps = {
  rows: Array<{ label: string; value: string | null | undefined }>
  emptyLabel?: string
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <section className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1E3150]/10">
          {Icon ? <Icon className="h-3.5 w-3.5 text-[#1E3150]" /> : null}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3150]">
          {title}
        </h3>
      </div>
      <div className="space-y-3 pl-8">
        {children}
      </div>
    </section>
  )
}

function SectionRows({ rows, emptyLabel = "Données non disponibles." }: SectionRowsProps) {
  const visibleRows = rows
    .map((row) => ({ ...row, value: asText(row.value) }))
    .filter((row) => Boolean(row.value))

  if (visibleRows.length === 0) return null

  return (
    <div className="space-y-2.5">
      {visibleRows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#243B63]">{row.label}</p>
          <p className="text-xs text-[#334155] leading-relaxed">{row.value}</p>
        </div>
      ))}
    </div>
  )
}

function SectionBullets({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <ul className="space-y-1.5 pl-4 list-disc">
      {items.map((item) => (
        <li key={item} className="text-xs text-body leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  )
}

function LabeledBullets({
  label,
  items,
}: {
  label: string
  items: string[]
}) {
  const filtered = items.filter(Boolean)
  if (filtered.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#243B63]">{label}</p>
      <SectionBullets items={filtered} />
    </div>
  )
}

export function FolioMobileAnalysisSections({ data }: { data: SectorAnalysisData }) {
  const synthese = asText(data.synthese_sectorielle)
  const syntheseBlocks = synthese ? parseNarrativeBlocks(synthese) : []

  const leaders = (data.acteurs_cles?.leaders ?? []).map((entry) => {
    const name = asText(entry?.nom)
    const part = asText(entry?.part_marche_estimee)
    if (!name) return null
    return part ? `${name} (${part})` : name
  }).filter((entry): entry is string => Boolean(entry))

  const challengers = (data.acteurs_cles?.challengers ?? []).map((entry) => asText(entry?.nom)).filter((entry): entry is string => Boolean(entry))
  const emergents = (data.acteurs_cles?.emergents ?? []).map((entry) => asText(entry?.nom)).filter((entry): entry is string => Boolean(entry))

  const concurrents = (data.analyse_concurrentielle?.concurrents_directs ?? [])
    .map((entry) => {
      const name = asText(entry?.nom)
      const forces = asText(entry?.forces)
      if (!name) return null
      return forces ? `${name} — ${forces}` : name
    })
    .filter((entry): entry is string => Boolean(entry))

  const segments = (data.segment_clientele?.segmentation ?? [])
    .map((entry) => {
      const name = asText(entry?.segment)
      const weight = asText(entry?.poids_estime)
      const description = asText(entry?.description)
      if (!name) return null
      const details = [weight, description].filter(Boolean).join(" — ")
      return details ? `${name} (${details})` : name
    })
    .filter((entry): entry is string => Boolean(entry))

  const reglementationsEnVigueur = (data.environnement_normatif?.reglementations_en_vigueur ?? [])
    .map((entry) => {
      const name = asText(entry?.nom)
      const impact = asText(entry?.impact)
      if (!name) return null
      return impact ? `${name} — ${impact}` : name
    })
    .filter((entry): entry is string => Boolean(entry))

  const reglementationsAVenir = (data.environnement_normatif?.reglementations_a_venir ?? [])
    .map((entry) => {
      const name = asText(entry?.nom)
      const deadline = asText(entry?.echeance)
      const impact = asText(entry?.impact)
      if (!name) return null
      const details = [deadline, impact].filter(Boolean).join(" — ")
      return details ? `${name} (${details})` : name
    })
    .filter((entry): entry is string => Boolean(entry))

  return (
    <div className="space-y-6 bg-[#FFFFFF] p-4 rounded-xl border border-[#CBD5E1]">
      {/* 1. Synthèse sectorielle */}
      <Section title="Synthèse sectorielle" icon={Compass}>
        {syntheseBlocks.length > 0 ? (
          <div className="space-y-2">
            {syntheseBlocks.map((block, index) =>
              block.type === "list" ? (
                <SectionBullets key={`synthese-list-${index}`} items={block.content as string[]} />
              ) : (
                <p key={`synthese-p-${index}`} className="text-xs text-body leading-relaxed">
                  {block.content as string}
                </p>
              )
            )}
          </div>
        ) : (
          <p className="text-xs italic text-muted">Données non disponibles.</p>
        )}
      </Section>

      {/* 2. Marché */}
      <Section title="Marché" icon={BarChart2}>
        <SectionRows
          rows={[
            { label: "Taille France", value: data.volume_marche?.taille_marche_france },
            { label: "Taille Europe", value: data.volume_marche?.taille_marche_europe },
            { label: "Croissance annuelle", value: data.volume_marche?.taux_croissance_annuel },
          ]}
        />
        <LabeledBullets label="Tendances" items={asTextList(data.volume_marche?.tendances_macro)} />
        <LabeledBullets label="Facteurs de croissance" items={asTextList(data.volume_marche?.facteurs_croissance)} />
        <LabeledBullets label="Freins identifiés" items={asTextList(data.volume_marche?.freins_identifies)} />
      </Section>

      {/* 3. Acteurs */}
      <Section title="Acteurs" icon={Users}>
        <LabeledBullets label="Leaders" items={leaders} />
        <LabeledBullets label="Challengers" items={challengers} />
        <LabeledBullets label="Émergents" items={emergents} />
      </Section>

      {/* 4. Chaîne de valeur */}
      <Section title="Chaîne de valeur" icon={Link2}>
        <SectionRows rows={[{ label: "Description", value: data.chaine_valeur?.description_chaine }]} />
        <LabeledBullets label="Maillons clés" items={asTextList(data.chaine_valeur?.maillons_cles)} />
        <LabeledBullets label="Dépendances critiques" items={asTextList(data.chaine_valeur?.dependances_critiques)} />
        <LabeledBullets label="Points de vulnérabilité" items={asTextList(data.chaine_valeur?.points_vulnerabilite)} />
      </Section>

      {/* 5. Réglementation */}
      <Section title="Réglementation" icon={Shield}>
        <LabeledBullets label="Réglementations en vigueur" items={reglementationsEnVigueur} />
        <LabeledBullets label="Réglementations à venir" items={reglementationsAVenir} />
        <LabeledBullets label="Certifications requises" items={asTextList(data.environnement_normatif?.certifications_requises)} />
        <LabeledBullets label="Risques de conformité" items={asTextList(data.environnement_normatif?.risques_conformite)} />
      </Section>

      {/* 6. Concurrence */}
      <Section title="Concurrence" icon={Swords}>
        <SectionRows
          rows={[
            { label: "Positionnement du compte", value: data.analyse_concurrentielle?.positionnement_client },
          ]}
        />
        <LabeledBullets label="Concurrents directs" items={concurrents} />
        <LabeledBullets label="Avantages concurrentiels" items={asTextList(data.analyse_concurrentielle?.avantages_concurrentiels_client)} />
        <LabeledBullets label="Menaces" items={asTextList(data.analyse_concurrentielle?.menaces)} />
        <LabeledBullets label="Opportunités de différenciation" items={asTextList(data.analyse_concurrentielle?.opportunites_differenciation)} />
      </Section>

      {/* 7. Clientèle */}
      <Section title="Clientèle" icon={Target}>
        <SectionRows rows={[{ label: "Profil client type", value: data.segment_clientele?.profil_client_type }]} />
        <LabeledBullets label="Segmentation" items={segments} />
        <LabeledBullets label="Tendances comportementales" items={asTextList(data.segment_clientele?.tendances_comportementales)} />
        <LabeledBullets label="Besoins non couverts" items={asTextList(data.segment_clientele?.besoins_non_couverts)} />
      </Section>
    </div>
  )
}

