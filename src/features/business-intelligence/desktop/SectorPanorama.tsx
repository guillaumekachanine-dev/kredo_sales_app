import { SectorActivationSector } from "@/lib/prospection/sector-activation-types"
import { Badge } from "@/components/ui/Badge"

interface SectorPanoramaProps {
  sectors: SectorActivationSector[]
}

export function SectorPanorama({ sectors }: SectorPanoramaProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
        <h3 className="font-bold text-[var(--color-text-main)]">Panorama sectoriel</h3>
        <button className="text-xs font-medium text-[var(--color-dataviz-1)] hover:underline">
          Voir tous les secteurs
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {sectors.map(sector => {
            const isActive = sector.status === "active"
            
            return (
              <div 
                key={sector.id} 
                className={`p-4 rounded-lg border flex flex-col justify-between ${
                  isActive 
                    ? "border-[var(--color-dataviz-1)] bg-[var(--color-dataviz-1)]/5" 
                    : "border-[var(--color-border)] bg-[var(--color-background)]"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-sm text-[var(--color-text-main)] line-clamp-2" title={sector.name}>{sector.name}</h4>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-dataviz-1)] flex-shrink-0 mt-1" title="Actif" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-muted)] flex-shrink-0 mt-1" title="En veille" />
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {isActive && sector.attractivenessScore !== null && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--color-muted)]">Attractivité</span>
                        <span className="font-semibold text-[var(--color-text-main)]">{sector.attractivenessScore}/100</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--color-muted)]">Fenêtres</span>
                      <span className="font-semibold text-[var(--color-text-main)]">{sector.openWindowCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--color-muted)]">Comptes liés</span>
                      <span className="font-semibold text-[var(--color-text-main)]">{sector.linkedAccountCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--color-muted)]">Couverture moy.</span>
                      <span className="font-semibold text-[var(--color-text-main)]">{sector.averageReachScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)]">
                  <span className="block text-[10px] uppercase text-[var(--color-muted)] mb-1">Practice ppale</span>
                  <span className="block text-xs font-medium text-[var(--color-text-main)] truncate" title={sector.topPracticeLabel}>
                    {sector.topPracticeLabel || "Aucune"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
