import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getSectorActivationData } from "@/lib/prospection/sector-activation-data"
import { getSectors } from "@/lib/supabase/sector"
import { SectorActivationDesktopView } from "@/components/prospection/sector-activation/SectorActivationDesktopView"
import { SectorCardMobile } from "@/components/sector/SectorCard"

export const dynamic = "force-dynamic"

export default async function ApprocheSectoriellePage() {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    // Source unique : la base. Le mobile lisait auparavant une liste de secteurs
    // codée en dur, qui divergeait du réel (noms, scores) et pointait vers trois
    // slugs inexistants — trois cartes menaient à une page vide.
    const sectors = await getSectors()

    // Même partage que le desktop : "disponible" = étude réellement produite (status
    // 'active'). Le reste est en préparation — des comptes y sont rattachés, mais il
    // n'y a ni pain point, ni calendrier réglementaire, ni playbook exploitable.
    const studied = sectors.filter((sector) => sector.status === "active")
    const preparing = sectors.filter((sector) => sector.status !== "active")

    return (
      <div className="space-y-8 pb-8">
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
  }

  const data = await getSectorActivationData()

  return <SectorActivationDesktopView data={data} />
}
