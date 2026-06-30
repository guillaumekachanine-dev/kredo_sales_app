import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getSectorActivationData } from "@/lib/prospection/sector-activation-data"
import { STRATEGIC_SECTOR_CONFIG } from "@/lib/prospection/sector-strategy-config"
import { getSectors } from "@/lib/supabase/sector"
import { SectorActivationDesktopView } from "@/components/prospection/sector-activation/SectorActivationDesktopView"
import { SectorCardMobile } from "@/components/sector/SectorCard"

export const dynamic = "force-dynamic"

export default async function ApprocheSectoriellePage() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    const dbSectors = await getSectors()
    const sectors = STRATEGIC_SECTOR_CONFIG.map((config) => {
      const dbSector = dbSectors.find((sector) => sector.slug === config.slug)

      if (dbSector) {
        return {
          id: dbSector.id,
          name: config.name,
          slug: dbSector.slug,
          status: dbSector.status,
          attractiveness_score: dbSector.attractiveness_score ?? config.attractivenessScore,
          digital_maturity: dbSector.digital_maturity ?? config.digitalMaturity,
          practices_fit: dbSector.practices_fit || config.practicesFit,
          companies_count: dbSector.companies_count,
          image_url: config.imageUrl,
        }
      }

      return {
        id: config.slug,
        name: config.name,
        slug: config.slug,
        status: config.status,
        attractiveness_score: config.attractivenessScore,
        digital_maturity: config.digitalMaturity,
        practices_fit: config.practicesFit,
        companies_count: config.companiesCount,
        image_url: config.imageUrl,
      }
    })

    return (
      <div className="space-y-8 pb-8">
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-surface p-6 md:p-8 shadow-sm">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none select-none" />
          <h1 className="font-heading text-xl font-black leading-none tracking-tight text-heading md:text-2xl">
            Approche Sectorielle
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-body">
            Pilotez nos campagnes de prospection et notre stratégie commerciale à travers nos 6 secteurs cibles.
            Analysez l&apos;attractivité, la maturité digitale globale, les points de douleur critiques et accédez aux playbooks commerciaux de prospection opérationnels.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sectors.map((sector) => (
            <SectorCardMobile key={sector.id} sector={sector} />
          ))}
        </div>
      </div>
    )
  }

  const data = await getSectorActivationData()

  return <SectorActivationDesktopView data={data} />
}
