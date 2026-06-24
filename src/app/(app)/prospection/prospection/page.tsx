import { SurfaceCard } from "@/components/ui/SurfaceCard"

export default function ProspectionPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16 sm:px-6">
      <SurfaceCard className="w-full p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          Prospection
        </p>
        <p className="mt-2 text-sm text-body">
          Objectifs, metriques et outils de prospection commerciale.
        </p>
        <p className="mt-4 text-xs text-muted">Module en construction</p>
      </SurfaceCard>
    </div>
  )
}
