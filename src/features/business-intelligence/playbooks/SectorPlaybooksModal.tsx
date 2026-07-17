"use client"

import { useState, useMemo } from "react"
import { IntelligenceSplitModalShell } from "@/components/intelligence/IntelligenceSplitModalShell"
import { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import { buildSectorPlaybookModel, BusinessIntelligenceSectorProfile } from "../models/build-sector-playbook-model"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"


interface SectorPlaybooksModalProps {
  open: boolean
  onClose: () => void
  snapshot: BusinessIntelligenceSnapshot
  initialSectorId: string | "all"
  onApplySector: (sectorId: string, firstAccountId: string | null) => void
}

function calculateCompleteness(profile: BusinessIntelligenceSectorProfile | null): number {
  if (!profile) return 0
  const items = [
    Boolean(profile.description),
    profile.playbook.personas.length > 0,
    profile.playbook.roiArguments.length > 0,
    profile.playbook.objections.length > 0,
    profile.playbook.entryPoints.length > 0,
    profile.painPoints.length > 0,
    profile.deadlines.length > 0,
    Object.keys(profile.practiceScores).length > 0,
  ]
  const count = items.filter(Boolean).length
  return Math.round((count / items.length) * 100)
}

export function SectorPlaybooksModal({
  open,
  onClose,
  snapshot,
  initialSectorId,
  onApplySector,
}: SectorPlaybooksModalProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  
  // Resolve initial selected sector ID
  const sectorsList = useMemo(() => {
    return snapshot.sectors.map(s => {
      const profile = buildSectorPlaybookModel(snapshot, s.id)
      const completeness = calculateCompleteness(profile)
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        status: s.status,
        linkedAccountCount: s.linkedAccountCount,
        openWindowCount: s.openWindowCount,
        updatedAt: s.updatedAt,
        completeness,
        profile,
      }
    })
  }, [snapshot])

  const initialId = useMemo(() => {
    if (initialSectorId && initialSectorId !== "all") {
      return initialSectorId
    }
    const activeSec = sectorsList.find(s => s.status === "active")
    if (activeSec) return activeSec.id
    return sectorsList[0]?.id ?? ""
  }, [initialSectorId, sectorsList])

  const [selectedSectorId, setSelectedSectorId] = useState<string>(initialId)

  const currentSector = useMemo(() => {
    return sectorsList.find(s => s.id === selectedSectorId) ?? sectorsList[0]
  }, [selectedSectorId, sectorsList])

  // Filtered sectors list for left pane
  const filteredSectors = useMemo(() => {
    return sectorsList.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [sectorsList, searchQuery])

  const activeSectors = useMemo(() => filteredSectors.filter(s => s.status === "active"), [filteredSectors])
  const watchSectors = useMemo(() => filteredSectors.filter(s => s.status !== "active"), [filteredSectors])

  // Selected priority account within the playbook right pane
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  // Derived active selected account ID
  const activeAccountId = useMemo(() => {
    const priorityAccounts = currentSector?.profile?.priorityAccounts ?? []
    if (priorityAccounts.length === 0) return null
    if (selectedAccountId && priorityAccounts.some(a => a.id === selectedAccountId)) {
      return selectedAccountId
    }
    return priorityAccounts[0]?.id ?? null
  }, [currentSector, selectedAccountId])


  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
    } catch {
      return "N/A"
    }
  }

  // Left Pane component
  const leftPane = (
    <div className="flex flex-col h-full bg-[#0d0f28] text-white">
      <div className="p-4 border-b border-white/5 space-y-3 shrink-0">
        <input
          type="search"
          placeholder="Rechercher un secteur..."
          className="w-full bg-slate-950/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-brass/60"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Active Sectors Group */}
        {activeSectors.length > 0 && (
          <div className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Études opérationnelles
            </h3>
            {activeSectors.map(s => {
              const isSelected = s.id === selectedSectorId
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSectorId(s.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border outline-none ${
                    isSelected
                      ? "bg-brand-brass/10 border-brand-brass/35 text-white"
                      : "bg-transparent border-transparent text-white/70 hover:bg-white/[0.03] hover:text-white"
                  }`}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs leading-tight block">{s.name}</span>
                    <span className="text-[10px] font-mono font-bold text-brand-brass bg-brand-brass/15 px-1.5 py-0.5 rounded ml-2 shrink-0">
                      {s.completeness}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-white/40 font-medium">
                    <span>{s.linkedAccountCount} comptes</span>
                    <span>•</span>
                    <span>{s.openWindowCount} fenêtres</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Watch Sectors Group */}
        {watchSectors.length > 0 && (
          <div className="space-y-1 pt-2">
            <h3 className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Secteurs en veille
            </h3>
            {watchSectors.map(s => {
              const isSelected = s.id === selectedSectorId
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSectorId(s.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border outline-none ${
                    isSelected
                      ? "bg-white/[0.06] border-white/15 text-white"
                      : "bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:text-white"
                  }`}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs leading-tight block">{s.name}</span>
                    <span className="text-[10px] text-white/30 border border-white/10 px-1 py-0.5 rounded ml-2 shrink-0">
                      Veille
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-white/30 font-medium">
                    <span>{s.linkedAccountCount} comptes</span>
                    <span>•</span>
                    <span>MàJ {formatDate(s.updatedAt)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}


        {activeSectors.length === 0 && watchSectors.length === 0 && (
          <div className="text-center py-8 text-xs text-white/30 italic">
            Aucun secteur trouvé
          </div>
        )}
      </div>
    </div>
  )

  const profile = currentSector?.profile

  // Right Pane content (Detailed Playbook view)
  const rightPane = (
    <div className="flex flex-col h-full bg-[#0a0b1e] text-white">
      {profile ? (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header info */}
            <div className="border-b border-white/5 pb-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={profile.status === "active" ? "brand" : "neutral"} className="uppercase text-[9px] tracking-wider font-semibold">
                  {profile.status === "active" ? "Étude active" : "En veille"}
                </Badge>
                {profile.topPracticeLabel && (
                  <Badge variant="brass" className="text-[9px] tracking-wider font-semibold">
                    Practice : {profile.topPracticeLabel}
                  </Badge>
                )}
                {profile.updatedAt && (
                  <span className="text-[10px] text-white/40 ml-auto">
                    Mis à jour le {new Date(profile.updatedAt).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">{profile.name}</h3>
              {profile.description && (
                <p className="text-xs text-white/70 leading-relaxed pt-1">{profile.description}</p>
              )}
            </div>

            {profile.status === "watch" ? (
              /* Watch State View */
              <div className="space-y-6">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center space-y-1">
                  <span className="text-brand-brass text-xs font-bold uppercase tracking-wider block">
                    Étude sectorielle en préparation
                  </span>
                  <p className="text-[11px] text-white/50">
                    Ce secteur est actuellement en veille. Les playbooks et argumentaires complets seront disponibles dès la finalisation de l'étude.
                  </p>
                </div>

                {/* Market metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                    <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Comptes liés</span>
                    <span className="block text-lg font-bold text-white">{profile.linkedAccountCount}</span>
                  </div>
                  <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                    <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Couverture moy.</span>
                    <span className="block text-lg font-bold text-white">
                      {profile.averageReach !== null ? `${profile.averageReach}%` : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                    <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Attractivité</span>
                    <span className="block text-lg font-bold text-white">
                      {profile.attractivenessScore !== null ? `${profile.attractivenessScore} / 100` : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                    <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Maturité Digitale</span>
                    <span className="block text-sm font-bold text-white capitalize">{profile.digitalMaturity ?? "N/A"}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Active State View */
              <div className="space-y-6">
                {/* Market metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profile.marketSizeEurBn !== null && (
                    <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                      <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Taille de marché</span>
                      <span className="block text-lg font-bold text-white">{profile.marketSizeEurBn} Md€</span>
                    </div>
                  )}

                  {profile.marketGrowthPct !== null && (
                    <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                      <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Croissance</span>
                      <span className="block text-lg font-bold text-brand-brass">+{profile.marketGrowthPct}%</span>
                    </div>
                  )}
                  {profile.averageReach !== null && (
                    <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                      <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Couverture relationnelle</span>
                      <span className="block text-lg font-bold text-white">{profile.averageReach}%</span>
                    </div>
                  )}
                  {profile.digitalMaturity && (
                    <div className="bg-slate-900/35 border border-white/5 rounded-lg p-3">
                      <span className="block text-[9px] uppercase tracking-wider text-white/45 mb-1">Maturité Digitale</span>
                      <span className="block text-sm font-bold text-white capitalize">{profile.digitalMaturity}</span>
                    </div>
                  )}
                </div>

                {/* Personas Section */}
                {profile.playbook.personas.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                      Personas cibles
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.playbook.personas.map((p, idx) => (
                        <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-2">
                          <span className="block text-xs font-bold text-white">{p.role}</span>
                          <div className="text-[11px] space-y-1">
                            <p className="text-white/70">
                              <strong className="text-white/95">Enjeu principal :</strong> {p.enjeu}
                            </p>
                            <p className="text-white/70">
                              <strong className="text-white/95">Point de douleur :</strong> {p.peur}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pain Points Section */}
                {profile.painPoints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                      Points de douleur sectoriels (Pain Points)
                    </h4>
                    <div className="space-y-2">
                      {profile.painPoints.map((pp, idx) => (
                        <div key={idx} className="bg-slate-900/25 border border-white/5 rounded-lg p-3 space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-semibold text-white">{pp.title}</span>
                            <span className="text-[10px] font-mono text-white/40 shrink-0">
                              Freq: {pp.frequencyCount}
                            </span>
                          </div>
                          {pp.description && <p className="text-[11px] text-white/60">{pp.description}</p>}
                          {pp.verbatim && (
                            <blockquote className="border-l-2 border-brand-brass/40 pl-2 text-[10px] italic text-white/50">
                              "{pp.verbatim}"
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Arguments ROI */}
                {profile.playbook.roiArguments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                      Arguments ROI de valeur
                    </h4>
                    <ul className="list-disc pl-4 text-xs text-white/75 space-y-1.5">
                      {profile.playbook.roiArguments.map((arg, idx) => (
                        <li key={idx} className="leading-relaxed">{arg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Objections */}
                {profile.playbook.objections.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                      Objections & Réponses préparées
                    </h4>
                    <div className="space-y-3">
                      {profile.playbook.objections.map((o, idx) => (
                        <div key={idx} className="bg-slate-900/30 border border-white/5 rounded-xl p-4 space-y-2">
                          <p className="text-xs font-bold text-red-400">« {o.objection} »</p>
                          <p className="text-[11px] text-white/70 leading-relaxed">{o.reponse}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deadlines Section */}
                {profile.deadlines.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                      Échéances réglementaires
                    </h4>
                    <div className="space-y-2">
                      {profile.deadlines.map((d, idx) => (
                        <div key={idx} className="bg-slate-900/35 border border-white/5 rounded-lg p-3 flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-white truncate">{d.title}</span>
                            <span className="block text-[10px] text-white/40 mt-0.5">
                              {d.authority ?? "Régulateur"} • Urgence: {d.urgency}/100
                            </span>
                          </div>
                          {d.date && (
                            <span className="text-xs font-mono font-bold text-brand-brass shrink-0 bg-brand-brass/10 px-2.5 py-1 rounded">
                              {new Date(d.date).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Players Section */}
                {(profile.keyPlayers.paca.length > 0 || profile.keyPlayers.national.length > 0) && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                      Acteurs clés & Ecosystème
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.keyPlayers.paca.length > 0 && (
                        <div className="space-y-2">
                          <span className="block text-[11px] font-bold text-white/50">Acteurs PACA</span>
                          <div className="space-y-2">
                            {profile.keyPlayers.paca.map((p, idx) => (
                              <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-lg p-3 text-xs">
                                <strong className="text-white block">{p.name} ({p.size})</strong>
                                {p.note && <span className="block text-[10px] text-white/60 mt-1">{p.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {profile.keyPlayers.national.length > 0 && (
                        <div className="space-y-2">
                          <span className="block text-[11px] font-bold text-white/50">Acteurs Nationaux</span>
                          <div className="space-y-2">
                            {profile.keyPlayers.national.map((p, idx) => (
                              <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-lg p-3 text-xs">
                                <strong className="text-white block">{p.name} ({p.size})</strong>
                                {p.note && <span className="block text-[10px] text-white/60 mt-1">{p.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Caveats & Sources Section */}
                {profile.caveats && (
                  <div className="pt-2">
                    <details className="group border border-white/5 rounded-xl bg-white/[0.01]">
                      <summary className="p-3 text-xs font-bold text-white/50 hover:text-white cursor-pointer select-none outline-none flex justify-between items-center">
                        <span>Réserves méthodologiques & Sources ({profile.sources.length})</span>
                        <svg className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-4 border-t border-white/5 space-y-3 text-[11px] text-white/65 leading-relaxed bg-slate-950/20">
                        {profile.caveats.corpus && (
                          <p><strong>Taille du corpus :</strong> {profile.caveats.corpus}</p>
                        )}
                        {profile.caveats.verbatims && (
                          <p><strong>Verbatims :</strong> {profile.caveats.verbatims}</p>
                        )}
                        {profile.caveats.frequences && (
                          <p><strong>Fréquences d'occurrence :</strong> {profile.caveats.frequences}</p>
                        )}
                        {profile.caveats.marche && (
                          <p><strong>Chiffres marché :</strong> {profile.caveats.marche}</p>
                        )}
                        {profile.sources.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="block font-bold text-white/80">Sources consultées :</span>
                            <ul className="list-disc pl-4 space-y-1 text-brand-brass">
                              {profile.sources.map((src, idx) => (
                                <li key={idx}>
                                  <a href={src} target="_blank" rel="noreferrer" className="hover:underline truncate block max-w-full">
                                    {src}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}

            {/* Priority accounts section */}
            <div className="border-t border-white/5 pt-6 space-y-3">
              <h4 className="text-[10px] font-bold text-brand-brass uppercase tracking-wider">
                Comptes prioritaires liés
              </h4>
              <div className="space-y-2">
                {profile.priorityAccounts.length === 0 ? (
                  <p className="text-xs text-white/40 italic">Aucun compte lié trouvé dans le portefeuille actuel.</p>
                ) : (
                  profile.priorityAccounts.map(a => {
                    const isSelected = a.id === activeAccountId
                    return (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAccountId(a.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-wrap items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-brand-brass/10 border-brand-brass/30"
                            : "bg-slate-900/30 border-white/5 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-white">{a.name}</span>
                          <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
                            <span>Priorité : {a.priority}</span>
                            <span>•</span>
                            <span>Potentiel/Reach: P:{a.potential} | R:{a.reach}</span>
                            {a.nativeScore !== null && (
                              <>
                                <span>•</span>
                                <span>Score Natif : {a.nativeScore}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {a.action && (
                          <span className="text-[10px] text-white/60 bg-white/[0.04] px-2 py-1 rounded shrink-0 max-w-[200px] truncate" title={a.action}>
                            Action: {a.action}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Action footer */}
          <footer className="shrink-0 p-4 border-t border-white/5 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="brass"
              size="sm"
              onClick={() => onApplySector(currentSector.id, activeAccountId)}
            >
              Appliquer au portefeuille
            </Button>

            {activeAccountId ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  router.push(`/prospection/accounts/${activeAccountId}`)
                }}
              >
                Ouvrir le compte prioritaire
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                Ouvrir le compte prioritaire
              </Button>
            )}
          </footer>

        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-white/40 italic">
          Sélectionnez un secteur pour afficher son playbook
        </div>
      )}
    </div>
  )

  return (
    <IntelligenceSplitModalShell
      open={open}
      onClose={onClose}
      title="Playbooks sectoriels"
      subtitle="Études, angles d’approche et argumentaires adaptés à chaque secteur."
      leftPaneWidth="32%"
      leftPane={leftPane}
      rightPane={rightPane}
    />
  )
}
