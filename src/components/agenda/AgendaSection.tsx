import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { AgendaDesktopPage } from "./AgendaDesktopPage"
import { AgendaMobilePage } from "./AgendaMobilePage"

interface AgendaSectionProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Le squelette est porté par `app/(app)/agenda/loading.tsx`, par device : plus de
// `<Suspense>` ici, qui ajoutait un second squelette après celui de la route.
export async function AgendaSection({ searchParams }: AgendaSectionProps) {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return <AgendaMobilePage searchParams={searchParams} />
  }

  return <AgendaDesktopPage searchParams={searchParams} />
}
