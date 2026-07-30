import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getSectorActivationData } from "@/features/legacy/sector-approach/sector-activation-data"
import { getSectors } from "@/lib/supabase/sector"
import { SectorActivationDesktopView } from "@/features/legacy/sector-approach/SectorActivationDesktopView"
import { SectorCardMobile } from "@/features/legacy/sector-approach/SectorCard"
import { LegacyBanner } from "@/features/legacy/LegacyBanner"

export default async function LegacyApprocheSectoriellePage() {
  const device = await getDashboardDevice()

  let view
  if (device === "mobile") {
    const sectors = await getSectors()
    const studied = sectors.filter((sector) => sector.status === "active")
    const preparing = sectors.filter((sector) => sector.status !== "active")

    view = (
      <div className="space-y-8 pb-8 px-4 md:px-6 pt-5">
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-surface p-6 md:p-8 shadow-sm">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none select-none" />
          <h1 className="font-heading text-xl font-black leading-none tracking-tight text-heading md:text-2xl">
            Approche Sectorielle
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-body">
            Pilotez nos campagnes de prospection et notre stratégie commerciale à travers nos secteurs cibles.
            Analysez l&apos;attractivité, la maturité digitale globale, les points de douleur critiques et accédez aux playbooks commerciaux de prospection opérationnels.
          </p>
        </div>

        {studied.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-heading text-sm font-bold text-heading">
              Études disponibles
              <span className="ml-2 font-normal text-muted">{studied.length}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {studied.map((sector) => (
                <SectorCardMobile key={sector.id} sector={sector} />
              ))}
            </div>
          </section>
        ) : null}

        {preparing.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-heading text-sm font-bold text-heading">
              En préparation
              <span className="ml-2 font-normal text-muted">{preparing.length}</span>
            </h2>
            <p className="text-xs leading-relaxed text-muted">
              Comptes rattachés, étude sectorielle pas encore produite.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {preparing.map((sector) => (
                <SectorCardMobile key={sector.id} sector={sector} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    )
  } else {
    const data = await getSectorActivationData()
    view = <SectorActivationDesktopView data={data} />
  }

  return (
    <div className="flex flex-col min-h-screen">
      <LegacyBanner />
      <div className="flex-1">
        {view}
      </div>
    </div>
  )
}
