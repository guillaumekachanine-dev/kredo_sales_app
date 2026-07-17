import React from "react"
import { BarChart2, Users, Link2, Shield, Swords, Target, Compass } from "./icons"
import { cn } from "@/lib/utils"
import type { SectorAnalysisData } from "./types"
import { buildSyntheseBlocks } from "./utils"

type Props = {
  data: SectorAnalysisData
  companyName: string
  logoUrl?: string | null
}

function InfoRow({ label, value }: { label: string; value: string | string[] | undefined }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  const displayValue = Array.isArray(value)
    ? value.filter((v) => v && v !== "Non trouvé").join(" · ")
    : value
  if (!displayValue || displayValue === "Non trouvé") return null
  return (
    <div className="space-y-1 text-xs">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <p className="text-xs text-slate-200">{displayValue}</p>
    </div>
  )
}

function TagList({ items }: { items: string[] | undefined }) {
  const filtered = (items ?? []).filter((v) => v && v !== "Non trouvé")
  if (filtered.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {filtered.map((item, i) => (
        <span key={i} className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-650">
          {item}
        </span>
      ))}
    </div>
  )
}

function BulletList({ label, items }: { label: string; items: string[] | undefined }) {
  const filtered = (items ?? []).filter((v) => v && v !== "Non trouvé")
  if (filtered.length === 0) return null
  return (
    <div className="space-y-1 text-xs">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-200">
        {filtered.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-slate-700 bg-slate-800">
        <Icon className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          {title}
        </span>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  )
}


export function FolioSectorAnalysisPanel({ data, companyName, logoUrl }: Props) {
  const hasSynthese = Boolean(data.synthese_sectorielle && data.synthese_sectorielle !== "Non trouvé")
  const leaders = data.acteurs_cles?.leaders ?? []
  const challengers = data.acteurs_cles?.challengers ?? []
  const emergents = data.acteurs_cles?.emergents ?? []
  const reglementationsEnVigueur = data.environnement_normatif?.reglementations_en_vigueur ?? []
  const reglementationsAVenir = data.environnement_normatif?.reglementations_a_venir ?? []
  const concurrentsDirects = data.analyse_concurrentielle?.concurrents_directs ?? []
  const segments = data.segment_clientele?.segmentation ?? []
  const syntheseBlocks = hasSynthese ? buildSyntheseBlocks(data.synthese_sectorielle ?? "") : []

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. Synthèse sectorielle */}
      {hasSynthese && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Synthèse sectorielle
            </h3>
          </div>
          <div className="border-l-2 border-slate-600 pl-4 py-0.5">
            <div className="space-y-3 text-sm text-slate-200 leading-relaxed">
              {syntheseBlocks.map((block, index) =>
                block.type === "list" ? (
                  <ul key={`list-${index}`} className="list-disc space-y-1.5 pl-5">
                    {block.items.map((item, itemIndex) => (
                      <li key={`${index}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={`p-${index}`}>{block.text}</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid of the 6 other sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Marché */}
        <Section icon={BarChart2} title="Marché">
          <InfoRow label="Taille France" value={data.volume_marche?.taille_marche_france} />
          <InfoRow label="Taille Europe" value={data.volume_marche?.taille_marche_europe} />
          <InfoRow label="Croissance" value={data.volume_marche?.taux_croissance_annuel} />
          <BulletList label="Tendances" items={data.volume_marche?.tendances_macro} />
          <BulletList label="Facteurs de croissance" items={data.volume_marche?.facteurs_croissance} />
          <BulletList label="Freins identifiés" items={data.volume_marche?.freins_identifies} />
        </Section>

        {/* 3. Acteurs */}
        <Section icon={Users} title="Acteurs">
          {leaders.filter((a) => a.nom && a.nom !== "Non trouvé").length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leaders</span>
              <div className="flex flex-wrap gap-1.5">
                {leaders
                  .filter((a) => a.nom && a.nom !== "Non trouvé")
                  .map((a, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-650"
                      title={a.description}
                    >
                      {a.nom}
                      {a.part_marche_estimee && a.part_marche_estimee !== "Non trouvé"
                        ? ` · ${a.part_marche_estimee}`
                        : ""}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {challengers.filter((a) => a.nom && a.nom !== "Non trouvé").length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Challengers</span>
              <div className="flex flex-wrap gap-1.5">
                {challengers
                  .filter((a) => a.nom && a.nom !== "Non trouvé")
                  .map((a, i) => (
                    <span key={i} className="text-[10px] bg-slate-850 text-slate-300 px-2 py-0.5 rounded border border-slate-750">
                      {a.nom}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {emergents.filter((a) => a.nom && a.nom !== "Non trouvé").length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Émergents</span>
              <div className="flex flex-wrap gap-1.5">
                {emergents
                  .filter((a) => a.nom && a.nom !== "Non trouvé")
                  .map((a, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                      {a.nom}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {leaders.length === 0 && challengers.length === 0 && emergents.length === 0 && (
            <p className="text-xs italic text-slate-450">Données non disponibles.</p>
          )}
        </Section>

        {/* 4. Chaîne de valeur */}
        <Section icon={Link2} title="Chaîne de valeur">
          <InfoRow label="Description" value={data.chaine_valeur?.description_chaine} />
          <BulletList label="Maillons clés" items={data.chaine_valeur?.maillons_cles} />
          <BulletList label="Dépendances critiques" items={data.chaine_valeur?.dependances_critiques} />
          <BulletList label="Points de vulnérabilité" items={data.chaine_valeur?.points_vulnerabilite} />
        </Section>

        {/* 5. Réglementation */}
        <Section icon={Shield} title="Réglementation">
          {reglementationsEnVigueur.filter((r) => r.nom && r.nom !== "Non trouvé").length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Réglementations en vigueur</span>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-200">
                {reglementationsEnVigueur
                  .filter((r) => r.nom && r.nom !== "Non trouvé")
                  .map((r, i) => (
                    <li key={i}>
                      <strong>{r.nom}</strong>
                      {r.impact && r.impact !== "Non trouvé" ? ` — ${r.impact}` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {reglementationsAVenir.filter((r) => r.nom && r.nom !== "Non trouvé").length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Réglementations à venir</span>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-200">
                {reglementationsAVenir
                  .filter((r) => r.nom && r.nom !== "Non trouvé")
                  .map((r, i) => (
                    <li key={i}>
                      <strong>{r.nom}</strong>
                      {r.echeance && r.echeance !== "Non trouvé" ? ` (${r.echeance})` : ""}
                      {r.impact && r.impact !== "Non trouvé" ? ` — ${r.impact}` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <BulletList label="Certifications requises" items={data.environnement_normatif?.certifications_requises} />
          <BulletList label="Risques de conformité" items={data.environnement_normatif?.risques_conformite} />
        </Section>

        {/* 6. Concurrence */}
        <Section icon={Swords} title="Concurrence">
          <InfoRow label={`Positionnement du compte (${companyName})`} value={data.analyse_concurrentielle?.positionnement_client} />
          {concurrentsDirects.filter((c) => c.nom && c.nom !== "Non trouvé").length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Concurrents directs</span>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-200">
                {concurrentsDirects
                  .filter((c) => c.nom && c.nom !== "Non trouvé")
                  .map((c, i) => (
                    <li key={i}>
                      <strong>{c.nom}</strong>
                      {c.forces && c.forces !== "Non trouvé" ? ` — ${c.forces}` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <BulletList label="Avantages concurrentiels" items={data.analyse_concurrentielle?.avantages_concurrentiels_client} />
          <BulletList label="Menaces" items={data.analyse_concurrentielle?.menaces} />
          <BulletList label="Opportunités de différenciation" items={data.analyse_concurrentielle?.opportunites_differenciation} />
        </Section>

        {/* 7. Clientèle */}
        <Section icon={Target} title="Clientèle">
          <InfoRow label="Profil client type" value={data.segment_clientele?.profil_client_type} />
          {segments.filter((s) => s.segment && s.segment !== "Non trouvé").length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Segmentation</span>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-200">
                {segments
                  .filter((s) => s.segment && s.segment !== "Non trouvé")
                  .map((s, i) => (
                    <li key={i}>
                      <strong>{s.segment}</strong>
                      {s.poids_estime && s.poids_estime !== "Non trouvé" ? ` (${s.poids_estime})` : ""}
                      {s.description && s.description !== "Non trouvé" ? ` — ${s.description}` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <BulletList label="Tendances comportementales" items={data.segment_clientele?.tendances_comportementales} />
          <BulletList label="Besoins non couverts" items={data.segment_clientele?.besoins_non_couverts} />
        </Section>
      </div>
    </div>
  )
}
