import Link from "next/link"
import { DashboardLabShell } from "@/components/prospection/dashboard-lab/DashboardLabShell"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { getDashboardLabData } from "@/lib/prospection/dashboard-lab-data"

export default async function ProspectionDashboardLabPage() {
  const [device, data] = await Promise.all([getDashboardDevice(), getDashboardLabData()])

  if (device === "mobile") {
    return (
      <div className="space-y-6 pb-8">
        <SurfaceCard padding="spacious" className="border-dashed">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Dashboard Lab
            </p>
            <h1 className="font-heading text-2xl font-bold text-heading">
              Laboratoire desktop uniquement
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-body">
              Cette exploration compare trois variantes desktop de la Synthèse CRM. La branche mobile n&apos;est volontairement pas chargée ici.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/intelligence" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                Retour à la synthèse
              </Link>
              <Link href="/prospection/suivi" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                Ouvrir le suivi
              </Link>
            </div>
          </div>
        </SurfaceCard>
      </div>
    )
  }

  return <DashboardLabShell data={data} />
}
