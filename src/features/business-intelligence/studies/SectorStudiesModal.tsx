"use client"

import { useMemo, useState, type ReactNode } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { SectorKnowledgeReadModel, SectorResolvedLevel } from "@/features/master-study/data/get-sector-knowledge-read-model"

type SectorStudySectionKey =
  | "essential"
  | "economy"
  | "tech"
  | "risks"
  | "pain_points"
  | "sources"

type SectorStudySectionDef = {
  key: SectorStudySectionKey
  label: string
  hasData: boolean
  countBadge?: string | number | null
}

export type SectorStudiesModalProps = {
  open: boolean
  onClose: () => void
  knowledge: SectorKnowledgeReadModel
  segmentName?: string
  macroName?: string | null
  isMobile?: boolean
}

function ProvenanceBadge({ level }: { level?: SectorResolvedLevel | "segment" | "macro" | null }) {
  if (!level) return null
  if (level === "segment") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
        Segment
      </span>
    )
  }
  if (level === "macro") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
        Hérité macro
      </span>
    )
  }
  if (level === "locked") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
        Verrouillé
      </span>
    )
  }
  if (level === "estimated") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-400">
        Estimé
      </span>
    )
  }
  return null
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4 space-y-2.5">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
        {title}
      </h4>
      <div className="text-xs text-white/75 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function SectorStudiesModal({
  open,
  onClose,
  knowledge,
  segmentName,
  macroName,
  isMobile = false,
}: SectorStudiesModalProps) {
  const name = segmentName || knowledge.segmentName
  const macro = macroName || knowledge.macroName
  const playbook = asRecord(knowledge.playbook)
  const caveats = asRecord(knowledge.caveats)

  const rawTheses = asArray(playbook.theses)
  const rawModeles = asArray(playbook.modeles_economiques)
  const rawFrontsTech = asArray(playbook.fronts_technologiques)
  const rawDependances = asArray(playbook.dependances_critiques)
  const rawRisques = asArray(playbook.risques_et_opportunites)
  const rawSourcesList = asArray(caveats.sources)

  const keyPlayersPaca = asArray(knowledge.keyPlayersPaca)
  const keyPlayersNational = asArray(knowledge.keyPlayersNational)

  const sections: SectorStudySectionDef[] = useMemo(() => {
    const list: SectorStudySectionDef[] = [
      {
        key: "essential",
        label: "Essentiel",
        hasData: Boolean(
          knowledge.description ||
          knowledge.marketSizeEurBn !== null ||
          knowledge.marketGrowthPct !== null ||
          knowledge.attractivenessScore !== null ||
          knowledge.digitalMaturity ||
          knowledge.avgTjmMin !== null,
        ),
      },
      {
        key: "economy",
        label: "Économie & modèles",
        hasData: rawModeles.length > 0 || rawTheses.length > 0,
        countBadge: rawModeles.length || rawTheses.length || null,
      },
      {
        key: "tech",
        label: "Technologies & dépendances",
        hasData: rawFrontsTech.length > 0 || rawDependances.length > 0 || Boolean(knowledge.practicesFit && Object.keys(asRecord(knowledge.practicesFit)).length > 0),
        countBadge: (rawFrontsTech.length + rawDependances.length) || null,
      },
      {
        key: "risks",
        label: "Risques & dynamiques",
        hasData: rawRisques.length > 0 || knowledge.events.length > 0,
        countBadge: (rawRisques.length + knowledge.events.length) || null,
      },
      {
        key: "pain_points",
        label: "Pain points & acteurs",
        hasData: knowledge.painPoints.length > 0 || keyPlayersPaca.length > 0 || keyPlayersNational.length > 0,
        countBadge: (knowledge.painPoints.length + keyPlayersPaca.length + keyPlayersNational.length) || null,
      },
      {
        key: "sources",
        label: "Sources & limites",
        hasData: Boolean(
          caveats.corpus ||
          caveats.verbatims ||
          caveats.frequences ||
          caveats.marche ||
          rawSourcesList.length > 0,
        ),
        countBadge: rawSourcesList.length || null,
      },
    ]

    return list.filter((s) => s.hasData)
  }, [
    knowledge,
    rawTheses,
    rawModeles,
    rawFrontsTech,
    rawDependances,
    rawRisques,
    rawSourcesList,
    keyPlayersPaca,
    keyPlayersNational,
    caveats,
  ])

  const [activeSectionKey, setActiveSectionKey] = useState<SectorStudySectionKey>(
    () => sections[0]?.key ?? "essential",
  )

  const activeSection = sections.find((s) => s.key === activeSectionKey) ?? sections[0]

  const leftPane = (
    <div className="flex h-full flex-col bg-[#0d0f28] text-white">
      <div className="border-b border-white/10 p-4">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          Étude sectorielle
        </span>
        <h3 className="mt-1 font-heading text-sm font-bold text-white truncate">
          {name}
        </h3>
        {macro ? (
          <p className="text-[11px] text-white/45 truncate">Macro : {macro}</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
        <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
          Sections de l’étude
        </p>
        {sections.map((section) => {
          const isSelected = section.key === activeSection?.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSectionKey(section.key)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-brass",
                isSelected
                  ? "border-brand-brass/40 bg-brand-brass/10 text-white font-semibold"
                  : "border-transparent text-white/70 hover:bg-white/[0.03] hover:text-white",
              )}
            >
              <span className="text-xs leading-tight">{section.label}</span>
              {section.countBadge ? (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white/50">
                  {section.countBadge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderSectionContent = () => {
    if (!activeSection) {
      return (
        <div className="py-12 text-center text-xs text-white/40 italic">
          Aucune donnée disponible pour cette étude.
        </div>
      )
    }

    switch (activeSection.key) {
      case "essential":
        return (
          <div className="space-y-5">
            {/* Description du segment */}
            {knowledge.description ? (
              <SectionCard title="Description métier">
                <div className="flex items-start justify-between gap-3">
                  <p className="leading-relaxed text-white/85">{knowledge.description}</p>
                  <ProvenanceBadge level={knowledge.descriptionLevel} />
                </div>
              </SectionCard>
            ) : null}

            {/* Chiffres clés de marché */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-white/40">Taille de marché</span>
                  <ProvenanceBadge level={knowledge.marketSizeEurBnLevel} />
                </div>
                <span className="block text-lg font-bold text-white">
                  {knowledge.marketSizeEurBn !== null ? `${knowledge.marketSizeEurBn} Md€` : "N/A"}
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-white/40">Croissance</span>
                  <ProvenanceBadge level={knowledge.marketGrowthPctLevel} />
                </div>
                <span className="block text-lg font-bold text-brand-brass">
                  {knowledge.marketGrowthPct !== null ? `+${knowledge.marketGrowthPct}%` : "N/A"}
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-white/40">Attractivité</span>
                  <ProvenanceBadge level={knowledge.attractivenessScoreLevel} />
                </div>
                <span className="block text-lg font-bold text-white">
                  {knowledge.attractivenessScore !== null ? `${knowledge.attractivenessScore} / 5` : "N/A"}
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40">Maturité digitale</span>
                <span className="block text-sm font-bold text-white capitalize">
                  {knowledge.digitalMaturity ?? "Non renseignée"}
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40">Fourchette TJM</span>
                <span className="block text-sm font-bold text-white">
                  {knowledge.avgTjmMin && knowledge.avgTjmMax
                    ? `${knowledge.avgTjmMin} – ${knowledge.avgTjmMax} €`
                    : "Non renseignée"}
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40">Snapshot étude</span>
                <span className="block text-xs font-mono text-white/70">
                  {knowledge.studySnapshotDate
                    ? new Date(knowledge.studySnapshotDate).toLocaleDateString("fr-FR")
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        )

      case "economy":
        return (
          <div className="space-y-4">
            {rawTheses.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Thèses économiques et sectorielles ({rawTheses.length})
                </h4>
                <div className="space-y-2">
                  {rawTheses.map((item, idx) => {
                    const rec = asRecord(item)
                    const titre = typeof rec.these === "string" ? rec.these : typeof rec.titre === "string" ? rec.titre : `Thèse #${idx + 1}`
                    const implication = typeof rec.donc_commercialement === "string" ? rec.donc_commercialement : typeof rec.implication === "string" ? rec.implication : null
                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2">
                        <span className="text-xs font-bold text-white block">{titre}</span>
                        {typeof rec.detail === "string" ? (
                          <p className="text-xs leading-relaxed text-white/70">{rec.detail}</p>
                        ) : null}
                        {implication ? (
                          <div className="rounded-lg border border-brand-brass/20 bg-brand-brass/[0.05] p-2.5 text-xs text-brand-brass">
                            <strong>Impact commercial : </strong>
                            {implication}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {rawModeles.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Modèles économiques observés ({rawModeles.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rawModeles.map((item, idx) => {
                    const rec = asRecord(item)
                    const nom = typeof rec.nom === "string" ? rec.nom : typeof rec.modele === "string" ? rec.modele : `Modèle #${idx + 1}`
                    const desc = typeof rec.description === "string" ? rec.description : typeof rec.detail === "string" ? rec.detail : ""
                    return (
                      <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/30 p-3.5 space-y-1.5">
                        <span className="text-xs font-bold text-white block">{nom}</span>
                        {desc ? <p className="text-xs text-white/65 leading-relaxed">{desc}</p> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )

      case "tech":
        return (
          <div className="space-y-4">
            {rawFrontsTech.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Fronts technologiques & Chantiers SI ({rawFrontsTech.length})
                </h4>
                <div className="space-y-2">
                  {rawFrontsTech.map((item, idx) => {
                    const rec = asRecord(item)
                    const titre = typeof rec.front === "string" ? rec.front : typeof rec.titre === "string" ? rec.titre : `Front #${idx + 1}`
                    const impact = typeof rec.impact === "string" ? rec.impact : typeof rec.description === "string" ? rec.description : null
                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1.5">
                        <span className="text-xs font-bold text-white block">{titre}</span>
                        {impact ? <p className="text-xs text-white/70 leading-relaxed">{impact}</p> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {rawDependances.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Dépendances critiques & Fournisseurs ({rawDependances.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rawDependances.map((item, idx) => {
                    const rec = asRecord(item)
                    const titre = typeof rec.dependance === "string" ? rec.dependance : typeof rec.nom === "string" ? rec.nom : `Dépendance #${idx + 1}`
                    const desc = typeof rec.description === "string" ? rec.description : null
                    return (
                      <div key={idx} className="rounded-xl border border-white/5 bg-slate-900/30 p-3 space-y-1">
                        <span className="text-xs font-semibold text-white block">{titre}</span>
                        {desc ? <p className="text-xs text-white/65 leading-relaxed">{desc}</p> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )

      case "risks":
        return (
          <div className="space-y-4">
            {rawRisques.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Risques & Dynamiques de marché ({rawRisques.length})
                </h4>
                <div className="space-y-2">
                  {rawRisques.map((item, idx) => {
                    const rec = asRecord(item)
                    const titre = typeof rec.risque === "string" ? rec.risque : typeof rec.titre === "string" ? rec.titre : `Risque #${idx + 1}`
                    const mitigation = typeof rec.opportunite === "string" ? rec.opportunite : typeof rec.impact === "string" ? rec.impact : null
                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white">{titre}</span>
                          {typeof rec.niveau === "string" ? (
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                              {rec.niveau}
                            </span>
                          ) : null}
                        </div>
                        {mitigation ? (
                          <p className="text-xs text-white/70 leading-relaxed">{mitigation}</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {knowledge.events.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Événements structurants ({knowledge.events.length})
                </h4>
                <div className="space-y-2">
                  {knowledge.events.map((event) => (
                    <div key={event.id} className="rounded-xl border border-white/5 bg-slate-900/30 p-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-white block">{event.title}</span>
                        {event.description ? <p className="text-[11px] text-white/60 mt-0.5">{event.description}</p> : null}
                      </div>
                      {event.eventDate ? (
                        <span className="font-mono text-xs font-bold text-brand-brass bg-brand-brass/10 px-2 py-1 rounded">
                          {new Date(event.eventDate).toLocaleDateString("fr-FR")}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )

      case "pain_points":
        return (
          <div className="space-y-5">
            {knowledge.painPoints.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Points de douleur sectoriels ({knowledge.painPoints.length})
                </h4>
                <div className="space-y-2">
                  {knowledge.painPoints.map((pp) => (
                    <div key={pp.id} className="rounded-xl border border-white/10 bg-slate-900/30 p-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white">{pp.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-white/40">Fréq : {pp.frequencyCount}</span>
                          <ProvenanceBadge level={pp.resolvedLevel} />
                        </div>
                      </div>
                      {pp.description ? (
                        <p className="text-xs text-white/70 leading-relaxed">{pp.description}</p>
                      ) : null}
                      {pp.verbatim ? (
                        <blockquote className="border-l-2 border-brand-brass/40 pl-2.5 text-[11px] italic text-white/60">
                          « {pp.verbatim} »
                        </blockquote>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(keyPlayersPaca.length > 0 || keyPlayersNational.length > 0) ? (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Acteurs clés du secteur
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keyPlayersPaca.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-white/5 bg-slate-950/30 p-3">
                      <span className="text-[10px] font-bold uppercase text-white/45 block">Bassin Régional (PACA)</span>
                      <div className="space-y-1.5">
                        {keyPlayersPaca.map((p, idx) => {
                          const rec = asRecord(p)
                          return (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold text-white">{String(rec.name ?? "")}</span>
                              {rec.size ? <span className="text-white/40 text-[10px] ml-1.5">({String(rec.size)})</span> : null}
                              {rec.note ? <p className="text-[11px] text-white/60 mt-0.5">{String(rec.note)}</p> : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {keyPlayersNational.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-white/5 bg-slate-950/30 p-3">
                      <span className="text-[10px] font-bold uppercase text-white/45 block">Échelle Nationale / Globale</span>
                      <div className="space-y-1.5">
                        {keyPlayersNational.map((p, idx) => {
                          const rec = asRecord(p)
                          return (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold text-white">{String(rec.name ?? "")}</span>
                              {rec.size ? <span className="text-white/40 text-[10px] ml-1.5">({String(rec.size)})</span> : null}
                              {rec.note ? <p className="text-[11px] text-white/60 mt-0.5">{String(rec.note)}</p> : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )

      case "sources":
        return (
          <div className="space-y-4">
            <SectionCard title="Réserves méthodologiques (Caveats)">
              <div className="space-y-2">
                {typeof caveats.corpus === "string" ? (
                  <p><strong className="text-white/90">Corpus analysé :</strong> {caveats.corpus}</p>
                ) : null}
                {typeof caveats.verbatims === "string" ? (
                  <p><strong className="text-white/90">Verbatims :</strong> {caveats.verbatims}</p>
                ) : null}
                {typeof caveats.frequences === "string" ? (
                  <p><strong className="text-white/90">Fréquences d&apos;occurrence :</strong> {caveats.frequences}</p>
                ) : null}
                {typeof caveats.marche === "string" ? (
                  <p><strong className="text-white/90">Chiffres de marché :</strong> {caveats.marche}</p>
                ) : null}
              </div>
            </SectionCard>

            {rawSourcesList.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                  Sources consultées ({rawSourcesList.length})
                </h4>
                <ul className="space-y-1.5 text-xs text-brand-brass list-disc pl-5">
                  {rawSourcesList.map((src, idx) => {
                    const url = typeof src === "string" ? src : typeof asRecord(src).url === "string" ? String(asRecord(src).url) : ""
                    const label = typeof asRecord(src).atteste === "string" ? String(asRecord(src).atteste) : url
                    return (
                      <li key={idx} className="leading-relaxed">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
                            {label} ↗
                          </a>
                        ) : (
                          <span className="text-white/70">{label}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )
    }
  }

  const rightPane = (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0b1e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-brass/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-brass">
              Étude active
            </span>
            {macro ? (
              <span className="text-[10px] text-white/40">Macro : {macro}</span>
            ) : null}
          </div>
          {knowledge.studySnapshotDate ? (
            <span className="text-[10px] text-white/45">
              Mise à jour : {new Date(knowledge.studySnapshotDate).toLocaleDateString("fr-FR")}
            </span>
          ) : null}
        </div>
        <h2 className="mt-2 font-heading text-xl font-bold text-white">
          {name} — {activeSection?.label}
        </h2>
      </div>

      {/* Contenu de la section active */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {renderSectionContent()}
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 justify-end border-t border-white/10 bg-slate-950/40 p-4">
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </footer>
    </div>
  )

  const mobileContent = (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0a0b1e] text-white">
      {/* Header Mobile */}
      <div className="shrink-0 border-b border-white/10 p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
          Étude sectorielle
        </span>
        <h3 className="mt-0.5 font-heading text-lg font-bold text-white">{name}</h3>
      </div>

      {/* Rail de navigation tactile horizontal */}
      <nav
        aria-label="Sections de l’étude"
        className="sticky top-0 z-10 flex overflow-x-auto border-b border-white/10 bg-slate-950 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section) => {
          const isSelected = section.key === activeSection?.key
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSectionKey(section.key)}
              aria-current={isSelected ? "page" : undefined}
              className={cn(
                "min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass",
                isSelected
                  ? "bg-brand-brass/20 text-brand-brass font-bold"
                  : "text-white/60 hover:text-white",
              )}
            >
              {section.label}
            </button>
          )
        })}
      </nav>

      {/* Contenu Mobile */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {renderSectionContent()}
      </div>

      {/* Footer Mobile */}
      <footer className="shrink-0 border-t border-white/10 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="secondary" className="min-h-11 w-full" onClick={onClose}>
          Fermer
        </Button>
      </footer>
    </div>
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      onClose={onClose}
      title={`Étude sectorielle — ${name}`}
      subtitle="Projection structurée pour comprendre et exploiter le segment."
      leftPane={leftPane}
      rightPane={rightPane}
      content={isMobile ? mobileContent : undefined}
      leftPaneWidth="30%"
      isMobile={isMobile}
    />
  )
}
